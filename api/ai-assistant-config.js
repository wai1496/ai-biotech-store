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
    const r=await fetch(`${url}/rest/v1/public_feature_flags?feature_key=eq.ai_storefront_assistant&select=feature_key,enabled,status,version&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
    const data=await r.json();
    if(!r.ok)throw new Error(data?.message||'Feature flag unavailable');
    const flag=Array.isArray(data)&&data[0]?data[0]:{feature_key:'ai_storefront_assistant',enabled:false,status:'missing',version:'0.1.0'};
    res.status(200).json(flag);
  }catch(e){
    res.status(200).json({feature_key:'ai_storefront_assistant',enabled:false,status:'config_error',version:'0.1.0'});
  }
};
