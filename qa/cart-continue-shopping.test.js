const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');

assert(html.includes('id="continueShoppingBtn"'),'cart drawer must include a Continue Shopping button');
assert(/CONTINUE SHOPPING/i.test(html),'Continue Shopping must be clearly labeled');
const addStart=app.indexOf('function addCart()');
const renderStart=app.indexOf('function renderCart()',addStart);
assert(addStart>=0&&renderStart>addStart,'addCart function must exist');
const addBody=app.slice(addStart,renderStart);
assert(!addBody.includes("drawer.classList.add('show')"),'adding to cart must not force-open the cart drawer');
assert(app.includes('showCartToast')||app.includes('cartToast'),'adding to cart must give a lightweight confirmation');
console.log('cart continue-shopping contract: ok');
