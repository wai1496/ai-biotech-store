const {requireSandboxConfig,serviceRest,getBillTransactions,persistVerifiedTransaction,callbackHash,safeEqualHex,parseBody}=require('../lib/toyyibpay');

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).send('Method not allowed');
  try{
    const cfg=requireSandboxConfig();
    const body=parseBody(req);
    const expected=callbackHash(cfg.secret,body);
    if(!safeEqualHex(expected,body.hash))return res.status(400).send('Invalid callback hash');
    const orderId=String(body.order_id||'').trim(),billCode=String(body.billcode||'').trim();
    if(!orderId||!billCode)return res.status(400).send('Missing callback reference');
    const rows=await serviceRest(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,user_id,status,grand_total,currency,order_number`);
    const order=Array.isArray(rows)?rows[0]:null;
    if(!order)return res.status(404).send('Order not found');
    const txs=await getBillTransactions(billCode);
    const tx=txs.find(x=>String(x.billExternalReferenceNo||'')===orderId)||txs[0];
    if(!tx)return res.status(409).send('Payment transaction not found');
    await persistVerifiedTransaction(order,billCode,tx);
    return res.status(200).send('OK');
  }catch(e){
    console.error('ToyyibPay callback failed',e?.code||e?.message||e);
    return res.status(e?.code==='PAYMENT_NOT_CONFIGURED'||e?.code==='PAYMENT_SANDBOX_REQUIRED'?503:500).send('Callback processing failed');
  }
};
