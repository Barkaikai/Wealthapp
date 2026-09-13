// Attempt 3: load tarball into in-memory PGlite
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const TMP = path.join(process.env.LOCALAPPDATA, 'Temp', 'wf_recover');
const tars = ['work_a.tar'];

(async () => {
  for (const t of tars) {
    const tp = path.join(TMP, t);
    if (!fs.existsSync(tp)) { console.log(`skip ${t}`); continue; }
    try {
      const db = new PGlite('memory://', { debug: 0 });
      const buf = fs.readFileSync(tp);
      await db.loadDataDir(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      const assets = await db.query('SELECT id, user_id, name, asset_type, value, quantity, created_at FROM assets ORDER BY id');
      const tasks = await db.query('SELECT count(*)::int AS n FROM tasks');
      console.log(`=== ${t}: OPENED — ${assets.rows.length} assets, ${tasks.rows[0].n} tasks`);
      fs.writeFileSync(path.join(TMP, 'recovered_assets.json'), JSON.stringify(assets.rows, null, 2));
      const allTables = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
      console.log('tables:', allTables.rows.map(r => r.table_name).join(', '));
    } catch (e) {
      console.log(`=== ${t}: FAILED — ${String(e.message).slice(0, 300)}`);
    }
  }
})();
