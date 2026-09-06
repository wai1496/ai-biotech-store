import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = p => fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
const admin = read('admin.html');
const ops = read('ops-control.js');
const resolver = read('product-visual-resolver.js');
const assetCheck = read('scripts/product-master-assets-check.mjs');

assert.match(admin, /url=\/ops\.html|location\.replace\('\/ops\.html'\)/i, 'legacy admin must redirect to Operations');
assert.match(ops, /Media & Placeholder Templates/);
assert.match(ops, /ops_save_media_template/);
assert.match(ops, /media_templates/);
assert.match(resolver, /overlayAllowed:format==='Vial'\|\|format==='Pen'/, 'master overlays must remain limited to Vial/Pen');
assert.match(resolver, /format!==['"]Cartridge['"]/, 'approved custom Cartridge images must not allow dynamic overlays');
assert.match(assetCheck, /cartridge-master-v5\.svg/);
assert.match(assetCheck, /no-overlay Cartridge contract/);

console.log('PASS: Cartridge master is managed through Operations Media and remains no-overlay');
