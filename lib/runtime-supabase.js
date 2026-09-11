const APPROVED_ORIGIN='https://rpnwssqvurpdennpzplx.supabase.co';
function fail(message,code='PREVIEW_BACKEND_ISOLATION_REQUIRED'){const e=new Error(message);e.status=503;e.code=code;throw e;}
function vercelEnvironment(){return String(process.env.VERCEL_ENV||'').trim().toLowerCase();}
function runtimeSupabase(){
  const environment=vercelEnvironment();
  if(!['preview','development'].includes(environment))fail('This integration supports explicitly isolated Preview/development only.');
  let url;try{url=new URL(String(process.env.SUPABASE_URL||'').trim());}catch{fail('Preview backend isolation is not configured.');}
  const publishableKey=String(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'').trim();
  if(url.origin!==APPROVED_ORIGIN||url.pathname!=='/'||url.search||url.hash||url.username||url.password||!publishableKey)fail('Only the approved isolated project is allowed.');
  return {environment,url:APPROVED_ORIGIN,publishableKey,serviceKey:String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim()};
}
function requireServiceRuntime(){const runtime=runtimeSupabase();if(!runtime.serviceKey)fail('Server database key is not configured.','SUPABASE_SERVICE_KEY_NOT_CONFIGURED');return runtime;}
module.exports={runtimeSupabase,requireServiceRuntime,vercelEnvironment,APPROVED_ORIGIN};
