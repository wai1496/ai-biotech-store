(()=>{
'use strict';
let memberInvoices=[],memberShipments=[];
const baseTab=window.tab;
const eh=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function invoiceFor(orderId){return memberInvoices.find(x=>x.order_id===orderId)||null}
function shipmentFor(orderId){return memberShipments.find(x=>x.order_id===orderId)||null}

window.aibtOpenInvoice=function(orderId){
  const inv=invoiceFor(orderId);
  if(!inv)return alert('Invoice is not available for this order yet.');
  const payload={invoice_number:inv.invoice_number,generated_at:inv.generated_at,version:inv.version,...(inv.snapshot||{})};
  const w=window.open('','_blank');
  if(!w)return alert('Please allow pop-ups to open the invoice.');
  w.document.open();w.document.write(typeof invoiceDocument==='function'?invoiceDocument(payload):`<pre>${eh(JSON.stringify(payload,null,2))}</pre>`);w.document.close();
};

window.orderCard=function(o){
  const inv=invoiceFor(o.id),ship=shipmentFor(o.id);
  const track=ship?.tracking_url?`<a class="btn" href="${eh(ship.tracking_url)}" target="_blank" rel="noopener">Track parcel</a>`:(ship?.tracking_number?`<span class="badge">Tracking: ${eh(ship.tracking_number)}</span>`:'');
  const invoice=inv?`<button class="btn" onclick="aibtOpenInvoice('${eh(o.id)}')">Invoice ${eh(inv.invoice_number||'')}</button>`:'';
  return `<div class="order"><b>${eh(o.order_number||o.id)}</b> <span class="badge">${eh(o.status)}</span><div>${money(o.grand_total)}</div><small>${dt(o.created_at)}</small>${invoice||track?`<div class="toolbar" style="margin-top:8px">${invoice}${track}</div>`:''}</div>`;
};

window.tab=function(name){
  baseTab(name);
  document.querySelectorAll('a[href="/plain.html"]').forEach(a=>a.setAttribute('href','/'));
};

async function loadOrderExtras(){
  try{
    if(typeof me==='undefined'||!me||typeof orders==='undefined'||!Array.isArray(orders)||!orders.length)return;
    const ids=orders.map(o=>o.id).filter(Boolean);
    const [ir,sr]=await Promise.all([
      msb.from('invoices').select('id,order_id,invoice_number,snapshot,version,generated_at').in('order_id',ids),
      msb.from('shipments').select('id,order_id,courier,tracking_number,tracking_url,manual_status,live_status,shipped_at,estimated_delivery').in('order_id',ids)
    ]);
    if(!ir.error)memberInvoices=ir.data||[];
    if(!sr.error)memberShipments=sr.data||[];
    tab('overview');
  }catch(_){ }
}

document.addEventListener('DOMContentLoaded',()=>setTimeout(loadOrderExtras,650));
})();
