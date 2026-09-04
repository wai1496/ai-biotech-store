(()=>{
  'use strict';
  const STAGING_URL='https://rpnwssqvurpdennpzplx.supabase.co';
  const STAGING_KEY='sb_publishable_x4udjzTcG-t9NW6qusKvZA_Efk2QoXh';
  const host=String(location.hostname||'').toLowerCase();
  const isPreviewHost=/git-(?:feature|review|staging)-/.test(host)||host.includes('research-approval-workflow');
  if(!isPreviewHost||!window.supabase?.createClient)return;
  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  window.AIBT_STAGING_SUPABASE=Object.freeze({url:STAGING_URL,key:STAGING_KEY});
  window.supabase.createClient=(url,key,options)=>originalCreateClient(STAGING_URL,STAGING_KEY,options);
})();
