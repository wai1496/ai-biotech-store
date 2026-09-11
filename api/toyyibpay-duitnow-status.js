const {checkDuitNowQRStatus}=require('../lib/toyyibpay');
const {previewSafety}=require('../lib/preview-safety');

module.exports=async function handler(req,res){
  try{
    previewSafety();
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    const result=await checkDuitNowQRStatus();
    return res.status(200).json(result);
  }catch(e){
    console.error('ToyyibPay DuitNow QR status check failed',e?.code||e?.message||e);
    const status=e?.status||((e?.code==='PAYMENT_NOT_CONFIGURED'||e?.code==='PAYMENT_SANDBOX_REQUIRED')?503:502);
    return res.status(status).json({error:e?.message||'Could not check DuitNow QR status.',code:e?.code||'DUITNOW_STATUS_FAILED'});
  }
};
