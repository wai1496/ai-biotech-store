(()=>{
  'use strict';
  const cfg=window.AIBT_CONFIG||{};
  const supabaseApi=window.supabase;
  if(!supabaseApi||typeof supabaseApi.createClient!=='function')return;
  if(cfg.environment!=='staging'||!cfg.supabaseUrl||!cfg.supabaseKey)return;
  const original=supabaseApi.createClient.bind(supabaseApi);
  const PROD_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
  supabaseApi.createClient=function(url,key,...rest){
    const targetUrl=String(url||'');
    if(targetUrl===PROD_URL){
      console.info('[AI BioTech staging] redirected shared Supabase client to isolated staging project');
      return original(cfg.supabaseUrl,cfg.supabaseKey,...rest);
    }
    return original(url,key,...rest);
  };
  window.AIBT_RUNTIME_BRIDGE={environment:cfg.environment,supabaseUrl:cfg.supabaseUrl,productionClientRedirect:true};
})();
