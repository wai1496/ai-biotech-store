const {requireAdmin,bookPaidOrder}=require('../lib/easyparcel-fulfillment');
const {previewSafety}=require('../lib/preview-safety');

module.exports=async function handler(req,res){
  try{
    previewSafety();
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    await requireAdmin(req);
    const orderId=String(req.body?.orderId||'').trim();
    if(!orderId)return res.status(400).json({error:'orderId is required'});
    const result=await bookPaidOrder(orderId);
    return res.status(200).json(result);
  }catch(e){
    console.error('EasyParcel booking failed',e?.code||e?.message||e);
    return res.status(e?.status||502).json({error:e?.message||'Could not book EasyParcel shipment.',code:e?.code||'EASYPARCEL_BOOK_FAILED',rate:e?.rate||null});
  }
};