const LEGACY_PRODUCTION_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
const LEGACY_PRODUCTION_PUBLISHABLE_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';

function vercelEnvironment(){
  return String(process.env.VERCEL_ENV||'').trim().toLowerCase();
}

function runtimeSupabase(){
  const environment=vercelEnvironment();
  const explicitUrl=String(process.env.SUPABASE_URL||'').trim();
  const explicitPublishableKey=String(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'').trim();
  const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();

  if(environment==='preview'&&(!explicitUrl||!explicitPublishableKey)){
    const error=new Error('Preview Supabase is not explicitly configured. Production fallback is blocked.');
    error.code='PREVIEW_SUPABASE_NOT_CONFIGURED';
    error.status=503;
    throw error;
  }

  return {
    environment,
    url:explicitUrl||LEGACY_PRODUCTION_URL,
    publishableKey:explicitPublishableKey||LEGACY_PRODUCTION_PUBLISHABLE_KEY,
    serviceKey
  };
}

function requireServiceRuntime(){
  const runtime=runtimeSupabase();
  if(!runtime.serviceKey){
    const error=new Error('Server database key is not configured.');
    error.code='SUPABASE_SERVICE_KEY_NOT_CONFIGURED';
    error.status=503;
    throw error;
  }
  return runtime;
}

module.exports={runtimeSupabase,requireServiceRuntime,vercelEnvironment};
