// Recover ALL quarantined pglite copies: resetwal + dump assets
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PGlite } = require('@electric-sql/pglite');

const WF_LOCAL = path.join(process.env.LOCALAPPDATA, 'WealthForge');
const TMP = path.join(process.env.LOCALAPPDATA, 'Temp', 'wf_recover');
const RESETWAL = path.join(process.env.LOCALAPPDATA, 'Temp', 'pg18', 'edb', 'pgsql', 'bin', 'pg_resetwal.exe');

const copies = [
  'pglite-fast',                              // live (also crashed)
  'pglite-fast.corrupt-20260912a',
  'pglite-fast.bad-manual-20260911',
  'pglite-fast.corrupt-20260911b',
  'pglite-fast.bad-20260911095836',
  'pglite-fast.corrupt-20260910a',
  'pglite-fast.corrupt-20260909',
];

(async () => {
  const results = {};
  for (const name of copies) {
    const src = path.join(WF_LOCAL, name);
    const work = path.join(TMP, 'rc_' + name.replace(/[^a-z0-9]/gi, '_'));
    if (!fs.existsSync(src)) { console.log(`${name}: missing, skip`); continue; }
    try {
      fs.rmSync(work, { recursive: true, force: true });
      fs.cpSync(src, work, { recursive: true });
      for (const lock of ['postmaster.pid', 'postmaster.opts']) {
        try { fs.unlinkSync(path.join(work, lock)); } catch {}
      }
      try {
        execSync(`"${RESETWAL}" -f -D "${work}"`, { stdio: 'pipe' });
      } catch (e) {
        console.log(`${name}: resetwal failed — ${String(e.message).slice(0, 100)}`);
        continue;
      }
      const db = new PGlite(work, { debug: 0 });
      await db.ready;
      let assets = [];
      try { assets = (await db.query('SELECT * FROM assets ORDER BY id')).rows; } catch {}
      let tasks = -1;
      try { tasks = (await db.query('SELECT count(*)::int AS n FROM tasks')).rows[0].n; } catch {}
      await db.close().catch(()=>{});
      results[name] = assets;
      console.log(`${name}: ${assets.length} assets, ${tasks} tasks`);
    } catch (e) {
      console.log(`${name}: FAILED — ${String((e && e.message) || e).slice(0, 120)}`);
    }
  }
  fs.writeFileSync(path.join(TMP, 'all_recovered_assets.json'), JSON.stringify(results, null, 2));
  console.log('---');
  // merge: unique by symbol+name, keep most recent updated_at
  const byKey = new Map();
  let total = 0;
  for (const [name, rows] of Object.entries(results)) {
    for (const r of rows) {
      total++;
      const key = (r.symbol || r.name || '').toUpperCase() + '|' + (r.asset_type || '');
      const prev = byKey.get(key);
      if (!prev || new Date(r.updated_at || r.created_at || 0) > new Date(prev.updated_at || prev.created_at || 0)) {
        byKey.set(key, r);
      }
    }
  }
  const merged = [...byKey.values()];
  console.log(`total rows across copies: ${total}, unique merged: ${merged.length}`);
  fs.writeFileSync(path.join(TMP, 'merged_assets.json'), JSON.stringify(merged, null, 2));
  for (const a of merged) console.log(` - ${a.symbol || a.name} (${a.asset_type}) qty=${a.quantity} value=${a.value} from ${a.created_at}`);
})();
