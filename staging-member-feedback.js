(()=>{
'use strict';
const cfg=window.AIBT_CONFIG||{};
const db=window.supabase?.createClient(cfg.supabaseUrl,cfg.supabaseKey);
if(!db)return;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function showResult(title,message,error=false){
  const d=$('#memberDialog');
  if(!d)return;
  $('#memberDialogTitle').textContent=title;
  $('#memberDialogBody').innerHTML=`<div class="notice${error?' error':''}">${esc(message)}</div>`;
  $('#memberDialogFoot').innerHTML='<button class="btn primary" onclick="closeMemberDialog()">Close</button>';
  d.showModal();
}
window.saveMemberProfile=async()=>{
  const name=String($('#mpName')?.value||'').trim();
  const phone=String($('#mpPhone')?.value||'').trim();
  const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Save Profile');
  if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent='Saving…';}
  try{
    const {data,error}=await db.rpc('member_save_profile',{p_name:name,p_phone:phone});
    if(error)throw error;
    if($('#mpName'))$('#mpName').value=data?.name||name;
    if($('#mpPhone'))$('#mpPhone').value=data?.phone||phone;
    showResult('Profile Saved','Your staging profile was saved successfully.');
  }catch(e){
    showResult('Profile Not Saved',e?.message||String(e),true);
  }finally{
    if(btn){btn.disabled=false;btn.textContent=btn.dataset.oldText||'Save Profile';}
  }
};
})();
