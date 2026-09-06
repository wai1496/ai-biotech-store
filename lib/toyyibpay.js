const crypto=require('crypto');

const SUPABASE_URL=process.env.SUPABASE_URL||'https://yjauxyvtrmdriwtmckkl.supabase.co';
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
    serviceKey:String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim()
  };
}

function requireSandboxConfig(){
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
  return jsonFetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:cfg.serviceKey,Authorization:auth}});
}

async function serviceRest(path,{method='GET',body,prefer}={}){
  const cfg=requireSandboxConfig();
  const headers={apikey:cfg.serviceKey,Authorization:`Bearer ${cfg.serviceKey}`};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(prefer)headers.Prefer=prefer;
  return jsonFetch(`${SUPABASE_URL}/rest/v1/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
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
  if(process.env.SITE_URL)return String(process.env.SITE_URL).replace(/\/$/,'');
  const host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').split(',')[0].trim();
  const proto=String(req.headers?.['x-forwarded-proto']||'https').split(',')[0].trim()||'https';
  if(!host)throw new Error('Could not determine storefront URL.');
  return `${proto}://${host}`;
}

function sanitizeBillText(value,max){return String(value||'').replace(/[^a-zA-Z0-9 _-]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}

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
    billEmail:String(order.customer_email||''),
    billPhone:String(order.customer_phone||''),
    billPaymentChannel:'0',
    billExpiryDays:'1'
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

async function persistVerifiedTransaction(order,billCode,tx){
  const mapped=mapTransactionStatus(tx?.billpaymentStatus);
  const expectedCents=Math.round(Number(order.grand_total||0)*100);
  const receivedCents=Math.round(Number(tx?.billpaymentAmount||0)*100);
  if(mapped.payment==='successful'&&expectedCents!==receivedCents)throw new Error('Verified payment amount does not match order total.');
  const metadata={mode:'sandbox',bill_code:billCode,transaction_status:String(tx?.billpaymentStatus||''),invoice_no:tx?.billpaymentInvoiceNo||null,channel:tx?.billpaymentChannel||null,checked_at:new Date().toISOString()};
  await serviceRest(`payments?order_id=eq.${encodeURIComponent(order.id)}&gateway=eq.${GATEWAY}`,{method:'PATCH',body:{status:mapped.payment,metadata},prefer:'return=minimal'});
  if(mapped.order==='paid'&&order.status!=='paid')await serviceRest(`orders?id=eq.${encodeURIComponent(order.id)}`,{method:'PATCH',body:{status:'paid'},prefer:'return=minimal'});
  return mapped;
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

module.exports={GATEWAY,requireSandboxConfig,getAuthedUser,getOwnedOrder,serviceRest,publicOrigin,createSandboxBill,findPendingPayment,insertPendingPayment,getBillTransactions,mapTransactionStatus,persistVerifiedTransaction,callbackHash,safeEqualHex,parseBody};
