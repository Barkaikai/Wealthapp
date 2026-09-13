// Attempt 2: copy quarantined dirs to clean temp, clean locks, open via tarball load
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PGlite } = require('@electric-sql/pglite');

const WF_LOCAL = path.join(process.env.LOCALAPPDATA, 'WealthForge');
const TMP = path.join(process.env.LOCALAPPDATA, 'Temp', 'wf_recover');
fs.mkdirSync(TMP, { recursive: true });

const dirs = [
  'pglite-fast.corrupt-20260912a',
  'pglite-fast.bad-manual-20260911',
  'pglite-fast.corrupt-20260911b',
];

async function tryOpen(label, srcDir) {
  const work = path.join(TMP, label);
  try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
  try { fs.rmSync(work + '.tar', { force: true }); } catch {}
  try {
    fs.cpSync(srcDir, work, { recursive: true });
    for (const lock of ['postmaster.pid', 'postmaster.opts']) {
      try { fs.unlinkSync(path.join(work, lock)); } catch {}
    }
    // tar it (PGlite-recommended copy format)
    execSync(`tar -cf "${work}.tar" -C "${TMP}" "${label}"`, { shell: 'cmd.exe', stdio: 'ignore' });
    const db = new PGlite('memory://', { debug: 0 });
    await db.loadDataDir? await null : null;
    if (typeof db.loadDataDir === 'function') {
      const buf = fs.readFileSync(work + '.tar');
      await db.loadDataDir(new Uint8Array(buf).buffer ? buf : buf);
    } else {
      throw new Error('no loadDataDir API');
    }
    const assets = await db.query('SELECT id, user_id, name, asset_type, value, quantity, created_at FROM assets ORDER BY id');
    const tasks = await db.query('SELECT count(*)::int AS n FROM tasks');
    console.log(`=== ${label}: OPENED — ${assets.rows.length} assets, ${tasks.rows[0].n} tasks`);
    fs.writeFileSync(path.join(TMP, label + '.assets.json'), JSON.stringify(assets.rows, null, 2));
    return true;
  } catch (e) {
    console.log(`=== ${label}: FAILED — ${String(e.message).slice(0, 160)}`);
    return false;
  }
}

(async () => {
  for (const d of dirs) {
    await tryOpen(d, path.join(WF_LOCAL, d));
  }
})();
