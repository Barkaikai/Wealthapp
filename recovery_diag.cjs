// Attempt 5: catch full error details + try dumpDataDir-based inspection
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const TMP = path.join(process.env.LOCALAPPDATA, 'Temp', 'wf_recover');

(async () => {
  const tp = path.join(TMP, 'work_a.tar');
  try {
    const db = new PGlite(tp, { debug: 1 });
    await db.ready;
    console.log('READY OK');
    await db.close();
  } catch (e) {
    console.log('ERROR NAME:', e && e.name);
    console.log('ERROR MESSAGE:', e && e.message);
    console.log('ERROR STRING:', String(e));
    if (e && e.cause) console.log('CAUSE:', String(e.cause).slice(0, 500));
    try { console.log('STACK:', String(e.stack).slice(0, 800)); } catch {}
  }
  process.exit(0);
})();
