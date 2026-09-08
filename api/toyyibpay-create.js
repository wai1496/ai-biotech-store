const {requireSandboxConfig,getOwnedOrder,createSandboxBill,findPendingPayment,insertPendingPayment}=require('../lib/toyyibpay');

module.exports=async function handler(req,res){
  try{
    requireSandboxConfig();
    if(req.method==='GET')return res.status(200).json({configured:true,mode:'sandbox'});
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    const orderId=String(req.body?.orderId||'').trim();
    if(!orderId)return res.status(400).json({error:'orderId is required'});
    const {order}=await getOwnedOrder(req,orderId);
    if(order.status!=='pending_payment')return res.status(409).json({error:'Order is not awaiting payment.',code:'ORDER_NOT_PENDING'});
    const existing=await findPendingPayment(order.id);
    const oldBill=String(existing?.metadata?.bill_code||existing?.gateway_reference||'');
    if(oldBill)return res.status(200).json({mode:'sandbox',billCode:oldBill,paymentUrl:`https://dev.toyyibpay.com/${encodeURIComponent(oldBill)}`,reused:true});
    const bill=await createSandboxBill(order,req);
    await insertPendingPayment(order,bill.billCode);
    return res.status(200).json({mode:'sandbox',...bill,reused:false});
  }catch(e){
    console.error('ToyyibPay create failed',e?.code||e?.message||e);
    const status=e?.status||((e?.code==='PAYMENT_NOT_CONFIGURED'||e?.code==='PAYMENT_SANDBOX_REQUIRED')?503:502);
    return res.status(status).json({error:e?.code==='PAYMENT_NOT_CONFIGURED'?'Main-store sandbox payment is not configured yet.':e?.message||'Could not start sandbox payment.',code:e?.code||'PAYMENT_CREATE_FAILED'});
  }
};
