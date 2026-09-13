// Read-only recovery: open quarantined PGlite dirs and dump assets + task counts
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const WF = __dirname;
const WF_LOCAL = path.join(process.env.LOCALAPPDATA, 'WealthForge');
const LIVE = path.join(WF_LOCAL, 'pglite-fast');

const dirs = [
  path.join(WF_LOCAL, 'pglite-fast.corrupt-20260912a'),
  path.join(WF_LOCAL, 'pglite-fast.bad-manual-20260911'),
  path.join(WF_LOCAL, 'pglite-fast.corrupt-20260911b'),
  path.join(WF_LOCAL, 'pglite-fast.bad-20260911095836'),
  path.join(WF_LOCAL, 'pglite-fast.corrupt-20260910a'),
  path.join(WF_LOCAL, 'pglite-fast.corrupt-20260909'),
  path.join(WF_LOCAL, 'pglite-fast.fresh1-100736'),
  path.join(WF_LOCAL, 'pglite-fast.bad-20260828123853'),
  LIVE,
];

(async () => {
  const report = {};
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const label = path.basename(dir);
    try {
      // copy-on-open is not needed; PGlite opens in place. Do NOT write.
      const db = new PGlite(dir, { debug: 0 });
      const assets = await db.query('SELECT id, user_id, name, asset_type, value, quantity, created_at FROM assets ORDER BY id');
      const tasks = await db.query('SELECT count(*)::int AS n FROM tasks');
      const contacts = await db.query('SELECT count(*)::int AS n FROM contacts');
      report[label] = {
        assets: assets.rows,
        taskCount: tasks.rows[0].n,
        contactCount: contacts.rows[0].n,
      };
      await db.close();
      console.log(`=== ${label}: ${assets.rows.length} assets, ${tasks.rows[0].n} tasks, ${contacts.rows[0].n} contacts`);
    } catch (e) {
      console.log(`=== ${label}: FAILED — ${String(e.message).slice(0, 200)}`);
      report[label] = { error: String(e.message).slice(0, 500) };
    }
  }
  fs.writeFileSync(path.join(WF, 'recovery_report.json'), JSON.stringify(report, null, 2));
  console.log('Wrote recovery_report.json');
})();
