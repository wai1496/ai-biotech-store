const PROD_SUPABASE_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
const PROD_SUPABASE_PUBLISHABLE_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';

function previewSafety(){
  const vercelEnv=String(process.env.VERCEL_ENV||'').trim().toLowerCase();
  if(vercelEnv!=='preview')return {preview:false};

  const supabaseUrl=String(process.env.SUPABASE_URL||'').trim();
  const publishableKey=String(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'').trim();
  if(!supabaseUrl||supabaseUrl===PROD_SUPABASE_URL||!publishableKey||publishableKey===PROD_SUPABASE_PUBLISHABLE_KEY){
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

  const paymentMode=String(process.env.TOYYIBPAY_MODE||'').trim().toLowerCase();
  if(paymentMode==='live'){
    const e=new Error('Live ToyyibPay is disabled on Preview deployments.');
    e.code='PREVIEW_LIVE_PAYMENT_BLOCKED';
    e.status=503;
    throw e;
  }

  return {preview:true,supabaseUrl,easyMode,paymentMode};
}

module.exports={previewSafety,PROD_SUPABASE_URL,PROD_SUPABASE_PUBLISHABLE_KEY};
