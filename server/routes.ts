import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateDailyBriefing, categorizeEmail, draftEmailReply, generateLifestyleRecommendations, generateTopicArticle } from "./openai";
import { getMarketOverview } from "./marketData";
import { slugify } from "./utils";
import { fetchRecentEmails } from "./gmail";
import { insertAssetSchema, insertEventSchema, insertRoutineSchema, insertAIContentSchema, insertTransactionSchema, insertWealthAlertSchema, insertFinancialGoalSchema, insertLiabilitySchema, insertCalendarEventSchema, insertTaskSchema, insertHealthMetricSchema, insertWalletConnectionSchema, insertVoiceCommandSchema, insertNoteSchema, insertDocumentSchema, insertPortfolioReportSchema, insertTradingRecommendationSchema, insertTaxEventSchema, insertRebalancingRecommendationSchema, insertAnomalyDetectionSchema } from "@shared/schema";
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      await storage.deleteNote(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      res.status(error.message?.includes("not found") ? 404 : 500).json({ message: error.message || "Failed to delete note" });
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      
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
      const id = parseInt(req.params.id);
      
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
      const id = parseInt(req.params.id);
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
      const userId = req.user.claims.sub;
      const wallets = await storage.getWalletConnections(userId);
      res.json(wallets);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      res.status(500).json({ message: "Failed to fetch wallets" });
    }
  });

  app.post('/api/wallets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const wallet = await storage.updateWalletConnection(id, userId, req.body);
      res.json(wallet);
    } catch (error) {
      console.error("Error updating wallet:", error);
      res.status(400).json({ message: "Failed to update wallet" });
    }
  });

  app.delete('/api/wallets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
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

  app.post('/api/portfolio-reports/generate', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/trading-recommendations/generate', isAuthenticated, async (req: any, res) => {
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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      const updated = await storage.updateTaxEvent(id, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating tax event:", error);
      res.status(400).json({ message: "Failed to update tax event" });
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

  app.post('/api/rebalancing-recommendations/generate', isAuthenticated, async (req: any, res) => {
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
      const id = parseInt(req.params.id);
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

  app.post('/api/anomalies/detect', isAuthenticated, async (req: any, res) => {
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
      const id = parseInt(req.params.id);
      const updated = await storage.updateAnomalyDetection(id, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating anomaly:", error);
      res.status(400).json({ message: "Failed to update anomaly" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
