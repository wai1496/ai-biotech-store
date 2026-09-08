const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
for(const token of ['STAGING PREVIEW — ISOLATED FROM PRODUCTION WRITES','class="site-header"','class="hero-inner"','class="trust-strip"','id="categoryChips"','id="productGrid"','id="mobileMenu"','class="mobile-sticky-cart"']){
  assert(html.includes(token),`missing White Clean shell token: ${token}`);
}
assert(!html.includes('SCIENCE.<br>PRECISION.'),'Dark Biotech hero must not be the Core v1 shell');
console.log('white-clean-shell: ok');
