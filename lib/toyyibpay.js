const {runtimeSupabase}=require('./runtime-supabase');
const crypto=require('crypto');

const GATEWAY='toyyibpay';

function paymentConfig(){
  const mode=String(process.env.TOYYIBPAY_MODE||'').trim().toLowerCase();
  const sandbox=mode==='sandbox';
  const live=mode==='live';
  const secret=sandbox
    ? String(process.env.TOYYIBPAY_SANDBOX_SECRET_KEY||process.env.TOYYIBPAY_SANDBOX_USER_SECRET_KEY||process.env.TOYYIBPAY_SECRET_KEY||'').trim()
    : live
      ? String(process.env.TOYYIBPAY_LIVE_SECRET_KEY||process.env.TOYYIBPAY_SECRET_KEY||'').trim()
      : String(process.env.TOYYIBPAY_SECRET_KEY||'').trim();
  const category=sandbox
    ? String(process.env.TOYYIBPAY_SANDBOX_CATEGORY_CODE||process.env.TOYYIBPAY_CATEGORY_CODE||'').trim()
    : live
      ? String(process.env.TOYYIBPAY_LIVE_CATEGORY_CODE||process.env.TOYYIBPAY_CATEGORY_CODE||'').trim()
      : String(process.env.TOYYIBPAY_CATEGORY_CODE||'').trim();
  return {
    mode,
    secret,
    category,
    serviceKey:String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim(),
    chargeDuitNowQR:String(process.env.TOYYIBPAY_DUITNOW_CHARGE_TO_CUSTOMER||'0').trim()==='1'?'1':'0'
  };
}

function requireSandboxConfig(){
  require('./preview-safety').previewSafety();
  const cfg=paymentConfig();
  if(cfg.mode!=='sandbox'){
    const e=new Error('Main-store payment is not configured for sandbox mode.');e.code='PAYMENT_SANDBOX_REQUIRED';throw e;
  }
  if(!cfg.secret||!cfg.category||!cfg.serviceKey){
    const e=new Error('Main-store sandbox payment credentials are incomplete.');e.code='PAYMENT_NOT_CONFIGURED';throw e;
  }
  return cfg;
}

function bearer(req){
  const h=String(req.headers?.authorization||'');
  return /^Bearer\s+.+/i.test(h)?h:'';
}

async function jsonFetch(url,options={}){
  const r=await fetch(url,options);
  const text=await r.text();
  let body=null;try{body=text?JSON.parse(text):null}catch{body=text}
  if(!r.ok){const e=new Error(typeof body==='object'&&body?.message?body.message:`Upstream request failed (${r.status})`);e.status=r.status;e.body=body;throw e;}
  return body;
}

async function getAuthedUser(req,cfg=requireSandboxConfig()){
  const auth=bearer(req);if(!auth){const e=new Error('Sign in required.');e.status=401;throw e;}
  return jsonFetch(`${runtimeSupabase().url}/auth/v1/user`,{headers:{apikey:runtimeSupabase().publishableKey,Authorization:auth}});
}

async function serviceRest(path,{method='GET',body,prefer}={}){
  const cfg=requireSandboxConfig();
  const headers={apikey:cfg.serviceKey,Authorization:`Bearer ${cfg.serviceKey}`};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(prefer)headers.Prefer=prefer;
  return jsonFetch(`${runtimeSupabase().url}/rest/v1/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
}

async function getOwnedOrder(req,orderId){
  const cfg=requireSandboxConfig();
  const user=await getAuthedUser(req,cfg);
  const rows=await serviceRest(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,user_id,status,grand_total,currency,customer_email,customer_phone`);
  const order=Array.isArray(rows)?rows[0]:null;
  if(!order||order.user_id!==user.id){const e=new Error('Order not found.');e.status=404;throw e;}
  return {order,user};
}

function publicOrigin(req){
  const configured=String(process.env.SITE_URL||'').trim();
  const host=String(req.headers?.host||'').trim().toLowerCase();
  let origin;try{origin=new URL(configured);}catch{throw new Error('Explicit Preview SITE_URL is required.');}
  if(origin.protocol!=='https:'||!origin.hostname.endsWith('.vercel.app')||origin.host!==host||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw new Error('Payment return origin must match this explicit Preview deployment.');
  return origin.origin;
}

function sanitizeBillText(value,max){return String(value||'').replace(/[^a-zA-Z0-9 _-]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}

async function checkDuitNowQRStatus(){
  const cfg=requireSandboxConfig();
  return jsonFetch('https://dev.toyyibpay.com/index.php/api/checkDuitNowQRStatus',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({userSecretKey:cfg.secret}).toString()
  });
}

async function createSandboxBill(order,req){
  const cfg=requireSandboxConfig();
  const origin=publicOrigin(req);
  const amountCents=Math.round(Number(order.grand_total||0)*100);
  if(!Number.isFinite(amountCents)||amountCents<1)throw new Error('Order total is invalid for payment.');
  const form=new URLSearchParams({
    userSecretKey:cfg.secret,
    categoryCode:cfg.category,
    billName:sanitizeBillText(`AI BioTech ${order.order_number||order.id}`,30)||'AI BioTech Order',
    billDescription:sanitizeBillText(`AI BioTech order ${order.order_number||order.id}`,100)||'AI BioTech order',
    billPriceSetting:'1',
    billPayorInfo:'1',
    billAmount:String(amountCents),
    billReturnUrl:`${origin}/payment-return.html`,
    billCallbackUrl:`${origin}/api/toyyibpay-callback`,
    billExternalReferenceNo:String(order.id),
    billTo:'AI BioTech Customer',
    billEmail:String(order.customer_email||'aibiotechs@gmail.com'),
    billPhone:String(order.customer_phone||'0123456789'),
    billSplitPayment:'0',
    billSplitPaymentArgs:'',
    billPaymentChannel:'0',
    billContentEmail:'AI BioTech sandbox payment',
    billChargeToCustomer:'',
    billExpiryDays:'1',
    enableDuitNowQR:'1',
    chargeDuitNowQR:cfg.chargeDuitNowQR
  });
  const raw=await jsonFetch('https://dev.toyyibpay.com/index.php/api/createBill',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()});
  const billCode=Array.isArray(raw)?String(raw[0]?.BillCode||''):'';
  if(!billCode)throw new Error('ToyyibPay did not return a BillCode.');
  return {billCode,paymentUrl:`https://dev.toyyibpay.com/${encodeURIComponent(billCode)}`};
}

async function findPendingPayment(orderId){
  const rows=await serviceRest(`payments?order_id=eq.${encodeURIComponent(orderId)}&gateway=eq.${GATEWAY}&status=eq.pending&select=id,gateway_reference,metadata&order=created_at.desc&limit=1`);
  return Array.isArray(rows)?rows[0]||null:null;
}

async function insertPendingPayment(order,billCode){
  const body={order_id:order.id,user_id:order.user_id,gateway:GATEWAY,amount:Number(order.grand_total),currency:order.currency||'MYR',status:'pending',gateway_reference:billCode,metadata:{mode:'sandbox',bill_code:billCode,order_number:order.order_number||null}};
  const rows=await serviceRest('payments',{method:'POST',body,prefer:'return=representation'});
  return Array.isArray(rows)?rows[0]||null:null;
}

async function getBillTransactions(billCode){
  requireSandboxConfig();
  const form=new URLSearchParams({billCode:String(billCode)});
  const raw=await jsonFetch('https://dev.toyyibpay.com/index.php/api/getBillTransactions',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()});
  return Array.isArray(raw)?raw:[];
}

function mapTransactionStatus(value){
  const s=String(value||'');
  if(s==='1')return {payment:'successful',order:'paid'};
  if(s==='3')return {payment:'failed',order:'pending_payment'};
  return {payment:'pending',order:'pending_payment'};
}

async function getPaymentAttempt(order,billCode){
  const rows=await serviceRest('payments?order_id=eq.'+encodeURIComponent(order.id)+'&gateway=eq.toyyibpay&gateway_reference=eq.'+encodeURIComponent(billCode)+'&select=id,order_id,gateway_reference,status,metadata,amount,currency');
  if(!Array.isArray(rows)||rows.length!==1)throw new Error('Bill is not bound to exactly one stored payment attempt.');
  const attempt=rows[0];
  if(attempt.order_id!==order.id||attempt.gateway_reference!==billCode||(attempt.metadata?.bill_code&&attempt.metadata.bill_code!==billCode))throw new Error('Stored payment attempt references conflict.');
  return attempt;
}
function verifyTransaction(order,attempt,billCode,transactions){
  if(!attempt?.id||attempt.order_id!==order.id||attempt.gateway_reference!==billCode)throw new Error('Unbound bill.');
  if(order.currency!=='MYR'||attempt.currency!=='MYR'||!Number.isFinite(Number(attempt.amount))||Math.round(Number(attempt.amount)*100)!==Math.round(Number(order.grand_total)*100))throw new Error('Stored payment amount or currency conflicts with the order.');
  if(!Array.isArray(transactions)||!transactions.length)return null;
  if(transactions.some(tx=>String(tx.billExternalReferenceNo||'')!==String(order.id)||(tx.billCode&&tx.billCode!==billCode)))throw new Error('Missing or conflicting payment reference.');
  if(transactions.length!==1)throw new Error('Ambiguous payment transactions require review.');
  const tx=transactions[0];
  if(!['1','2','3','4'].includes(String(tx.billpaymentStatus)))throw new Error('Unknown payment status.');
  if(!Number.isFinite(Number(tx.billpaymentAmount))||Math.round(Number(tx.billpaymentAmount)*100)!==Math.round(Number(order.grand_total)*100))throw new Error('Verified payment amount does not match order total.');
  return tx;
}
async function persistVerifiedTransaction(order,billCode,tx,attempt){
  verifyTransaction(order,attempt,billCode,[tx]);
  const mapped=mapTransactionStatus(tx.billpaymentStatus);
  // One server-only transaction must lock the exact attempt/order and apply the
  // approved inventory/wallet/audit transition. No multi-row REST PATCH fallback.
  const result=await serviceRest('rpc/reconcile_payment_attempt_v1',{method:'POST',body:{p_order_id:order.id,p_attempt_id:attempt.id,p_bill_code:billCode,p_status:mapped.payment,p_transaction:tx}});
  const row=Array.isArray(result)?result[0]:result;
  if(!row?.payment_status||!row?.order_status)throw new Error('Database reconciliation did not return authoritative state.');
  return {payment:row.payment_status,order:row.order_status};
}

function callbackHash(secret,{status,order_id,refno}){
  return crypto.createHash('md5').update(`${secret}${status||''}${order_id||''}${refno||''}ok`).digest('hex');
}

function safeEqualHex(a,b){
  const aa=Buffer.from(String(a||'').toLowerCase());const bb=Buffer.from(String(b||'').toLowerCase());
  return aa.length===bb.length&&aa.length>0&&crypto.timingSafeEqual(aa,bb);
}

function parseBody(req){
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  const raw=Buffer.isBuffer(req.body)?req.body.toString('utf8'):String(req.body||'');
  return Object.fromEntries(new URLSearchParams(raw));
}

module.exports={getPaymentAttempt,verifyTransaction,GATEWAY,requireSandboxConfig,getAuthedUser,getOwnedOrder,serviceRest,publicOrigin,checkDuitNowQRStatus,createSandboxBill,findPendingPayment,insertPendingPayment,getBillTransactions,mapTransactionStatus,persistVerifiedTransaction,callbackHash,safeEqualHex,parseBody};
