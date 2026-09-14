// Load drizzle-kit bin.cjs the way node would, to find the next unreadable file.
const fs = await import("fs");
const path = await import("path");
const WF = "C:/Users/Barkai Brinson/OneDrive/Desktop/WealthForge";
// drizzle-kit api.mjs requires these; scan each package dir for unreadable files.
const pkgs = ["esbuild", "@esbuild-kit", "dotenv", "raf", "zod", "@drizzle-team", "semver", "picocolors"];
let bad = 0;
function verify(dp) {
  let entries;
  try { entries = fs.readdirSync(dp, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dp, e.name);
    if (e.isDirectory()) { verify(p); continue; }
    try { fs.readFileSync(p); } catch { bad++; console.log("BAD:", p); }
  }
}
for (const pkg of pkgs) {
  const p = path.join(WF, "node_modules", pkg);
  if (fs.existsSync(p)) verify(p);
}
console.log("remaining bad:", bad);
