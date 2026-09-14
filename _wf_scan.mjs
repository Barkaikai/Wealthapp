// Find exactly which file inside drizzle-orm mysql-core/sqlite-core is unreadable.
const fs = await import("fs");
const path = await import("path");
const DR = "C:/Users/Barkai Brinson/OneDrive/Desktop/WealthForge/node_modules/drizzle-orm";
for (const d of ["mysql-core", "sqlite-core"]) {
  const dir = path.join(DR, d);
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    try {
      const st = fs.statSync(p);
      if (st.size === 0) { console.log("EMPTY:", p); continue; }
      fs.readFileSync(p); // throws if unreadable
    } catch (e) {
      console.log("BAD:", p, "-", e.code);
    }
  }
}
console.log("scan done");
