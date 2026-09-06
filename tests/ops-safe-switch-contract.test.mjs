import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('ops.html','utf8');

assert.match(html,/id="safeSwitchPanel"/,'Operations must expose the master safe-switch panel');
assert.match(html,/SAFE MODE ON/,'Safe-switch panel must clearly show safe mode');
assert.match(html,/PRODUCTION LOCKED/,'Safe-switch panel must clearly show production lock');
assert.match(html,/AUTOMATED GATES ENFORCED/,'Safe-switch panel must show permanent CI gates');
assert.match(html,/RUNTIME QA PENDING/,'Safe-switch panel must avoid claiming release-ready before runtime QA');
assert.doesNotMatch(html,/PRODUCTION READY/,'Operations must not claim production readiness before release gates are proven');

console.log('Operations safe-switch contract passed.');
