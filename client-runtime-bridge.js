/* Every Preview client enters here; absent configuration never falls back. */
(()=>{
  'use strict';
  const APPROVED='https://rpnwssqvurpdennpzplx.supabase.co';
  const cfg=window.AIBT_CONFIG;
  let valid=false;
  try { const u=new URL(cfg.supabaseUrl); valid=cfg.environment==='staging'&&u.origin===APPROVED&&u.pathname==='/'&&!u.search&&!u.hash&&!u.username&&!u.password&&typeof cfg.supabaseKey==='string'&&!!cfg.supabaseKey.trim(); } catch {}
  const qaRoutes=new Set(['/member.html','/checkout.html','/payment-return.html']);
  const writesEnabled=valid&&qaRoutes.has(String(window.location?.pathname||''))&&cfg.checkoutEnabled===true&&cfg.memberEnabled===true;
  const error={message:'Preview actions locked: authenticated QA is not enabled.',code:'PREVIEW_WRITES_LOCKED'};
  const denied=()=>Promise.resolve({data:null,error});
  const query=new Proxy({}, {get:(_,key)=>key==='then'?((ok)=>Promise.resolve({data:null,error}).then(ok)):()=>query});
  const locked={from:()=>query,rpc:denied,auth:new Proxy({}, {get:(_,key)=>key==='getSession'?()=>Promise.resolve({data:{session:null},error}):key==='getUser'?()=>Promise.resolve({data:{user:null},error}):key==='onAuthStateChange'?()=>({data:{subscription:{unsubscribe(){}}}}):denied})};
  const original=window.supabase?.createClient?.bind(window.supabase);
  let catalog,operational;
  function createClient(options={}) {
    if(!valid||!original)return locked;
    if(options.access==='catalog'){
      if(!catalog)catalog=original(APPROVED,cfg.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
      const tables=new Set(['products','variants','categories','research_entries','pages','media_templates']);
      return {auth:locked.auth,rpc:denied,from(table){
        if(!tables.has(table))return query;
        return {select:(...args)=>catalog.from(table).select(...args)};
      }};
    }
    if(!writesEnabled)return locked;
    if(!operational)operational=original(APPROVED,cfg.supabaseKey);
    return operational;
  }
  window.AIBTRuntime=Object.freeze({createClient,valid,writesEnabled,reason:writesEnabled?'Temporary authenticated Preview QA against isolated Staging only.':error.message,scope:'preview-rpnwssqvurpdennpzplx'});
  if(window.supabase)window.supabase.createClient=()=>locked;
})();
