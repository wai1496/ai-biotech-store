const {requireAdmin}=require('../lib/easyparcel-fulfillment');
const {getOauthTokens}=require('../lib/easyparcel');
const {previewSafety}=require('../lib/preview-safety');

module.exports=async function handler(req,res){
  try{
    previewSafety();
    if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
    await requireAdmin(req);
    const mode=String(process.env.EASYPARCEL_MODE||'sandbox').trim().toLowerCase();
    const checks={
      clientId:Boolean(String(process.env.EASYPARCEL_CLIENT_ID||'').trim()),
      clientSecret:Boolean(String(process.env.EASYPARCEL_CLIENT_SECRET||'').trim()),
      redirectUri:Boolean(String(process.env.EASYPARCEL_REDIRECT_URI||'').trim()),
      pickPostcode:Boolean(String(process.env.EASYPARCEL_PICK_POSTCODE||'').trim()),
      pickState:Boolean(String(process.env.EASYPARCEL_PICK_STATE||'').trim())
    };
    let connected=false;
    try{const tokens=await getOauthTokens();connected=Boolean(tokens?.access_token)}catch(e){if(e?.code!=='EASYPARCEL_OAUTH_NOT_CONNECTED')throw e}
    const missing=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);
    if(!connected)missing.push('oauthConnection');
    return res.status(200).json({configured:missing.length===0,connected,mode:mode==='live'?'live':'sandbox',checks,missing});
  }catch(e){
    return res.status(e?.status||500).json({error:e?.message||'Could not check EasyParcel setup.',code:e?.code||'EASYPARCEL_STATUS_FAILED'});
  }
};
