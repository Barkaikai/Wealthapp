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

// ============================================
// ENVIRONMENT VALIDATION (BEFORE APP CREATION)
// ============================================
// Validates required env vars and terminates in production if missing
// Provides dev fallbacks for local development
const env = validateEnvironment();
logEnvironmentStatus(env);

const app = express();

// Security: Helmet for secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite in dev
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
    },
  },
}));

// Performance: Compression (gzip responses)
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Compression level (0-9, 6 is a good balance)
}));

// Security: Cookie parser
app.use(cookieParser());

// Security: Rate limiting (300 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." }
});
app.use(limiter);

// Security: CSRF protection (conditional on CSRF_SECRET being set)
if (process.env.CSRF_SECRET) {
  const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET!,
    getSessionIdentifier: (req) => {
      // Use session ID if available, otherwise use a combination of IP and user agent
      return (req.session as any)?.id || `${req.ip}-${req.get('user-agent')}`;
    },
    cookieName: "__Host.x-csrf-token",
    cookieOptions: {
      sameSite: "strict",
      path: "/",
      secure: true,
      httpOnly: true,
    },
  });

  // Generate token and make it available to all routes
  app.use((req, res, next) => {
    res.locals.csrfToken = generateCsrfToken(req, res);
    next();
  });

  // Protect all state-changing API routes
  app.use("/api/*", (req, res, next) => {
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE") {
      return doubleCsrfProtection(req, res, next);
    }
    next();
  });

  log("CSRF protection enabled");
} else {
  log("⚠️  CSRF protection disabled - set CSRF_SECRET environment variable to enable");
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  const server = await registerRoutes(app);
  
  // Initialize WebSocket server for AI streaming
  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    setupAIWebSocket(server, openai);
    log("✓ AI WebSocket streaming enabled at /ws/ai-chat");
  } else {
    log("⚠️  AI WebSocket disabled - OPENAI_API_KEY not configured");
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start health monitor after server is listening
    healthMonitor.start();
  });
})();
