// Recursively copy fresh drizzle-orm subdirs over corrupt ones, creating files where possible.
const fs = await import("fs");
const path = await import("path");
const DR = "C:/Users/Barkai Brinson/OneDrive/Desktop/WealthForge/node_modules/drizzle-orm";
const SRC = "C:/Users/Barkai Brinson/OneDrive/Desktop/WealthForge/node_modules/dormfix/package";
let fixed = 0, locked = 0;
function walk(sp, dp) {
  for (const e of fs.readdirSync(sp, { withFileTypes: true })) {
    const s = path.join(sp, e.name), d = path.join(dp, e.name);
    if (e.isDirectory()) { walk(s, d); continue; }
    let readable = true;
    try { fs.readFileSync(s); } catch { readable = false; }
    if (readable) {
      try { fs.copyFileSync(s, d); fixed++; } catch { locked++; }
    } else locked++;
  }
}
for (const d of ["mysql-core", "sqlite-core"]) walk(path.join(SRC, d), path.join(DR, d));
// verify
let bad = 0;
function verify(dp) {
  for (const e of fs.readdirSync(dp, { withFileTypes: true })) {
    const p = path.join(dp, e.name);
    if (e.isDirectory()) { verify(p); continue; }
    try { fs.readFileSync(p); } catch { bad++; console.log("STILL BAD:", p); }
  }
}
for (const d of ["mysql-core", "sqlite-core"]) verify(path.join(DR, d));
console.log(`fixed=${fixed} locked=${locked} remainingBad=${bad}`);
