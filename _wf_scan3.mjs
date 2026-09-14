// Full node_modules corruption scan: list every unreadable file, grouped by package.
const fs = await import("fs");
const path = await import("path");
const NM = "C:/Users/Barkai Brinson/OneDrive/Desktop/WealthForge/node_modules";
const bad = [];
function verify(dp) {
  let entries;
  try { entries = fs.readdirSync(dp, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dp, e.name);
    if (e.isDirectory()) {
      if (e.name === "brocli_broken" || e.name === "dkfix2" || e.name === "dormfix" || e.name.startsWith("_")) continue;
      verify(p);
    } else {
      try { fs.readFileSync(p); } catch { bad.push(p); }
    }
  }
}
verify(NM);
const byPkg = {};
for (const p of bad) {
  const rel = path.relative(NM, p).split(path.sep);
  const pkg = rel[0].startsWith("@") ? rel.slice(0, 2).join("/") : rel[0];
  byPkg[pkg] = (byPkg[pkg] || 0) + 1;
}
console.log("total bad:", bad.length);
console.log(JSON.stringify(byPkg, null, 0));
