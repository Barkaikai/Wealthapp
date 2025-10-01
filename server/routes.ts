import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateDailyBriefing, categorizeEmail, draftEmailReply, generateLifestyleRecommendations, generateTopicArticle } from "./openai";
import { getMarketOverview } from "./marketData";
import { slugify } from "./utils";
import { fetchRecentEmails } from "./gmail";
import { insertAssetSchema, insertEventSchema, insertRoutineSchema, insertAIContentSchema } from "@shared/schema";
import { syncAllFinancialData, syncStockPrices, syncCryptoPrices, addStockPosition, addCryptoPosition } from "./financialSync";
import { syncAndCategorizeEmails, getEmailsWithDrafts, generateDraftForEmail } from "./emailAutomation";
import { getAllTemplates, getTemplateById, createTemplate, deleteTemplate } from "./emailTemplates";
import { insertEmailTemplateSchema } from "@shared/schema";
import { runFullDiagnostics } from "./diagnostics";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Daily Briefing routes
  app.get('/api/briefing/latest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const briefing = await storage.getLatestBriefing(userId);
      if (!briefing) {
        return res.json(null);
      }
      res.json(briefing);
    } catch (error) {
      console.error("Error fetching briefing:", error);
      res.status(500).json({ message: "Failed to fetch briefing" });
    }
  });

  app.post('/api/briefing/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`Starting briefing generation for user ${userId}`);
      
      // Gather comprehensive data for accurate briefing
      const [assets, events, marketContext, previousBriefing] = await Promise.all([
        storage.getAssets(userId),
        storage.getEvents(userId),
        getMarketOverview().catch((err) => {
          console.warn('Market data unavailable:', err.message);
          return null;
        }),
        storage.getLatestBriefing(userId).catch(() => null),
      ]);
      
      console.log(`Briefing data gathered: ${assets.length} assets, ${events.length} events, market data: ${marketContext ? 'available' : 'unavailable'}`);
      
      const { highlights, risks, actions } = await generateDailyBriefing(
        assets, 
        events, 
        marketContext,
        previousBriefing
      );
      
      console.log(`AI briefing generated: ${highlights.length} highlights, ${risks.length} risks, ${actions.length} actions`);
      
      const briefing = await storage.createBriefing({
        userId,
        date: new Date(),
        highlights,
        risks,
        actions,
      });
      
      console.log(`Briefing saved with ID ${briefing.id}`);
      res.json(briefing);
    } catch (error: any) {
      console.error("Error generating briefing:", error);
      res.status(500).json({ message: error.message || "Failed to generate briefing" });
    }
  });

  // Asset routes
  app.get('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assets = await storage.getAssets(userId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.post('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assetData = insertAssetSchema.parse({ ...req.body, userId });
      const asset = await storage.createAsset(assetData);
      res.json(asset);
    } catch (error: any) {
      console.error("Error creating asset:", error);
      res.status(400).json({ message: error.message || "Failed to create asset" });
    }
  });

  app.patch('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const asset = await storage.updateAsset(id, userId, req.body);
      res.json(asset);
    } catch (error: any) {
      console.error("Error updating asset:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to update asset" });
    }
  });

  app.delete('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      await storage.deleteAsset(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting asset:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to delete asset" });
    }
  });

  // Financial sync routes
  app.post('/api/financial/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await syncAllFinancialData(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing financial data:", error);
      res.status(500).json({ message: error.message || "Failed to sync financial data" });
    }
  });

  app.post('/api/financial/sync/stocks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await syncStockPrices(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing stock prices:", error);
      res.status(500).json({ message: error.message || "Failed to sync stock prices" });
    }
  });

  app.post('/api/financial/sync/crypto', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await syncCryptoPrices(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing crypto prices:", error);
      res.status(500).json({ message: error.message || "Failed to sync crypto prices" });
    }
  });

  app.post('/api/financial/stocks/add', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { symbol, quantity, name } = req.body;
      
      if (!symbol || !quantity) {
        return res.status(400).json({ message: "Symbol and quantity are required" });
      }

      const asset = await addStockPosition(userId, symbol, quantity, name);
      res.json(asset);
    } catch (error: any) {
      console.error("Error adding stock position:", error);
      res.status(500).json({ message: error.message || "Failed to add stock position" });
    }
  });

  app.post('/api/financial/crypto/add', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { symbol, quantity, name } = req.body;
      
      if (!symbol || !quantity) {
        return res.status(400).json({ message: "Symbol and quantity are required" });
      }

      const asset = await addCryptoPosition(userId, symbol, quantity, name);
      res.json(asset);
    } catch (error: any) {
      console.error("Error adding crypto position:", error);
      res.status(500).json({ message: error.message || "Failed to add crypto position" });
    }
  });

  // Event routes
  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventData = insertEventSchema.parse({ ...req.body, userId });
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error: any) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: error.message || "Failed to create event" });
    }
  });

  // Routine routes
  app.get('/api/routines', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const routines = await storage.getRoutines(userId);
      res.json(routines);
    } catch (error) {
      console.error("Error fetching routines:", error);
      res.status(500).json({ message: "Failed to fetch routines" });
    }
  });

  app.post('/api/routines', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const routineData = insertRoutineSchema.parse({ ...req.body, userId });
      const routine = await storage.createRoutine(routineData);
      res.json(routine);
    } catch (error: any) {
      console.error("Error creating routine:", error);
      res.status(400).json({ message: error.message || "Failed to create routine" });
    }
  });

  app.patch('/api/routines/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const routine = await storage.updateRoutine(id, userId, req.body);
      res.json(routine);
    } catch (error: any) {
      console.error("Error updating routine:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to update routine" });
    }
  });

  app.delete('/api/routines/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      await storage.deleteRoutine(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting routine:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to delete routine" });
    }
  });

  app.post('/api/routines/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const routines = await storage.getRoutines(userId);
      const recommendations = await generateLifestyleRecommendations(routines);
      res.json({ recommendations });
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Email routes
  app.get('/api/emails', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const emails = await storage.getEmails(userId);
      res.json(emails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });

  app.post('/api/emails/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const maxResults = req.body.maxResults || 20;
      
      const result = await syncAndCategorizeEmails(userId, maxResults);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing emails:", error);
      
      // Handle specific Gmail errors
      if (error.name === 'GmailScopeError') {
        return res.status(403).json({ 
          message: error.message,
          action: 'reconnect_gmail'
        });
      }
      if (error.name === 'GmailNotConnectedError') {
        return res.status(401).json({ 
          message: error.message,
          action: 'connect_gmail'
        });
      }
      
      res.status(500).json({ message: error.message || "Failed to sync emails" });
    }
  });

  app.get('/api/emails/with-drafts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const category = req.query.category as string | undefined;
      
      const emailsWithDrafts = await getEmailsWithDrafts(userId, category);
      res.json(emailsWithDrafts);
    } catch (error: any) {
      console.error("Error fetching emails with drafts:", error);
      res.status(500).json({ message: error.message || "Failed to fetch emails with drafts" });
    }
  });

  app.post('/api/emails/:id/draft', isAuthenticated, async (req: any, res) => {
    try {
      const emailId = req.params.id;
      const userId = req.user.claims.sub;
      
      const emails = await storage.getEmails(userId);
      const email = emails.find(e => e.id === emailId);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }

      const draftReply = await generateDraftForEmail(email.body || email.preview || '');
      
      await storage.upsertEmail({
        ...email,
        draftReply,
      });
      
      res.json({ draftReply });
    } catch (error: any) {
      console.error("Error generating draft:", error);
      res.status(500).json({ message: error.message || "Failed to generate draft" });
    }
  });

  app.patch('/api/emails/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const userId = req.user.claims.sub;
      const { isStarred, isRead } = req.body;
      const email = await storage.updateEmailStatus(id, userId, { isStarred, isRead });
      res.json(email);
    } catch (error: any) {
      console.error("Error updating email status:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to update email status" });
    }
  });

  app.post('/api/emails/:id/draft-reply', isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const userId = req.user.claims.sub;
      const emails = await storage.getEmails(userId);
      const email = emails.find(e => e.id === id);
      
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      
      const draft = await draftEmailReply(email.body || email.preview || '');
      res.json({ draft });
    } catch (error) {
      console.error("Error drafting reply:", error);
      res.status(500).json({ message: "Failed to draft reply" });
    }
  });

  // Email templates routes
  app.get('/api/email-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await getAllTemplates(userId);
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: error.message || "Failed to fetch templates" });
    }
  });

  app.get('/api/email-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateId = req.params.id;
      const template = await getTemplateById(userId, templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error: any) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: error.message || "Failed to fetch template" });
    }
  });

  app.post('/api/email-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateData = insertEmailTemplateSchema.parse({
        ...req.body,
        userId,
      });
      
      const template = await createTemplate(templateData);
      res.json(template);
    } catch (error: any) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: error.message || "Failed to create template" });
    }
  });

  app.delete('/api/email-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateId = req.params.id;
      
      await deleteTemplate(userId, templateId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: error.message || "Failed to delete template" });
    }
  });

  // Calendar export route
  app.get('/api/routines/export/ics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const routines = await storage.getRoutines(userId);
      
      const icsLines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Wealth Automation Platform//EN"
      ];
      
      const now = new Date();
      for (const routine of routines) {
        const [hours, minutes] = routine.time.split(':').map(Number);
        const start = new Date(now);
        start.setHours(hours, minutes, 0, 0);
        
        const durationMinutes = parseInt(routine.duration) || 60;
        const end = new Date(start.getTime() + durationMinutes * 60000);
        
        icsLines.push(
          "BEGIN:VEVENT",
          `UID:routine-${routine.id}@wealth-automation`,
          `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `SUMMARY:${routine.title}`,
          routine.description ? `DESCRIPTION:${routine.description}` : '',
          "END:VEVENT"
        );
      }
      
      icsLines.push("END:VCALENDAR");
      
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="daily_routine.ics"');
      res.send(icsLines.filter(line => line).join("\r\n"));
    } catch (error) {
      console.error("Error exporting calendar:", error);
      res.status(500).json({ message: "Failed to export calendar" });
    }
  });

  // Learn system routes - AI-generated educational content
  app.get('/api/learn/:slug', isAuthenticated, async (req, res) => {
    try {
      const { slug } = req.params;
      const content = await storage.getContentBySlug(slug);
      
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.json(content);
    } catch (error) {
      console.error("Error fetching learn content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post('/api/learn/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { topic, slug: customSlug } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }
      
      const slug = customSlug || slugify(topic);
      
      // Check if content already exists
      const existing = await storage.getContentBySlug(slug);
      if (existing) {
        return res.json(existing);
      }
      
      // Generate new content using OpenAI
      const { title, summary, contentMarkdown } = await generateTopicArticle(topic);
      
      // Validate before inserting
      const contentData = insertAIContentSchema.parse({
        slug,
        topic: title || topic,
        content: contentMarkdown,
        summary,
      });
      
      // Store in database
      const content = await storage.createContent(contentData);
      
      res.status(201).json(content);
    } catch (error: any) {
      console.error("Error generating learn content:", error);
      
      // Handle different error types
      if (error.message?.includes('OpenAI')) {
        return res.status(502).json({ message: "AI service temporarily unavailable. Please try again." });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid content data" });
      }
      if (error.message?.includes('unique constraint')) {
        return res.status(409).json({ message: "Content already exists for this topic" });
      }
      
      res.status(500).json({ message: error.message || "Failed to generate content" });
    }
  });

  // Market data routes - comprehensive market overview
  app.get('/api/market/overview', isAuthenticated, async (req, res) => {
    try {
      const overview = await getMarketOverview();
      res.json(overview);
    } catch (error) {
      console.error("Error fetching market overview:", error);
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  // Diagnostics route - comprehensive system health check
  app.get('/api/diagnostics', isAuthenticated, async (req, res) => {
    try {
      console.log('Running full system diagnostics...');
      const results = await runFullDiagnostics();
      console.log(`Diagnostics complete: ${results.length} checks performed`);
      res.json(results);
    } catch (error: any) {
      console.error("Error running diagnostics:", error);
      res.status(500).json({ message: error.message || "Failed to run diagnostics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
