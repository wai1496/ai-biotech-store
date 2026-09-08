const {requireAdmin}=require('../lib/easyparcel-fulfillment');
const {previewSafety}=require('../lib/preview-safety');

module.exports=async function handler(req,res){
  try{
    previewSafety();
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    await requireAdmin(req);
    const mode=String(process.env.EASYPARCEL_MODE||'demo').trim().toLowerCase();
    const checks={
      apiKey:Boolean(String(process.env.EASYPARCEL_API_KEY||'').trim()),
      pickPostcode:Boolean(String(process.env.EASYPARCEL_PICK_POSTCODE||'').trim()),
      pickState:Boolean(String(process.env.EASYPARCEL_PICK_STATE||'').trim()),
      pickName:Boolean(String(process.env.EASYPARCEL_PICK_NAME||'AI BioTech').trim()),
      pickPhone:Boolean(String(process.env.EASYPARCEL_PICK_PHONE||process.env.EASYPARCEL_PICK_CONTACT||'').trim()),
      pickAddress1:Boolean(String(process.env.EASYPARCEL_PICK_ADDRESS1||process.env.EASYPARCEL_PICK_ADDR1||'').trim()),
      pickCity:Boolean(String(process.env.EASYPARCEL_PICK_CITY||'').trim())
    };
    const missing=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);
    return res.status(200).json({configured:missing.length===0,mode:mode==='live'?'live':'demo',checks,missing});
  }catch(e){
    return res.status(e?.status||500).json({error:e?.message||'Could not check EasyParcel setup.',code:e?.code||'EASYPARCEL_STATUS_FAILED'});
  }
};
