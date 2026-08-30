(()=>{'use strict';
function isRecoveryUrl(){const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.replace(/^#/,''));return q.get('type')==='recovery'||h.get('type')==='recovery'||q.has('code')||h.get('type')==='recovery'}
function show(){const l=document.getElementById('login'),a=document.getElementById('app'),r=document.getElementById('recovery');if(l)l.hidden=true;if(a)a.hidden=true;if(r)r.hidden=false}
const originalReset=window.resetPassword;
window.resetPassword=async function(){const address=document.getElementById('email')?.value.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(address||'')){document.getElementById('loginError').textContent='Enter a valid administrator email first.';return}const redirect=location.origin+'/admin.html?type=recovery';const {error}=await sb.auth.resetPasswordForEmail(address,{redirectTo:redirect});document.getElementById('loginError').textContent=error?error.message:'If this account exists, a reset email has been sent.'}
const originalBoot=window.boot;
window.boot=async function(){if(isRecoveryUrl()){show();return}return originalBoot()}
const originalSave=window.saveNewPassword;
window.saveNewPassword=async function(){const input=document.getElementById('newPassword'),err=document.getElementById('recoveryError');if((input?.value||'').length<8){err.textContent='Use at least 8 characters.';return}const {error}=await sb.auth.updateUser({password:input.value});if(error){err.textContent=error.message;return}history.replaceState({},'',location.origin+'/admin.html');document.getElementById('recovery').hidden=true;if(window.flash)flash('Password updated successfully');return originalBoot()}
if(isRecoveryUrl())show();sb.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'||isRecoveryUrl())show()});
})();