(()=>{
  'use strict';
  const URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
  const KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
  const client=supabase.createClient(URL,KEY);
  let activePromise=null;

  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function ensureUi(){
    if(document.getElementById('aibtMfaDialog'))return;
    const d=document.createElement('dialog');
    d.id='aibtMfaDialog';
    d.className='aibt-mfa-dialog';
    d.innerHTML='<div class="aibt-mfa-card"><div class="aibt-mfa-brand">AI BioTech Security</div><h2 id="aibtMfaTitle">Two-factor authentication</h2><div id="aibtMfaBody"></div><div id="aibtMfaError" class="aibt-mfa-error" role="alert"></div></div>';
    document.body.appendChild(d);
  }

  function show(html,title='Two-factor authentication'){
    ensureUi();
    aibtMfaTitle.textContent=title;
    aibtMfaBody.innerHTML=html;
    aibtMfaError.textContent='';
    if(!aibtMfaDialog.open)aibtMfaDialog.showModal();
  }
  function err(message){ensureUi();aibtMfaError.textContent=message||'Unable to verify two-factor authentication.';}
  function close(){if(document.getElementById('aibtMfaDialog')?.open)aibtMfaDialog.close();}
  function unlock(){document.documentElement.classList.remove('aibt-mfa-pending');close();window.dispatchEvent(new CustomEvent('aibt:mfa-ready'));}
  function lock(){document.documentElement.classList.add('aibt-mfa-pending');}

  async function level(){
    const {data,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(error)throw error;
    return data||{};
  }
  async function verifiedTotp(){
    const {data,error}=await client.auth.mfa.listFactors();
    if(error)throw error;
    return (data?.totp||[]).filter(f=>f.status==='verified');
  }

  async function verifyExisting(factor){
    show('<p>Enter the 6-digit code from your authenticator app.</p><label class="aibt-mfa-label">Authenticator code<input id="aibtMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000"></label><button id="aibtMfaVerify" class="aibt-mfa-primary" type="button">Verify & continue</button><button id="aibtMfaSignOut" class="aibt-mfa-secondary" type="button">Sign out</button>','Verify your identity');
    aibtMfaVerify.onclick=async()=>{
      const code=aibtMfaCode.value.trim();
      if(!/^\d{6}$/.test(code))return err('Enter the 6-digit code from your authenticator app.');
      aibtMfaVerify.disabled=true;
      const {error}=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code});
      aibtMfaVerify.disabled=false;
      if(error)return err(error.message);
      const aal=await level().catch(()=>({}));
      if(aal.currentLevel!=='aal2')return err('Verification completed but the session did not reach AAL2. Please try again.');
      unlock();
    };
    aibtMfaSignOut.onclick=()=>client.auth.signOut().then(()=>location.reload());
    setTimeout(()=>aibtMfaCode?.focus(),50);
  }

  async function enrollTotp(){
    const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'AI BioTech Authenticator'});
    if(error)throw error;
    const qr=data?.totp?.qr_code||'';
    const secret=data?.totp?.secret||'';
    show('<p>Admin 2FA is required. Scan this QR code using Google Authenticator, Microsoft Authenticator, Authy, 1Password or another TOTP app.</p>'+(qr?`<div class="aibt-mfa-qr"><img src="${esc(qr)}" alt="Authenticator QR code"></div>`:'')+(secret?`<details><summary>Can\'t scan the QR?</summary><p>Enter this setup key manually:</p><code class="aibt-mfa-secret">${esc(secret)}</code></details>`:'')+'<label class="aibt-mfa-label">6-digit code<input id="aibtMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000"></label><button id="aibtMfaVerify" class="aibt-mfa-primary" type="button">Activate 2FA</button><button id="aibtMfaSignOut" class="aibt-mfa-secondary" type="button">Cancel & sign out</button>','Set up admin 2FA');
    aibtMfaVerify.onclick=async()=>{
      const code=aibtMfaCode.value.trim();
      if(!/^\d{6}$/.test(code))return err('Enter the 6-digit code shown in your authenticator app.');
      aibtMfaVerify.disabled=true;
      const {error:verifyError}=await client.auth.mfa.challengeAndVerify({factorId:data.id,code});
      aibtMfaVerify.disabled=false;
      if(verifyError)return err(verifyError.message);
      const aal=await level().catch(()=>({}));
      if(aal.currentLevel!=='aal2')return err('2FA was enrolled but this session is not AAL2 yet. Sign in again and verify your code.');
      unlock();
    };
    aibtMfaSignOut.onclick=async()=>{try{await client.auth.mfa.unenroll({factorId:data.id});}catch{}await client.auth.signOut();location.reload();};
  }

  async function requireAdminAal2(){
    lock();
    if(activePromise)return activePromise;
    activePromise=(async()=>{
      const {data:{user}}=await client.auth.getUser();
      if(!user){return false;}
      const admin=await client.from('admin_users').select('active,role').eq('user_id',user.id).maybeSingle();
      if(admin.error||!admin.data?.active){await client.auth.signOut();return false;}
      const aal=await level();
      if(aal.currentLevel==='aal2'){unlock();return true;}
      const factors=await verifiedTotp();
      if(factors.length){await verifyExisting(factors[0]);return false;}
      await enrollTotp();
      return false;
    })().catch(e=>{err(e.message);return false;}).finally(()=>{activePromise=null;});
    return activePromise;
  }

  async function optionalSecurityPanel(){
    const {data:{user}}=await client.auth.getUser();
    if(!user)return '<p>Sign in to manage two-factor authentication.</p>';
    const {data,error}=await client.auth.mfa.listFactors();
    if(error)return `<p>${esc(error.message)}</p>`;
    const factors=[...(data?.totp||[]),...(data?.phone||[])].filter(f=>f.status==='verified');
    const aal=await level().catch(()=>({}));
    return `<div class="aibt-security-box"><h3>Two-factor authentication</h3><p>Status: <b>${factors.length?'Enabled':'Not enabled'}</b> · Session: <b>${esc(aal.currentLevel||'aal1')}</b></p><p>Authenticator 2FA is optional for members and required for administrators.</p><button class="btn" type="button" onclick="AIBT_MFA.enrollOptional()">${factors.length?'Add another authenticator':'Enable authenticator 2FA'}</button>${factors.length?`<div class="aibt-factor-list">${factors.map(f=>`<div>${esc(f.friendly_name||f.factor_type||'Factor')} · ${esc(f.status)}</div>`).join('')}</div>`:''}<p class="muted">Mobile OTP login/fallback will become available after an SMS provider is configured.</p></div>`;
  }

  async function enrollOptional(){lock();try{await enrollTotp();}catch(e){err(e.message);}}

  async function sendPhoneLogin(phone){
    const value=String(phone||'').trim();
    if(!/^\+[1-9]\d{7,14}$/.test(value))throw new Error('Use international format, for example +60123456789.');
    const {error}=await client.auth.signInWithOtp({phone:value,options:{shouldCreateUser:false}});
    if(error)throw error;
    return true;
  }
  async function verifyPhoneLogin(phone,token){
    const {data,error}=await client.auth.verifyOtp({phone:String(phone||'').trim(),token:String(token||'').trim(),type:'sms'});
    if(error)throw error;
    return data;
  }

  window.AIBT_MFA={client,lock,unlock,requireAdminAal2,optionalSecurityPanel,enrollOptional,sendPhoneLogin,verifyPhoneLogin,getLevel:level};
})();