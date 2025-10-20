// From javascript_log_in_with_replit integration
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import pg from "pg";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Singleton session pool to prevent connection leaks
let sessionPool: pg.Pool | null = null;

function getSessionPool() {
  if (!sessionPool) {
    sessionPool = new pg.Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 10, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    sessionPool.on('error', (err) => {
      console.error('[Session] Unexpected session database pool error:', err);
    });
    
    sessionPool.on('connect', () => {
      console.log('[Session] Session database connection established');
    });
  }
  return sessionPool;
}

export function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: getSessionPool(),
    tableName: "sessions",
    createTableIfMissing: true,
    pruneSessionInterval: 60,
  });
  
  const sessionConfig = {
    store: sessionStore,
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    name: "__Host.sid",
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: "lax" as const,
      secure: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours (improved security with session timeout)
    },
    rolling: true, // Reset maxAge on every request to extend active sessions
  };
  
  return session(sessionConfig);
}

// Export cleanup function for graceful shutdown
export async function closeSessionPool() {
  if (sessionPool) {
    await sessionPool.end();
    sessionPool = null;
    console.log('[Session] Pool closed');
  }
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await storage.upsertUser({
        id: claims["sub"],
        email: claims["email"],
        firstName: claims["first_name"],
        lastName: claims["last_name"],
        profileImageUrl: claims["profile_image_url"],
      });
      return;
    } catch (error: any) {
      const isNeonSuspended = error?.message?.includes('endpoint has been disabled') || 
                              error?.code === 'XX000';
      
      if (isNeonSuspended && attempt < retries) {
        console.log(`[Auth] Neon DB suspended, retrying (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      throw error;
    }
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const domains = process.env.REPLIT_DOMAINS!.split(",");
  const primaryDomain = domains[0]; // Use first domain as primary
  
  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Always use primary Replit domain for auth, regardless of access method
    const authDomain = domains.includes(req.hostname) ? req.hostname : primaryDomain;
    passport.authenticate(`replitauth:${authDomain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Always use primary Replit domain for auth, regardless of access method
    const authDomain = domains.includes(req.hostname) ? req.hostname : primaryDomain;
    passport.authenticate(`replitauth:${authDomain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
