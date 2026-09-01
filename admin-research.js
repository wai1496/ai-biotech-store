(function(){
  'use strict';
  let C=null;
  const state={products:[],entries:[],versions:[],byProduct:new Map(),entryByProduct:new Map()};
  const safe=v=>C?.esc?C.esc(v):String(v??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
  const notify=message=>C?.flash?C.flash(message):console.log(message);
  const date=v=>v?new Date(v).toLocaleString():'—';
  const statusLabel=v=>String(v||'none').replaceAll('_',' ');

  async function load(){
    const [p,e,v]=await Promise.all([
      C.sb.from('products').select('id,name,published,status,archived_at').eq('published',true).is('archived_at',null).order('name'),
      C.sb.from('research_entries').select('id,product_id,short_summary,profile_json,references_json,published_version_id,published_at,approved_at,verification_note').order('updated_at',{ascending:false}),
      C.sb.from('research_entry_versions').select('id,research_entry_id,product_id,version_number,status,provider,model,profile_json,sources_json,evidence_gate_json,change_summary_json,provider_metadata_json,generated_at,submitted_at,approved_at,published_at,rejection_note,created_at').order('version_number',{ascending:false})
    ]);
    if(p.error)throw p.error;if(e.error)throw e.error;if(v.error)throw v.error;
    state.products=p.data||[];state.entries=e.data||[];state.versions=v.data||[];
    state.entryByProduct=new Map(state.entries.map(x=>[x.product_id,x]));state.byProduct=new Map();
    for(const row of state.versions)if(!state.byProduct.has(row.product_id))state.byProduct.set(row.product_id,row);
  }

  function evidenceBadge(gate){
    if(!gate||typeof gate!=='object')return '<span class="ar-badge neutral">Not checked</span>';
    return gate.passed?'<span class="ar-badge pass">Evidence gate passed</span>':'<span class="ar-badge warn">Review required</span>';
  }

  function row(p){
    const entry=state.entryByProduct.get(p.id),latest=state.byProduct.get(p.id),canReview=latest&&['draft','ai_reviewed','pending_admin_approval'].includes(latest.status);
    return `<article class="ar-product-card" data-product="${safe(p.id)}">
      <div class="ar-product-main"><h3>${safe(p.name)}</h3><div class="ar-meta">Published: ${entry?.published_version_id?date(entry.published_at):'Not yet approved'}</div><div class="ar-meta">Latest: ${latest?`v${safe(latest.version_number)} · ${safe(statusLabel(latest.status))} · ${safe(latest.provider)}${latest.model?` / ${safe(latest.model)}`:''}`:'No draft yet'}</div>${evidenceBadge(latest?.evidence_gate_json)}${latest?.evidence_gate_json?`<span class="ar-source-count">High-quality sources: ${Number(latest.evidence_gate_json.high_quality_source_count||0)}</span>`:''}</div>
      <div class="ar-actions"><button class="btn primary" data-ar="fetch" data-id="${safe(p.id)}">Fetch New Research</button><button class="btn" data-ar="manual" data-id="${safe(p.id)}">Manual Draft</button>${canReview?`<button class="btn" data-ar="review" data-version="${safe(latest.id)}">Review Draft</button>`:''}${entry?.published_version_id?`<a class="btn" target="_blank" href="/research-insight.html?product=${encodeURIComponent(p.id)}">View Published</a>`:''}<button class="btn" data-ar="history" data-id="${safe(p.id)}">Version History</button></div>
    </article>`;
  }

  function bind(){
    C.content.querySelectorAll('[data-ar="fetch"]').forEach(b=>b.onclick=()=>fetchNewResearch(b.dataset.id,b));
    C.content.querySelectorAll('[data-ar="manual"]').forEach(b=>b.onclick=()=>manualDraft(b.dataset.id));
    C.content.querySelectorAll('[data-ar="review"]').forEach(b=>b.onclick=()=>reviewVersion(b.dataset.version));
    C.content.querySelectorAll('[data-ar="history"]').forEach(b=>b.onclick=()=>history(b.dataset.id));
  }

  async function render(context){
    C=context;C.content.innerHTML='<div class="notice">Loading Research Catalog…</div>';
    try{await load();C.content.innerHTML=`<section class="ar-shell"><div class="ar-head"><div><h2>Research Catalog Approval</h2><p class="muted">Fetch evidence → review draft → approve separately. Public research never changes until approval.</p></div><button class="btn" id="arReload">Refresh List</button></div><div class="ar-grid">${state.products.map(row).join('')}</div></section>`;C.content.querySelector('#arReload').onclick=()=>render(C);bind();}
    catch(error){console.error('Research workspace load failed',{name:error?.name});C.content.innerHTML='<div class="notice">Research workspace is temporarily unavailable.</div>';}
  }

  async function nextVersion(productId){
    const {data,error}=await C.sb.from('research_entry_versions').select('version_number').eq('product_id',productId).order('version_number',{ascending:false}).limit(1);
    if(error)throw error;return Number(data?.[0]?.version_number||0)+1;
  }

  async function insertVersion(payload,retry=true){
    let versionNumber=await nextVersion(payload.product_id);
    const make=()=>({...payload,version_number:versionNumber});
    let result=await C.sb.from('research_entry_versions').insert(make()).select().single();
    if(result.error&&retry&&(result.error.code==='23505'||/duplicate|unique/i.test(result.error.message||''))){versionNumber=await nextVersion(payload.product_id);result=await C.sb.from('research_entry_versions').insert(make()).select().single();}
    if(result.error)throw result.error;return result.data;
  }

  async function fetchNewResearch(productId,button){
    button.disabled=true;button.textContent='Fetching…';
    try{
      const {data:{session}}=await C.sb.auth.getSession();if(!session?.access_token)throw new Error('Admin session required');
      const response=await fetch('/api/admin-research-refresh',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({product_id:productId})});
      let body={};try{body=await response.json()}catch{}
      if(!response.ok)throw new Error(body?.message||'AI research is temporarily unavailable. Existing published research is unchanged.');
      const entry=state.entryByProduct.get(productId);if(!entry?.id)throw new Error('Research entry is missing for this product.');
      const version=await insertVersion({research_entry_id:entry.id,product_id:productId,status:body.evidence_gate?.passed?'pending_admin_approval':'draft',provider:body.provider||'unknown',model:body.model||'',profile_json:body.profile||{},sources_json:body.sources||[],evidence_gate_json:body.evidence_gate||{},change_summary_json:body.change_summary||{},provider_metadata_json:body.provider_metadata||{},generated_at:body.generated_at||new Date().toISOString(),submitted_at:new Date().toISOString()});
      notify('Research draft created');await load();reviewVersion(version.id);
    }catch(error){notify(error?.message==='Research entry is missing for this product.'?error.message:'AI research is temporarily unavailable. Existing published research is unchanged.');}
    finally{button.disabled=false;button.textContent='Fetch New Research';}
  }

  function modal(html){
    document.getElementById('arModal')?.remove();const host=document.createElement('div');host.id='arModal';host.className='ar-modal';host.innerHTML=`<div class="ar-modal-card"><button class="ar-close" type="button" aria-label="Close">×</button>${html}</div>`;document.body.appendChild(host);host.querySelector('.ar-close').onclick=()=>host.remove();host.onclick=e=>{if(e.target===host)host.remove()};return host;
  }

  function emptyProfile(){return {short_description:'',overview:'',molecular_identity:'',mechanism:'',research_areas:[],evidence_context:'',cautions:'',source_notes:''};}
  function profileFields(profile){
    const p={...emptyProfile(),...(profile||{})};return `<label>Short description<textarea name="short_description" required>${safe(p.short_description)}</textarea></label><label>Overview<textarea name="overview" rows="7" required>${safe(p.overview)}</textarea></label><label>Molecular identity<textarea name="molecular_identity">${safe(p.molecular_identity)}</textarea></label><label>Mechanism / pathways<textarea name="mechanism">${safe(p.mechanism)}</textarea></label><label>Research areas<input name="research_areas" value="${safe((p.research_areas||[]).join(', '))}"></label><label>Evidence context<textarea name="evidence_context">${safe(p.evidence_context)}</textarea></label><label>Important limitations<textarea name="cautions">${safe(p.cautions)}</textarea></label><label>Source notes<textarea name="source_notes">${safe(p.source_notes)}</textarea></label>`;
  }

  function manualDraft(productId){
    const product=state.products.find(p=>p.id===productId),entry=state.entryByProduct.get(productId);if(!entry)return notify('Research entry is missing for this product.');
    const host=modal(`<h2>Manual Draft · ${safe(product?.name||productId)}</h2><p class="muted">Manual drafts are private until you review and publish them.</p><form id="arManualForm" class="ar-form">${profileFields(emptyProfile())}<label>Sources (one URL per line)<textarea name="sources" rows="5"></textarea></label><div class="ar-form-actions"><button class="btn primary" type="submit">Save Manual Draft</button></div></form>`);
    host.querySelector('#arManualForm').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget.elements;const urls=String(f.sources.value||'').split(/\n+/).map(x=>x.trim()).filter(x=>/^https?:\/\//i.test(x)).slice(0,16);const sources=urls.map(url=>{let domain='';try{domain=new URL(url).hostname}catch{}return {title:domain||url,url,domain,tier:'unreviewed',supports:[],retrieved_at:new Date().toISOString()}});const profile={short_description:f.short_description.value.trim(),overview:f.overview.value.trim(),molecular_identity:f.molecular_identity.value.trim(),mechanism:f.mechanism.value.trim(),research_areas:f.research_areas.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,10),evidence_context:f.evidence_context.value.trim(),cautions:f.cautions.value.trim(),source_notes:f.source_notes.value.trim()};try{const v=await insertVersion({research_entry_id:entry.id,product_id:productId,status:'draft',provider:'manual',model:'',profile_json:profile,sources_json:sources,evidence_gate_json:{passed:false,high_quality_source_count:0,unique_domain_count:new Set(sources.map(s=>s.domain)).size,exact_product_evidence:'none',human_evidence:'none',preclinical_evidence:'not_identified',contradictions_found:false,warnings:['Manual draft requires source and evidence review.']},change_summary_json:{changed_fields:Object.keys(profile),previous_source_count:(entry.references_json||[]).length,next_source_count:sources.length,source_count_delta:sources.length-(entry.references_json||[]).length},provider_metadata_json:{manual:true},submitted_at:new Date().toISOString()});host.remove();notify('Manual research draft saved');await load();reviewVersion(v.id);}catch(error){notify(error.message||'Could not save draft')}};
  }

  const PROFILE_FIELDS=[['short_description','Short description'],['overview','Overview'],['molecular_identity','Molecular identity'],['mechanism','Mechanism / pathways'],['research_areas','Research areas'],['evidence_context','Evidence context'],['cautions','Important limitations'],['source_notes','Source notes']];
  function fieldValue(profile,key){const value=profile?.[key];return Array.isArray(value)?value.join(', '):String(value||'');}
  function compareColumn(title,profile,changed,markChanges){return `<section class="ar-compare-col"><h3>${title}</h3>${PROFILE_FIELDS.map(([key,label])=>`<div class="ar-field ${markChanges&&changed.has(key)?'changed':''}"><b>${safe(label)}</b><div>${safe(fieldValue(profile,key))||'<span class="muted">—</span>'}</div></div>`).join('')}</section>`;}
  function sourceList(sources){const valid=(sources||[]).filter(s=>/^https?:\/\//i.test(String(s?.url||'')));return valid.length?`<div class="ar-sources">${valid.map(s=>`<a class="ar-source" href="${safe(s.url)}" target="_blank" rel="noopener noreferrer nofollow"><b>${safe(s.title||s.domain||'Source')}</b><span>${safe(s.domain||'')}</span><em class="${s.tier==='high'?'high':''}">${safe(s.tier||'unreviewed')}</em></a>`).join('')}</div>`:'<p class="muted">No sources saved with this version.</p>';}
  async function publishVersion(version,host){
    const note=String(host.querySelector('[name="verification_note"]')?.value||'').trim(),gate=version.evidence_gate_json||{};
    if(!gate.passed&&!note)return notify('Verification note is required because the evidence gate did not pass.');
    if(!confirm('Publish this reviewed research profile to customers?'))return;
    const button=host.querySelector('[data-ar-publish]');if(button){button.disabled=true;button.textContent='Publishing…'}
    const {error}=await C.sb.rpc('admin_publish_research_version',{p_version_id:version.id,p_verification_note:note});
    if(error){if(button){button.disabled=false;button.textContent='Approve & Publish'}return notify(error.message||'Could not publish research');}
    host.remove();notify('Research published');await render(C);
  }
  async function rejectVersion(version,host){
    const reason=String(prompt('Reason for rejecting this research draft','')||'').trim();if(!reason)return notify('Rejection reason required');
    if(!confirm('Reject this draft? The current published research will stay unchanged.'))return;
    const {error}=await C.sb.rpc('admin_reject_research_version',{p_version_id:version.id,p_reason:reason});
    if(error)return notify(error.message||'Could not reject research draft');host.remove();notify('Research draft rejected');await render(C);
  }
  function reviewVersion(versionId){
    const version=state.versions.find(v=>v.id===versionId);if(!version)return notify('Draft not found');
    const entry=state.entryByProduct.get(version.product_id)||{},published=entry.profile_json&&entry.published_version_id?entry.profile_json:{},gate=version.evidence_gate_json||{},changed=new Set(version.change_summary_json?.changed_fields||[]),warnings=Array.isArray(gate.warnings)?gate.warnings:[],editable=['draft','ai_reviewed','pending_admin_approval'].includes(version.status);
    const host=modal(`<div class="ar-review-head"><div><h2>${editable?'Review Draft':'Research Version'} · v${safe(version.version_number)}</h2><p class="muted">${safe(version.provider)}${version.model?` / ${safe(version.model)}`:''} · ${safe(statusLabel(version.status))}</p></div>${evidenceBadge(gate)}</div>
      <section class="ar-evidence"><h3>Evidence Gate</h3><div class="ar-evidence-grid"><div><span>High-quality sources</span><b>${Number(gate.high_quality_source_count||0)}</b></div><div><span>Unique domains</span><b>${Number(gate.unique_domain_count||0)}</b></div><div><span>Exact-product evidence</span><b>${safe(gate.exact_product_evidence||'none')}</b></div><div><span>Human evidence</span><b>${safe(gate.human_evidence||'none')}</b></div><div><span>Preclinical evidence</span><b>${safe(gate.preclinical_evidence||'not identified')}</b></div><div><span>Contradictions</span><b>${gate.contradictions_found?'Found':'Not flagged'}</b></div></div>${!gate.passed?'<div class="ar-gate-warning">Evidence gate did not auto-pass. You may continue only after manually reviewing the warnings and sources.</div>':''}<h4>Warnings</h4>${warnings.length?`<ul class="ar-warnings">${warnings.map(w=>`<li>${safe(w)}</li>`).join('')}</ul>`:'<p class="muted">No automated warnings.</p>'}<h4>Sources</h4>${sourceList(version.sources_json)}</section>
      <div class="ar-compare">${compareColumn('Published',published,changed,false)}${compareColumn('Draft',version.profile_json||{},changed,true)}</div>
      ${editable?`<section class="ar-approval"><label>Review / verification note${!gate.passed?' (required)':''}<textarea name="verification_note" rows="3" placeholder="Record what you checked before publishing."></textarea></label><div class="ar-form-actions"><button type="button" class="btn primary" data-ar-publish>Approve &amp; Publish</button><button type="button" class="btn" data-ar-reject>Reject</button></div></section>`:'<div class="notice">This published/history version is read-only.</div>'}`);
    host.querySelector('[data-ar-publish]')?.addEventListener('click',()=>publishVersion(version,host));
    host.querySelector('[data-ar-reject]')?.addEventListener('click',()=>rejectVersion(version,host));
  }
  function history(productId){
    const versions=state.versions.filter(v=>v.product_id===productId);modal(`<h2>Version History</h2>${versions.length?`<div class="ar-history">${versions.map(v=>`<button class="ar-history-row" data-version="${safe(v.id)}"><b>v${safe(v.version_number)}</b><span>${safe(statusLabel(v.status))}</span><span>${safe(v.provider)}${v.model?` / ${safe(v.model)}`:''}</span><small>${date(v.created_at)}</small></button>`).join('')}</div>`:'<p>No versions yet.</p>'}`);document.querySelectorAll('#arModal [data-version]').forEach(b=>b.onclick=()=>reviewVersion(b.dataset.version));
  }

  window.AIBTAdminResearch={render};
  const originalView=window.view;
  if(typeof originalView==='function')window.view=function(v){
    if(v==='research_entries'){
      try{current=v;page=0;title.textContent=label?.[v]||'Research Catalog';document.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('active',b.dataset.v===v));}catch{}
      return window.AIBTAdminResearch.render({sb,role,content,flash,esc});
    }
    return originalView.apply(this,arguments);
  };
})();
