import fs from 'fs';
import path from 'path';
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import pg from 'pg';
import * as schema from '@shared/schema';

const useEmbeddedDb = process.env.USE_PGLITE === '1' || process.env.LOCAL_DEV_AUTH === '1';
const fastStartup = process.env.FAST_STARTUP === '1';
const pgliteBaseDir = (() => {
  const baseDir = process.env.LOCALAPPDATA || process.cwd();
  if (fastStartup) {
    return path.join(baseDir, 'WealthForge', 'pglite-fast');
  }

  const candidate = process.env.PGLITE_DATA_DIR?.trim();
  if (candidate && !candidate.includes('://') && !candidate.includes(':')) {
    return candidate;
  }

  return path.join(baseDir, 'WealthForge', 'pglite');
})();

function getRecoveryDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${pgliteBaseDir}.corrupt-${stamp}`;
}

function clearPostgresLockFiles(dir: string) {
  for (const name of ['postmaster.pid']) {
    const file = path.join(dir, name);
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (error) {
      console.warn(`[DB] Could not remove stale lock file ${file}:`, error);
    }
  }
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function openPglite(dataDir: string) {
  console.log(`[DB] Using embedded PGlite database at ${dataDir}`);
  return drizzlePglite({ connection: { dataDir } }, { schema });
}

let pool: pg.Pool | null = null;

export const db = useEmbeddedDb
  ? (() => {
      try {
        ensureDir(pgliteBaseDir);
        clearPostgresLockFiles(pgliteBaseDir);
        return openPglite(pgliteBaseDir);
      } catch (error) {
        const message = String((error as any)?.message || error);
        console.warn(`[DB] Embedded DB failed to open at ${pgliteBaseDir}: ${message}`);
        try {
          const recoveryDir = getRecoveryDir();
          if (fs.existsSync(pgliteBaseDir)) {
            fs.renameSync(pgliteBaseDir, recoveryDir);
            console.warn(`[DB] Moved corrupted embedded DB to ${recoveryDir}`);
          }
        } catch (renameError) {
          console.warn('[DB] Could not quarantine embedded DB directory:', renameError);
        }
        ensureDir(pgliteBaseDir);
        clearPostgresLockFiles(pgliteBaseDir);
        return openPglite(pgliteBaseDir);
      }
    })()
  : (() => {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
      }

      // Local dev / production Postgres connection
      pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });

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

      return drizzleNodePostgres(pool, { schema });
    })();

export async function closeDB() {
  if (pool) {
    await pool.end();
    console.log('[DB] Connection pool closed');
  }
}
