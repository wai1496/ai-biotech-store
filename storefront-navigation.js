(function(){
  'use strict';
  const core=window.AIBTNavigationCore;
  if(!core)return;
  const nav=document.querySelector('.nav');
  if(!nav)return;
  const buttons=[...nav.querySelectorAll('button')];
  const byPurpose=purpose=>buttons.find(b=>core.navPurpose(b.textContent)===purpose);
  const catalogBtn=byPurpose('catalog'), peptideBtn=byPurpose('peptides-menu'), aboutBtn=byPurpose('about');

  function showCatalog(categoryKey='All'){
    showAll=true;
    category=categoryKey;
    if(typeof renderProducts==='function')renderProducts();
    document.getElementById('catalog')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function ensurePeptideMenu(){
    let menu=document.getElementById('aibtPeptideMenu');
    if(menu)return menu;
    menu=document.createElement('div');
    menu.id='aibtPeptideMenu';menu.className='aibt-peptide-menu';menu.setAttribute('role','menu');
    const entries=core.categoryKeys().map(key=>{
      const meta=(typeof CAT!=='undefined'&&CAT[key])||{};
      return `<button type="button" role="menuitem" data-category="${key.replace(/"/g,'&quot;')}" style="--cat:${meta.color||'#18c9ff'}"><b>${key}</b><small>${meta.label||'View category'}</small></button>`;
    }).join('');
    menu.innerHTML=`<div class="menu-head"><strong>Browse Peptides by Research Category</strong><button type="button" class="menu-close" aria-label="Close peptide menu">×</button></div><div class="aibt-peptide-menu-grid">${entries}</div>`;
    document.body.appendChild(menu);
    menu.querySelector('.menu-close').addEventListener('click',()=>menu.classList.remove('show'));
    menu.querySelectorAll('[data-category]').forEach(btn=>btn.addEventListener('click',()=>{showCatalog(btn.dataset.category);menu.classList.remove('show')}));
    document.addEventListener('click',e=>{if(!menu.classList.contains('show'))return;if(e.target===peptideBtn||peptideBtn?.contains(e.target)||menu.contains(e.target))return;menu.classList.remove('show')});
    window.addEventListener('resize',()=>menu.classList.remove('show'));
    return menu;
  }

  function positionMenu(menu){
    const r=peptideBtn.getBoundingClientRect();
    const left=Math.max(12,Math.min(r.left,window.innerWidth-menu.offsetWidth-12));
    menu.style.left=`${left}px`;menu.style.top=`${Math.min(window.innerHeight-12,r.bottom+8)}px`;
  }

  function togglePeptides(){
    const menu=ensurePeptideMenu();
    const willShow=!menu.classList.contains('show');
    menu.classList.toggle('show',willShow);
    peptideBtn?.setAttribute('aria-expanded',String(willShow));
    if(willShow)requestAnimationFrame(()=>positionMenu(menu));
  }

  function ensureAbout(){
    let section=document.getElementById('aboutUs');
    if(section)return section;
    section=document.createElement('section');section.id='aboutUs';section.setAttribute('aria-labelledby','aboutUsTitle');
    section.innerHTML='<h2 id="aboutUsTitle">About AI BioTech</h2><p>AI BioTech is a research-focused catalog built around clear product formats, variant-specific availability, structured research references and practical product guides. The storefront separates shopping information from research context so each section has one clear purpose.</p><div class="about-points"><span>◇ Product-specific Vial, Pen & Cartridge options</span><span>⌘ Research Catalog & source-backed insights</span><span>ⓘ Practical guides, storage & order support</span></div>';
    document.querySelector('.footer')?.before(section);
    return section;
  }

  if(catalogBtn){catalogBtn.id='catalogNavBtn';catalogBtn.onclick=()=>showCatalog('All')}
  if(peptideBtn){peptideBtn.id='peptidesNavBtn';peptideBtn.onclick=togglePeptides;peptideBtn.setAttribute('aria-haspopup','menu');peptideBtn.setAttribute('aria-expanded','false')}
  if(aboutBtn){aboutBtn.id='aboutNavBtn';aboutBtn.onclick=()=>ensureAbout().scrollIntoView({behavior:'smooth',block:'start'})}
  ensureAbout();
})();
