const PROD_SUPABASE_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';

function previewSafety(){
  const vercelEnv=String(process.env.VERCEL_ENV||'').trim().toLowerCase();
  if(vercelEnv!=='preview')return {preview:false};
  const supabaseUrl=String(process.env.SUPABASE_URL||'').trim();
  if(!supabaseUrl||supabaseUrl===PROD_SUPABASE_URL){
    const e=new Error('Preview backend isolation is not configured.');
    e.code='PREVIEW_BACKEND_ISOLATION_REQUIRED';
    e.status=503;
    throw e;
  }
  const easyMode=String(process.env.EASYPARCEL_MODE||'demo').trim().toLowerCase();
  if(easyMode==='live'){
    const e=new Error('Live EasyParcel is disabled on Preview deployments.');
    e.code='PREVIEW_LIVE_SHIPPING_BLOCKED';
    e.status=503;
    throw e;
  }
  return {preview:true,supabaseUrl,easyMode};
}

module.exports={previewSafety,PROD_SUPABASE_URL};
