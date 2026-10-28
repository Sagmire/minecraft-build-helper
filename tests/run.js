'use strict';

// Runs every tests/*.test.js in a real browser (Chromium) and fails if any check fails or the
// page shows an error. Usage: npm test            (all tests)
//                             npm test -- planner (only files whose name contains "planner")

const fs = require('fs');
const path = require('path');
const { TestRun } = require('./helpers');

(async () => {
  const filter = process.argv[2] || '';
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js') && f.includes(filter)).sort();
  let failed = 0;
  let total = 0;
  for (const file of files) {
    const t = new TestRun(file);
    const started = Date.now();
    try {
      await require(path.join(__dirname, file))(t);
    } catch (e) {
      t.check('runs to the end', false, e.message.split('\n')[0]);
    }
    await t.close();
    const bad = t.checks.filter(c => !c.pass);
    total += t.checks.length;
    failed += bad.length + t.errors.length;
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`${bad.length || t.errors.length ? '✗' : '✓'} ${file}: ${t.checks.length - bad.length}/${t.checks.length} checks (${secs}s)`);
    for (const c of bad) console.log(`    ✗ ${c.what}${c.detail ? ` — ${c.detail}` : ''}`);
    for (const e of t.errors) console.log(`    ✗ page error: ${e}`);
  }
  console.log(failed ? `\n${failed} problem(s) in ${total} checks` : `\nAll ${total} checks passed`);
  process.exit(failed ? 1 : 0);
})();
