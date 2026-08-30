(()=>{
  if(!/\/progress\.html$/i.test(location.pathname)) return;
  const css=`
  .cred-grid{display:grid;grid-template-columns:1fr;gap:10px}.cred-item{border:1px solid #dbe5ef;border-radius:14px;padding:12px;background:#fbfdff}.cred-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.cred-meta{margin-top:7px;font-size:12px;color:#718499;line-height:1.45}.cred-actions{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}.cred-secret-warning{padding:10px 12px;border-radius:12px;background:#fff7e8;border:1px solid #efcf8c;color:#7f5a00;font-size:12px;line-height:1.45}.cred-modal{position:fixed;inset:0;background:#0a183bcc;z-index:70;display:none;align-items:center;justify-content:center;padding:18px}.cred-modal.open{display:flex}.cred-dialog{background:#fff;border-radius:20px;max-width:620px;width:100%;max-height:82vh;overflow:auto;padding:20px}.cred-value{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f5f8fb;border-radius:10px;padding:10px;word-break:break-word}`;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

  const aside=document.querySelector('aside');
  if(!aside) return;
  const section=document.createElement('section');
  section.className='card';
  section.id='credentialVault';
  section.innerHTML=`<h2>🔐 Credentials & Integrations</h2>
    <p class="note">This panel tracks what is connected, what is missing and which work package is blocked. <b>Secret values are never displayed or stored in this dashboard.</b></p>
    <div class="cred-secret-warning">For safety, do not paste API keys, passwords, tokens or service-role secrets into the project inbox. Use the provider's secure secret/environment settings. This dashboard stores status metadata only.</div>
    <div id="credentialList" class="cred-grid" style="margin-top:12px"><div class="tiny">Loading credential status…</div></div>`;
  const inbox=aside.querySelector('section.card:nth-of-type(2)');
  if(inbox) aside.insertBefore(section,inbox); else aside.prepend(section);

  const modal=document.createElement('div');
  modal.id='credentialModal';modal.className='cred-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
  modal.innerHTML=`<div class="cred-dialog"><div class="row"><h2 id="credentialModalTitle" style="margin:0">Credential</h2><button class="btn" id="credentialClose">Close</button></div><div id="credentialModalBody"></div></div>`;
  document.body.appendChild(modal);
  document.getElementById('credentialClose').onclick=()=>modal.classList.remove('open');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});

  const statusClass=s=>({connected:'ok',tested:'ok',missing:'fail',blocked:'fail',not_required_yet:'wait',later:'wait'}[s]||'wait');
  const statusLabel=s=>({connected:'CONNECTED',tested:'TESTED',missing:'MISSING',blocked:'BLOCKED',not_required_yet:'NOT REQUIRED YET',later:'LATER'}[s]||String(s||'UNKNOWN').toUpperCase());
  const esc=s=>String(s??'').replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  async function load(){
    const list=document.getElementById('credentialList');
    try{
      const sb=window.getAIBTSupabase?.();
      if(!sb){list.innerHTML='<div class="tiny">Staging Supabase connection unavailable.</div>';return}
      const {data:{session}}=await sb.auth.getSession();
      if(!session){list.innerHTML='<div class="cred-item"><b>Sign in required</b><div class="cred-meta">Open Admin / Sign In to view credential readiness. Secret values are never shown here.</div><div class="cred-actions"><button class="btn" onclick="location.href=\'/ops.html\'">Open Admin / Sign In</button></div></div>';return}
      const {data,error}=await sb.from('project_credential_requirements').select('provider,display_name,status,blocker_wp,purpose,secure_location,owner_action,is_secret,updated_at').order('id');
      if(error) throw error;
      list.innerHTML='';
      for(const r of data||[]){
        const el=document.createElement('div');el.className='cred-item';
        el.innerHTML=`<div class="cred-top"><div><b>${esc(r.display_name)}</b><div class="cred-meta">${esc(r.purpose||'')}</div></div><span class="status ${statusClass(r.status)}">${statusLabel(r.status)}</span></div><div class="cred-meta"><b>Blocks:</b> ${esc(r.blocker_wp||'—')}</div><div class="cred-actions"><button class="btn" data-provider="${esc(r.provider)}">${r.status==='missing'?'Add securely':'Details'}</button></div>`;
        el.querySelector('button').onclick=()=>show(r);list.appendChild(el);
      }
    }catch(e){list.innerHTML='<div class="tiny">Credential status unavailable: '+esc(e.message)+'</div>'}
  }
  function show(r){
    document.getElementById('credentialModalTitle').textContent=r.display_name;
    document.getElementById('credentialModalBody').innerHTML=`<p><span class="status ${statusClass(r.status)}">${statusLabel(r.status)}</span></p><p><b>Needed for</b><br>${esc(r.purpose||'')}</p><p><b>Work package</b><br>${esc(r.blocker_wp||'—')}</p><p><b>Secure location</b></p><div class="cred-value">${esc(r.secure_location||'Secure provider/environment settings')}</div><p><b>What you need to do</b><br>${esc(r.owner_action||'No action required right now.')}</p><div class="cred-secret-warning">Never paste the secret value into this dashboard or chat. After it is added to the secure environment, the integration can be tested and this status can be changed to CONNECTED / TESTED.</div>`;
    modal.classList.add('open');
  }
  window.addEventListener('load',()=>setTimeout(load,250));
})();