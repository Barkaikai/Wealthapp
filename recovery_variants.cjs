// Recovery: try opening copies of the corrupted cluster with progressively
// stronger cleanup: remove postmaster.pid, then pg_wal contents, then pg_xact.
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const WF_LOCAL = path.join(process.env.LOCALAPPDATA, 'WealthForge');
const SRC = path.join(WF_LOCAL, 'pglite-fast.corrupt-20260912a');
const TMP = path.join(process.env.LOCALAPPDATA, 'Temp', 'wf_recover');

function copyDir(src, dst) {
  fs.rmSync(dst, { recursive: true, force: true });
  fs.cpSync(src, dst, { recursive: true });
}

async function tryOpen(label, mutate) {
  const work = path.join(TMP, label);
  copyDir(SRC, work);
  try { fs.unlinkSync(path.join(work, 'postmaster.pid')); } catch {}
  if (mutate) mutate(work);
  try {
    const db = new PGlite(work, { debug: 0 });
    await db.ready;
    const assets = await db.query('SELECT * FROM assets ORDER BY id');
    const tasks = await db.query('SELECT count(*)::int AS n FROM tasks');
    console.log(`[${label}] SUCCESS — ${assets.rows.length} assets, ${tasks.rows[0].n} tasks`);
    fs.writeFileSync(path.join(TMP, `assets_${label}.json`), JSON.stringify(assets.rows, null, 2));
    return true;
  } catch (e) {
    console.log(`[${label}] fail — ${String((e && e.message) || e).slice(0, 120)}`);
    return false;
  }
}

(async () => {
  // v1: locks only (baseline)
  await tryOpen('v1_locks');
  // v2: empty pg_wal
  await tryOpen('v2_wal', (w) => {
    for (const f of fs.readdirSync(path.join(w, 'pg_wal'))) {
      if (f !== 'archive_status') { try { fs.unlinkSync(path.join(w, 'pg_wal', f)); } catch {} }
    }
  });
  // v3: empty pg_wal + pg_xact + pg_multixact
  await tryOpen('v3_xact', (w) => {
    for (const dir of ['pg_wal', 'pg_xact', 'pg_multixact', 'pg_commit_ts']) {
      const d = path.join(w, dir);
      if (!fs.existsSync(d)) continue;
      for (const f of fs.readdirSync(d)) {
        if (f === 'archive_status' || f === 'offsets' || f === 'members') continue;
        try { fs.unlinkSync(path.join(d, f)); } catch {}
      }
    }
  });
  process.exit(0);
})();
