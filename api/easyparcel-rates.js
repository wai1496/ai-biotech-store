const {requireUser,requireConfig,quoteRates}=require('../lib/easyparcel');
const {previewSafety}=require('../lib/preview-safety');

module.exports=async function handler(req,res){
  try{
    previewSafety();
    if(req.method==='GET'){
      requireConfig();
      return res.status(200).json({configured:true});
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
    console.error('EasyParcel rate check failed',e?.code||e?.message||e);
    return res.status(e?.status||502).json({error:e?.message||'Could not get EasyParcel rates.',code:e?.code||'EASYPARCEL_RATE_FAILED'});
  }
};
