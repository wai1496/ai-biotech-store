(function(){
  'use strict';
  const AR_SB_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
  const AR_SB_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
  const publishedResearch=new Map();
  let publishedPromise=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function loadPublishedResearch(){
    if(publishedPromise)return publishedPromise;
    publishedPromise=(async()=>{
      try{
        if(!window.supabase)return;
        const client=window.supabase.createClient(AR_SB_URL,AR_SB_KEY);
        const {data,error}=await client.from('research_entries').select('product_id,short_summary,published_version_id,published_at').eq('published',true);
        if(error)throw error;
        publishedResearch.clear();
        for(const row of data||[])publishedResearch.set(row.product_id,row);
      }catch(error){console.error('Published research catalog read failed',{name:error?.name});}
    })();
    return publishedPromise;
  }

  function approvedSummary(product){
    const approved=publishedResearch.get(product.id);
    return approved?.published_version_id&&String(approved.short_summary||'').trim()?approved.short_summary:'Research profile is being prepared.';
  }

  const originalOpenResearch=window.openResearch;
  if(typeof originalOpenResearch==='function')window.openResearch=function(){
    const result=originalOpenResearch.apply(this,arguments);
    loadPublishedResearch().then(()=>window.renderResearch?.());
    return result;
  };

  window.renderResearch=function(){
    const q=(document.getElementById('researchSearch')?.value||'').toLowerCase();
    const cat=document.getElementById('researchCat')?.value||'All';
    const filtered=products.filter(p=>{
      const category=dc(p),summary=approvedSummary(p),label=CAT[category]?.label||category;
      return (cat==='All'||category===cat)&&(`${p.name} ${label} ${summary}`.toLowerCase().includes(q));
    });
    const count=document.getElementById('researchCount');if(count)count.textContent=filtered.length+' research profiles';
    const grid=document.getElementById('researchGrid');if(!grid)return;
    grid.innerHTML=filtered.map(p=>{const category=dc(p),summary=approvedSummary(p);return `<article class="researchcard" style="--rc:${esc(color(p))}"><i></i><small>${esc(CAT[category]?.label||category)}</small><h2>${esc(p.name)}</h2><p>${esc(summary)}</p><div><span>${esc(p.strengths.map(main).join(' · '))}</span><button type="button" data-approved-research="${esc(p.id)}">Explore science →</button></div></article>`}).join('');
    grid.querySelectorAll('[data-approved-research]').forEach(button=>button.onclick=()=>window.openResearchDetail(button.dataset.approvedResearch));
  };

  window.openResearchDetail=function(id){location.href='/research-insight.html?product='+encodeURIComponent(id)};
  loadPublishedResearch();
})();
