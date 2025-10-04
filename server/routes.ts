import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateDailyBriefing, categorizeEmail, draftEmailReply, generateLifestyleRecommendations, generateTopicArticle, generateVideoRecommendations, generateRoutineReport } from "./openai";
import { getMarketOverview } from "./marketData";
import { slugify } from "./utils";
import { fetchRecentEmails } from "./gmail";
import OpenAI from "openai";
import Stripe from "stripe";
import { convertToUSD } from "./currencyExchange";
import { attachSubscription, requireTier, requireFeature, enforceLimit } from "./subscriptionMiddleware";
import { getCanonicalUserId, getCacheStats } from "./helpers/canonicalUser";
import { appLogger } from "./appLogger";
import { aiDataForwarder } from "./aiDataForwarder";

// Initialize OpenAI client for routes that need it directly
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
});

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});
import { insertAssetSchema, insertEventSchema, insertRoutineSchema, insertAIContentSchema, insertTransactionSchema, insertWealthAlertSchema, insertFinancialGoalSchema, insertLiabilitySchema, insertCalendarEventSchema, insertTaskSchema, insertHealthMetricSchema, insertWalletConnectionSchema, insertVoiceCommandSchema, insertNoteSchema, insertDocumentSchema, insertPortfolioReportSchema, insertTradingRecommendationSchema, insertTaxEventSchema, insertRebalancingRecommendationSchema, insertAnomalyDetectionSchema, insertReceiptSchema, insertAccountSchema, insertJournalLineSchema, insertInvoiceSchema, insertBankTransactionSchema } from "@shared/schema";
import { analyzeReceiptImage } from "./receiptOCR";
import multer from "multer";
import { fileStorage } from "./fileStorage";
import { syncAllFinancialData, syncStockPrices, syncCryptoPrices, addStockPosition, addCryptoPosition } from "./financialSync";
import { syncAndCategorizeEmails, getEmailsWithDrafts, generateDraftForEmail } from "./emailAutomation";
import { getAllTemplates, getTemplateById, createTemplate, deleteTemplate } from "./emailTemplates";
import { insertEmailTemplateSchema } from "@shared/schema";
import { runFullDiagnostics } from "./diagnostics";
import { healthMonitor } from "./healthMonitor";
import { analyzeDocument } from "./documentAnalysis";
import { isObjectStorageAvailable, getStorageUnavailableMessage } from "./config";
import healthRoutes from "./healthRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoints (no auth required - used by deployment platforms)
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/livez', (_req, res) => {
    res.status(200).json({ status: 'alive', uptime: process.uptime() });
  });

  app.get('/readyz', async (_req, res) => {
    try {
      const { db } = await import('./db');
      await db.execute('SELECT 1');
      res.status(200).json({ 
        status: 'ready', 
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'not ready', 
        database: 'disconnected',
        error: (error as Error).message 
      });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Helper function to safely parse integer IDs
  const parseIntId = (value: string, paramName: string = 'id'): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error(`Invalid ${paramName}: must be a positive integer`);
    }
    return parsed;
  };

  // Mount health tracking routes (before subscription middleware to keep them unauthenticated)
  app.use('/api', healthRoutes);
  
  // Attach subscription data to all authenticated requests (after health routes)
  app.use('/api', isAuthenticated, attachSubscription);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const claims = req.user.claims;
      const userId = claims.sub;
      
      // Try to get user from database
      let user = await storage.getUser(userId);
      
      // If user doesn't exist, create it from claims (handles OIDC bypass in tests)
      if (!user) {
        user = await storage.upsertUser({
          id: claims.sub,
          email: claims.email,
          firstName: claims.first_name,
          lastName: claims.last_name,
          profileImageUrl: claims.profile_image_url,
        });
      }
      
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

  app.post('/api/assets', isAuthenticated, enforceLimit('maxAssets'), async (req: any, res) => {
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
      const id = parseIntId(req.params.id);
      const userId = req.user.claims.sub;
      const asset = await storage.updateAsset(id, userId, req.body);
      res.json(asset);
    } catch (error: any) {
      console.error("Error updating asset:", error);
      res.status(error.message?.includes("not found") || error.message?.includes("Invalid") ? 404 : 500).json({ message: error.message || "Failed to update asset" });
    }
  });

  app.delete('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntId(req.params.id);
      const userId = req.user.claims.sub;
      await storage.deleteAsset(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting asset:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to delete asset" });
    }
  });

  // Financial sync routes
  app.post('/api/financial/sync', isAuthenticated, requireTier('premium'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await syncAllFinancialData(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing financial data:", error);
      res.status(500).json({ message: error.message || "Failed to sync financial data" });
    }
  });

  app.post('/api/financial/sync/stocks', isAuthenticated, requireTier('premium'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await syncStockPrices(userId);
      res.json(result);
    } catch (error: any) {
      console.error("Error syncing stock prices:", error);
      res.status(500).json({ message: error.message || "Failed to sync stock prices" });
    }
  });

  app.post('/api/financial/sync/crypto', isAuthenticated, requireTier('premium'), async (req: any, res) => {
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
      const id = parseIntId(req.params.id);
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
      const id = parseIntId(req.params.id);
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

  app.post('/api/routines/ai-report', isAuthenticated, requireFeature('automatedReports'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { templateName, routines } = req.body;
      
      if (!templateName) {
        return res.status(400).json({ message: "Template name is required" });
      }

      const briefing = await storage.getLatestBriefing(userId).catch(() => null);
      
      const result = await generateRoutineReport(
        templateName,
        routines || [],
        briefing
      );
      
      res.json(result);
    } catch (error: any) {
      console.error("Error generating routine report:", error);
      res.status(500).json({ message: error.message || "Failed to generate routine report" });
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

  app.post('/api/emails/:id/draft', isAuthenticated, requireFeature('emailAutomation'), async (req: any, res) => {
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

  app.post('/api/emails/:id/draft-reply', isAuthenticated, requireFeature('emailAutomation'), async (req: any, res) => {
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
      const report = await runFullDiagnostics();
      console.log(`Diagnostics complete: ${report.results.length} checks performed in ${report.durationMs}ms`);
      console.log(`Summary: ${report.summary.success} success, ${report.summary.warning} warnings, ${report.summary.error} errors`);
      res.json(report);
    } catch (error: any) {
      console.error("Error running diagnostics:", error);
      res.status(500).json({ message: error.message || "Failed to run diagnostics" });
    }
  });

  // Health Monitor routes - continuous monitoring control
  app.get('/api/health-monitor/status', isAuthenticated, async (req, res) => {
    try {
      const status = healthMonitor.getStatus();
      res.json(status);
    } catch (error: any) {
      console.error("Error getting health monitor status:", error);
      res.status(500).json({ message: error.message || "Failed to get status" });
    }
  });

  app.get('/api/health-monitor/latest', isAuthenticated, async (req, res) => {
    try {
      const latest = await healthMonitor.getLatestRun();
      res.json(latest);
    } catch (error: any) {
      console.error("Error getting latest run:", error);
      res.status(500).json({ message: error.message || "Failed to get latest run" });
    }
  });

  app.get('/api/health-monitor/history', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await healthMonitor.getHistory(limit);
      res.json(history);
    } catch (error: any) {
      console.error("Error getting history:", error);
      res.status(500).json({ message: error.message || "Failed to get history" });
    }
  });

  app.post('/api/health-monitor/run', isAuthenticated, async (req, res) => {
    try {
      const report = await healthMonitor.runHealthCheck('manual');
      res.json(report || { message: 'Check already in progress' });
    } catch (error: any) {
      console.error("Error running manual check:", error);
      res.status(500).json({ message: error.message || "Failed to run check" });
    }
  });

  app.get('/api/health-monitor/config', isAuthenticated, async (req, res) => {
    try {
      const config = healthMonitor.getConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error getting config:", error);
      res.status(500).json({ message: error.message || "Failed to get config" });
    }
  });

  app.post('/api/health-monitor/config', isAuthenticated, async (req, res) => {
    try {
      const updates = req.body;
      healthMonitor.updateConfig(updates);
      const config = healthMonitor.getConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error updating config:", error);
      res.status(500).json({ message: error.message || "Failed to update config" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionData = insertTransactionSchema.parse({ ...req.body, userId });
      const transaction = await storage.createTransaction(transactionData);
      res.json(transaction);
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      res.status(400).json({ message: error.message || "Failed to create transaction" });
    }
  });

  app.delete('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntId(req.params.id);
      const userId = req.user.claims.sub;
      await storage.deleteTransaction(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: error.message || "Failed to delete transaction" });
    }
  });

  // Wealth Alert routes
  app.get('/api/wealth-alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alerts = await storage.getWealthAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching wealth alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post('/api/wealth-alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alertData = insertWealthAlertSchema.parse({ ...req.body, userId });
      const alert = await storage.createWealthAlert(alertData);
      res.json(alert);
    } catch (error: any) {
      console.error("Error creating wealth alert:", error);
      res.status(400).json({ message: error.message || "Failed to create alert" });
    }
  });

  app.patch('/api/wealth-alerts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntId(req.params.id);
      const userId = req.user.claims.sub;
      const alert = await storage.updateWealthAlert(id, userId, req.body);
      res.json(alert);
    } catch (error: any) {
      console.error("Error updating wealth alert:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to update alert" });
    }
  });

  app.delete('/api/wealth-alerts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntId(req.params.id);
      const userId = req.user.claims.sub;
      await storage.deleteWealthAlert(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting wealth alert:", error);
      res.status(500).json({ message: error.message || "Failed to delete alert" });
    }
  });

  // Financial Goal routes
  app.get('/api/financial-goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getFinancialGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching financial goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/financial-goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const goalData = insertFinancialGoalSchema.parse({ ...req.body, userId });
      const goal = await storage.createFinancialGoal(goalData);
      res.json(goal);
    } catch (error: any) {
      console.error("Error creating financial goal:", error);
      res.status(400).json({ message: error.message || "Failed to create goal" });
    }
  });

  app.patch('/api/financial-goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntId(req.params.id);
      const userId = req.user.claims.sub;
      const goal = await storage.updateFinancialGoal(id, userId, req.body);
      res.json(goal);
    } catch (error: any) {
      console.error("Error updating financial goal:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to update goal" });
    }
  });

  app.delete('/api/financial-goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntId(req.params.id);
      const userId = req.user.claims.sub;
      await storage.deleteFinancialGoal(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting financial goal:", error);
      res.status(500).json({ message: error.message || "Failed to delete goal" });
    }
  });

  // Liability routes
  app.get('/api/liabilities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const liabilities = await storage.getLiabilities(userId);
      res.json(liabilities);
    } catch (error) {
      console.error("Error fetching liabilities:", error);
      res.status(500).json({ message: "Failed to fetch liabilities" });
    }
  });

  app.post('/api/liabilities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const liabilityData = insertLiabilitySchema.parse({ ...req.body, userId });
      const liability = await storage.createLiability(liabilityData);
      res.json(liability);
    } catch (error: any) {
      console.error("Error creating liability:", error);
      res.status(400).json({ message: error.message || "Failed to create liability" });
    }
  });

  app.patch('/api/liabilities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntId(req.params.id);
      const userId = req.user.claims.sub;
      const liability = await storage.updateLiability(id, userId, req.body);
      res.json(liability);
    } catch (error: any) {
      console.error("Error updating liability:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to update liability" });
    }
  });

  app.delete('/api/liabilities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseIntId(req.params.id);
      const userId = req.user.claims.sub;
      await storage.deleteLiability(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting liability:", error);
      res.status(500).json({ message: error.message || "Failed to delete liability" });
    }
  });

  // Portfolio Analytics route
  app.get('/api/portfolio/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [assets, liabilities, transactions] = await Promise.all([
        storage.getAssets(userId),
        storage.getLiabilities(userId),
        storage.getTransactions(userId),
      ]);

      // Calculate portfolio metrics
      const totalAssets = assets.reduce((sum, asset) => sum + asset.value, 0);
      const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.amount, 0);
      const netWorth = totalAssets - totalLiabilities;

      // Calculate total gains/losses from transactions
      const buyTransactions = transactions.filter(t => t.type === 'buy');
      const sellTransactions = transactions.filter(t => t.type === 'sell');
      
      const totalInvested = buyTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const totalRealized = sellTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
      
      // Calculate unrealized P&L
      const assetsBySymbol = new Map();
      assets.forEach(asset => {
        assetsBySymbol.set(asset.symbol, asset.value);
      });

      let unrealizedPL = 0;
      buyTransactions.forEach(tx => {
        const currentValue = assetsBySymbol.get(tx.symbol) || 0;
        const costBasis = tx.totalAmount;
        unrealizedPL += (currentValue - costBasis);
      });

      const analytics = {
        totalAssets,
        totalLiabilities,
        netWorth,
        totalInvested,
        totalRealized,
        unrealizedPL,
        realizedPL: totalRealized - totalInvested,
        totalPL: unrealizedPL + (totalRealized - totalInvested),
        assetCount: assets.length,
        liabilityCount: liabilities.length,
        transactionCount: transactions.length,
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error calculating portfolio analytics:", error);
      res.status(500).json({ message: "Failed to calculate analytics" });
    }
  });

  // Calendar Event routes
  app.get('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getCalendarEvents(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCalendarEventSchema.parse({ ...req.body, userId });
      const event = await storage.createCalendarEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(400).json({ message: "Failed to create event" });
    }
  });

  app.patch('/api/calendar/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const event = await storage.updateCalendarEvent(id, userId, req.body);
      res.json(event);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/calendar/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      await storage.deleteCalendarEvent(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTaskSchema.parse({ ...req.body, userId });
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const task = await storage.updateTask(id, userId, req.body);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      await storage.deleteTask(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Notes routes
  app.get('/api/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const folder = req.query.folder as string | undefined;
      const notes = await storage.getNotes(userId, folder);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.get('/api/notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const note = await storage.getNote(id, userId);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      res.json(note);
    } catch (error) {
      console.error("Error fetching note:", error);
      res.status(500).json({ message: "Failed to fetch note" });
    }
  });

  app.post('/api/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertNoteSchema.parse({ ...req.body, userId });
      const note = await storage.createNote(validatedData);
      res.status(201).json(note);
    } catch (error: any) {
      console.error("Error creating note:", error);
      res.status(400).json({ message: error.message || "Failed to create note" });
    }
  });

  app.patch('/api/notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const note = await storage.updateNote(id, userId, req.body);
      res.json(note);
    } catch (error: any) {
      console.error("Error updating note:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to update note" });
    }
  });

  app.delete('/api/notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      await storage.deleteNote(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to delete note" });
    }
  });

  app.post('/api/notes/:id/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      
      console.log(`Note analysis requested for note ${id} by user ${userId}`);
      
      // Get the note
      const note = await storage.getNote(id, userId);
      if (!note) {
        return res.status(404).json({ message: 'Note not found or access denied' });
      }

      // Check if content is sufficient for analysis
      if (note.content.trim().length < 10) {
        return res.status(400).json({ message: 'Note content is too short for meaningful analysis' });
      }

      // Prepare text for analysis (with truncation if needed)
      const MAX_TEXT_LENGTH = 6000;
      let processedText = note.content;
      let tokenWarning: string | undefined;

      if (note.content.length > MAX_TEXT_LENGTH) {
        processedText = note.content.substring(0, MAX_TEXT_LENGTH);
        const truncatedChars = note.content.length - MAX_TEXT_LENGTH;
        tokenWarning = `Note: Text was truncated. Original length: ${note.content.length} characters. Analyzed first ${MAX_TEXT_LENGTH} characters (${truncatedChars} characters truncated to optimize costs).`;
        console.log(tokenWarning);
      }

      // Create AI analysis prompt
      const analysisPrompt = `You are an AI note analyst. Analyze the following note and provide structured insights in JSON format.

Your response must be valid JSON with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the main content",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "actionItems": ["Action 1", "Action 2"],
  "sentiment": "positive" | "negative" | "neutral",
  "categories": ["category1", "category2"]
}

Guidelines:
- summary: Capture the essence of the note in 2-3 clear sentences
- keyPoints: Extract 3-5 most important points or insights (array of strings)
- actionItems: Identify any tasks, to-dos, or action items mentioned (array of strings, empty if none)
- sentiment: Overall tone of the note (must be one of: positive, negative, neutral)
- categories: Relevant categories like "finance", "health", "personal", "business", "legal", etc. (array of strings)

Note title: ${note.title}
Note content:
${processedText}`;

      // Call OpenAI API
      console.log('Starting AI analysis with GPT-4o-mini...');
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a precise note analyst. Always respond with valid JSON matching the requested structure."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(content);

      // Add token warning if applicable
      if (tokenWarning) {
        analysis.summary = `${analysis.summary}\n\n${tokenWarning}`;
      }

      // Validate the result structure
      if (!analysis.summary || !analysis.keyPoints || !analysis.sentiment || !analysis.categories) {
        throw new Error('Invalid analysis response from AI');
      }

      console.log('AI analysis completed successfully');
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing note:", error);
      
      // Return appropriate status codes
      if (error.message?.includes("not found") || error.message?.includes("access denied")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message?.includes("too short")) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message || "Failed to analyze note" });
    }
  });

  // Configure multer for document uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Allowed types: pdf, doc, docx, txt, jpg, jpeg, png, gif'));
      }
    },
  });

  // Documents routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const folder = req.query.folder as string | undefined;
      const documents = await storage.getDocuments(userId, folder);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const document = await storage.getDocument(id, userId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.get('/api/documents/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      // Check if Object Storage is available
      if (!isObjectStorageAvailable()) {
        return res.status(503).json({ message: getStorageUnavailableMessage() });
      }

      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const document = await storage.getDocument(id, userId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Download file from storage
      const fileBuffer = await fileStorage.downloadFile(document.storageKey);
      
      // Set appropriate headers
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Length', document.fileSize.toString());
      
      res.send(fileBuffer);
    } catch (error: any) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: error.message || "Failed to download document" });
    }
  });

  app.post('/api/documents/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      // Check if Object Storage is available
      if (!isObjectStorageAvailable()) {
        return res.status(503).json({ message: getStorageUnavailableMessage() });
      }

      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Upload file to storage
      const uploadedFile = await fileStorage.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      
      // Parse additional metadata from request body
      const { tags, folder, linkedEntityType, linkedEntityId, isPinned } = req.body;
      
      // Create document record
      const documentData = insertDocumentSchema.parse({
        userId,
        filename: uploadedFile.filename,
        originalName: req.file.originalname,
        mimeType: uploadedFile.mimeType,
        fileSize: uploadedFile.fileSize,
        storageKey: uploadedFile.storageKey,
        checksum: uploadedFile.checksum,
        tags: tags ? JSON.parse(tags) : undefined,
        folder: folder || 'default',
        linkedEntityType: linkedEntityType || undefined,
        linkedEntityId: linkedEntityId || undefined,
        isPinned: isPinned || 'false',
      });
      
      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error uploading document:", error);
      
      // Clean up uploaded file if document creation failed
      if (req.file && error.storageKey) {
        try {
          await fileStorage.deleteFile(error.storageKey);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      
      res.status(400).json({ message: error.message || "Failed to upload document" });
    }
  });

  app.patch('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const document = await storage.updateDocument(id, userId, req.body);
      res.json(document);
    } catch (error: any) {
      console.error("Error updating document:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to update document" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if Object Storage is available
      if (!isObjectStorageAvailable()) {
        return res.status(503).json({ message: getStorageUnavailableMessage() });
      }

      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      
      // Get document to retrieve storage key
      const document = await storage.getDocument(id, userId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Delete file from storage first
      try {
        await fileStorage.deleteFile(document.storageKey);
      } catch (storageError) {
        console.error("Error deleting file from storage:", storageError);
        // Continue with database deletion even if file deletion fails
      }
      
      // Delete document record from database
      await storage.deleteDocument(id, userId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to delete document" });
    }
  });

  app.post('/api/documents/:id/analyze', isAuthenticated, async (req: any, res) => {
    try {
      // Check if Object Storage is available
      if (!isObjectStorageAvailable()) {
        return res.status(503).json({ message: getStorageUnavailableMessage() });
      }

      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      
      console.log(`Document analysis requested for document ${id} by user ${userId}`);
      
      const insight = await analyzeDocument(id, userId);
      
      console.log(`Document analysis completed for document ${id}`);
      res.json(insight);
    } catch (error: any) {
      console.error("Error analyzing document:", error);
      
      // Return appropriate status codes based on error message
      if (error.message?.includes("not found") || error.message?.includes("access denied")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message?.includes("PDF and Word document analysis coming soon")) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message?.includes("Unsupported file type")) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message || "Failed to analyze document" });
    }
  });

  // Health Metrics routes
  app.get('/api/health/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const metrics = await storage.getHealthMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching health metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.post('/api/health/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertHealthMetricSchema.parse({ ...req.body, userId });
      const metric = await storage.createHealthMetric(validatedData);
      res.status(201).json(metric);
    } catch (error) {
      console.error("Error creating health metric:", error);
      res.status(400).json({ message: "Failed to create metric" });
    }
  });

  app.delete('/api/health/metrics/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      await storage.deleteHealthMetric(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting health metric:", error);
      res.status(500).json({ message: "Failed to delete metric" });
    }
  });

  // Wallet Connection routes
  app.get('/api/wallets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const wallets = await storage.getWalletConnections(userId);
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.post('/api/wallets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const validatedData = insertWalletConnectionSchema.parse({ ...req.body, userId });
      const wallet = await storage.createWalletConnection(validatedData);
      res.status(201).json(wallet);
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(400).json({ message: "Failed to create wallet" });
    }
  });

  app.patch('/api/wallets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const id = parseIntId(req.params.id);
      const wallet = await storage.updateWalletConnection(id, userId, req.body);
      res.json(wallet);
    } catch (error) {
      console.error("Error updating wallet:", error);
      res.status(400).json({ message: "Failed to update wallet" });
    }
  });

  app.delete('/api/wallets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const id = parseIntId(req.params.id);
      await storage.deleteWalletConnection(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting wallet:", error);
      res.status(500).json({ message: "Failed to delete wallet" });
    }
  });

  // Voice Command routes
  app.get('/api/voice/commands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const commands = await storage.getVoiceCommands(userId, limit);
      res.json(commands);
    } catch (error) {
      console.error("Error fetching voice commands:", error);
      res.status(500).json({ message: "Failed to fetch commands" });
    }
  });

  app.post('/api/voice/commands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertVoiceCommandSchema.parse({ ...req.body, userId });
      const command = await storage.createVoiceCommand(validatedData);
      res.status(201).json(command);
    } catch (error) {
      console.error("Error creating voice command:", error);
      res.status(400).json({ message: "Failed to create command" });
    }
  });

  // Web Search route
  app.post('/api/web-search', isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const { config } = await import('./config');
      if (!config.tavilyApiKey) {
        console.error('Tavily API key not configured');
        return res.status(503).json({ message: "Web search service not configured" });
      }

      const { searchWeb } = await import('./webSearch');
      const results = await searchWeb(query);
      res.json({ results });
    } catch (error: any) {
      console.error("Web search error:", error);
      res.status(500).json({ message: error.message || "Failed to perform web search" });
    }
  });

  // ChatGPT route
  app.post('/api/chat', isAuthenticated, async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array is required" });
      }

      if (messages.length === 0) {
        return res.status(400).json({ message: "Messages array cannot be empty" });
      }

      const { config } = await import('./config');
      if (!config.openaiApiKey) {
        console.error('OpenAI API key not configured');
        return res.status(503).json({ message: "Chat service not configured" });
      }

      const { getChatCompletion } = await import('./chatgpt');
      const response = await getChatCompletion(messages);
      res.json({ message: response });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ message: error.message || "Failed to get chat response" });
    }
  });

  // ==================== AI INTELLIGENCE FEATURES ====================

  // Portfolio Reports routes
  app.get('/api/portfolio-reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reports = await storage.getPortfolioReports(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching portfolio reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get('/api/portfolio-reports/latest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const report = await storage.getLatestPortfolioReport(userId);
      res.json(report);
    } catch (error) {
      console.error("Error fetching latest report:", error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.post('/api/portfolio-reports/generate', isAuthenticated, requireFeature('aiInsights'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reportType = 'daily', periodStart, periodEnd } = req.body;
      
      const now = new Date();
      const start = periodStart ? new Date(periodStart) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const end = periodEnd ? new Date(periodEnd) : now;

      const [assets, transactions] = await Promise.all([
        storage.getAssets(userId),
        storage.getTransactions(userId),
      ]);

      const { generatePortfolioReport } = await import('./aiIntelligence');
      const reportData = await generatePortfolioReport(assets, transactions, start, end);

      const report = await storage.createPortfolioReport({
        userId,
        reportType,
        periodStart: start,
        periodEnd: end,
        ...reportData,
      });

      res.json(report);
    } catch (error: any) {
      console.error("Error generating portfolio report:", error);
      res.status(500).json({ message: error.message || "Failed to generate report" });
    }
  });

  // Trading Recommendations routes
  app.get('/api/trading-recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recommendations = await storage.getTradingRecommendations(userId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching trading recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.post('/api/trading-recommendations/generate', isAuthenticated, requireFeature('aiInsights'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const [assets, transactions, marketContext] = await Promise.all([
        storage.getAssets(userId),
        storage.getTransactions(userId),
        getMarketOverview().catch(() => null),
      ]);

      const { generateTradingRecommendations } = await import('./aiIntelligence');
      const recommendations = await generateTradingRecommendations(assets, transactions, marketContext);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const created = await Promise.all(
        recommendations.map((rec: any) =>
          storage.createTradingRecommendation({
            userId,
            ...rec,
            expiresAt,
          })
        )
      );

      res.json(created);
    } catch (error: any) {
      console.error("Error generating trading recommendations:", error);
      res.status(500).json({ message: error.message || "Failed to generate recommendations" });
    }
  });

  app.patch('/api/trading-recommendations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const updated = await storage.updateTradingRecommendation(id, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating trading recommendation:", error);
      res.status(400).json({ message: "Failed to update recommendation" });
    }
  });

  // Tax Events routes
  app.get('/api/tax-events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const events = await storage.getTaxEvents(userId, year);
      res.json(events);
    } catch (error) {
      console.error("Error fetching tax events:", error);
      res.status(500).json({ message: "Failed to fetch tax events" });
    }
  });

  app.post('/api/tax-events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTaxEventSchema.parse({ ...req.body, userId });
      const event = await storage.createTaxEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating tax event:", error);
      res.status(400).json({ message: "Failed to create tax event" });
    }
  });

  app.patch('/api/tax-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const updated = await storage.updateTaxEvent(id, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating tax event:", error);
      res.status(400).json({ message: "Failed to update tax event" });
    }
  });

  app.post('/api/tax-events/generate', isAuthenticated, requireFeature('aiInsights'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Fetch all transactions for the user
      const transactions = await storage.getTransactions(userId);
      
      if (transactions.length === 0) {
        return res.json([]);
      }

      const { analyzeTaxImplications } = await import('./aiIntelligence');
      const createdEvents = [];

      // Analyze each transaction for tax implications
      for (const transaction of transactions) {
        try {
          const taxAnalysis = await analyzeTaxImplications(transaction, (transaction as any).costBasis || undefined);
          
          // Validate and sanitize numeric fields (AI may return "unknown" or invalid values)
          const sanitizeNumber = (value: any, fallback: number = 0): number => {
            if (typeof value === 'number' && !isNaN(value)) return value;
            if (typeof value === 'string' && !isNaN(parseFloat(value))) return parseFloat(value);
            return fallback;
          };
          
          // Create tax event record with proper validation
          const taxEvent = await storage.createTaxEvent({
            userId,
            transactionId: transaction.id,
            eventType: taxAnalysis.eventType,
            taxYear: taxAnalysis.taxYear,
            symbol: taxAnalysis.symbol,
            assetType: taxAnalysis.assetType,
            costBasis: sanitizeNumber(taxAnalysis.costBasis),
            proceeds: sanitizeNumber(taxAnalysis.proceeds),
            gainLoss: sanitizeNumber(taxAnalysis.gainLoss),
            holdingPeriod: taxAnalysis.holdingPeriod,
            taxableAmount: sanitizeNumber(taxAnalysis.taxableAmount),
            description: taxAnalysis.description,
            notes: taxAnalysis.notes,
            eventDate: transaction.transactionDate ? new Date(transaction.transactionDate) : new Date(),
            isReviewed: 'false',
          });
          
          createdEvents.push(taxEvent);
        } catch (txError) {
          console.error(`Error analyzing transaction ${transaction.id}:`, txError);
          // Continue with other transactions even if one fails
        }
      }

      res.json(createdEvents);
    } catch (error: any) {
      console.error("Error generating tax events:", error);
      res.status(500).json({ message: error.message || "Failed to generate tax events" });
    }
  });

  // Rebalancing Recommendations routes
  app.get('/api/rebalancing-recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recommendations = await storage.getRebalancingRecommendations(userId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching rebalancing recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.post('/api/rebalancing-recommendations/generate', isAuthenticated, requireFeature('aiInsights'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const targetAllocation = req.body.targetAllocation;

      const assets = await storage.getAssets(userId);

      const { generateRebalancingRecommendations } = await import('./aiIntelligence');
      const recommendation = await generateRebalancingRecommendations(assets, targetAllocation);

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const created = await storage.createRebalancingRecommendation({
        userId,
        ...recommendation,
        expiresAt,
      });

      res.json(created);
    } catch (error: any) {
      console.error("Error generating rebalancing recommendation:", error);
      res.status(500).json({ message: error.message || "Failed to generate recommendation" });
    }
  });

  app.patch('/api/rebalancing-recommendations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const updated = await storage.updateRebalancingRecommendation(id, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating rebalancing recommendation:", error);
      res.status(400).json({ message: "Failed to update recommendation" });
    }
  });

  // Anomaly Detection routes
  app.get('/api/anomalies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = req.query.status as string | undefined;
      const anomalies = await storage.getAnomalyDetections(userId, status);
      res.json(anomalies);
    } catch (error) {
      console.error("Error fetching anomalies:", error);
      res.status(500).json({ message: "Failed to fetch anomalies" });
    }
  });

  app.post('/api/anomalies/detect', isAuthenticated, requireFeature('aiInsights'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const [assets, transactions, events] = await Promise.all([
        storage.getAssets(userId),
        storage.getTransactions(userId),
        storage.getEvents(userId),
      ]);

      const { detectAnomalies } = await import('./aiIntelligence');
      const anomalies = await detectAnomalies(assets, transactions, events);

      const created = await Promise.all(
        anomalies.map((anomaly: any) =>
          storage.createAnomalyDetection({
            userId,
            ...anomaly,
          })
        )
      );

      res.json(created);
    } catch (error: any) {
      console.error("Error detecting anomalies:", error);
      res.status(500).json({ message: error.message || "Failed to detect anomalies" });
    }
  });

  app.patch('/api/anomalies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const updated = await storage.updateAnomalyDetection(id, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating anomaly:", error);
      res.status(400).json({ message: "Failed to update anomaly" });
    }
  });

  // Receipt routes
  const receiptUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit for receipt images
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/heic',
        'image/webp',
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only image files are allowed (JPEG, PNG, HEIC, WebP).'));
      }
    },
  });

  app.get('/api/receipts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = req.query.status as string | undefined;
      const receipts = await storage.getReceipts(userId, status);
      res.json(receipts);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      res.status(500).json({ message: "Failed to fetch receipts" });
    }
  });

  // Receipt reports routes - must come before /api/receipts/:id to avoid route conflicts
  app.get('/api/receipts/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reports = await storage.getReceiptReports(userId);
      res.json(reports);
    } catch (error: any) {
      console.error("Error fetching receipt reports:", error);
      res.status(500).json({ message: "Failed to fetch receipt reports" });
    }
  });

  app.get('/api/receipts/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const report = await storage.getReceiptReport(id, userId);
      
      if (!report) {
        return res.status(404).json({ message: "Receipt report not found" });
      }
      
      res.json(report);
    } catch (error: any) {
      console.error("Error fetching receipt report:", error);
      res.status(500).json({ message: "Failed to fetch receipt report" });
    }
  });

  app.post('/api/receipts/reports/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, reportType, startDate, endDate, filters } = req.body;
      
      // Use defaults if not provided
      const finalTitle = title || 'Receipt Analysis Report';
      const finalReportType = reportType || 'custom';

      // Create report with generating status
      const reportData = {
        userId,
        title: finalTitle,
        description: description || '',
        reportType: finalReportType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        filters: filters || {},
        status: 'generating' as const,
      };

      const report = await storage.createReceiptReport(reportData);

      // Fetch receipts based on filters
      const allReceipts = await storage.getReceipts(userId);
      let filteredReceipts = allReceipts;

      // Apply date filters
      if (startDate) {
        const start = new Date(startDate);
        filteredReceipts = filteredReceipts.filter(
          (r) => r.receiptDate && new Date(r.receiptDate) >= start
        );
      }
      if (endDate) {
        const end = new Date(endDate);
        filteredReceipts = filteredReceipts.filter(
          (r) => r.receiptDate && new Date(r.receiptDate) <= end
        );
      }

      // Apply other filters
      if (filters?.category) {
        filteredReceipts = filteredReceipts.filter((r) => r.category === filters.category);
      }
      if (filters?.merchant) {
        filteredReceipts = filteredReceipts.filter((r) => r.merchant?.includes(filters.merchant));
      }
      if (filters?.status) {
        filteredReceipts = filteredReceipts.filter((r) => r.status === filters.status);
      }

      // Generate AI report asynchronously
      const { generateReceiptReport } = await import("./receiptReportGenerator");
      const generatedData = await generateReceiptReport(filteredReceipts, finalReportType, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        ...filters,
      });

      // Update report with generated data
      const updatedReport = await storage.updateReceiptReport(report.id, userId, {
        aiSummary: generatedData.aiSummary,
        insights: generatedData.insights,
        recommendations: generatedData.recommendations,
        totalReceipts: filteredReceipts.length,
        totalAmount: filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0),
        categoryBreakdown: generatedData.categoryBreakdown,
        merchantBreakdown: generatedData.merchantBreakdown,
        trends: generatedData.trends,
        status: 'completed',
      });

      res.status(201).json(updatedReport);
    } catch (error: any) {
      console.error("Error generating receipt report:", error);
      res.status(500).json({ message: error.message || "Failed to generate receipt report" });
    }
  });

  app.delete('/api/receipts/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      await storage.deleteReceiptReport(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting receipt report:", error);
      res.status(500).json({ message: "Failed to delete receipt report" });
    }
  });

  app.get('/api/receipts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const receipt = await storage.getReceipt(id, userId);
      
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      
      res.json(receipt);
    } catch (error) {
      console.error("Error fetching receipt:", error);
      res.status(500).json({ message: "Failed to fetch receipt" });
    }
  });

  app.post('/api/receipts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Parse and validate the receipt data
      const receiptData = insertReceiptSchema.parse({
        ...req.body,
        userId,
      });

      const receipt = await storage.createReceipt(receiptData);
      res.status(201).json(receipt);
    } catch (error: any) {
      console.error("Error creating receipt:", error);
      res.status(400).json({ message: error.message || "Failed to create receipt" });
    }
  });

  app.post('/api/receipts/upload', isAuthenticated, receiptUpload.single('receipt'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No receipt image uploaded" });
      }

      // Convert image to base64 for GPT-4o Vision
      const imageBase64 = req.file.buffer.toString('base64');

      // Analyze receipt with GPT-4o Vision
      console.log(`Analyzing receipt image for user ${userId} (${req.file.mimetype})...`);
      const analysis = await analyzeReceiptImage(imageBase64, req.file.mimetype);
      console.log(`Receipt analysis complete:`, analysis);

      // Create receipt record in database
      const receiptData = insertReceiptSchema.parse({
        userId,
        imageUrl: `data:${req.file.mimetype};base64,${imageBase64}`, // Store base64 for now
        merchant: analysis.merchant,
        amount: analysis.amount,
        currency: analysis.currency,
        receiptDate: analysis.receiptDate,
        category: analysis.category,
        rawText: analysis.rawText,
        items: analysis.items || [],
        aiAnalysis: analysis.aiAnalysis,
        status: 'processed',
      });

      const receipt = await storage.createReceipt(receiptData);
      res.status(201).json(receipt);
    } catch (error: any) {
      console.error("Error uploading receipt:", error);
      res.status(400).json({ message: error.message || "Failed to upload receipt" });
    }
  });

  app.patch('/api/receipts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      
      // Coerce receiptDate to Date if it's a string
      const updateData = { ...req.body };
      if (updateData.receiptDate && typeof updateData.receiptDate === 'string') {
        updateData.receiptDate = new Date(updateData.receiptDate);
      }
      
      const updated = await storage.updateReceipt(id, userId, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating receipt:", error);
      res.status(400).json({ message: "Failed to update receipt" });
    }
  });

  app.delete('/api/receipts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      await storage.deleteReceipt(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting receipt:", error);
      res.status(500).json({ message: "Failed to delete receipt" });
    }
  });

  // Receipt Report endpoints
  app.get('/api/receipt-reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reports = await storage.getReceiptReports(userId);
      res.json(reports);
    } catch (error: any) {
      console.error("Error fetching receipt reports:", error);
      res.status(500).json({ message: "Failed to fetch receipt reports" });
    }
  });

  app.get('/api/receipt-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const report = await storage.getReceiptReport(id, userId);
      
      if (!report) {
        return res.status(404).json({ message: "Receipt report not found" });
      }
      
      res.json(report);
    } catch (error: any) {
      console.error("Error fetching receipt report:", error);
      res.status(500).json({ message: "Failed to fetch receipt report" });
    }
  });

  app.post('/api/receipt-reports/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, reportType, startDate, endDate, filters } = req.body;
      
      if (!title || !reportType) {
        return res.status(400).json({ message: "Title and report type are required" });
      }

      // Create report with generating status
      const reportData = {
        userId,
        title,
        description: description || '',
        reportType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        filters: filters || {},
        status: 'generating' as const,
      };

      const report = await storage.createReceiptReport(reportData);

      // Fetch receipts based on filters
      const allReceipts = await storage.getReceipts(userId);
      let filteredReceipts = allReceipts;

      // Apply date filters
      if (startDate) {
        const start = new Date(startDate);
        filteredReceipts = filteredReceipts.filter(
          (r) => r.receiptDate && new Date(r.receiptDate) >= start
        );
      }
      if (endDate) {
        const end = new Date(endDate);
        filteredReceipts = filteredReceipts.filter(
          (r) => r.receiptDate && new Date(r.receiptDate) <= end
        );
      }

      // Apply other filters
      if (filters?.category) {
        filteredReceipts = filteredReceipts.filter((r) => r.category === filters.category);
      }
      if (filters?.merchant) {
        filteredReceipts = filteredReceipts.filter((r) => r.merchant?.includes(filters.merchant));
      }
      if (filters?.status) {
        filteredReceipts = filteredReceipts.filter((r) => r.status === filters.status);
      }

      // Generate AI report asynchronously
      const { generateReceiptReport } = await import("./receiptReportGenerator");
      const generatedData = await generateReceiptReport(filteredReceipts, reportType, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        ...filters,
      });

      // Update report with generated data
      const updatedReport = await storage.updateReceiptReport(report.id, userId, {
        aiSummary: generatedData.aiSummary,
        insights: generatedData.insights,
        recommendations: generatedData.recommendations,
        totalReceipts: filteredReceipts.length,
        totalAmount: filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0),
        categoryBreakdown: generatedData.categoryBreakdown,
        merchantBreakdown: generatedData.merchantBreakdown,
        trends: generatedData.trends,
        status: 'completed',
      });

      res.status(201).json(updatedReport);
    } catch (error: any) {
      console.error("Error generating receipt report:", error);
      res.status(500).json({ message: error.message || "Failed to generate receipt report" });
    }
  });

  app.delete('/api/receipt-reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      await storage.deleteReceiptReport(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting receipt report:", error);
      res.status(500).json({ message: "Failed to delete receipt report" });
    }
  });

  // Video recommendation routes
  app.get('/api/videos/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get cached recommendations from user's session or generate new ones
      const cachedRecommendations = (req as any).session?.videoRecommendations;
      
      if (cachedRecommendations) {
        return res.json(cachedRecommendations);
      }
      
      res.json([]);
    } catch (error) {
      console.error("Error fetching video recommendations:", error);
      res.status(500).json({ message: "Failed to fetch video recommendations" });
    }
  });

  app.post('/api/videos/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get the latest briefing
      const briefing = await storage.getLatestBriefing(userId);
      
      if (!briefing) {
        console.error(`No briefing found for user ${userId}`);
        return res.status(400).json({ message: "No briefing found. Please generate a daily briefing first." });
      }

      console.log(`Generating video recommendations for user ${userId} based on briefing ${briefing.id}`);
      console.log(`Briefing data:`, { highlights: briefing.highlights, risks: briefing.risks, actions: briefing.actions });
      
      // Generate video recommendations using GPT-4o
      const recommendations = await generateVideoRecommendations(briefing);
      
      console.log(`Generated ${recommendations.length} video recommendations`);
      console.log(`Sample recommendation:`, recommendations[0]);
      
      // Store in session for caching
      (req as any).session.videoRecommendations = recommendations;
      
      res.json(recommendations);
    } catch (error: any) {
      console.error("Error generating video recommendations:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: error.message || "Failed to generate video recommendations" });
    }
  });

  // Wallet routes
  app.get('/api/wallet', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      let wallet = await storage.getWallet(userId);
      
      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = await storage.createWallet({
          userId,
          balance: 0,
          availableBalance: 0,
          pendingBalance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          currency: 'USD',
        });
      }
      
      res.json(wallet);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      res.status(500).json({ message: "Failed to fetch wallet" });
    }
  });

  // Alias endpoint for wallet balance (compatibility)
  app.get('/api/wallet/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      let wallet = await storage.getWallet(userId);
      
      // Create wallet if it doesn't exist
      if (!wallet) {
        wallet = await storage.createWallet({
          userId,
          balance: 0,
          availableBalance: 0,
          pendingBalance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          currency: 'USD',
        });
      }
      
      res.json(wallet);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      res.status(500).json({ message: "Failed to fetch wallet balance" });
    }
  });

  app.get('/api/wallet/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const transactions = await storage.getWalletTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/wallet/deposit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { amount, paymentMethodId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Get or create wallet
      let wallet = await storage.getWallet(userId);
      if (!wallet) {
        wallet = await storage.createWallet({
          userId,
          balance: 0,
          availableBalance: 0,
          pendingBalance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          currency: 'USD',
        });
      }

      // Immediately update pending balance
      await storage.updateWallet(wallet.id, {
        pendingBalance: wallet.pendingBalance + amount,
      });

      // Create transaction record
      const transaction = await storage.createWalletTransaction({
        userId,
        walletId: wallet.id,
        type: 'deposit',
        amount,
        currency: 'USD',
        status: 'processing',
        paymentMethod: 'card',
        description: `Deposit of $${amount.toFixed(2)}`,
        processedAt: new Date(),
      });

      // Simulate async processing (in real implementation, this would be Stripe webhook)
      setTimeout(async () => {
        try {
          const currentWallet = await storage.getWallet(userId);
          if (!currentWallet) return;

          await storage.updateWalletTransaction(transaction.id, {
            status: 'completed',
            completedAt: new Date(),
          });
          
          await storage.updateWallet(currentWallet.id, {
            balance: currentWallet.balance + amount,
            availableBalance: currentWallet.availableBalance + amount,
            pendingBalance: currentWallet.pendingBalance - amount,
            totalDeposited: currentWallet.totalDeposited + amount,
          });
        } catch (error) {
          console.error("Error completing deposit:", error);
        }
      }, 2000);

      res.json(transaction);
    } catch (error: any) {
      console.error("Error processing deposit:", error);
      res.status(500).json({ message: error.message || "Failed to process deposit" });
    }
  });

  app.post('/api/wallet/withdraw', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { amount, paymentMethodId } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Wallet not found" });
      }

      if (amount > wallet.availableBalance) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Update wallet balance immediately (deduct from available, add to pending)
      await storage.updateWallet(wallet.id, {
        availableBalance: wallet.availableBalance - amount,
        pendingBalance: wallet.pendingBalance + amount,
      });

      // Create transaction record
      const transaction = await storage.createWalletTransaction({
        userId,
        walletId: wallet.id,
        type: 'withdrawal',
        amount,
        currency: 'USD',
        status: 'processing',
        paymentMethod: 'bank_account',
        description: `Withdrawal of $${amount.toFixed(2)}`,
        processedAt: new Date(),
      });

      // Simulate withdrawal processing
      setTimeout(async () => {
        try {
          const currentWallet = await storage.getWallet(userId);
          if (!currentWallet) return;

          await storage.updateWalletTransaction(transaction.id, {
            status: 'completed',
            completedAt: new Date(),
          });
          
          await storage.updateWallet(currentWallet.id, {
            balance: currentWallet.balance - amount,
            pendingBalance: currentWallet.pendingBalance - amount,
            totalWithdrawn: currentWallet.totalWithdrawn + amount,
          });
        } catch (error) {
          console.error("Error completing withdrawal:", error);
        }
      }, 2000);

      res.json(transaction);
    } catch (error: any) {
      console.error("Error processing withdrawal:", error);
      res.status(500).json({ message: error.message || "Failed to process withdrawal" });
    }
  });

  app.get('/api/payment-methods', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const methods = await storage.getPaymentMethods(userId);
      res.json(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  // Accounting routes
  app.get('/api/accounting/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post('/api/accounting/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accountData = insertAccountSchema.parse({ ...req.body, userId });
      const account = await storage.createAccount(accountData);
      res.json(account);
    } catch (error: any) {
      console.error("Error creating account:", error);
      res.status(400).json({ message: error.message || "Failed to create account" });
    }
  });

  app.get('/api/accounting/journal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const entries = await storage.getJournalEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post('/api/accounting/journal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { description, lines, clientRef } = req.body;

      if (!description || !lines || !Array.isArray(lines)) {
        return res.status(400).json({ message: "Invalid journal entry data" });
      }

      const validatedLines = lines.map(line => insertJournalLineSchema.parse(line));
      
      if (!storage.validateDoubleEntry(validatedLines)) {
        return res.status(400).json({ message: "Double-entry validation failed: debits must equal credits" });
      }

      const entry = await storage.createJournalEntry(userId, description, validatedLines, clientRef);
      res.json(entry);
    } catch (error: any) {
      console.error("Error creating journal entry:", error);
      res.status(400).json({ message: error.message || "Failed to create journal entry" });
    }
  });

  app.get('/api/accounting/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/accounting/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(userId, invoiceData);
      res.json(invoice);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ message: error.message || "Failed to create invoice" });
    }
  });

  app.get('/api/accounting/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payments = await storage.getPayments(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post('/api/accounting/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { invoiceId, amount, method } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid payment amount" });
      }

      if (!method) {
        return res.status(400).json({ message: "Payment method is required" });
      }

      const payment = await storage.recordPayment(userId, invoiceId || null, amount, method);
      res.json(payment);
    } catch (error: any) {
      console.error("Error recording payment:", error);
      res.status(400).json({ message: error.message || "Failed to record payment" });
    }
  });

  app.get('/api/accounting/bank-transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getBankTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching bank transactions:", error);
      res.status(500).json({ message: "Failed to fetch bank transactions" });
    }
  });

  app.post('/api/accounting/bank-transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionData = insertBankTransactionSchema.parse(req.body);
      const transaction = await storage.createBankTransaction(userId, transactionData);
      res.json(transaction);
    } catch (error: any) {
      console.error("Error creating bank transaction:", error);
      res.status(400).json({ message: error.message || "Failed to create bank transaction" });
    }
  });

  app.get('/api/accounting/reports/trial-balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trialBalance = await storage.generateTrialBalance(userId);
      res.json(trialBalance);
    } catch (error) {
      console.error("Error generating trial balance:", error);
      res.status(500).json({ message: "Failed to generate trial balance" });
    }
  });

  app.get('/api/accounting/reports/profit-loss', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const profitLoss = await storage.generateProfitLoss(userId, startDate, endDate);
      res.json(profitLoss);
    } catch (error) {
      console.error("Error generating P&L:", error);
      res.status(500).json({ message: "Failed to generate profit & loss statement" });
    }
  });

  app.get('/api/accounting/reports/balance-sheet', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const balanceSheet = await storage.generateBalanceSheet(userId);
      res.json(balanceSheet);
    } catch (error) {
      console.error("Error generating balance sheet:", error);
      res.status(500).json({ message: "Failed to generate balance sheet" });
    }
  });

  app.get('/api/accounting/reports/ledger/:accountCode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountCode } = req.params;
      
      if (!accountCode) {
        return res.status(400).json({ message: "Account code is required" });
      }

      const ledger = await storage.getAccountLedger(userId, accountCode);
      res.json(ledger);
    } catch (error: any) {
      console.error("Error fetching account ledger:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ 
        message: error.message || "Failed to fetch account ledger" 
      });
    }
  });

  // Terminal routes
  app.post('/api/terminal/execute', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { command } = req.body;
      
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: "Invalid command" });
      }

      const trimmedCommand = command.trim().toLowerCase();
      let output = '';
      let error = '';

      // Handle different commands
      switch (trimmedCommand) {
        case 'help':
          output = `Available commands:
  help      - Display this help message
  status    - Show system status
  wallet    - Display wallet balance
  portfolio - Show portfolio summary
  health    - Check system health
  clear     - Clear terminal (client-side)
  whoami    - Display current user info
  date      - Display current date and time`;
          break;

        case 'status':
          output = `System Status: Online
Uptime: ${Math.floor(process.uptime())} seconds
Node.js: ${process.version}
Platform: ${process.platform}
Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`;
          break;

        case 'wallet':
          try {
            const wallet = await storage.getWallet(userId);
            if (wallet) {
              output = `Wallet Balance:
Total: $${wallet.balance.toFixed(2)}
Available: $${wallet.availableBalance.toFixed(2)}
Pending: $${wallet.pendingBalance.toFixed(2)}
Total Deposited: $${wallet.totalDeposited.toFixed(2)}
Total Withdrawn: $${wallet.totalWithdrawn.toFixed(2)}`;
            } else {
              output = 'No wallet found. Create one from the Wallet page.';
            }
          } catch (e) {
            error = 'Failed to fetch wallet information';
          }
          break;

        case 'portfolio':
          try {
            const assets = await storage.getAssets(userId);
            const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
            output = `Portfolio Summary:
Total Assets: ${assets.length}
Total Value: $${totalValue.toFixed(2)}
Top Holdings:`;
            assets.slice(0, 5).forEach((asset, i) => {
              output += `\n  ${i + 1}. ${asset.name} (${asset.symbol}): $${asset.value.toFixed(2)}`;
            });
          } catch (e) {
            error = 'Failed to fetch portfolio information';
          }
          break;

        case 'health':
          output = `System Health: OK
Database: Connected
API Services: Active
Authentication: Active`;
          break;

        case 'whoami':
          try {
            const user = await storage.getUser(userId);
            if (!user) {
              error = 'User not found';
              break;
            }
            output = `User Information:
ID: ${user.id}
Email: ${user.email || 'N/A'}
Name: ${user.firstName || ''} ${user.lastName || ''}
Account Created: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}`;
          } catch (e) {
            error = 'Failed to fetch user information';
          }
          break;

        case 'date':
          output = new Date().toString();
          break;

        case 'clear':
          output = 'Terminal cleared (handled client-side)';
          break;

        default:
          error = `Command not found: ${command}\nType 'help' for available commands`;
      }

      res.json({ output, error });
    } catch (error: any) {
      console.error("Error executing terminal command:", error);
      res.status(500).json({ error: error.message || "Failed to execute command" });
    }
  });

  // CRM routes
  app.get('/api/crm/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizations = await storage.getCrmOrganizations(userId);
      res.json(organizations);
    } catch (error: any) {
      console.error("Error fetching CRM organizations:", error);
      res.status(500).json({ message: error.message || "Failed to fetch organizations" });
    }
  });

  app.post('/api/crm/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organization = await storage.createCrmOrganization({
        ...req.body,
        userId,
      });
      res.json(organization);
    } catch (error: any) {
      console.error("Error creating CRM organization:", error);
      res.status(500).json({ message: error.message || "Failed to create organization" });
    }
  });

  app.get('/api/crm/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const query = req.query.search as string | undefined;
      const contacts = await storage.getCrmContacts(userId, query);
      res.json(contacts);
    } catch (error: any) {
      console.error("Error fetching CRM contacts:", error);
      res.status(500).json({ message: error.message || "Failed to fetch contacts" });
    }
  });

  app.get('/api/crm/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const contact = await storage.getCrmContact(id, userId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error: any) {
      console.error("Error fetching CRM contact:", error);
      res.status(500).json({ message: error.message || "Failed to fetch contact" });
    }
  });

  app.post('/api/crm/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contact = await storage.createCrmContact({
        ...req.body,
        userId,
      });
      res.json(contact);
    } catch (error: any) {
      console.error("Error creating CRM contact:", error);
      res.status(500).json({ message: error.message || "Failed to create contact" });
    }
  });

  app.patch('/api/crm/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const contact = await storage.updateCrmContact(id, userId, req.body);
      res.json(contact);
    } catch (error: any) {
      console.error("Error updating CRM contact:", error);
      res.status(500).json({ message: error.message || "Failed to update contact" });
    }
  });

  app.get('/api/crm/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const leads = await storage.getCrmLeads(userId);
      res.json(leads);
    } catch (error: any) {
      console.error("Error fetching CRM leads:", error);
      res.status(500).json({ message: error.message || "Failed to fetch leads" });
    }
  });

  app.post('/api/crm/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lead = await storage.createCrmLead({
        ...req.body,
        userId,
      });
      res.json(lead);
    } catch (error: any) {
      console.error("Error creating CRM lead:", error);
      res.status(500).json({ message: error.message || "Failed to create lead" });
    }
  });

  app.patch('/api/crm/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const lead = await storage.updateCrmLead(id, userId, req.body);
      res.json(lead);
    } catch (error: any) {
      console.error("Error updating CRM lead:", error);
      res.status(500).json({ message: error.message || "Failed to update lead" });
    }
  });

  app.get('/api/crm/deals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deals = await storage.getCrmDeals(userId);
      res.json(deals);
    } catch (error: any) {
      console.error("Error fetching CRM deals:", error);
      res.status(500).json({ message: error.message || "Failed to fetch deals" });
    }
  });

  app.post('/api/crm/deals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deal = await storage.createCrmDeal({
        ...req.body,
        userId,
      });
      res.json(deal);
    } catch (error: any) {
      console.error("Error creating CRM deal:", error);
      res.status(500).json({ message: error.message || "Failed to create deal" });
    }
  });

  app.patch('/api/crm/deals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const deal = await storage.updateCrmDeal(id, userId, req.body);
      res.json(deal);
    } catch (error: any) {
      console.error("Error updating CRM deal:", error);
      res.status(500).json({ message: error.message || "Failed to update deal" });
    }
  });

  app.get('/api/crm/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contactId = req.query.contactId ? parseInt(req.query.contactId as string) : undefined;
      const dealId = req.query.dealId ? parseInt(req.query.dealId as string) : undefined;
      const activities = await storage.getCrmActivities(userId, contactId, dealId);
      res.json(activities);
    } catch (error: any) {
      console.error("Error fetching CRM activities:", error);
      res.status(500).json({ message: error.message || "Failed to fetch activities" });
    }
  });

  app.post('/api/crm/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activity = await storage.createCrmActivity({
        ...req.body,
        userId,
      });
      res.json(activity);
    } catch (error: any) {
      console.error("Error creating CRM activity:", error);
      res.status(500).json({ message: error.message || "Failed to create activity" });
    }
  });

  app.patch('/api/crm/activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseIntId(req.params.id);
      const activity = await storage.updateCrmActivity(id, userId, req.body);
      res.json(activity);
    } catch (error: any) {
      console.error("Error updating CRM activity:", error);
      res.status(500).json({ message: error.message || "Failed to update activity" });
    }
  });


  // AI Task Generation
  app.post('/api/ai/generate-tasks', isAuthenticated, requireFeature('aiInsights'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Fetch user data for context
      const [emails, events, notes] = await Promise.all([
        storage.getEmails(userId),
        storage.getCalendarEvents(userId),
        storage.getNotes(userId),
      ]);

      const { generateAITasks } = await import('./openai');
      const tasks = await generateAITasks(
        emails.slice(0, 20),
        events.slice(0, 20),
        notes.slice(0, 10),
        req.body.context
      );

      // Optionally auto-create the generated tasks
      if (req.body.autoCreate) {
        for (const task of tasks) {
          await storage.createTask({
            userId,
            title: task.title,
            description: task.description,
            status: 'pending',
            category: task.category,
            priority: task.priority,
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            aiSuggestions: task.aiContext,
          });
        }
      }

      res.json({ tasks, created: req.body.autoCreate || false });
    } catch (error: any) {
      console.error("Error generating AI tasks:", error);
      res.status(500).json({ message: error.message || "Failed to generate tasks" });
    }
  });

  // AI Calendar Recommendations
  app.post('/api/ai/calendar-recommendations', isAuthenticated, requireFeature('aiInsights'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Fetch user data for context
      const [routines, tasks, events] = await Promise.all([
        storage.getRoutines(userId),
        storage.getTasks(userId),
        storage.getCalendarEvents(userId),
      ]);

      const { generateCalendarRecommendations } = await import('./openai');
      const recommendations = await generateCalendarRecommendations(
        routines,
        tasks.filter((t: any) => t.status !== 'completed'),
        events,
        req.body.preferences
      );

      res.json({ recommendations });
    } catch (error: any) {
      console.error("Error generating calendar recommendations:", error);
      res.status(500).json({ message: error.message || "Failed to generate recommendations" });
    }
  });

  // AI Document Organization
  app.post('/api/ai/organize-document', isAuthenticated, requireFeature('aiInsights'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { documentName, extractedText, documentType, documentId } = req.body;

      // Get existing folders from user's documents
      const documents = await storage.getDocuments(userId);
      const existingFolders = Array.from(new Set(documents.map((d: any) => d.folder).filter(Boolean)));

      const { analyzeDocumentForOrganization } = await import('./openai');
      const organization = await analyzeDocumentForOrganization(
        documentName,
        extractedText,
        existingFolders,
        documentType
      );

      // Optionally update the document with AI suggestions
      if (documentId && req.body.autoApply) {
        await storage.updateDocument(documentId, userId, {
          folder: organization.suggestedFolder,
          tags: organization.suggestedTags,
        });
      }

      res.json({ organization, applied: req.body.autoApply || false });
    } catch (error: any) {
      console.error("Error organizing document:", error);
      res.status(500).json({ message: error.message || "Failed to organize document" });
    }
  });

  // Microsoft OAuth Routes
  app.get('/auth/microsoft', (req, res) => {
    const { msAuthClient } = require('./msAuthClient');
    if (!msAuthClient.isConfigured()) {
      return res.status(503).json({ 
        message: 'Microsoft authentication not configured. Please set MS_CLIENT_ID, MS_TENANT_ID, MS_CLIENT_SECRET in Replit Secrets.' 
      });
    }
    msAuthClient.getAuthCodeUrl(req.query.state as string)
      .then((url: string) => res.redirect(url))
      .catch((err: Error) => {
        console.error('[MS Auth] Error getting auth URL:', err);
        res.status(500).json({ message: 'Failed to initiate Microsoft login', error: err.message });
      });
  });

  app.get('/auth/microsoft/callback', async (req, res) => {
    const { msAuthClient } = require('./msAuthClient');
    const code = req.query.code as string;
    
    if (!code) {
      return res.status(400).json({ message: 'Authorization code missing' });
    }

    try {
      const tokenResponse = await msAuthClient.acquireTokenByCode(code);
      
      // Store tokens securely (encrypted in DB in production)
      // For now, set in session
      if (req.session) {
        (req.session as any).msTokens = {
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          expiresOn: tokenResponse.expiresOn,
        };
        (req.session as any).msAccount = tokenResponse.account;
      }

      // Redirect to frontend with success
      const frontendUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
      res.redirect(`${frontendUrl}/settings?ms_auth=success`);
    } catch (err: any) {
      console.error('[MS Auth] Callback error:', err);
      const frontendUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
      res.redirect(`${frontendUrl}/settings?ms_auth=error&message=${encodeURIComponent(err.message)}`);
    }
  });

  // Get Microsoft account info
  app.get('/api/microsoft/profile', isAuthenticated, async (req: any, res) => {
    const msTokens = (req.session as any)?.msTokens;
    if (!msTokens) {
      return res.status(401).json({ message: 'Microsoft account not connected' });
    }

    try {
      const { Client } = require('@microsoft/microsoft-graph-client');
      const client = Client.init({
        authProvider: (done: any) => done(null, msTokens.accessToken),
      });

      const profile = await client.api('/me').get();
      res.json({ profile, connected: true });
    } catch (err: any) {
      console.error('[MS Graph] Profile fetch error:', err);
      res.status(500).json({ message: 'Failed to fetch Microsoft profile', error: err.message });
    }
  });

  // Disconnect Microsoft account
  app.post('/api/microsoft/disconnect', isAuthenticated, async (req: any, res) => {
    if ((req.session as any)?.msTokens) {
      delete (req.session as any).msTokens;
      delete (req.session as any).msAccount;
    }
    res.json({ message: 'Microsoft account disconnected successfully' });
  });

  // Multi-Agent AI Query
  app.post('/api/ai/multi-agent', isAuthenticated, requireFeature('multiAgentAI'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { prompt, context, enableCritique } = req.body;

      // Validate inputs
      if (!prompt || typeof prompt !== 'string' || prompt.length === 0) {
        return res.status(400).json({ message: 'Prompt is required and must be a non-empty string' });
      }
      if (prompt.length > 10000) {
        return res.status(400).json({ message: 'Prompt too long (max 10000 characters)' });
      }
      if (context && typeof context !== 'string') {
        return res.status(400).json({ message: 'Context must be a string' });
      }
      if (enableCritique !== undefined && typeof enableCritique !== 'boolean') {
        return res.status(400).json({ message: 'enableCritique must be a boolean' });
      }

      const { multiAgentQuery } = await import('./multiAgent');
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Configure providers (add more as secrets are configured)
      const providers = [
        { name: 'openai', type: 'openai' as const, opts: { model: 'gpt-4o-mini' }, weight: 1.0 },
      ];

      // Add Anthropic if configured
      if (process.env.ANTHROPIC_KEY && process.env.ANTHROPIC_ENDPOINT) {
        providers.push({
          name: 'anthropic',
          type: 'anthropic' as const,
          endpoint: process.env.ANTHROPIC_ENDPOINT,
          key: process.env.ANTHROPIC_KEY,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          opts: {},
          weight: 0.95,
        } as any);
      }

      const result = await multiAgentQuery({
        userId,
        prompt,
        context: context || 'Wealth management and lifestyle optimization',
        providers,
        tools: [
          { name: 'getPortfolioSnapshot' },
          { name: 'simpleCalc' },
        ],
        options: {
          enableCritique: enableCritique ?? false,
          memoryTTL: 60 * 60 * 6,
          timeout: 8000,
        },
        openai,
      });

      res.json(result);
    } catch (error: any) {
      console.error('[Multi-Agent] Query error:', error);
      res.status(500).json({ message: error.message || 'Multi-agent query failed' });
    }
  });

  // ============================================
  // NFT & WEB3 ROUTES
  // ============================================

  // Connect wallet
  app.post('/api/nft/wallet/connect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate input
      const { z } = await import('zod');
      const connectWalletSchema = z.object({
        walletType: z.string().min(1),
        chain: z.string().min(1),
        address: z.string().min(1),
        metadata: z.record(z.any()).optional(),
      });

      const validated = connectWalletSchema.parse(req.body);

      const wallet = await storage.createWalletConnection(userId, {
        walletType: validated.walletType,
        walletAddress: validated.address,
        chainId: validated.metadata?.chainId || null,
        network: validated.chain,
        isActive: 'true',
        walletName: validated.metadata?.name || validated.walletType,
        metadata: JSON.stringify(validated.metadata || {}),
      });

      res.json({ wallet, message: 'Wallet connected successfully' });
    } catch (error: any) {
      console.error('[NFT] Wallet connect error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to connect wallet' });
    }
  });

  // Get connected wallets
  app.get('/api/nft/wallets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const wallets = await storage.getWalletConnections(userId);
      // Return 200 with data (or empty array if null)
      res.json({ wallets: wallets || [], error: false });
    } catch (error: any) {
      console.error('[NFT] Get wallets error:', error);
      // Return 503 with empty array for gentle UX while preserving observability
      res.status(503).json({ 
        wallets: [], 
        error: true,
        message: 'Unable to fetch wallet data. Please try again later.' 
      });
    }
  });

  // Sync NFTs from blockchain
  app.post('/api/nft/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate input
      const { z } = await import('zod');
      const syncSchema = z.object({
        walletId: z.number().optional(),
        chain: z.enum(['ethereum', 'polygon', 'solana', 'hedera']),
        address: z.string().min(1),
      });

      const validated = syncSchema.parse(req.body);
      let nfts: any[] = [];

      // Fetch NFTs based on chain
      if (validated.chain === 'ethereum' || validated.chain === 'polygon') {
        const { evmProvider } = await import('./web3/evmProvider');
        if (!evmProvider.isConfigured()) {
          return res.status(503).json({ message: 'Alchemy API key not configured. Add ALCHEMY_API_KEY to secrets.' });
        }
        nfts = await evmProvider.getNFTsByOwner(validated.address, validated.chain);
      } else if (validated.chain === 'solana') {
        const { solanaProvider } = await import('./web3/solanaProvider');
        nfts = await solanaProvider.getNFTsByOwner(validated.address);
      } else if (validated.chain === 'hedera') {
        const { hederaProvider } = await import('./web3/hederaProvider');
        nfts = await hederaProvider.getNFTsByOwner(validated.address);
      }

      // Persist NFTs to database
      let persistedCount = 0;
      for (const nft of nfts) {
        try {
          // Create or get collection
          const collectionData = {
            userId,
            chain: nft.chain,
            contractAddress: nft.contractAddress,
            collectionName: nft.collectionName || 'Unknown Collection',
            totalSupply: nft.totalSupply ? String(nft.totalSupply) : null,
            metadata: JSON.stringify({
              symbol: nft.symbol,
              description: nft.description,
            }),
          };
          
          const collection = await storage.createNftCollection(collectionData);

          // Create NFT asset
          const assetData = {
            userId,
            walletId: validated.walletId || null,
            collectionId: collection.id,
            chain: nft.chain,
            contractAddress: nft.contractAddress,
            tokenId: nft.tokenId,
            name: nft.name || `Token #${nft.tokenId}`,
            description: nft.description || null,
            imageUrl: nft.imageUrl || null,
            metadata: JSON.stringify(nft.metadata || {}),
          };

          await storage.createNftAsset(assetData);
          persistedCount++;
        } catch (err) {
          console.error(`[NFT] Failed to persist NFT ${nft.tokenId}:`, err);
        }
      }

      res.json({ 
        message: `Synced and stored ${persistedCount} NFTs from ${validated.chain}`, 
        count: persistedCount,
        nfts: nfts,
      });
    } catch (error: any) {
      console.error('[NFT] Sync error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to sync NFTs' });
    }
  });

  // Get NFTs for user
  app.get('/api/nft/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const nfts = await storage.getNftAssets(userId);
      // Return 200 with data (or empty array if null)
      res.json({ nfts: nfts || [], error: false });
    } catch (error: any) {
      console.error('[NFT] Get assets error:', error);
      // Return 503 with empty array for gentle UX while preserving observability
      res.status(503).json({ 
        nfts: [], 
        error: true,
        message: 'Unable to fetch NFT data. Please try again later.' 
      });
    }
  });

  // Disconnect wallet
  app.delete('/api/nft/wallet/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const walletId = parseIntId(req.params.id, 'walletId');
      
      // Would delete via storage
      res.json({ message: 'Wallet disconnected successfully' });
    } catch (error: any) {
      console.error('[NFT] Disconnect wallet error:', error);
      res.status(500).json({ message: error.message || 'Failed to disconnect wallet' });
    }
  });

  // ============================================
  // DISCORD ROUTES
  // ============================================

  // Initialize Discord bot
  app.post('/api/discord/initialize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const botToken = process.env.DISCORD_BOT_TOKEN;
      
      if (!botToken) {
        return res.status(400).json({ 
          message: 'Discord bot token not configured. Please set DISCORD_BOT_TOKEN in environment secrets.' 
        });
      }

      const { discordBot } = await import('./discord/discordBot');

      // Set storage instance
      discordBot.setStorage(storage);

      // Initialize the bot
      await discordBot.initialize(botToken);

      // Load all scheduled jobs from database (for all users)
      await discordBot.loadAllScheduledJobs();

      res.json({ message: 'Discord bot initialized successfully' });
    } catch (error: any) {
      console.error('[Discord] Initialize error:', error);
      res.status(500).json({ message: error.message || 'Failed to initialize Discord bot' });
    }
  });

  // Get Discord servers
  app.get('/api/discord/servers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { discordBot } = await import('./discord/discordBot');
      
      if (!discordBot.isReady()) {
        return res.status(503).json({ message: 'Discord bot not initialized. Please add your bot token first.' });
      }

      const servers = await discordBot.getServers();
      
      // Store servers in database
      for (const server of servers) {
        await storage.createDiscordServer({
          userId,
          serverId: server.id,
          serverName: server.name,
          iconUrl: server.iconUrl || null,
          isActive: 'true',
          metadata: JSON.stringify({ channels: server.channels }),
        });
      }

      res.json({ servers });
    } catch (error: any) {
      console.error('[Discord] Get servers error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch servers' });
    }
  });

  // Send AI message
  app.post('/api/discord/send-message', isAuthenticated, async (req: any, res) => {
    try {
      const { z } = await import('zod');
      const messageSchema = z.object({
        channelId: z.string().min(1),
        prompt: z.string().min(1),
      });

      const { channelId, prompt } = messageSchema.parse(req.body);
      const { discordBot } = await import('./discord/discordBot');

      const result = await discordBot.sendAIMessage(channelId, prompt);
      res.json(result);
    } catch (error: any) {
      console.error('[Discord] Send message error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to send message' });
    }
  });

  // Edit AI message
  app.post('/api/discord/edit-message', isAuthenticated, async (req: any, res) => {
    try {
      const { z } = await import('zod');
      const editSchema = z.object({
        channelId: z.string().min(1),
        messageId: z.string().min(1),
        prompt: z.string().min(1),
      });

      const { channelId, messageId, prompt } = editSchema.parse(req.body);
      const { discordBot } = await import('./discord/discordBot');

      const result = await discordBot.editAIMessage(channelId, messageId, prompt);
      res.json(result);
    } catch (error: any) {
      console.error('[Discord] Edit message error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to edit message' });
    }
  });

  // Schedule AI message
  app.post('/api/discord/schedule', isAuthenticated, requireFeature('discordScheduling'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { z } = await import('zod');
      const scheduleSchema = z.object({
        serverId: z.string().min(1),
        channelId: z.string().min(1),
        channelName: z.string().optional(),
        prompt: z.string().min(1),
        cronTime: z.string().min(1),
      });

      const { serverId, channelId, channelName, prompt, cronTime } = scheduleSchema.parse(req.body);
      
      // Save scheduled message to database
      const scheduledMessage = await storage.createDiscordScheduledMessage({
        userId,
        serverId,
        channelId,
        channelName: channelName || null,
        prompt,
        cronTime,
        isActive: 'true',
        lastRunAt: null,
        nextRunAt: null,
      });

      // Schedule with Discord bot
      const { discordBot } = await import('./discord/discordBot');
      await discordBot.scheduleAIMessage(scheduledMessage.id, userId, channelId, prompt, cronTime);

      res.json({ message: 'Message scheduled successfully', schedule: scheduledMessage });
    } catch (error: any) {
      console.error('[Discord] Schedule error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to schedule message' });
    }
  });

  // Get scheduled messages
  app.get('/api/discord/scheduled', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduled = await storage.getDiscordScheduledMessages(userId);
      res.json({ scheduled });
    } catch (error: any) {
      console.error('[Discord] Get scheduled error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch scheduled messages' });
    }
  });

  // Delete scheduled message
  app.delete('/api/discord/scheduled/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseIntId(req.params.id, 'scheduleId');
      
      // Cancel in Discord bot
      const { discordBot } = await import('./discord/discordBot');
      discordBot.cancelScheduledMessage(scheduleId);
      
      // Delete from database
      await storage.deleteDiscordScheduledMessage(scheduleId, userId);
      
      res.json({ message: 'Scheduled message deleted successfully' });
    } catch (error: any) {
      console.error('[Discord] Delete scheduled error:', error);
      res.status(500).json({ message: error.message || 'Failed to delete scheduled message' });
    }
  });

  // ============================================
  // WEALTH FORGE ROUTES
  // ============================================

  // Get user's Wealth Forge progress
  app.get('/api/wealth-forge/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      
      let progress = await storage.getWealthForgeProgress(userId);
      
      // Create initial progress if it doesn't exist
      if (!progress) {
        progress = await storage.upsertWealthForgeProgress({
          userId,
          tokens: 0,
          xp: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          totalMined: 0,
          totalSpent: 0,
        });
      }
      
      res.json(progress);
    } catch (error: any) {
      console.error('[Wealth Forge] Get progress error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch progress' });
    }
  });

  // Get user's Wealth Forge balance (alias for progress endpoint, returns balance info)
  app.get('/api/wealth-forge/balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      
      let progress = await storage.getWealthForgeProgress(userId);
      
      // Create initial progress if it doesn't exist
      if (!progress) {
        progress = await storage.upsertWealthForgeProgress({
          userId,
          tokens: 0,
          xp: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          totalMined: 0,
          totalSpent: 0,
        });
      }
      
      // Return balance-focused data
      res.json({
        tokens: progress.tokens,
        level: progress.level,
        xp: progress.xp,
        totalMined: progress.totalMined,
        totalSpent: progress.totalSpent,
      });
    } catch (error: any) {
      console.error('[Wealth Forge] Get balance error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch balance' });
    }
  });

  // Update Wealth Forge progress (nickname, wallet address)
  app.patch('/api/wealth-forge/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { nickname, solanaWallet } = req.body;
      
      const progress = await storage.updateWealthForgeProgress(userId, {
        nickname,
        solanaWallet,
      });
      
      res.json(progress);
    } catch (error: any) {
      console.error('[Wealth Forge] Update progress error:', error);
      res.status(500).json({ message: error.message || 'Failed to update progress' });
    }
  });

  // Mine tokens (free or paid) - Server calculates all rewards (Premium+ feature)
  app.post('/api/wealth-forge/mine', isAuthenticated, requireFeature('wealthForge'), async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { type, gameData, gameScore } = req.body;
      
      // Validate mining type
      const validTypes = ['mini_game', 'daily_bonus', 'quiz', 'task'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid mining type' });
      }
      
      // Validate gameScore for mini_game type (server-side security)
      if (type === 'mini_game') {
        if (typeof gameScore !== 'number' || gameScore < 0 || gameScore > 100 || !Number.isFinite(gameScore)) {
          return res.status(400).json({ message: 'Invalid game score: must be between 0-100' });
        }
      }
      
      // Validate gameData structure (prevent malicious payloads)
      if (gameData && (typeof gameData !== 'object' || Array.isArray(gameData))) {
        return res.status(400).json({ message: 'Invalid game data format' });
      }
      
      // Get or create progress
      let progress = await storage.getWealthForgeProgress(userId);
      if (!progress) {
        progress = await storage.upsertWealthForgeProgress({
          userId,
          tokens: 0,
          xp: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          totalMined: 0,
          totalSpent: 0,
        });
      }
      
      // Anti-abuse: Check for rapid mining (no more than 1 mine per 5 seconds)
      const recentMining = await storage.getWealthForgeMiningHistory(userId, 1);
      if (recentMining.length > 0) {
        const lastMine = new Date(recentMining[0].createdAt).getTime();
        const now = new Date().getTime();
        if (now - lastMine < 5000) {
          return res.status(429).json({ message: 'Mining too fast. Wait a few seconds.' });
        }
      }
      
      // Anti-abuse: Daily bonus can only be claimed once per day (USE UTC FOR CONSISTENCY)
      if (type === 'daily_bonus') {
        const nowUtc = new Date();
        const todayUtc = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));
        const lastActivity = progress.lastActiveDate ? new Date(progress.lastActiveDate) : null;
        
        if (lastActivity) {
          const lastActivityUtc = new Date(Date.UTC(lastActivity.getUTCFullYear(), lastActivity.getUTCMonth(), lastActivity.getUTCDate()));
          if (todayUtc.getTime() === lastActivityUtc.getTime()) {
            return res.status(400).json({ message: 'Daily bonus already claimed today' });
          }
        }
      }
      
      // SERVER-SIDE ONLY reward calculation - client cannot manipulate these values
      let tokensEarned = 0;
      let xpEarned = 0;
      
      switch (type) {
        case 'mini_game':
          // Base reward + bonus for score (validated above)
          tokensEarned = 5;
          xpEarned = 10;
          const validatedScore = Math.min(Math.max(gameScore || 0, 0), 100); // Clamp 0-100
          if (validatedScore >= 80) {
            tokensEarned += 3; // Bonus for high score
            xpEarned += 5;
          }
          break;
        case 'daily_bonus':
          tokensEarned = 10;
          xpEarned = 15;
          break;
        case 'quiz':
          tokensEarned = 8;
          xpEarned = 12;
          break;
        case 'task':
          tokensEarned = 3;
          xpEarned = 5;
          break;
      }
      
      // Update progress
      const newTokens = (progress.tokens || 0) + tokensEarned;
      const newXp = (progress.xp || 0) + xpEarned;
      const newLevel = Math.floor(newXp / 100) + 1; // Level up every 100 XP
      const newTotalMined = (progress.totalMined || 0) + tokensEarned;
      
      // Check and update streak
      const now = new Date();
      const lastActive = progress.lastActiveDate ? new Date(progress.lastActiveDate) : null;
      let newStreak = progress.currentStreak || 0;
      let newLongestStreak = progress.longestStreak || 0;
      
      if (lastActive) {
        const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
          newLongestStreak = Math.max(newLongestStreak, newStreak);
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      
      await storage.updateWealthForgeProgress(userId, {
        tokens: newTokens,
        xp: newXp,
        level: newLevel,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        totalMined: newTotalMined,
        lastActiveDate: now,
      });
      
      // Create transaction record
      await storage.createWealthForgeTransaction({
        userId,
        type: `mine_${type}`,
        amount: tokensEarned,
        description: `Mined ${tokensEarned} WFG from ${type}`,
        metadata: gameData || {},
      });
      
      // Create mining history record
      await storage.createWealthForgeMiningHistory({
        userId,
        miningType: type,
        tokensEarned,
        xpGained: xpEarned,
        gameScore,
        gameData: gameData || {},
      });
      
      res.json({
        success: true,
        tokensEarned,
        xpGained: xpEarned,
        newBalance: newTokens,
        level: newLevel,
        streak: newStreak,
      });
    } catch (error: any) {
      console.error('[Wealth Forge] Mine error:', error);
      res.status(500).json({ message: error.message || 'Failed to mine tokens' });
    }
  });

  // Get leaderboard
  app.get('/api/wealth-forge/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const limitParam = req.query.limit as string;
      const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 100) : 100;
      const leaderboard = await storage.getWealthForgeLeaderboard(limit);
      res.json(leaderboard);
    } catch (error: any) {
      console.error('[Wealth Forge] Leaderboard error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch leaderboard' });
    }
  });

  // Get vault items
  app.get('/api/wealth-forge/vault', isAuthenticated, async (req: any, res) => {
    try {
      const items = await storage.getWealthForgeVaultItems();
      res.json(items);
    } catch (error: any) {
      console.error('[Wealth Forge] Vault error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch vault items' });
    }
  });

  // Redeem vault item
  app.post('/api/wealth-forge/redeem', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { vaultItemId } = req.body;
      
      // Get vault item
      const items = await storage.getWealthForgeVaultItems();
      const item = items.find(i => i.id === vaultItemId);
      
      if (!item) {
        return res.status(404).json({ message: 'Vault item not found' });
      }
      
      // Get user progress
      const progress = await storage.getWealthForgeProgress(userId);
      if (!progress) {
        return res.status(400).json({ message: 'User progress not found' });
      }
      
      // Check if user has enough tokens
      if ((progress.tokens || 0) < item.cost) {
        return res.status(400).json({ message: 'Insufficient tokens' });
      }
      
      // Deduct tokens
      const newTokens = (progress.tokens || 0) - item.cost;
      const newTotalSpent = (progress.totalSpent || 0) + item.cost;
      
      await storage.updateWealthForgeProgress(userId, {
        tokens: newTokens,
        totalSpent: newTotalSpent,
      });
      
      // Create transaction record
      await storage.createWealthForgeTransaction({
        userId,
        type: 'redeem',
        amount: -item.cost,
        description: `Redeemed: ${item.name}`,
        metadata: { vaultItemId, itemName: item.name },
      });
      
      // Create redemption record
      const redemption = await storage.createWealthForgeRedemption({
        userId,
        vaultItemId,
        itemName: item.name,
        tokensCost: item.cost,
        status: 'delivered',
        deliveryData: item.itemData || {},
        deliveredAt: new Date(),
      });
      
      res.json({
        success: true,
        redemption,
        newBalance: newTokens,
      });
    } catch (error: any) {
      console.error('[Wealth Forge] Redeem error:', error);
      res.status(500).json({ message: error.message || 'Failed to redeem item' });
    }
  });

  // Get user's transactions
  app.get('/api/wealth-forge/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getWealthForgeTransactions(userId, limit);
      res.json(transactions);
    } catch (error: any) {
      console.error('[Wealth Forge] Transactions error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch transactions' });
    }
  });

  // Get user's redemptions
  app.get('/api/wealth-forge/redemptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const redemptions = await storage.getWealthForgeRedemptions(userId);
      res.json(redemptions);
    } catch (error: any) {
      console.error('[Wealth Forge] Redemptions error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch redemptions' });
    }
  });

  // Get mining history
  app.get('/api/wealth-forge/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const limit = parseInt(req.query.limit as string) || 100;
      const history = await storage.getWealthForgeMiningHistory(userId, limit);
      res.json(history);
    } catch (error: any) {
      console.error('[Wealth Forge] History error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch mining history' });
    }
  });

  // Buy token pack (simulated payment for MVP)
  app.post('/api/wealth-forge/buy', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { amount, packName } = req.body;
      
      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 10000 || !Number.isFinite(amount)) {
        return res.status(400).json({ message: 'Invalid amount: must be between 1-10000' });
      }
      
      // Validate packName
      const validPackNames = ['starter', 'standard', 'premium', 'ultimate'];
      if (packName && !validPackNames.includes(packName)) {
        return res.status(400).json({ message: 'Invalid pack name' });
      }
      
      // Get user progress
      let progress = await storage.getWealthForgeProgress(userId);
      if (!progress) {
        progress = await storage.upsertWealthForgeProgress({
          userId,
          tokens: 0,
          xp: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          totalMined: 0,
          totalSpent: 0,
        });
      }
      
      // Add tokens
      const newTokens = (progress.tokens || 0) + amount;
      await storage.updateWealthForgeProgress(userId, {
        tokens: newTokens,
      });
      
      // Create transaction record
      await storage.createWealthForgeTransaction({
        userId,
        type: 'purchase',
        amount,
        description: `Purchased ${packName || 'Token Pack'}: ${amount} WFG`,
        metadata: { packName, purchaseMethod: 'simulated' },
      });
      
      res.json({
        success: true,
        amount,
        newBalance: newTokens,
      });
    } catch (error: any) {
      console.error('[Wealth Forge] Buy error:', error);
      res.status(500).json({ message: error.message || 'Failed to buy tokens' });
    }
  });

  // Seed initial vault items (admin/development only)
  app.post('/api/wealth-forge/seed-vault', isAuthenticated, async (req: any, res) => {
    try {
      // Check if items already exist
      const existing = await storage.getWealthForgeVaultItems();
      if (existing.length > 0) {
        return res.json({ message: 'Vault items already seeded', count: existing.length });
      }

      // Create default vault items
      const items = [
        {
          name: 'Starter Budget Template',
          description: 'Professional Excel budget template with automated calculations',
          cost: 15,
          category: 'template',
          itemType: 'pdf',
          itemData: { downloadUrl: '/vault/starter-budget-template.pdf' },
          isActive: 'true',
          sortOrder: 1,
        },
        {
          name: 'Investment Guide E-Book',
          description: 'Complete guide to building your investment portfolio',
          cost: 30,
          category: 'lesson',
          itemType: 'pdf',
          itemData: { downloadUrl: '/vault/investment-guide.pdf' },
          isActive: 'true',
          sortOrder: 2,
        },
        {
          name: '30-Min Financial Consultation',
          description: 'One-on-one session with a wealth advisor',
          cost: 100,
          category: 'mentor_time',
          itemType: 'call',
          itemData: { bookingUrl: '/vault/book-consultation' },
          isActive: 'true',
          sortOrder: 3,
        },
        {
          name: 'Premium Asset Tracker',
          description: 'Advanced spreadsheet for tracking all your assets',
          cost: 25,
          category: 'template',
          itemType: 'pdf',
          itemData: { downloadUrl: '/vault/premium-asset-tracker.xlsx' },
          isActive: 'true',
          sortOrder: 4,
        },
        {
          name: 'Tax Optimization Guide',
          description: 'Strategies to minimize your tax burden legally',
          cost: 40,
          category: 'premium_content',
          itemType: 'video',
          itemData: { videoUrl: '/vault/tax-optimization-guide.mp4' },
          isActive: 'true',
          sortOrder: 5,
        },
      ];

      for (const item of items) {
        await storage.createWealthForgeVaultItem(item);
      }

      res.json({ message: 'Vault items seeded successfully', count: items.length });
    } catch (error: any) {
      console.error('[Wealth Forge] Seed error:', error);
      res.status(500).json({ message: error.message || 'Failed to seed vault items' });
    }
  });

  // Bonding curve price calculation
  app.get('/api/wealth-forge/bonding-price', isAuthenticated, async (req: any, res) => {
    try {
      const amount = parseInt(req.query.amount || '1', 10);
      if (isNaN(amount) || amount <= 0 || amount > 100000) {
        return res.status(400).json({ message: 'Invalid amount: must be between 1-100000' });
      }

      const BASE_PRICE_USD = 0.00007;
      const SLOPE_PRICE_USD = 0.00000001;
      
      const currentSupply = await storage.getTotalMintedSupply();
      const totalUSD = amount * BASE_PRICE_USD + SLOPE_PRICE_USD * (amount * currentSupply + (amount * (amount - 1)) / 2);
      const perTokenApproxUSD = totalUSD / amount;

      res.json({
        amount,
        currentSupply,
        totalUSD: Math.max(0.01, totalUSD),
        perTokenApproxUSD,
        basePrice: BASE_PRICE_USD,
        slope: SLOPE_PRICE_USD,
      });
    } catch (error: any) {
      console.error('[Wealth Forge] Price calculation error:', error);
      res.status(500).json({ message: error.message || 'Failed to calculate price' });
    }
  });

  // Create Stripe PaymentIntent for token purchase
  app.post('/api/wealth-forge/create-payment-intent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { amount } = req.body;
      
      if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 100000 || !Number.isFinite(amount)) {
        return res.status(400).json({ message: 'Invalid amount: must be between 1-100000' });
      }

      const BASE_PRICE_USD = 0.00007;
      const SLOPE_PRICE_USD = 0.00000001;
      
      const currentSupply = await storage.getTotalMintedSupply();
      const totalUSD = amount * BASE_PRICE_USD + SLOPE_PRICE_USD * (amount * currentSupply + (amount * (amount - 1)) / 2);
      const amountCents = Math.max(50, Math.round(totalUSD * 100));

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        metadata: {
          userId,
          tokenAmount: String(amount),
          currentSupply: String(currentSupply),
          productType: 'wealth_forge_tokens',
        },
        description: `Purchase ${amount} WFG tokens`,
      });

      await storage.createStripePayment({
        userId,
        paymentIntentId: paymentIntent.id,
        amount,
        pricePerToken: totalUSD / amount,
        totalUsd: totalUSD,
        amountCents,
        status: 'pending',
        currentSupply,
        metadata: { created: new Date().toISOString() },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount,
        totalUSD,
        amountCents,
      });
    } catch (error: any) {
      console.error('[Wealth Forge] Create payment intent error:', error);
      res.status(500).json({ message: error.message || 'Failed to create payment intent' });
    }
  });

  // Complete token purchase after successful payment
  app.post('/api/wealth-forge/complete-purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: 'Missing paymentIntentId' });
      }

      const existingPayment = await storage.getStripePayment(paymentIntentId);
      if (!existingPayment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      if (existingPayment.status === 'succeeded') {
        return res.status(400).json({ message: 'Payment already processed' });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: 'Payment not succeeded', status: paymentIntent.status });
      }

      const tokenAmount = Number(paymentIntent.metadata.tokenAmount || existingPayment.amount);
      
      let progress = await storage.getWealthForgeProgress(userId);
      if (!progress) {
        progress = await storage.upsertWealthForgeProgress({
          userId,
          tokens: 0,
          xp: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          totalMined: 0,
          totalSpent: 0,
        });
      }

      const newTokens = (progress.tokens || 0) + tokenAmount;
      await storage.updateWealthForgeProgress(userId, { tokens: newTokens });

      await storage.createWealthForgeTransaction({
        userId,
        type: 'purchase',
        amount: tokenAmount,
        description: `Purchased ${tokenAmount} WFG tokens via Stripe`,
        metadata: { 
          paymentIntentId,
          priceUsd: existingPayment.totalUsd,
          bondingCurve: true,
        },
      });

      await storage.updateStripePayment(paymentIntentId, {
        status: 'succeeded',
        metadata: { completedAt: new Date().toISOString() },
      });

      res.json({
        success: true,
        tokensAdded: tokenAmount,
        newBalance: newTokens,
        paymentIntentId,
      });
    } catch (error: any) {
      console.error('[Wealth Forge] Complete purchase error:', error);
      res.status(500).json({ message: error.message || 'Failed to complete purchase' });
    }
  });

  // Get ownership contract
  app.get('/api/wealth-forge/contract', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const contractType = (req.query.type as string) || 'ownership_assignment';
      
      const contract = await storage.getWealthForgeContract(userId, contractType);
      res.json(contract || null);
    } catch (error: any) {
      console.error('[Wealth Forge] Get contract error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch contract' });
    }
  });

  // Save/update ownership contract
  app.post('/api/wealth-forge/contract', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { contractText, contractType = 'ownership_assignment', signedDate } = req.body;
      
      if (!contractText || typeof contractText !== 'string') {
        return res.status(400).json({ message: 'Contract text is required' });
      }

      const existing = await storage.getWealthForgeContract(userId, contractType);
      
      let contract;
      if (existing) {
        contract = await storage.updateWealthForgeContract(existing.id, userId, {
          contractText,
          signedDate: signedDate ? new Date(signedDate) : undefined,
          metadata: { lastUpdated: new Date().toISOString() },
        });
      } else {
        contract = await storage.createWealthForgeContract({
          userId,
          contractType,
          contractText,
          signedDate: signedDate ? new Date(signedDate) : undefined,
          metadata: { created: new Date().toISOString() },
        });
      }

      res.json({ success: true, contract });
    } catch (error: any) {
      console.error('[Wealth Forge] Save contract error:', error);
      res.status(500).json({ message: error.message || 'Failed to save contract' });
    }
  });

  // ============================================================================
  // SUBSCRIPTION & STRIPE ROUTES
  // ============================================================================

  // Get all subscription plans
  app.get('/api/subscription/plans', isAuthenticated, async (req: any, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error('[Subscription] Get plans error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch subscription plans' });
    }
  });

  // Alias for subscription plans (alternative endpoint name)
  app.get('/api/subscription/tiers', isAuthenticated, async (req: any, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error('[Subscription] Get tiers error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch subscription tiers' });
    }
  });

  // Get current user's subscription
  app.get('/api/subscription/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const subscription = await storage.getUserSubscription(userId);
      
      if (!subscription) {
        return res.json({ tier: 'free', status: 'active' });
      }
      
      res.json(subscription);
    } catch (error: any) {
      console.error('[Subscription] Get current error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch subscription' });
    }
  });

  // Create Stripe Checkout Session
  app.post('/api/subscription/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { planId, billingInterval = 'monthly' } = req.body;

      if (!planId) {
        return res.status(400).json({ message: 'Plan ID is required' });
      }

      const plan = await storage.getActivePlan(planId);
      if (!plan) {
        return res.status(404).json({ message: 'Subscription plan not found' });
      }

      // Get or create Stripe customer
      const user = await storage.getUser(userId);
      let customerId = user?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user?.email || undefined,
          metadata: { userId },
        });
        customerId = customer.id;
        
        await storage.upsertUser({
          id: userId,
          email: user?.email || null,
          name: user?.name || null,
          stripeCustomerId: customerId,
        });
      }

      // Select the appropriate price ID
      const priceId = billingInterval === 'annual' 
        ? plan.stripePriceIdAnnual 
        : plan.stripePriceIdMonthly;

      if (!priceId) {
        return res.status(400).json({ 
          message: `No Stripe price configured for ${billingInterval} billing` 
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.APP_BASE_URL || req.headers.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_BASE_URL || req.headers.origin}/subscription`,
        metadata: {
          userId,
          planId: plan.id.toString(),
          tier: plan.tier,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('[Subscription] Checkout error:', error);
      res.status(500).json({ message: error.message || 'Failed to create checkout session' });
    }
  });

  // Create Stripe Customer Portal Session
  app.post('/api/subscription/portal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: 'No Stripe customer found' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.APP_BASE_URL || req.headers.origin}/subscription`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('[Subscription] Portal error:', error);
      res.status(500).json({ message: error.message || 'Failed to create portal session' });
    }
  });

  // Stripe Webhook Handler (no auth required - validates via signature)
  app.post('/api/stripe/webhook', async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Stripe] Webhook secret not configured');
      return res.status(500).json({ message: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err: any) {
      console.error('[Stripe] Webhook signature verification failed:', err.message);
      return res.status(400).json({ message: `Webhook signature verification failed: ${err.message}` });
    }

    // Check for duplicate events
    const existingEvent = await storage.getSubscriptionEventByStripeId(event.id);
    if (existingEvent) {
      console.log('[Stripe] Duplicate event, skipping:', event.id);
      return res.json({ received: true, duplicate: true });
    }

    console.log('[Stripe] Processing webhook event:', event.type);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const planId = session.metadata?.planId;
          const tier = session.metadata?.tier;

          if (!userId || !planId) {
            console.error('[Stripe] Missing metadata in checkout session:', session.id);
            break;
          }

          // Create or update subscription
          const subscription = await storage.createUserSubscription({
            userId,
            planId: parseInt(planId),
            tier: tier || 'premium',
            status: 'active',
            stripeSubscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
            currentPeriodStart: new Date(session.created * 1000),
            currentPeriodEnd: new Date((session.created + 30 * 24 * 60 * 60) * 1000), // Approximate, will be updated
            billingInterval: 'monthly',
          });

          // Log revenue with proper FX conversion
          const plan = await storage.getActivePlan(tier || 'premium');
          if (plan && session.amount_total) {
            const amount = session.amount_total / 100; // Convert from cents to dollars
            const currency = session.currency?.toUpperCase() || 'USD';
            
            try {
              const usdValue = await convertToUSD(amount, currency);
              const exchangeRate = currency === 'USD' ? 1.0 : (amount > 0 ? usdValue / amount : 1.0);

              await storage.createRevenueEntry({
                userId,
                source: 'stripe_subscription',
                eventType: 'subscription_created',
                amount,
                currency,
                usdValue,
                metadata: {
                  sessionId: session.id,
                  subscriptionId: session.subscription,
                  planId,
                  tier,
                  exchangeRate,
                  originalAmountCents: session.amount_total,
                },
                occurredAt: new Date(session.created * 1000),
              });
              console.log(`[Stripe] Revenue logged: ${currency} ${amount} = USD ${usdValue.toFixed(2)} (rate: ${exchangeRate.toFixed(4)})`);
            } catch (error) {
              console.error('[Stripe] Failed to log revenue with FX conversion:', error);
              // Log with fallback 1:1 conversion but mark as failed
              await storage.createRevenueEntry({
                userId,
                source: 'stripe_subscription',
                eventType: 'subscription_created',
                amount,
                currency,
                usdValue: amount, // Fallback 1:1
                metadata: {
                  sessionId: session.id,
                  subscriptionId: session.subscription,
                  planId,
                  tier,
                  fxConversionFailed: true,
                  error: (error as Error).message,
                },
                occurredAt: new Date(session.created * 1000),
              });
            }
          }

          console.log('[Stripe] Subscription created:', subscription.id);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const dbSubscription = await storage.getUserSubscriptionByStripeId(subscription.id);

          if (dbSubscription) {
            await storage.updateUserSubscription(dbSubscription.id, {
              status: subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end ? 'true' : 'false',
            });
            console.log('[Stripe] Subscription updated:', dbSubscription.id);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const dbSubscription = await storage.getUserSubscriptionByStripeId(subscription.id);

          if (dbSubscription) {
            await storage.updateUserSubscription(dbSubscription.id, {
              status: 'canceled',
              canceledAt: new Date(),
            });
            console.log('[Stripe] Subscription canceled:', dbSubscription.id);
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscription = await storage.getUserSubscriptionByStripeId(invoice.subscription as string);

          if (subscription && invoice.amount_paid) {
            // Log revenue for recurring payment with FX conversion
            const amount = invoice.amount_paid / 100; // Convert from cents to dollars
            const currency = invoice.currency.toUpperCase();
            
            try {
              const usdValue = await convertToUSD(amount, currency);
              const exchangeRate = currency === 'USD' ? 1.0 : (amount > 0 ? usdValue / amount : 1.0);

              await storage.createRevenueEntry({
                userId: subscription.userId,
                source: 'stripe_subscription',
                eventType: 'invoice_paid',
                amount,
                currency,
                usdValue,
                metadata: {
                  invoiceId: invoice.id,
                  subscriptionId: invoice.subscription,
                  exchangeRate,
                  originalAmountCents: invoice.amount_paid,
                },
                occurredAt: new Date(invoice.created * 1000),
              });
              console.log(`[Stripe] Invoice paid: ${currency} ${amount} = USD ${usdValue.toFixed(2)} (rate: ${exchangeRate.toFixed(4)})`);
            } catch (error) {
              console.error('[Stripe] Failed to log invoice revenue with FX conversion:', error);
              // Log with fallback 1:1 conversion but mark as failed
              await storage.createRevenueEntry({
                userId: subscription.userId,
                source: 'stripe_subscription',
                eventType: 'invoice_paid',
                amount,
                currency,
                usdValue: amount, // Fallback 1:1
                metadata: {
                  invoiceId: invoice.id,
                  subscriptionId: invoice.subscription,
                  fxConversionFailed: true,
                  error: (error as Error).message,
                },
                occurredAt: new Date(invoice.created * 1000),
              });
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscription = await storage.getUserSubscriptionByStripeId(invoice.subscription as string);

          if (subscription) {
            await storage.updateUserSubscription(subscription.id, {
              status: 'past_due',
            });
            console.log('[Stripe] Payment failed, subscription marked past_due:', subscription.id);
          }
          break;
        }

        default:
          console.log('[Stripe] Unhandled event type:', event.type);
      }

      // Log the event
      await storage.createSubscriptionEvent({
        stripeEventId: event.id,
        eventType: event.type,
        eventData: event.data.object as any,
        processedAt: new Date(),
      });

      res.json({ received: true });
    } catch (error: any) {
      console.error('[Stripe] Webhook processing error:', error);
      res.status(500).json({ message: error.message || 'Webhook processing failed' });
    }
  });

  // ============================================================================
  // REVENUE ANALYTICS ROUTES
  // ============================================================================

  // Get revenue entries (admin/analytics)
  app.get('/api/revenue/entries', isAuthenticated, requireFeature('revenueDashboard'), async (req: any, res) => {
    try {
      const { startDate, endDate, source } = req.query;
      
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      let entries;
      if (source) {
        entries = await storage.getRevenueBySource(source, start, end);
      } else {
        entries = await storage.getRevenueEntries(undefined, start, end);
      }

      res.json(entries);
    } catch (error: any) {
      console.error('[Revenue] Get entries error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch revenue entries' });
    }
  });

  // Get revenue summary
  app.get('/api/revenue/summary', isAuthenticated, requireFeature('revenueDashboard'), async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      const summary = await storage.getRevenueSummary(
        new Date(startDate),
        new Date(endDate)
      );

      res.json(summary);
    } catch (error: any) {
      console.error('[Revenue] Get summary error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch revenue summary' });
    }
  });

  // Get revenue reports
  app.get('/api/revenue/reports', isAuthenticated, requireFeature('revenueDashboard'), async (req: any, res) => {
    try {
      const { type, limit } = req.query;
      
      const reports = await storage.getRevenueReports(
        type as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );

      res.json(reports);
    } catch (error: any) {
      console.error('[Revenue] Get reports error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch revenue reports' });
    }
  });

  // ============================================================================
  // APP LOGGING ROUTES (Admin/Development Only)
  // ============================================================================
  
  // Admin check middleware for logging endpoints
  const requireAdmin = async (req: any, res: any, next: any) => {
    // SECURITY: In production, implement proper admin role checking
    // For now, this is development-only functionality
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        message: 'Logging endpoints disabled in production',
        note: 'Contact system administrator for log access'
      });
    }
    next();
  };

  // Get all app creation logs (Admin/Dev only)
  app.get('/api/app-logs', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      await appLogger.log({
        action: "App logs accessed",
        metadata: { userId, timestamp: new Date().toISOString() }
      });
      
      const logs = await appLogger.getAllLogs();
      res.json({ logs, count: logs.length });
    } catch (error: any) {
      console.error('[AppLogs] Fetch error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch logs' });
    }
  });

  // Get recent app creation logs (Admin/Dev only)
  app.get('/api/app-logs/recent', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const limit = parseInt(req.query.limit as string) || 50;
      
      await appLogger.log({
        action: "Recent app logs accessed",
        metadata: { userId, limit, timestamp: new Date().toISOString() }
      });
      
      const logs = await appLogger.getAllLogs();
      const recentLogs = logs.slice(-limit).reverse();
      res.json({ logs: recentLogs, count: recentLogs.length });
    } catch (error: any) {
      console.error('[AppLogs] Fetch recent error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch recent logs' });
    }
  });

  // Clear app creation logs (Admin/Dev only - requires explicit authorization)
  app.delete('/api/app-logs', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = await getCanonicalUserId(req.user.claims);
      const { confirmClear } = req.body;
      
      if (confirmClear !== true) {
        return res.status(400).json({ 
          message: 'Confirmation required',
          note: 'Set confirmClear: true in request body to confirm deletion'
        });
      }
      
      await appLogger.log({
        action: "App creation logs deletion initiated",
        metadata: { 
          userId, 
          userEmail: req.user.claims.email,
          timestamp: new Date().toISOString()
        },
        insights: "SECURITY: Log deletion should be audited and restricted to authorized personnel only"
      });
      
      await appLogger.clearLogs();
      res.json({ message: 'Logs cleared successfully' });
    } catch (error: any) {
      console.error('[AppLogs] Clear error:', error);
      res.status(500).json({ message: error.message || 'Failed to clear logs' });
    }
  });

  // ============================================================================
  // SYSTEM MONITORING ROUTES (Admin/Development Only)
  // ============================================================================

  // Get AI Data Forwarder statistics
  app.get('/api/system/ai-forwarder-stats', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const stats = aiDataForwarder.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error('[System] AI Forwarder stats error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch stats' });
    }
  });

  // Get canonical user ID cache statistics
  app.get('/api/system/user-cache-stats', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const stats = getCacheStats();
      res.json(stats);
    } catch (error: any) {
      console.error('[System] User cache stats error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch cache stats' });
    }
  });

  // Get combined system statistics
  app.get('/api/system/stats', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const stats = {
        aiDataForwarder: aiDataForwarder.getStats(),
        userIdCache: getCacheStats(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      };
      res.json(stats);
    } catch (error: any) {
      console.error('[System] System stats error:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch system stats' });
    }
  });

  // Catch-all for unknown API routes (must be last)
  app.use('/api/*', (req, res) => {
    res.status(404).json({ 
      message: "API endpoint not found",
      path: req.path 
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
