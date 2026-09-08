const fs=require('fs');
const assert=require('assert');
for(const path of ['lib/easyparcel.js','lib/easyparcel-fulfillment.js','api/easyparcel-rates.js','api/easyparcel-quote.js','api/easyparcel-book.js','api/easyparcel-track.js','api/easyparcel-status.js','admin-shipping.js']) assert(fs.existsSync(path),`missing ${path}`);
const checkout=fs.readFileSync('checkout.js','utf8');
assert(/easyparcel|shipping quote|shipping_quote/i.test(checkout),'checkout must retain EasyParcel quote integration');
console.log('white-clean-easyparcel-preservation: ok');
