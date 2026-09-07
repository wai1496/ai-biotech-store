/* Preview EasyParcel fulfillment actions for the existing admin tables. */
(function(){
  async function token(){const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error('Admin session expired. Please sign in again.');return session.access_token}
  async function post(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Request failed.');return data}
  window.aibtBookShipment=async function(i){const r=rows[i];if(!r?.id)return;try{flash('Booking EasyParcel shipment…');const data=await post('/api/easyparcel-book',{orderId:r.id});flash(data.reused?'Shipment already booked':'Shipment booked');if(data.labelUrl&&confirm('Shipment ready. Open the airway bill label now?'))window.open(data.labelUrl,'_blank','noopener');await table('orders')}catch(e){flash(e.message||String(e))}}
  window.aibtTrackOrder=async function(orderId){try{flash('Checking EasyParcel tracking…');const data=await post('/api/easyparcel-track',{orderId});const result=data.tracking?.result;const first=Array.isArray(result)?result[0]:result;const details=first?.tracking_details||first?.parcel||first?.status||first;alert('EasyParcel tracking\n\n'+(typeof details==='string'?details:JSON.stringify(details||data.shipment,null,2)))}catch(e){flash(e.message||String(e))}}
  window.aibtPrintLabel=function(url){if(!url)return flash('No airway bill label is saved yet.');window.open(url,'_blank','noopener')}
  function decorate(){
    if(!window.grid)return;
    const trs=[...grid.querySelectorAll('table tr')].slice(1);
    if(current==='orders'){
      trs.forEach(tr=>{const id=tr.cells?.[0]?.textContent?.trim();const i=rows.findIndex(x=>String(x.id)===id);const r=rows[i];const cell=tr.cells?.[tr.cells.length-1];if(!cell||!r||cell.querySelector('.aibt-ship-actions'))return;const wrap=document.createElement('span');wrap.className='aibt-ship-actions';if(['paid','ready_to_ship'].includes(String(r.status)))wrap.innerHTML=` <button class="btn" onclick="aibtBookShipment(${i})">Book Shipment</button> <button class="btn" onclick="aibtTrackOrder('${esc(r.id)}')">Track</button>`;cell.appendChild(wrap)})
    }
    if(current==='shipments'){
      trs.forEach(tr=>{const id=tr.cells?.[0]?.textContent?.trim();const i=rows.findIndex(x=>String(x.id)===id);const r=rows[i];const cell=tr.cells?.[tr.cells.length-1];if(!cell||!r||cell.querySelector('.aibt-ship-actions'))return;const wrap=document.createElement('span');wrap.className='aibt-ship-actions';wrap.innerHTML=` <button class="btn" onclick="aibtPrintLabel(${JSON.stringify(String(r.tracking_url||''))})">Print Label</button> <button class="btn" onclick="aibtTrackOrder('${esc(r.order_id||'')}')">Track</button>`;cell.appendChild(wrap)})
    }
  }
  const original=window.renderGeneric;
  if(typeof original==='function')window.renderGeneric=function(cc){const out=original(cc);setTimeout(decorate,0);return out};
})();