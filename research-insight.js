const RI_SB_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
const RI_SB_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
const risb=supabase.createClient(RI_SB_URL,RI_SB_KEY);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=v=>Array.isArray(v)?v:[];
const hasProfile=v=>v&&typeof v==='object'&&Object.keys(v).length>0&&String(v.short_description||'').trim()&&String(v.overview||'').trim();
const safeSourceUrl=v=>{const s=String(v||'').trim();return /^https?:\/\//i.test(s)?s:''};

function showPrepared(product){
  riSources.hidden=true;
  riMain.innerHTML=`<div class="ri-actions"><span class="ri-kicker">${esc(product?.category?.name||'Research')}</span></div><h1>${esc(product?.name||'Research Insight')}</h1><div class="ri-status"><strong>Research profile is being prepared.</strong><br>Please check again later.</div>`;
}
function showUnavailable(){
  riSources.hidden=true;
  riMain.innerHTML='<h2>Research information is temporarily unavailable.</h2><p class="ri-muted">Please try again later.</p>';
}
function renderProfile(product,entry){
  const profile=entry.profile_json||{},areas=arr(profile.research_areas),sources=arr(entry.references_json).filter(s=>safeSourceUrl(s?.url));
  const published=entry.published_at||entry.approved_at;
  riMain.innerHTML=`<div class="ri-actions"><span class="ri-kicker">${esc(product.category?.name||'Research')}</span>${published?`<span class="ri-verified">Reviewed & published ${esc(new Date(published).toLocaleDateString())}</span>`:''}</div><h1>${esc(product.name)}</h1><p><strong>${esc(profile.short_description)}</strong></p><h3>Overview</h3><p class="ri-muted ri-copy">${esc(profile.overview)}</p>${profile.molecular_identity?`<h3>Molecular identity</h3><p class="ri-muted ri-copy">${esc(profile.molecular_identity)}</p>`:''}${profile.mechanism?`<h3>Mechanism / pathways</h3><p class="ri-muted ri-copy">${esc(profile.mechanism)}</p>`:''}${areas.length?`<h3>Research areas</h3><div class="ri-areas">${areas.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}${profile.evidence_context?`<h3>Evidence context</h3><p class="ri-muted ri-copy">${esc(profile.evidence_context)}</p>`:''}${profile.cautions?`<h3>Important limitations</h3><p class="ri-muted ri-copy">${esc(profile.cautions)}</p>`:''}${profile.source_notes?`<h3>Source coverage</h3><p class="ri-muted ri-copy">${esc(profile.source_notes)}</p>`:''}`;
  riSources.hidden=!sources.length;
  riSourceList.innerHTML=sources.map(s=>{const url=safeSourceUrl(s.url);return `<a href="${esc(url)}" target="_blank" rel="nofollow noopener noreferrer"><b>${esc(s.title||s.domain||'Source')}</b>${s.domain?`<br><small>${esc(s.domain)}</small>`:''}</a>`}).join('');
}

async function boot(){
  const id=String(new URLSearchParams(location.search).get('product')||'').trim();
  try{
    let productQuery=risb.from('products').select('id,name,categories(name,color)').eq('published',true).is('archived_at',null);
    productQuery=id?productQuery.eq('id',id):productQuery.order('name').limit(1);
    const productResult=await productQuery.maybeSingle();
    if(productResult.error)throw productResult.error;
    const product=productResult.data;
    if(!product){riMain.innerHTML='<h2>Research profile unavailable</h2><p>Return to the store and choose a product.</p>';riSources.hidden=true;return;}
    const p={...product,category:product.categories||null};
    const entryResult=await risb.from('research_entries').select('product_id,profile_json,references_json,published,published_version_id,approved_at,published_at').eq('product_id',p.id).eq('published',true).maybeSingle();
    if(entryResult.error)throw entryResult.error;
    const entry=entryResult.data;
    if(!entry?.published_version_id||!hasProfile(entry.profile_json)){showPrepared(p);return;}
    renderProfile(p,entry);
  }catch(error){console.error('Public research read failed',{name:error?.name});showUnavailable();}
}
document.addEventListener('DOMContentLoaded',boot);
