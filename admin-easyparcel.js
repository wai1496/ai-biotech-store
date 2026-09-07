/* Preview-only EasyParcel fulfillment controls. Loaded after admin.js. */
(function(){
  const baseRenderGeneric=renderGeneric;
  async function authHeader(){const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error('Admin session expired. Sign in again.');return {Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'}}
  function rowIndex(r){return rows.indexOf(r)}
  function orderActions(r){const i=rowIndex(r);let html=`<button class="btn" onclick="orderStatus(${i})">Status</button>`;if(['paid','ready_to_ship'].includes(String(r.status)))html+=` <button class="btn primary" onclick="bookEasyParcel(${i})">Book Shipment</button>`;return html}
  function shipmentActions(r){const i=rowIndex(r);let html='';if(r.tracking_url)html+=`<button class="btn primary" onclick="printEasyParcelLabel(${i})">Print Label</button> `;if(r.tracking_number)html+=`<button class="btn" onclick="trackEasyParcel(${i})">Track</button>`;return html||'<span class="muted">Not booked</span>'}
  renderGeneric=function(cc){
    if(current!=='orders'&&current!=='shipments')return baseRenderGeneric(cc);
    cc=cc||Object.keys(rows[0]||{}).slice(0,8);
    const q=(document.getElementById('search')?.value||'').toLowerCase(),data=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q));
    grid.innerHTML=data.length?`<div class="wrap"><table><tr>${cc.map(c=>'<th>'+esc(c)+'</th>').join('')}<th>Actions</th></tr>${data.map(r=>`<tr>${cc.map(c=>'<td>'+esc(typeof r[c]==='object'?JSON.stringify(r[c]):r[c])+'</td>').join('')}<td>${current==='orders'?orderActions(r):shipmentActions(r)}</td></tr>`).join('')}</table></div>`:'<div class="empty">No records.</div>';
  };
  window.bookEasyParcel=async function(i){
    const r=rows[i];if(!r)return flash('Order not found');if(!confirm(`Book EasyParcel shipment for ${r.order_number||r.id}? This will submit and pay the shipment from your EasyParcel account.`))return;
    try{flash('Booking EasyParcel shipment…');const headers=await authHeader();const resp=await fetch('/api/easyparcel-book',{method:'POST',headers,body:JSON.stringify({orderId:r.id})});const data=await resp.json().catch(()=>({}));if(!resp.ok)throw new Error(data.error||'EasyParcel booking failed.');const s=data.shipment||data.booking?.shipment||{};flash(`Shipment booked${s.tracking_number?' · '+s.tracking_number:''}`);await table('orders');if(s.tracking_url&&confirm('Airway bill ready. Open label now?'))window.open(s.tracking_url,'_blank','noopener')}
    catch(e){flash(e.message||String(e))}
  };
  window.printEasyParcelLabel=function(i){const r=rows[i];if(!r?.tracking_url)return flash('No label is available yet.');window.open(r.tracking_url,'_blank','noopener')};
  window.trackEasyParcel=async function(i){
    const r=rows[i];if(!r?.order_id)return flash('Shipment order reference is missing.');
    try{flash('Checking EasyParcel tracking…');const headers=await authHeader();const resp=await fetch('/api/easyparcel-track',{method:'POST',headers,body:JSON.stringify({orderId:r.order_id})});const data=await resp.json().catch(()=>({}));if(!resp.ok)throw new Error(data.error||'Tracking check failed.');const result=Array.isArray(data.tracking?.result)?data.tracking.result[0]:null;const events=result?.tracking||result?.history||result?.status||result?.remarks||data.shipment?.live_status||'Tracking information received.';alert(`AWB: ${r.tracking_number}\n\n${typeof events==='string'?events:JSON.stringify(events,null,2)}`)}catch(e){flash(e.message||String(e))}
  };
})();
