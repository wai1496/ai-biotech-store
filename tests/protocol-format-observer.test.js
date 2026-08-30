const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'admin-protocol-format.js'), 'utf8');

test('protocol formatter must not observe the entire document subtree', () => {
  assert.doesNotMatch(
    source,
    /observer\.observe\(document\.documentElement,\{childList:true,subtree:true\}\)/,
    'Observing the whole document subtree lets the formatter observe its own preview writes and can create a re-entrant loop.'
  );
});

test('protocol formatter ignores mutations originating from its calculation preview', () => {
  assert.match(
    source,
    /aibtDoseCalculationPreview/,
    'Protocol formatter should explicitly recognize its own calculation preview so those writes cannot retrigger formatting.'
  );
});
