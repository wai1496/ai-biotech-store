const fs=require('fs');
const assert=require('assert');
const required=['api/toyyibpay-create.js','api/toyyibpay-callback.js','api/toyyibpay-reconcile.js','payment-return.html','payment-return.js'];
for(const f of required)assert(fs.existsSync(f),`missing ${f}`);
const create=fs.readFileSync('api/toyyibpay-create.js','utf8');
const callback=fs.readFileSync('api/toyyibpay-callback.js','utf8');
const reconcile=fs.readFileSync('api/toyyibpay-reconcile.js','utf8');
const checkout=fs.readFileSync('checkout.js','utf8');
const ret=fs.readFileSync('payment-return.js','utf8');
for(const src of [create,callback,reconcile]){
  assert(src.includes('TOYYIBPAY_MODE'),'payment API must require explicit ToyyibPay mode');
  assert(src.includes('sandbox'),'payment API must be sandbox-gated');
  assert(!src.includes('https://toyyibpay.com/index.php/api/createBill'),'sandbox code must not use live createBill URL');
}
assert(create.includes('https://dev.toyyibpay.com/index.php/api/createBill'),'create endpoint must use ToyyibPay sandbox createBill');
assert(create.includes('TOYYIBPAY_SECRET_KEY')&&create.includes('TOYYIBPAY_CATEGORY_CODE'),'create endpoint must use dedicated main-store ToyyibPay credentials');
assert(create.includes('SUPABASE_SERVICE_ROLE_KEY'),'payment persistence must require server-side Supabase service credentials');
assert(callback.includes('createHash')&&callback.includes("'md5'")&&callback.includes('ok'),'callback must validate ToyyibPay MD5 hash');
assert(callback.includes("status==='1'")||callback.includes('status === \'1\''),'callback must explicitly handle successful status');
assert(reconcile.includes('getBillTransactions'),'return reconciliation must verify payment with ToyyibPay, not trust query parameters');
assert(reconcile.includes("'successful'")&&reconcile.includes("'paid'"),'verified payment must mark payment successful and order paid');
assert(checkout.includes('/api/toyyibpay-create'),'checkout must initiate ToyyibPay payment after order creation');
assert(!checkout.includes("localStorage.removeItem('aibt_cart');cart=[];renderCart();msg('Order created successfully."),'checkout must not clear cart before verified payment');
assert(ret.includes('/api/toyyibpay-reconcile'),'return page must reconcile payment server-side');
assert(ret.includes("localStorage.removeItem('aibt_cart')"),'cart may clear only after verified success on return');
console.log('ToyyibPay sandbox contract: ok');
