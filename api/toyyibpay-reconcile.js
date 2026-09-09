const {getPaymentAttempt,verifyTransaction,requireSandboxConfig,getOwnedOrder,getBillTransactions,persistVerifiedTransaction}=require('../lib/toyyibpay');
const {previewSafety}=require('../lib/preview-safety');

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    previewSafety();
    requireSandboxConfig();
    const orderId=String(req.body?.orderId||'').trim(),billCode=String(req.body?.billCode||'').trim();
    if(!orderId||!billCode)return res.status(400).json({error:'orderId and billCode are required'});
    const {order}=await getOwnedOrder(req,orderId);
    const attempt=await getPaymentAttempt(order,billCode);
    const txs=await getBillTransactions(billCode);
    const tx=verifyTransaction(order,attempt,billCode,txs);
    if(!tx)return res.status(200).json({mode:'sandbox',status:'pending',orderStatus:order.status,message:'Payment confirmation is still pending.'});
    if(String(tx.billExternalReferenceNo||'')&&String(tx.billExternalReferenceNo)!==orderId)return res.status(409).json({error:'Payment reference does not match this order.'});
    const mapped=await persistVerifiedTransaction(order,billCode,tx,attempt);
    return res.status(200).json({mode:'sandbox',status:mapped.payment,orderStatus:mapped.order,billCode,invoiceNo:tx.billpaymentInvoiceNo||null});
  }catch(e){
    console.error('ToyyibPay reconcile failed',e?.code||e?.message||e);
    const status=e?.status||((e?.code==='PAYMENT_NOT_CONFIGURED'||e?.code==='PAYMENT_SANDBOX_REQUIRED')?503:502);
    return res.status(status).json({error:e?.message||'Could not verify sandbox payment.',code:e?.code||'PAYMENT_RECONCILE_FAILED'});
  }
};
