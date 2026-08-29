const STAGING_URL='https://rpnwssqvurpdennpzplx.supabase.co';
const STAGING_KEY='sb_publishable_x4udjzTcG-t9NW6qusKvZA_Efk2QoXh';
module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return;}
  res.setHeader('Cache-Control','no-store');
  const isProd=process.env.VERCEL_ENV==='production';
  if(isProd&&process.env.AIBT_PUBLIC_AI_ENABLED!=='true'){
    res.status(200).json({feature_key:'ai_storefront_assistant',enabled:false,status:'production_locked',version:'0.1.0'});return;
  }
  const url=process.env.AIBT_STAGING_SUPABASE_URL||STAGING_URL;
  const key=process.env.AIBT_STAGING_SUPABASE_KEY||STAGING_KEY;
  try{
    const r=await fetch(`${url}/rest/v1/rpc/get_public_feature_flag`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({p_feature_key:'ai_storefront_assistant'})});
    const data=await r.json();
    if(!r.ok)throw new Error(data?.message||'Feature flag unavailable');
    res.status(200).json(data);
  }catch(e){
    res.status(200).json({feature_key:'ai_storefront_assistant',enabled:false,status:'config_error',version:'0.1.0'});
  }
};
