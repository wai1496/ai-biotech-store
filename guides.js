(function(){
  'use strict';
  const stepBase='https://simple-commerce-8rxct4.v2.appdeploy.ai/resources/pen-guide-step-';
  const steps=[
    ['CHECK YOUR PEN','Check the pen and product details before use.'],
    ['ATTACH A NEW NEEDLE','Use a fresh compatible needle.'],
    ['PRIME THE PEN','2 UNITS = PRIMING ONLY — this is not the actual instructed setting.'],
    ['SET YOUR ACTUAL INSTRUCTED UNITS','After priming, set the units specified for your exact product.'],
    ['ADMINISTER AS DIRECTED','Follow the exact product/device instructions supplied to you.'],
    ['REMOVE THE NEEDLE','Remove the used needle after use as directed.'],
    ['DISPOSE & STORE','Dispose of the used needle safely and follow product-specific storage instructions.']
  ];
  const pen=`<div class="guidehero penhero"><span>PRODUCT FORMAT GUIDE</span><h1>PREFILLED<br>DISPOSABLE PEN SET</h1><h2>PEN GUIDE — STEP BY STEP</h2><p>Seven high-resolution visual steps. Tap any image to open it at full size.</p></div><div class="pensteps">${steps.map((s,i)=>{const n=i+1;return `<section class="penstep ${n===3?'prime':''}"><div class="pensteptitle"><b>${n}</b><div><h2>${s[0]}</h2><p>${s[1]}</p></div></div>${n===3?'<div class="primealert"><b>IMPORTANT:</b> 2 UNITS = PRIMING ONLY. NOT THE ACTUAL INSTRUCTED SETTING.</div>':''}<a href="${stepBase+n}.png" target="_blank" rel="noopener noreferrer"><img src="${stepBase+n}.png" data-guide-step="${n}" alt="Pen Guide Step ${n} — ${s[0]}" loading="${n>2?'lazy':'eager'}" decoding="async"></a></section>`}).join('')}</div><div class="guidewarning"><b>Important:</b><p>Always follow the instructions supplied for the exact product and device. If anything is unclear, confirm the correct instructions before proceeding.</p></div>`;
  const vial=`<div class="guidehero"><span>LABORATORY HANDLING GUIDE</span><h1>Vial Set & Reconstitution</h1><p>A practical explanation of the vial format, aseptic handling and why stability requirements are product-specific.</p></div><div class="guidebody"><article><h2>What is included?</h2><p>The Vial Set includes the selected vial, BAC water and a reconstitution syringe set.</p></article><article><h2>What does reconstitution mean?</h2><p>Reconstitution adds an appropriate liquid back to a dry, lyophilized material. The correct diluent, final volume and stability conditions depend on the exact compound and formulation.</p></article><article><h2>General laboratory principles</h2><h3>1. Confirm the product documentation</h3><p>Do not assume every vial uses the same diluent volume or handling conditions.</p><h3>2. Protect aseptic technique</h3><p>Use a clean working area and appropriate sterile equipment. Disinfect vial stoppers and avoid touching cleaned contact surfaces.</p><h3>3. Introduce diluent gently</h3><p>Add the selected diluent slowly to reduce unnecessary foaming or mechanical stress.</p><h3>4. Mix gently</h3><p>Gentle swirling is generally preferable to vigorous shaking unless the product-specific instructions state otherwise.</p></article><article><h2>How long does it last after reconstitution?</h2><p>There is no scientifically responsible universal answer for every compound. Stability depends on the molecule, formulation, concentration, diluent, sterility, temperature, light exposure and handling.</p></article><article><h2>Storage and inspection</h2><p>Follow the storage conditions applicable to the actual formulation. Check for leakage, damaged closure, unexpected particulate matter or an appearance inconsistent with the supplied information.</p></article><article><h2>Video tutorial</h2><p>Use the video below as an additional visual reference. Product-specific documentation remains the primary reference.</p><div class="faqvideo"><iframe src="https://www.youtube-nocookie.com/embed/b08QwxZW0Ig" title="Vial reconstitution video tutorial" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe></div></article></div>`;
  const coldchain=`<div class="guidehero"><span>SHIPPING EDUCATION</span><h1>What “cold chain” actually means</h1><p>Cold-chain packaging is temperature-conscious protection during transit. It helps reduce heat exposure; it does not mean a parcel is guaranteed to remain refrigerator-cold every minute until delivery.</p></div><div class="guidebody"><article class="guidewarning"><h2>The important point</h2><p>Insulation and cooling materials create a temporary thermal buffer. Their effectiveness changes with transit duration, outside temperature, package size, coolant quantity and courier conditions. A coolant pack becoming warmer during delivery does not by itself prove that the product was continuously exposed to the same temperature as the outside air.</p></article><article><h2>How the protection works</h2><h3>1 · Pre-cooling</h3><p>Temperature-sensitive items and cooling materials begin the journey under controlled handling.</p><h3>2 · Insulation</h3><p>An insulated layer slows heat transfer between the parcel interior and the outside environment.</p><h3>3 · Transit buffer</h3><p>Cooling material absorbs heat as the parcel travels. Its cooling capacity is finite, not permanent.</p><h3>4 · Refrigerate on arrival</h3><p>Once received, follow the product-specific storage information promptly.</p></article><article><h2>Cold chain does not mean “frozen until your doorstep”</h2><p>For parcel shipping, the practical goal of insulated packaging is to reduce and slow temperature excursions during transit. Unless a shipment uses validated, continuously monitored pharmaceutical logistics with defined acceptance limits, it is not accurate to promise that the internal parcel temperature will remain at one exact refrigerator temperature throughout the entire journey.</p></article><article><h2>What should I check when it arrives?</h2><h3>Parcel condition</h3><p>Check for damage, leakage or compromised packaging and retain the packaging if there is a concern.</p><h3>Product-specific instructions</h3><p>Follow the storage information for the actual compound/formulation. Different peptides can have different stability characteristics.</p></article><article><h2>Why Ai BioTech uses it</h2><p>Temperature-conscious packaging adds protection against uncontrolled ambient heat during ordinary courier transit. It is one part of good handling, alongside minimizing transit time, secure packaging and appropriate storage after delivery.</p></article></div>`;

  function installGuideImageFallback(host){
    host.querySelectorAll('img[data-guide-step]').forEach(img=>{
      img.addEventListener('error',()=>{
        const n=Number(img.dataset.guideStep||0),info=steps[n-1]||['PEN GUIDE','Visual temporarily unavailable.'];
        const fallback=document.createElement('div');
        fallback.className='guide-image-fallback';
        fallback.innerHTML='<b></b><h3></h3><p></p>';
        fallback.querySelector('b').textContent=`STEP ${n||''}`.trim();
        fallback.querySelector('h3').textContent=info[0];
        fallback.querySelector('p').textContent=info[1];
        const anchor=img.closest('a');
        if(anchor)anchor.replaceWith(fallback);else img.replaceWith(fallback);
      },{once:true});
    });
  }

  window.openGuides=function(kind='home'){
    let p=document.getElementById('guidesPage');
    if(!p){p=document.createElement('section');p.id='guidesPage';p.className='guidespage';document.body.appendChild(p)}
    const home=`<div class="guidehero"><span>AI BIOTECH GUIDES</span><h1>Product & Handling Guides</h1><p>Choose a guide below.</p></div><div class="guidecards"><button type="button" onclick="openGuides('pen')"><b>Prefilled Disposable Pen Set</b><span>Illustrated guide →</span></button><button type="button" onclick="openGuides('vial')"><b>Vial Set & Reconstitution</b><span>Full guide →</span></button><button type="button" onclick="openGuides('coldchain')"><b>Cold Chain & Shipping</b><span>Read shipping guide →</span></button></div>`;
    p.innerHTML=`<div class="guidesinner"><button type="button" class="faqclose" onclick="closeGuides()">×</button>${kind!=='home'?'<button type="button" class="guideback" onclick="openGuides(\'home\')">← Back to Guides</button>':''}${kind==='pen'?pen:kind==='vial'?vial:kind==='coldchain'?coldchain:home}</div>`;
    installGuideImageFallback(p);
    p.classList.add('show');document.body.style.overflow='hidden';p.scrollTop=0;
  };
  window.closeGuides=function(){const p=document.getElementById('guidesPage');if(p)p.classList.remove('show');document.body.style.overflow=''};

  function ensureStyle(href,id){if(document.getElementById(id))return;const css=document.createElement('link');css.id=id;css.rel='stylesheet';css.href=href;document.head.appendChild(css)}
  function ensureScript(src,id){if(document.getElementById(id))return;const js=document.createElement('script');js.id=id;js.src=src;js.defer=true;document.body.appendChild(js)}
  function wireResearch(){
    const blend=[...document.querySelectorAll('.nav button')].find(b=>/BLENDS|RESEARCH/i.test(b.textContent||''));
    if(blend){blend.textContent='⌘ RESEARCH';blend.onclick=()=>window.openResearch&&window.openResearch()}
    const panel=[...document.querySelectorAll('.panels>div')].find(x=>/RESEARCH CATALOG/i.test(x.textContent||''));
    if(panel){panel.style.cursor='pointer';panel.onclick=()=>window.openResearch&&window.openResearch()}
    ensureScript('/research-enhance.js','aibtResearchEnhance');
    ensureScript('/research-detail-full.js','aibtResearchFull');
  }

  ensureStyle('/research.css','aibtResearchCss');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireResearch,{once:true});else wireResearch();
})();
