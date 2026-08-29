(()=>{
'use strict';

function syncAdminGlobals(){
  try{
    window.protocolVariants=protocolVariants;
    window.protocolConfigs=protocolConfigs;
    window.rows=rows;
  }catch(_){ }
}

const baseProtocolAdminPage=protocolAdminPage;
window.protocolAdminPage=protocolAdminPage=async function(){
  const result=await baseProtocolAdminPage();
  syncAdminGlobals();
  return result;
};

const baseEditProtocol=editProtocol;
window.editProtocol=editProtocol=function(id=null){
  window.__aibtEditingProtocolId=id||null;
  if(window.saveEdit){saveEdit.textContent='Save';saveEdit.disabled=false;}
  syncAdminGlobals();
  return baseEditProtocol(id);
};

const baseEditProduct=editProduct;
window.editProduct=editProduct=async function(index){
  await baseEditProduct(index);
  const row=rows[index]||{};
  const f=editForm.elements;
  if(!f.p_category_id){
    const label=document.createElement('label');
    label.textContent='Category';
    const select=document.createElement('select');
    select.name='p_category_id';
    select.innerHTML='<option value="">No category</option>'+(categories||[]).map(c=>`<option value="${esc(c.id)}" ${c.id===row.category_id?'selected':''}>${esc(c.name)}</option>`).join('');
    label.appendChild(select);
    fields.insertBefore(label,fields.firstElementChild?.nextSibling||null);
  }
  if(!f.p_product_type){
    const label=document.createElement('label');
    label.textContent='Product type';
    const input=document.createElement('input');
    input.name='p_product_type';
    input.value=row.product_type||'peptide';
    input.placeholder='peptide';
    label.appendChild(input);
    fields.insertBefore(label,fields.firstElementChild?.nextSibling||null);
  }
};

editor?.addEventListener('close',()=>{
  window.__aibtEditingProtocolId=null;
  if(window.saveEdit){saveEdit.textContent='Save';saveEdit.disabled=false;}
});

window.addEventListener('unhandledrejection',event=>{
  const message=event.reason?.message||String(event.reason||'Unexpected error');
  console.error('AI BioTech admin error',event.reason);
  if(window.editor?.open&&typeof flash==='function')flash(message);
});

syncAdminGlobals();
})();
