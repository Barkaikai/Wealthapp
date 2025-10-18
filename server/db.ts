import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Track pool initialization
let poolInitialized = false;

pool.on('error', (err) => {
  console.error('[DB] Unexpected database pool error:', err);
});

pool.on('connect', () => {
  if (!poolInitialized) {
    console.log('[DB] Connection pool initialized successfully');
    poolInitialized = true;
  }
});

pool.on('remove', () => {
  // Silent - normal pool behavior, no need to log every connection removal
});

export const db = drizzle({ client: pool, schema });

// Graceful shutdown
export async function closeDB(): Promise<void> {
  console.log('[DB] Closing database connection pool...');
  await pool.end();
  console.log('[DB] Connection pool closed successfully');
}
