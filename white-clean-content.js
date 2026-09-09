(()=>{
'use strict';
const cfg=window.AIBT_CONFIG||{};
const db=window.supabase?.createClient(cfg.supabaseUrl,cfg.supabaseKey);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function loadResearch(){
  const host=document.getElementById('researchGrid');
  if(!host)return;
  if(!db){host.innerHTML='<div class="empty">Research catalog is unavailable in this preview.</div>';return;}
  host.innerHTML=Array.from({length:3},()=>'<div class="skeleton" style="height:180px"></div>').join('');
  try{
    const {data,error}=await db
      .from('research_entries')
      .select('id,product_id,title,category,short_summary,published,products(name,categories(name,color))')
      .eq('published',true)
      .limit(9);
    if(error)throw error;
    const rows=Array.isArray(data)?data:[];
    if(!rows.length){host.innerHTML='<div class="empty">Published Research Insights will appear here.</div>';return;}
    host.innerHTML=rows.map(row=>{
      const color=row.products?.categories?.color||'#1477ff';
      const name=row.products?.name||row.title||'Research Insight';
      return `<article class="research-card" style="--cat:${esc(color)}"><h3>${esc(name)}</h3><p>${esc(row.short_summary||'Research information linked to this catalog compound.')}</p><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="category-badge" style="position:static;background:${esc(color)}">${esc(row.category||row.products?.categories?.name||'Research')}</span><button class="btn" type="button" onclick="document.getElementById('catalog').scrollIntoView({behavior:'smooth'})">View Catalog</button></div></article>`;
    }).join('');
  }catch(error){
    console.error('White Clean research content failed',error);
    host.innerHTML='<div class="empty">Research Insights could not be loaded in this preview.</div>';
  }
}

document.addEventListener('DOMContentLoaded',loadResearch,{once:true});
})();
