import { defineConfig } from "drizzle-kit";

const useEmbeddedDb = process.env.USE_PGLITE === '1' || process.env.LOCAL_DEV_AUTH === '1';

if (!useEmbeddedDb && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  ...(useEmbeddedDb
    ? {
        driver: "pglite" as const,
        dbCredentials: {
          url: process.env.PGLITE_DATA_DIR || process.env.DATABASE_URL || "./.data/pglite",
        },
      }
    : {
        dbCredentials: {
          url: process.env.DATABASE_URL,
        },
      }),
});
