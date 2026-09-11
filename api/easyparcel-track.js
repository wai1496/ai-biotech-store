const {requireAdmin,getShipment,trackAwb}=require('../lib/easyparcel-fulfillment');
const {previewSafety}=require('../lib/preview-safety');

module.exports=async function handler(req,res){
  try{
    previewSafety();
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    await requireAdmin(req);
    const orderId=String(req.body?.orderId||'').trim();
    if(!orderId)return res.status(400).json({error:'orderId is required'});
    const shipment=await getShipment(orderId);
    if(!shipment?.tracking_number)return res.status(404).json({error:'No EasyParcel tracking number is saved for this order.'});
    const tracking=await trackAwb(shipment.tracking_number);
    return res.status(200).json({shipment,tracking});
  }catch(e){
    console.error('EasyParcel tracking failed',e?.code||e?.message||e);
    return res.status(e?.status||502).json({error:e?.message||'Could not check EasyParcel tracking.',code:e?.code||'EASYPARCEL_TRACK_FAILED'});
  }
};