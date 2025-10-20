import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { healthMonitor } from "./healthMonitor";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import cookieParser from "cookie-parser";
import { doubleCsrf } from "csrf-csrf";
import { validateEnvironment, logEnvironmentStatus } from "./env";
import { setupAIWebSocket } from "./aiWebSocket";
import OpenAI from "openai";
import cors from "cors";
import { storage } from "./storage";
import { automationScheduler } from "./automationScheduler";
import { closeDB } from './db';

// ============================================
// ENVIRONMENT VALIDATION (BEFORE APP CREATION)
// ============================================
// Validates required env vars and terminates in production if missing
// Provides dev fallbacks for local development
const env = validateEnvironment();
logEnvironmentStatus(env);

const app = express();

// Security: CORS - Explicit configuration to prevent misconfigurations
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5000', 'http://127.0.0.1:5000'];

// Production domains - WealthForge Elite
const productionDomains = [
  'https://wealthforge.app',
  'https://www.wealthforge.app'
];
allowedOrigins.push(...productionDomains);

// In production, add your Replit domain for testing
if (process.env.REPLIT_DOMAINS) {
  const replitDomains = process.env.REPLIT_DOMAINS.split(',').map(domain => 
    `https://${domain.trim()}`
  );
  allowedOrigins.push(...replitDomains);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  exposedHeaders: ['x-csrf-token'],
  maxAge: 600, // Cache preflight requests for 10 minutes
}));

// Security: Helmet for secure HTTP headers
// Production-grade CSP without unsafe-inline/unsafe-eval
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: [
        "'self'",
        ...(process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',').map(d => `https://${d.trim()}`) : [])
      ],
      scriptSrc: [
        "'self'",
        "https://js.stripe.com",
        ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'", "'unsafe-eval'"] : [])
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled components and Tailwind
        "https://fonts.googleapis.com",
        "https://m.stripe.network",
        "https://m.stripe.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https://api.coinpaprika.com", "https://api.coingecko.com"],
      connectSrc: [
        "'self'",
        "wss://wealthforge.app",
        "https://wealthforge.app",
        "https://www.wealthforge.app",
        "https://api.stripe.com",
        "https://api.openai.com",
        "https://api.tavily.com",
        "https://www.alphavantage.co",
        "https://api.coinpaprika.com",
        "https://api.coincap.io",
        "https://min-api.cryptocompare.com",
        "https://pro-api.coinmarketcap.com",
        "https://graph.microsoft.com",
        "https://login.microsoftonline.com",
        "https://gmail.googleapis.com",
        "https://discord.com",
        "https://api.discord.com",
        ...(process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',').map(d => `https://${d.trim()}`) : []),
        ...(process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',').map(d => `wss://${d.trim()}`) : [])
      ],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some third-party embeds
}));

// Performance: Compression (gzip responses)
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Compression level (0-9, 6 is a good balance)
}));

// Security: Cookie parser
app.use(cookieParser());

// Security: Rate limiting (1000 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000, // Increased for modern SPA with multiple API calls
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." }
});
app.use(limiter);

// Health check endpoint for Replit monitoring (must respond quickly)
// This MUST be before any other middleware to ensure fastest response
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

// Additional health check on root for workflow detection
app.get("/", (_req, res, next) => {
  // Only respond to direct health checks (not SPA routes)
  if (_req.headers['user-agent']?.includes('Replit') || _req.headers['x-replit-health-check']) {
    return res.status(200).json({ status: "ok", timestamp: Date.now() });
  }
  next();
});

// Security: CSRF protection (conditional on CSRF_SECRET being set)
// NOTE: CSRF setup moved AFTER session setup in routes.ts to ensure session is available
if (process.env.CSRF_SECRET) {
  log("CSRF protection will be enabled after session setup");
} else {
  log("⚠️  CSRF protection disabled - set CSRF_SECRET environment variable to enable");
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add cache control headers BEFORE routes to prevent aggressive browser caching
app.use((req, res, next) => {
  // Service worker should NEVER be cached (check first!)
  if (req.path === '/service-worker.js') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // For API routes, prevent caching to ensure fresh data
  else if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // For other static assets, allow short caching
  else {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Capture server instance for graceful shutdown
let httpServer: ReturnType<typeof app.listen> | null = null;

(async () => {
  try {
    const server = await registerRoutes(app);
    httpServer = server;
    
    // Initialize WebSocket server for AI streaming
    // NOTE: Temporarily disabled - no client-side implementation yet
    // Re-enable when client-side WebSocket connection is implemented
    // if (process.env.OPENAI_API_KEY) {
    //   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    //   setupAIWebSocket(server, openai);
    //   log("✓ AI WebSocket streaming enabled at /ws/ai-chat");
    // } else {
    //   log("⚠️  AI WebSocket disabled - OPENAI_API_KEY not configured");
    // }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Start listening FIRST so Replit detects the port immediately
    server.listen(port, "0.0.0.0", async () => {
      log(`serving on port ${port}`);
      log(`✓ Server is ready and accepting connections`);
      
      // Setup Vite or static serving AFTER port is open
      try {
        if (app.get("env") === "development") {
          await setupVite(app, server);
          log("✓ Vite development server ready");
        } else {
          serveStatic(app);
          log("✓ Static file serving enabled");
        }
      } catch (error) {
        console.error("Error setting up Vite:", error);
      }
      
      // Initialize background services AFTER Vite is ready
      // Delay background services to ensure port is fully open and detected
      log("Initializing background services...");
      
      setTimeout(() => {
        // Start health monitor
        healthMonitor.start();
        log("✓ Health monitor started");
        
        // Initialize and start automation scheduler
        automationScheduler.setStorage(storage);
        automationScheduler.start();
        log("✓ Automation scheduler started (email sync & routine reports)");
      }, 2000); // 2 second delay to ensure port detection
      
      log("✓ Background services scheduled to start in 2s");
    });
  } catch (error) {
    console.error("Fatal error during server startup:", error);
    process.exit(1);
  }
})();

// Global error handlers to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Graceful shutdown handlers
async function gracefulShutdown(signal: string) {
  console.log(`\n🧘 Gracefully shutting down (${signal})...`);
  
  try {
    // Stop accepting new requests
    if (httpServer) {
      log('Closing HTTP server...');
      await new Promise<void>((resolve, reject) => {
        httpServer!.close((err) => {
          if (err) reject(err);
          else {
            log('✓ HTTP server closed');
            resolve();
          }
        });
      });
    }
    
    // Stop background services
    log('Stopping automation scheduler...');
    automationScheduler.stop();
    
    log('Stopping health monitor...');
    healthMonitor.stop();
    
    // Close database connections
    await closeDB();
    
    log('✓ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
