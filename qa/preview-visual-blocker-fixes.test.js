const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const approvedAssets = [
  {
    path: 'assets/vial-master-approved.webp',
    sha256: '1baac70a84c67911994124622099dbe9a7348679b2fa96ce77e5b431df338831',
  },
  {
    path: 'assets/pen-master-approved.webp',
    sha256: 'a2489302370a8e43576d47939978d9228152b945bd03a05a44bfe9bea9a17705',
  },
];

for (const asset of approvedAssets) {
  assert(fs.existsSync(asset.path), `missing approved master asset: ${asset.path}`);
  const digest = crypto.createHash('sha256').update(fs.readFileSync(asset.path)).digest('hex');
  assert.equal(digest, asset.sha256, `unexpected approved master contents: ${asset.path}`);
}

const html = fs.readFileSync('index.html', 'utf8');
assert(
  html.includes('/storefront-preview-visual-fixes.css'),
  'missing focused Preview visual-fix stylesheet',
);

const css = fs.readFileSync('storefront-preview-visual-fixes.css', 'utf8');
assert.match(css, /html,\s*body\s*\{[^}]*overflow-x:\s*hidden/s, 'document overflow containment missing');
assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*\.toolbar\s*\{[^}]*minmax\(0,\s*1fr\)/, '720px toolbar containment missing');
assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*\.header-main\s*\{[^}]*minmax\(0,\s*1fr\)/, 'small-screen header containment missing');
assert.match(css, /\.product-media\s*\{[^}]*pointer-events:\s*none/, 'product media must not intercept product buttons');
assert.match(css, /\.toast\s*\{[^}]*pointer-events:\s*none/, 'toast must not intercept product buttons');
assert.match(css, /\.product-name\s*\{[^}]*scroll-margin-top:/, 'product button sticky-header clearance missing');

console.log('Preview visual blocker regression checks passed');
