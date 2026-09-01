const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const core = require(path.join(root, 'storefront-navigation-core.js'));

assert.notStrictEqual(core.navPurpose('CATALOG'), core.navPurpose('PEPTIDES'), 'Catalog and Peptides must serve different purposes');
assert.strictEqual(core.navPurpose('CATALOG'), 'catalog');
assert.strictEqual(core.navPurpose('PEPTIDES'), 'peptides-menu');
assert.strictEqual(core.navPurpose('ABOUT US'), 'about');
assert.deepStrictEqual(core.categoryKeys(), ['Metabolism','Regeneration','Healing','Brain & Sleep','Bonding','Longevity','Hormone','Special Blend','Solvent']);

const css = fs.readFileSync(path.join(root, 'storefront-navigation.css'), 'utf8');
assert.match(css, /\.product\s*>\s*\.visual\s*>\s*img/, 'direct product images need a mobile safe-area rule');
assert.match(css, /object-fit\s*:\s*contain/, 'product images must use object-fit: contain');
assert.match(css, /padding\s*:\s*(?:1[2468]|20)px/, 'direct product images need internal mobile padding');
assert.match(css, /\.aibt-peptide-menu/, 'Peptides must have its own menu styling');
assert.match(css, /#aboutUs/, 'About Us must target a dedicated section');

const runtime = fs.readFileSync(path.join(root, 'storefront-navigation.js'), 'utf8');
assert.doesNotMatch(runtime, /window\.category\s*=/, 'runtime must update the existing global lexical category binding, not create window.category');
assert.doesNotMatch(runtime, /window\.showAll\s*=/, 'runtime must update the existing global lexical showAll binding, not create window.showAll');
assert.doesNotMatch(runtime, /window\.CAT\?\./, 'runtime must read the existing CAT lexical binding');

console.log('storefront navigation/media QA contracts passed');
