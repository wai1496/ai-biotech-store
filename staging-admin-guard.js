/* Staging Admin safety gate: unlock only when runtime is pinned to the isolated Staging Supabase project. */
(()=>{
  const STAGING_PROJECT='rpnwssqvurpdennpzplx';
  const expectedUrl=`https://${STAGING_PROJECT}.supabase.co`;

  function hardLock(reason){
    const note=document.createElement('p');
    note.setAttribute('role','status');
    note.textContent=`PREVIEW ADMIN LOCKED — ${reason||'isolated database and administrator permissions are not verified.'} No sign-in or writes are enabled.`;
    document.body.prepend(note);
    document.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=true);
  }

  function verify(){
    const cfg=window.AIBT_CONFIG||{};
    const environment=String(cfg.environment||'').trim().toLowerCase();
    const supabaseUrl=String(cfg.supabaseUrl||'').trim().replace(/\/$/,'');
    if(environment!=='staging' || supabaseUrl!==expectedUrl){
      hardLock('runtime is not pinned to the verified isolated Staging database.');
      return;
    }
    document.documentElement.dataset.aibtAdminSafety='verified-staging';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',verify,{once:true});else verify();
})();
