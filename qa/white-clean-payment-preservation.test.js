const fs=require('fs');
const assert=require('assert');
const lib=fs.readFileSync('lib/toyyibpay.js','utf8');
for(const token of ["enableDuitNowQR:'1'",'chargeDuitNowQR','getBillTransactions','persistVerifiedTransaction']) assert(lib.includes(token),`missing ${token}`);
for(const path of ['api/toyyibpay-create.js','api/toyyibpay-callback.js','api/toyyibpay-reconcile.js','api/toyyibpay-duitnow-status.js','payment-return.html','payment-return.js']) assert(fs.existsSync(path),`missing ${path}`);
console.log('white-clean-payment-preservation: ok');
