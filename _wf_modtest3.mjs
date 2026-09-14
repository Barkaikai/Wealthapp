const mods = ["drizzle-orm/mysql-core", "drizzle-orm/sqlite-core", "drizzle-orm/pg-core"];
for (const m of mods) {
  try { await import(m); console.log("OK:", m); }
  catch (e) { console.log("FAIL:", m, "-", e.code); }
}
