import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const exists = file => fs.existsSync(file);
const config = read('staging-config.js');
const index = read('index.html');
const store = read('clean-store.js');

const requiredAssets = [
  'assets/vial-master-v4.svg',
  'assets/pen-master-v4.svg',
  'assets/cartridge-master-v5.svg',
  'assets/vial-cap-mask.svg',
  'assets/vial-stopper-mask.svg',
  'assets/vial-strength-mask.svg',
  'product-visuals.css'
];

for (const file of requiredAssets) {
  assert.equal(exists(file), true, `${file} must exist for WP-03`);
}

assert.equal(/master-pending/i.test(config), false, 'staging-config.js must not use pending Vial/Pen masters');
assert.match(config, /Vial:\s*['"]\/assets\/vial-master-v4\.svg/);
assert.match(config, /Pen:\s*['"]\/assets\/pen-master-v4\.svg/);
assert.match(config, /Cartridge:\s*['"]\/assets\/cartridge-master-v5\.svg/);

for (const file of ['assets/vial-master-v4.svg', 'assets/pen-master-v4.svg', 'assets/cartridge-master-v5.svg']) {
  const svg = read(file);
  assert.match(svg, /viewBox=['"]0 0 \d+ \d+['"]/i, `${file} must provide a square SVG viewBox`);
  const viewBox = svg.match(/viewBox=['"]0 0 (\d+) (\d+)['"]/i);
  assert.equal(viewBox?.[1], viewBox?.[2], `${file} must be 1:1`);
  assert.match(svg, /data:image\/(?:webp|png);base64,/i, `${file} must embed its approved transparent product artwork`);
  assert.equal(/<rect[^>]+(?:fill=['"]#(?:000|000000)|style=['"][^'"]*fill:\s*#(?:000|000000))/i.test(svg), false, `${file} must not draw a black background rectangle`);
}

for (const file of ['assets/vial-cap-mask.svg', 'assets/vial-stopper-mask.svg', 'assets/vial-strength-mask.svg']) {
  const svg = read(file);
  assert.match(svg, /viewBox=['"]0 0 384 384['"]/i, `${file} must align to the 384×384 Vial master coordinate system`);
  assert.match(svg, /data:image\/png;base64,/i, `${file} must contain an exact alpha mask derived from the approved Vial master`);
}

assert.ok(index.indexOf('/product-visuals.css') > index.indexOf('/clean-store.css'), 'product-visuals.css must load after base storefront CSS');
assert.match(store, /class=\"product-visual-stage/);
assert.match(store, /class=\"product-visual-overlay/);
assert.match(store, /data-overlay-mode=/);
assert.match(store, /fitVisualText/);

const css = read('product-visuals.css');
assert.match(css, /vial-cap-mask\.svg/);
assert.match(css, /vial-stopper-mask\.svg/);
assert.match(css, /vial-strength-mask\.svg/);
assert.match(css, /data-overlay-mode=['"]none['"]/);
assert.match(css, /isolation:\s*isolate/);
assert.equal(/product-card\[data-format=['"]Cartridge['"]\][^{]*\.dynamic-label/i.test(css), false, 'Cartridge must not have dynamic label positioning rules');

console.log('PASS: final Vial/Pen/Cartridge master asset and overlay contract');
