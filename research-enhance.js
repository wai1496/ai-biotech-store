(function(){
  const focusByCategory={
    'Metabolism / Fat Loss / Mitochondrial':'Metabolic signaling • energy balance • mitochondrial biology',
    'Skin / Hair / Tissue Regeneration':'Extracellular matrix • skin/hair biology • tissue remodeling',
    'Healing / Repair / Anti-inflammatory / Immune':'Repair signaling • inflammation • innate immune biology',
    'Brain / Sleep / Cognitive':'Neurobiology • cognition • sleep and stress pathways',
    'Sexual Wellness / Bonding':'Neuroendocrine • reproductive and bonding pathways',
    'Longevity / Cellular Health / Anti-aging':'Cellular energetics • redox biology • aging pathways',
    'Growth Hormone / Endocrine':'Pituitary • endocrine • GH/IGF-1 signaling',
    'Special Blend':'Multi-pathway blend research • component evidence review',
    'Solvent / Base':'Laboratory preparation • compatibility • handling context'
  };
  function enhanceCards(){
    document.querySelectorAll('.researchcard').forEach(card=>{
      if(card.dataset.enhanced)return;
      card.dataset.enhanced='1';
      const cat=(card.querySelector('small')?.textContent||'').trim();
      const p=card.querySelector('p');
      if(p){
        const box=document.createElement('section');box.className='researchpreview';
        box.innerHTML='<div><b>RESEARCH FOCUS</b><span>'+(focusByCategory[cat]||'Molecular identity • mechanism • experimental context')+'</span></div><div><b>PROFILE INCLUDES</b><span>Molecular identity · Primary targets & pathways · Research areas · Evidence context · Literature links</span></div>';
        p.insertAdjacentElement('afterend',box);
      }
      const btn=card.querySelector('button');if(btn){btn.textContent='VIEW RESEARCH PROFILE →';btn.setAttribute('aria-label','View full research profile');}
    });
  }
  function wrap(){
    if(typeof window.renderResearch!=='function')return;
    if(window.renderResearch.__enhanced)return;
    const original=window.renderResearch;
    const enhanced=function(){original.apply(this,arguments);requestAnimationFrame(enhanceCards)};
    enhanced.__enhanced=true;window.renderResearch=enhanced;enhanceCards();
  }
  wrap();setTimeout(wrap,150);setTimeout(wrap,600);
})();