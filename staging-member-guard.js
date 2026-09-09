(()=>{
  'use strict';
  const cfg=window.AIBT_CONFIG||{};
  if(window.AIBTRuntime?.writesEnabled===true)return;
  const message='Member actions are temporarily locked in staging until the isolated member data path is verified.';
  const lock=()=>{
    const note=document.getElementById('memberMessage');
    if(note)note.textContent=message;
    for(const id of ['memberEmail','memberPassword','registerName','registerPhone','registerEmail','registerPassword']){
      const el=document.getElementById(id); if(el)el.disabled=true;
    }
    document.querySelectorAll('#memberLogin button').forEach(button=>button.disabled=true);
  };
  for(const fn of ['memberSignIn','memberRegister','memberForgot','saveProfile','addAddress','editAddress','retryPayment']){
    window[fn]=async function(){lock();throw new Error('Staging member writes are disabled.');};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(lock,0),{once:true});else setTimeout(lock,0);
  setTimeout(lock,300);
})();
