const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
for(const token of ['mobile-menu-btn','id="mobileMenu"','openStageAccount()','class="mobile-sticky-cart"','data-cart-count']) assert(html.includes(token),`missing mobile contract ${token}`);
console.log('white-clean-mobile-contract: ok');
