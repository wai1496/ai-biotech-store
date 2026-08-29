(()=>{
'use strict';
let memberInvoices=[],memberShipments=[],extrasUser=null,extrasLoading=false;
const baseTab=tab;
const baseLoadMember=loadMember;
const eh=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=value=>{try{const u=new URL(value,location.origin);return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}};

function invoiceFor(orderId){return memberInvoices.find(x=>x.order_id===orderId)||null}
function shipmentFor(orderId){return memberShipments.find(x=>x.order_id===orderId)||null}
function protocolId(p){return p?.customer_protocol_id||p?.id||null}

async function recordProtocolEvent(p,event){
  const id=protocolId(p);if(!id||!['print','download'].includes(event))return;
  const {error}=await msb.rpc('record_customer_protocol_event',{p_customer_protocol_id:id,p_event:event});
  if(error)console.warn('Protocol event could not be recorded',error.message);
}

window.aibtOpenProtocol=async function(index,mode='download'){
  const p=protocols[index];if(!p)return alert('Protocol is not available.');
  const event=mode==='print'?'print':'download';
  await recordProtocolEvent(p,event);
  const w=window.open('','_blank');
  if(!w)return alert('Please allow pop-ups to open the protocol.');
  const autoPrint=mode==='print';
  w.document.open();
  w.document.write(window.AIBTProtocolDocument?AIBTProtocolDocument.documentHtml(p,autoPrint):`<pre>${eh(JSON.stringify(p,null,2))}</pre>`);
  w.document.close();
};

window.aibtOpenInvoice=function(orderId){
  const inv=invoiceFor(orderId);if(!inv)return alert('Invoice is not available for this order yet.');
  const payload={invoice_number:inv.invoice_number,generated_at:inv.generated_at,version:inv.version,...(inv.snapshot||{})};
  const w=window.open('','_blank');if(!w)return alert('Please allow pop-ups to open the invoice.');
  w.document.open();w.document.write(typeof invoiceDocument==='function'?invoiceDocument(payload):`<pre>${eh(JSON.stringify(payload,null,2))}</pre>`);w.document.close();
};

window.orderCard=orderCard=function(o){
  const inv=invoiceFor(o.id),ship=shipmentFor(o.id),tracking=safeUrl(ship?.tracking_url);
  const track=tracking?`<a class="btn" href="${eh(tracking)}" target="_blank" rel="noopener noreferrer">Track parcel</a>`:(ship?.tracking_number?`<span class="badge">Tracking: ${eh(ship.tracking_number)}</span>`:'');
  const invoice=inv?`<button class="btn" onclick="aibtOpenInvoice('${eh(o.id)}')">Invoice ${eh(inv.invoice_number||'')}</button>`:'';
  return `<div class="order"><b>${eh(o.order_number||o.id)}</b> <span class="badge">${eh(o.status)}</span><div>${money(o.grand_total)}</div><small>${dt(o.created_at)}</small>${invoice||track?`<div class="toolbar" style="margin-top:8px">${invoice}${track}</div>`:''}</div>`;
};

function renderProtocols(){
  memberPanel.innerHTML=`<h2>My protocols</h2>${protocols.length?protocols.map((p,i)=>`<div class="protocol"><b>${eh(p.title||p.product_name||p.variant_id||'Protocol')}</b><p>${eh([p.strength_label,p.format].filter(Boolean).join(' · '))}</p><small>${eh(p.duration_text||p.timing_text||'Purchased-variant protocol')}</small><div class="toolbar" style="margin-top:10px"><button class="btn primary" onclick="aibtOpenProtocol(${i},'download')">Open / Save PDF</button><button class="btn" onclick="aibtOpenProtocol(${i},'print')">Print</button></div></div>`).join(''):'<p>No protocol guides available yet.</p>'}`;
}

window.tab=tab=function(name){
  if(name==='protocols')renderProtocols();else baseTab(name);
  document.querySelectorAll('a[href="/plain.html"]').forEach(a=>a.setAttribute('href','/'));
};

async function loadOrderExtras(force=false){
  if(extrasLoading||typeof me==='undefined'||!me||!Array.isArray(orders))return;
  if(!force&&extrasUser===me.id)return;
  extrasLoading=true;
  try{
    const ids=orders.map(o=>o.id).filter(Boolean);
    if(!ids.length){memberInvoices=[];memberShipments=[];extrasUser=me.id;return;}
    const [ir,sr]=await Promise.all([
      msb.from('invoices').select('id,order_id,invoice_number,snapshot,version,generated_at').in('order_id',ids),
      msb.from('shipments').select('id,order_id,courier,tracking_number,tracking_url,manual_status,live_status,shipped_at,estimated_delivery').in('order_id',ids)
    ]);
    if(!ir.error)memberInvoices=ir.data||[];else console.warn(ir.error.message);
    if(!sr.error)memberShipments=sr.data||[];else console.warn(sr.error.message);
    extrasUser=me.id;
    tab('overview');
  }finally{extrasLoading=false;}
}

window.loadMember=loadMember=async function(){
  await baseLoadMember();
  await loadOrderExtras(true);
};

document.addEventListener('DOMContentLoaded',()=>{
  [500,1400,3000].forEach(ms=>setTimeout(()=>loadOrderExtras(),ms));
});
})();
