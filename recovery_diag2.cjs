// Attempt 6: use PGlite's dumpDataDir on the LIVE dir (if the server stopped, no lock conflict)
// and inspect recovered_assets.json if it exists
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const TMP = path.join(process.env.LOCALAPPDATA, 'Temp', 'wf_recover');
const WF_LOCAL = path.join(process.env.LOCALAPPDATA, 'WealthForge');

(async () => {
  // 1) What did attempt-4 actually capture? check the json
  const j = path.join(TMP, 'recovered_assets.json');
  if (fs.existsSync(j)) {
    const rows = JSON.parse(fs.readFileSync(j, 'utf8'));
    console.log(`recovered_assets.json: ${rows.length} rows`);
  } else {
    console.log('recovered_assets.json: MISSING');
  }

  // 2) dumpDataDir from live pglite-fast (server currently running — may fail; try anyway read-only-ish)
  try {
    const db = new PGlite(path.join(WF_LOCAL, 'pglite-fast'));
    await db.ready;
    const assets = await db.query('SELECT count(*)::int AS n FROM assets').catch(e => ({ rows: [{ n: -1 }] }));
    console.log('live pglite-fast assets count:', assets.rows[0].n);
    const tarBuf = await db.dumpDataDir();
    fs.writeFileSync(path.join(TMP, 'live_dump.tar'), Buffer.from(tarBuf));
    console.log('live dump written');
    await db.close();
  } catch (e) {
    console.log('live dump failed:', String(e.message).slice(0, 150));
  }
})();
