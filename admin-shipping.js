/* Preview EasyParcel fulfillment actions for the existing admin tables. */
(function(){
  async function token(){const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw new Error('Admin session expired. Please sign in again.');return session.access_token}
  async function post(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Request failed.');return data}
  async function get(path){const r=await fetch(path,{headers:{Authorization:`Bearer ${await token()}`}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Request failed.');return data}
  function humanMissing(k){return ({apiKey:'API key',pickPostcode:'pickup postcode',pickState:'pickup state',pickPhone:'pickup phone',pickAddress1:'pickup address',pickCity:'pickup city',pickName:'pickup name'})[k]||k}
  window.aibtEasyParcelStatus=async function(){try{const s=await get('/api/easyparcel-status');const missing=(s.missing||[]).map(humanMissing);alert(`EasyParcel ${String(s.mode||'demo').toUpperCase()}\n\n${s.configured?'Ready for shipping QA.':'Still missing: '+missing.join(', ')}`)}catch(e){flash(e.message||String(e))}}
  window.aibtBookShipment=async function(i){const r=rows[i];if(!r?.id)return;try{const s=await get('/api/easyparcel-status');if(!s.configured)throw new Error('EasyParcel setup is incomplete: '+(s.missing||[]).map(humanMissing).join(', '));if(!confirm(`Book EasyParcel shipment for ${r.order_number||r.id}? This will submit and pay the shipment from your EasyParcel ${String(s.mode||'demo').toUpperCase()} account.`))return;flash('Booking EasyParcel shipment…');const data=await post('/api/easyparcel-book',{orderId:r.id});flash(data.stage==='awaiting-awb'?'Shipment awaiting AWB — do not rebook':data.reused?'Shipment already booked':'Shipment booked');if(data.labelUrl&&confirm('Shipment ready. Open the airway bill label now?'))window.aibtPrintLabel(data.labelUrl);await table('orders')}catch(e){flash(e.message||String(e))}}
  window.aibtTrackOrder=async function(orderId){try{flash('Checking EasyParcel tracking…');const data=await post('/api/easyparcel-track',{orderId});const result=data.tracking?.result;const first=Array.isArray(result)?result[0]:result;const details=first?.tracking_details||first?.parcel||first?.status||first;alert('EasyParcel tracking\n\n'+(typeof details==='string'?details:JSON.stringify(details||data.shipment,null,2)))}catch(e){flash(e.message||String(e))}}
  window.aibtPrintLabel=function(url){let parsed;try{parsed=new URL(String(url));}catch{return flash('No valid airway bill label is saved yet.');}if(parsed.protocol!=='https:'||parsed.username||parsed.password)return flash('Unsafe label URL blocked.');window.open(parsed.href,'_blank','noopener,noreferrer')}
  function decorate(){
    if(!window.grid)return;
    if(current==='orders'||current==='shipments'){
      const toolbar=content.querySelector('.toolbar');
      if(toolbar&&!toolbar.querySelector('.aibt-easyparcel-status')){const b=document.createElement('button');b.className='btn aibt-easyparcel-status';b.textContent='EasyParcel Setup';b.onclick=aibtEasyParcelStatus;toolbar.appendChild(b)}
    }
    const trs=[...grid.querySelectorAll('table tr')].slice(1);
    if(current==='orders'){
      trs.forEach(tr=>{const id=tr.cells?.[0]?.textContent?.trim();const i=rows.findIndex(x=>String(x.id)===id);const r=rows[i];const cell=tr.cells?.[tr.cells.length-1];if(!cell||!r||cell.querySelector('.aibt-ship-actions'))return;const wrap=document.createElement('span');wrap.className='aibt-ship-actions';if(['paid','ready_to_ship'].includes(String(r.status)))wrap.innerHTML=` <button class="btn" onclick="aibtBookShipment(${i})">Book Shipment</button> <button class="btn" onclick="aibtTrackOrder('${esc(r.id)}')">Track</button>`;cell.appendChild(wrap)})
    }
    if(current==='shipments'){
      trs.forEach(tr=>{const id=tr.cells?.[0]?.textContent?.trim();const i=rows.findIndex(x=>String(x.id)===id);const r=rows[i];const cell=tr.cells?.[tr.cells.length-1];if(!cell||!r||cell.querySelector('.aibt-ship-actions'))return;const wrap=document.createElement('span');wrap.className='aibt-ship-actions';const label=document.createElement('button');label.className='btn';label.textContent='Print Label';label.addEventListener('click',()=>window.aibtPrintLabel(r.tracking_url));wrap.appendChild(label);const track=document.createElement('button');track.className='btn';track.textContent='Track';track.addEventListener('click',()=>window.aibtTrackOrder(r.order_id));wrap.appendChild(track);cell.appendChild(wrap)})
    }
  }
  const original=window.renderGeneric;
  if(typeof original==='function')window.renderGeneric=function(cc){const out=original(cc);setTimeout(decorate,0);return out};
})();
