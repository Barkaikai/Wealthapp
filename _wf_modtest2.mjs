// Test loading the fresh drizzle-kit api and its deps from WealthForge root.
const mods = [
  "./node_modules/dkfix2/package/api.mjs",
  "esbuild",
  "@drizzle-team/brocli",
  "dotenv",
];
for (const m of mods) {
  try {
    await import(m);
    console.log("OK:", m);
  } catch (e) {
    console.log("FAIL:", m, "-", e.code, "|", String(e.message).slice(0, 90));
  }
}
