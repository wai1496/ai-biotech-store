(()=>{
  'use strict';
  window.memberSecurityTab=async function(){
    if(!window.AIBT_MFA||!window.memberPanel)return;
    memberPanel.innerHTML='<h2>Account Security</h2><p>Loading security settings…</p>';
    const panel=await AIBT_MFA.optionalSecurityPanel();
    memberPanel.innerHTML='<h2>Account Security</h2>'+panel+'<div class="aibt-security-box"><h3>Mobile OTP login</h3><p>Phone OTP support is prepared for AI BioTech, but SMS delivery requires a configured Supabase SMS provider before this login method is enabled.</p><p class="muted">Your authenticator app does not depend on SMS and can be used now for optional member 2FA.</p></div>';
  };
})();