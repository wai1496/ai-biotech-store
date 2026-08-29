(()=>{
'use strict';

function protocolSetupState(x){
  const v=customerProtocolVariants?.[x.variant_id]||{};
  const template=(customerProtocolTemplates||[]).find(t=>t.variant_id===x.variant_id&&['verified','published'].includes(t.status));
  const cfg=customerProtocolConfigs?.[x.variant_id];
  return {v,template,cfg,ready:!!template&&cfg?.configuration_status==='verified'};
}

window.openMissingProtocolSetup=async function(index){
  const x=customerProtocols?.[index];
  if(!x)return flash('Protocol assignment not found');
  const {v}=protocolSetupState(x);
  flash(`Opening exact protocol setup for ${v.products?.name||v.product_id||x.variant_id} ${v.strength_label||''} ${v.format||''}`);
  await view('protocols');
  setTimeout(()=>{
    const exact=protocolVariants.find(p=>p.id===x.variant_id);
    if(exact) openReferenceBuilder(exact.id);
    else flash('Exact variant was not found in the protocol library');
  },120);
};

const baseRenderCustomerProtocolCards=window.renderCustomerProtocolCards||renderCustomerProtocolCards;
window.renderCustomerProtocolCards=renderCustomerProtocolCards=function(){
  const input=document.getElementById('protocolQueueSearch');
  const q=(input?.value||'').toLowerCase();
  const data=(customerProtocols||[]).filter(x=>{
    const o=customerProtocolOrders?.[x.order_id]||{},c=customerProtocolCustomers?.[x.user_id]||{},v=customerProtocolVariants?.[x.variant_id]||{};
    return `${o.order_number} ${o.customer_email} ${c.name} ${c.email} ${v.products?.name} ${v.strength_label} ${v.format}`.toLowerCase().includes(q);
  });
  const host=document.getElementById('protocolQueueGrid');
  if(!host)return baseRenderCustomerProtocolCards();
  host.innerHTML=data.length?data.map(x=>{
    const i=customerProtocols.indexOf(x),o=customerProtocolOrders[x.order_id]||{},c=customerProtocolCustomers[x.user_id]||{};
    const {v,template,cfg,ready}=protocolSetupState(x);
    const missing=[];
    if(!template)missing.push('verified exact-variant template');
    if(cfg?.configuration_status!=='verified')missing.push('verified calculation configuration');
    return `<article class="protocol-order-card"><header><div><small>${esc(o.order_number||x.order_id)}</small><h3>${esc(v.products?.name||v.product_id||x.variant_id)}</h3><p>${esc(v.strength_label||'')} · ${esc(v.format||'')}</p></div><span>${esc(x.status)}</span></header><div><b>${esc(c.name||c.email||o.customer_email||x.user_id)}</b></div>${ready?'<div class="notice">✓ Exact template and calculation configuration verified.</div>':`<div class="notice"><b>Setup required before generation</b><br>Missing: ${esc(missing.join(' + '))}. The system will not invent dosage content.</div>`}<footer>${ready?`<button onclick="openCustomerProtocolEditor(${i},false)">Review / Generate</button><button class="push" onclick="openCustomerProtocolEditor(${i},true)">Pass & Push</button>`:`<button class="push" onclick="openMissingProtocolSetup(${i})">Set Up Protocol</button>`}</footer></article>`;
  }).join(''):'<div class="empty">No customer protocols match.</div>';
};

const baseOpenCustomerProtocolEditor=window.openCustomerProtocolEditor||openCustomerProtocolEditor;
window.openCustomerProtocolEditor=openCustomerProtocolEditor=function(i,push){
  const x=customerProtocols?.[i];
  if(!x)return flash('Protocol assignment not found');
  const {ready,v}=protocolSetupState(x);
  if(!ready){
    flash(`${v.products?.name||v.product_id||'This variant'} needs an exact verified Protocol Template before Generate can run.`);
    return openMissingProtocolSetup(i);
  }
  return baseOpenCustomerProtocolEditor(i,push);
};
})();