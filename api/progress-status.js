const {authorizeAdmin,getProgressStatus}=require('./_progress-lib');
const {requireAal2}=require('./_mfa-api');

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    res.status(405).json({error:'Method not allowed'});
    return;
  }
  const auth=await authorizeAdmin(req);
  if(!auth.ok){res.status(auth.status).json({error:auth.error});return;}
  const mfa=requireAal2(req);
  if(!mfa.ok){res.status(mfa.status).json({error:mfa.error,code:mfa.code});return;}
  try{
    const status=await getProgressStatus(req,auth);
    res.status(200).json(status);
  }catch(error){
    console.error('Progress status aggregation failed',error?.message||error);
    res.status(500).json({error:'Project status could not be assembled safely.'});
  }
};