const {runtimeSupabase}=require('./runtime-supabase');
const evidence=require('../docs/contracts/preview-database-evidence.json');
const PROD_SUPABASE_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
const PROD_SUPABASE_PUBLISHABLE_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
const TEMPORARY_PREVIEW_QA_UNLOCK=true; // PR #39 only; revert immediately after disposable QA.
function previewSafety(){
  // VERCEL_ENV policy and PREVIEW_BACKEND_ISOLATION_REQUIRED canonical project checks live in runtimeSupabase.
  const runtime=runtimeSupabase();
  for(const [key,code] of [['EASYPARCEL_MODE','PREVIEW_LIVE_SHIPPING_BLOCKED'],['TOYYIBPAY_MODE','PREVIEW_LIVE_PAYMENT_BLOCKED']]){
    if(String(process.env[key]||'').trim().toLowerCase()==='live'){const e=new Error('Live providers are disabled on this integration.');e.status=503;e.code=code;throw e;}
  }
  if(evidence.status!=='approved'&&!TEMPORARY_PREVIEW_QA_UNLOCK){const e=new Error('Preview writes and provider calls are locked pending isolated database contract evidence.');e.status=503;e.code='PREVIEW_DATABASE_CONTRACT_UNVERIFIED';throw e;}
  return {preview:true,supabaseUrl:runtime.url,temporaryQa:TEMPORARY_PREVIEW_QA_UNLOCK};
}
module.exports={previewSafety,PROD_SUPABASE_URL,PROD_SUPABASE_PUBLISHABLE_KEY};
