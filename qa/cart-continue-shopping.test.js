const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const flow=fs.readFileSync('cart-flow.js','utf8');

assert(html.includes('/cart-flow.js'),'storefront must load the cart-flow override');
assert(flow.includes('continueShoppingBtn'),'cart drawer must include a Continue Shopping button');
assert(/CONTINUE SHOPPING/i.test(flow),'Continue Shopping must be clearly labeled');
assert(flow.includes('window.addCart=function'),'cart flow must override addCart after the legacy storefront script');
const addStart=flow.indexOf('window.addCart=function');
const tail=flow.slice(addStart);
assert(!tail.includes("drawer.classList.add('show')"),'adding to cart must not force-open the cart drawer');
assert(flow.includes('showCartToast'),'adding to cart must give a lightweight confirmation');
console.log('cart continue-shopping contract: ok');
