(function(){
  'use strict';
  const PAGE_SIZE=20;
  let filter='all',visibleCount=PAGE_SIZE,query='';

  function statusOf(card){
    const text=(card.textContent||'').toLowerCase();
    if(card.querySelector('.ar-badge.warn')||text.includes('review required'))return 'needs';
    if(card.querySelector('[data-ar="review"]'))return 'needs';
    if(card.querySelector('a[href*="research-insight.html"]')&&!text.includes('not yet approved'))return 'published';
    if(card.querySelector('.ar-badge.neutral')||text.includes('not checked'))return 'unchecked';
    return 'other';
  }

  function compactActions(card){
    const actions=card.querySelector('.ar-actions');
    if(!actions||actions.querySelector('.ar-more-actions'))return;
    const buttons=[...actions.children];
    const review=actions.querySelector('[data-ar="review"]');
    const fetch=actions.querySelector('[data-ar="fetch"]');
    const primary=review||fetch||buttons[0];
    if(!primary)return;
    primary.classList.add('ar-primary-action');
    const secondary=buttons.filter(x=>x!==primary);
    if(!secondary.length)return;
    const more=document.createElement('details');
    more.className='ar-more-actions';
    const summary=document.createElement('summary');
    summary.textContent='More';
    const inner=document.createElement('div');
    inner.className='ar-more-actions-menu';
    secondary.forEach(x=>inner.appendChild(x));
    more.append(summary,inner);
    actions.appendChild(more);
  }

  function apply(grid,summary,loadMore){
    const cards=[...grid.querySelectorAll('.ar-product-card')];
    const q=query.trim().toLowerCase();
    const matches=cards.filter(card=>{
      const name=(card.querySelector('h3')?.textContent||'').toLowerCase();
      const searchOk=!q||name.includes(q);
      const status=statusOf(card);
      const filterOk=filter==='all'||status===filter;
      return searchOk&&filterOk;
    });
    cards.forEach(card=>card.hidden=true);
    matches.slice(0,visibleCount).forEach(card=>card.hidden=false);
    summary.textContent=`Showing ${Math.min(matches.length,visibleCount)} of ${matches.length}`;
    loadMore.hidden=matches.length<=visibleCount;
  }

  function styleOnce(){
    if(document.getElementById('arCatalogUxStyle'))return;
    const style=document.createElement('style');
    style.id='arCatalogUxStyle';
    style.textContent=`
      .ar-catalog-tools{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:10px;align-items:center;margin:0 0 12px}
      .ar-catalog-search{width:100%;box-sizing:border-box;border:1px solid #cad6e2;border-radius:10px;padding:11px 12px;font:inherit;background:#fff;color:#102033}
      .ar-catalog-filters{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.ar-filter{border:1px solid #c8d5e2;background:#fff;color:#17395f;border-radius:999px;padding:8px 11px;font-weight:700;cursor:pointer}.ar-filter.active{background:#12344d;color:#fff;border-color:#12344d}
      .ar-catalog-meta{font-size:12px;color:#708195;margin:-4px 0 10px}.ar-catalog-load{display:flex;justify-content:center;margin:12px 0 4px}.ar-catalog-load button{min-width:150px}
      .ar-product-card{padding:12px 14px;gap:12px}.ar-product-card .ar-meta{margin:2px 0}.ar-actions{align-items:center;max-width:none}.ar-primary-action{min-width:150px}
      .ar-more-actions{position:relative}.ar-more-actions summary{list-style:none;cursor:pointer;border:1px solid #cbd8e5;border-radius:8px;padding:9px 12px;background:#102f47;color:#fff;font-weight:700}.ar-more-actions summary::-webkit-details-marker{display:none}.ar-more-actions-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;min-width:190px;background:#fff;border:1px solid #d9e2eb;border-radius:10px;padding:8px;box-shadow:0 12px 28px rgba(15,23,42,.18);display:grid;gap:6px}.ar-more-actions-menu .btn{width:100%;text-align:center}
      @media(max-width:720px){.ar-catalog-tools{grid-template-columns:1fr}.ar-catalog-filters{justify-content:flex-start;overflow:auto;flex-wrap:nowrap;padding-bottom:2px}.ar-filter{white-space:nowrap}.ar-product-card{padding:12px}.ar-actions{display:grid;grid-template-columns:1fr auto;gap:8px}.ar-primary-action{min-width:0;width:100%}.ar-more-actions{justify-self:end}.ar-more-actions-menu{right:0;min-width:210px}.ar-product-card h3{font-size:17px;margin-bottom:4px}}
    `;
    document.head.appendChild(style);
  }

  function enhance(){
    const shell=document.querySelector('.ar-shell');
    const grid=shell?.querySelector('.ar-grid');
    if(!shell||!grid||grid.dataset.catalogUx==='1')return;
    grid.dataset.catalogUx='1';
    styleOnce();
    [...grid.querySelectorAll('.ar-product-card')].forEach(compactActions);

    const tools=document.createElement('div');
    tools.className='ar-catalog-tools';
    tools.innerHTML=`<input class="ar-catalog-search" type="search" placeholder="Search research" aria-label="Search research"><div class="ar-catalog-filters" role="group" aria-label="Research status filters"><button class="ar-filter active" data-filter="all">All</button><button class="ar-filter" data-filter="needs">Needs Review</button><button class="ar-filter" data-filter="published">Published</button><button class="ar-filter" data-filter="unchecked">Not Checked</button></div>`;
    const meta=document.createElement('div');meta.className='ar-catalog-meta';
    const loadWrap=document.createElement('div');loadWrap.className='ar-catalog-load';
    const load=document.createElement('button');load.type='button';load.className='btn';load.textContent='Load More';loadWrap.appendChild(load);
    grid.before(tools,meta);grid.after(loadWrap);

    tools.querySelector('.ar-catalog-search').addEventListener('input',e=>{query=e.target.value;visibleCount=PAGE_SIZE;apply(grid,meta,loadWrap)});
    tools.querySelectorAll('.ar-filter').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.filter;visibleCount=PAGE_SIZE;tools.querySelectorAll('.ar-filter').forEach(x=>x.classList.toggle('active',x===btn));apply(grid,meta,loadWrap)}));
    load.addEventListener('click',()=>{visibleCount+=PAGE_SIZE;apply(grid,meta,loadWrap)});
    apply(grid,meta,loadWrap);
  }

  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',enhance);
  enhance();
})();