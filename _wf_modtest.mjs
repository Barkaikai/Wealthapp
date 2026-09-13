// Find which module drizzle-kit fails to load (run from WealthForge root).
const mods = ["drizzle-orm", "drizzle-orm/node-postgres", "drizzle-kit/api", "pg"];
for (const m of mods) {
  try {
    await import(m);
    console.log("OK:", m);
  } catch (e) {
    console.log("FAIL:", m, "-", e.code, "|", String(e.message).slice(0, 100));
  }
}
