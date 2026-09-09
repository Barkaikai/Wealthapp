// Local development auth bypass.
// The original file used Replit OIDC (see git history / replitAuth.ts.orig).
// With LOCAL_DEV_AUTH set, every visitor is auto-logged-in as a local dev user.
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import pg from "pg";
import { storage } from "./storage";

const useEmbeddedDb = process.env.USE_PGLITE === '1' || process.env.LOCAL_DEV_AUTH === '1';

let sessionPool: pg.Pool | null = null;

function getSessionPool() {
  if (!sessionPool) {
    sessionPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    });
    sessionPool.on('error', (err) => {
      console.error('[Session] Unexpected session database pool error:', err);
    });
  }
  return sessionPool;
}

export function getSession() {
  const baseSessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    name: "__Host.sid",
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: "lax" as const,
      secure: false, // local dev over http
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
    rolling: true,
  };

  if (useEmbeddedDb) {
    return session({
      ...baseSessionOptions,
      store: new session.MemoryStore(),
    });
  }

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: getSessionPool(),
    tableName: "sessions",
    createTableIfMissing: true,
    pruneSessionInterval: 60,
  });

  return session({
    ...baseSessionOptions,
    store: sessionStore,
  });
}

export async function closeSessionPool() {
  if (sessionPool) {
    await sessionPool.end();
    sessionPool = null;
  }
}

const DEV_USER = {
  sub: "local-dev-user",
  email: "dev@localhost",
  first_name: "Local",
  last_name: "Developer",
  profile_image_url: "",
};

async function upsertDevUser() {
  try {
    await storage.upsertUser({
      id: DEV_USER.sub,
      email: DEV_USER.email,
      firstName: DEV_USER.first_name,
      lastName: DEV_USER.last_name,
      profileImageUrl: DEV_USER.profileImageUrl,
    });
  } catch (e) {
    console.error("[Auth] Failed to upsert local dev user:", e);
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Fake passport-style req.login/req.logout/isAuthenticated via simple middleware
  app.use((req, _res, next) => {
    (req as any).login = (user: any, cb?: any) => {
      (req as any).user = user;
      if (typeof cb === 'function') cb();
    };
    (req as any).logout = (cb?: any) => {
      delete (req as any).user;
      if (req.session) delete (req.session as any).passport;
      if (typeof cb === 'function') cb();
      else if (typeof cb !== 'undefined') {} // no-op
    };
    (req as any).isAuthenticated = () => !!(req as any).user;
    next();
  });

  // Restore user from session on each request
  app.use(async (req, _res, next) => {
    const sess: any = req.session;
    if (!sess) return next();
    if (!(req as any).user && sess.localDevAuth) {
      await upsertDevUser();
      (req as any).user = {
        claims: DEV_USER,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      (sess as any).localDevAuth = true; // keep flag alive with rolling session
    } else if ((req as any).user && sess.localDevAuth) {
      (req as any).user.expires_at = Math.floor(Date.now() / 1000) + 3600;
    }
    next();
  });

  app.get("/api/login", async (req: any, res) => {
    await upsertDevUser();
    req.user = {
      claims: DEV_USER,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    if (req.session) {
      (req.session as any).localDevAuth = true;
      (req.session as any).user = DEV_USER;
    }
    res.redirect("/");
  });

  app.get("/api/callback", (_req, res) => res.redirect("/"));

  app.get("/api/logout", (req: any, res) => {
    req.session?.destroy(() => res.redirect("/"));
  });

  console.log("[Auth] Local development auth enabled (LOCAL_DEV_AUTH=1)");
}

// Mirrors the original contract: refresh never expires in local dev.
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const sess: any = req.session;

  if (process.env.LOCAL_DEV_AUTH === '1') {
    if (!sess?.localDevAuth) {
      await upsertDevUser();
      if (req.session) {
        (req.session as any).localDevAuth = true;
        (req.session as any).user = DEV_USER;
      }
    }

    if (!(req as any).user) {
      (req as any).user = {
        claims: DEV_USER,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
    }

    (req as any).user.expires_at = Math.floor(Date.now() / 1000) + 3600;
    return next();
  }

  if (!user || !sess?.localDevAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  user.expires_at = Math.floor(Date.now() / 1000) + 3600;
  return next();
};
