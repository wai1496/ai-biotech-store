const {requireUser,requireConfig,quoteRates,getOauthTokens}=require('../lib/easyparcel');
const {previewSafety}=require('../lib/preview-safety');

function configPresence(){
  return {
    configured:{
      EASYPARCEL_CLIENT_ID:Boolean(String(process.env.EASYPARCEL_CLIENT_ID||'').trim()),
      EASYPARCEL_CLIENT_SECRET:Boolean(String(process.env.EASYPARCEL_CLIENT_SECRET||'').trim()),
      EASYPARCEL_REDIRECT_URI:Boolean(String(process.env.EASYPARCEL_REDIRECT_URI||'').trim()),
      EASYPARCEL_PICK_POSTCODE:Boolean(String(process.env.EASYPARCEL_PICK_POSTCODE||'').trim()),
      EASYPARCEL_PICK_STATE:Boolean(String(process.env.EASYPARCEL_PICK_STATE||'').trim())
    }
  };
}

module.exports=async function handler(req,res){
  try{
    previewSafety();
    if(req.method==='GET'){
      requireConfig();
      await getOauthTokens();
      return res.status(200).json({configured:true,oauthConnected:true});
    }
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    await requireUser(req);
    const postcode=String(req.body?.postcode||'').trim();
    const state=String(req.body?.state||'').trim();
    const parcelValue=Number(req.body?.parcelValue||0);
    const weight=Number(req.body?.weight||0)||undefined;
    const result=await quoteRates({postcode,state,parcelValue,weight});
    return res.status(200).json(result);
  }catch(e){
    if(['EASYPARCEL_OAUTH_NOT_CONFIGURED','EASYPARCEL_PICKUP_NOT_CONFIGURED','EASYPARCEL_OAUTH_NOT_CONNECTED'].includes(e?.code))console.error('EasyParcel rate check config presence',JSON.stringify(configPresence()));
    console.error('EasyParcel rate check failed',e?.code||e?.message||e);
    return res.status(e?.status||502).json({error:e?.message||'Could not get EasyParcel rates.',code:e?.code||'EASYPARCEL_RATE_FAILED'});
  }
};
