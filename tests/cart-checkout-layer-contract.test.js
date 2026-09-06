const fs=require('fs');

const storefront=fs.readFileSync('storefront-visual-fix.js','utf8');
const checkoutHtml=fs.readFileSync('checkout.html','utf8');
const checkoutFix=fs.existsSync('checkout-visual-fix.js')?fs.readFileSync('checkout-visual-fix.js','utf8'):'';

const storefrontRequired=[
  'window.AIBT_LAYER_VISUALS',
  'decorateCartVisuals',
  "localStorage.getItem('aibt_staging_cart')",
  "format==='Cartridge'",
  'categoryHex'
];
for(const token of storefrontRequired){
  if(!storefront.includes(token)) throw new Error(`Missing storefront cart visual contract token: ${token}`);
}

const checkoutRequired=[
  '/storefront-visual-fix.js?v=20260830wp03',
  '/checkout-visual-fix.js?v=20260906wp03'
];
for(const token of checkoutRequired){
  if(!checkoutHtml.includes(token)) throw new Error(`Missing checkout visual dependency: ${token}`);
}

for(const token of ['AIBT_LAYER_VISUALS','checkoutItems','MutationObserver','aibt-checkout-product-visual']){
  if(!checkoutFix.includes(token)) throw new Error(`Missing checkout layered visual contract token: ${token}`);
}

console.log('PASS cart + checkout layered visual contract');
