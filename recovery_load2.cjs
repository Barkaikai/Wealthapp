// Attempt 4: open the tarball directly as the data dir (PGlite supports *.tar)
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const TMP = path.join(process.env.LOCALAPPDATA, 'Temp', 'wf_recover');

(async () => {
  const tp = path.join(TMP, 'work_a.tar');
  try {
    const db = new PGlite(tp, { debug: 0 });
    await db.ready;
    const assets = await db.query('SELECT * FROM assets ORDER BY id');
    console.log(`=== OPENED — ${assets.rows.length} assets`);
    const tasks = await db.query('SELECT count(*)::int AS n FROM tasks');
    console.log(`${tasks.rows[0].n} tasks`);
    const tables = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    console.log('tables:', tables.rows.map(r => r.table_name).join(', '));
    fs.writeFileSync(path.join(TMP, 'recovered_assets.json'), JSON.stringify(assets.rows, null, 2));
    console.log('Wrote recovered_assets.json');
    await db.close();
  } catch (e) {
    console.log(`FAILED — ${String(e.stack || e.message).slice(0, 600)}`);
  }
})();
