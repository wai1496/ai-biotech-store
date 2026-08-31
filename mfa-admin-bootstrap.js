(()=>{
  'use strict';
  document.documentElement.classList.add('aibt-mfa-pending');
  async function enforce(){
    if(!window.AIBT_MFA)return;
    const {data:{session}}=await AIBT_MFA.client.auth.getSession();
    if(!session)return;
    await AIBT_MFA.requireAdminAal2();
  }
  window.addEventListener('DOMContentLoaded',()=>setTimeout(enforce,0));
  AIBT_MFA.client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT')document.documentElement.classList.add('aibt-mfa-pending');
    if(session&&['SIGNED_IN','TOKEN_REFRESHED','MFA_CHALLENGE_VERIFIED','INITIAL_SESSION'].includes(event))setTimeout(enforce,0);
  });
  window.addEventListener('aibt:mfa-ready',()=>document.documentElement.classList.remove('aibt-mfa-pending'));
})();