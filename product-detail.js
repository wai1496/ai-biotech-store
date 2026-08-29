/* Full-screen product detail for the live Supabase catalog. */
(function(){
  'use strict';
  const eh=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const enc=v=>encodeURIComponent(String(v??''));
  const availableStock=v=>Math.max(0,Number(v?.stock||0)-Number(v?.reserved||0));
  const variantFor=(p,strength,form)=>vfind(p,strength,form);
  const wishlistKey='aibt_wishlist';
  function wishlist(){try{const value=JSON.parse(localStorage.getItem(wishlistKey)||'[]');return new Set(Array.isArray(value)?value:[])}catch{return new Set()}}
  function saveWishlist(set){try{localStorage.setItem(wishlistKey,JSON.stringify([...set]))}catch(_){ }}
  function setWishButton(button,id){if(!button)return;const saved=wishlist().has(id);button.textContent=saved?'♥':'♡';button.setAttribute('aria-pressed',saved?'true':'false');button.setAttribute('aria-label',saved?'Remove from saved products':'Save product')}
  window.togglePDWishlist=function(button){const id=current;if(!id)return;const set=wishlist();if(set.has(id))set.delete(id);else set.add(id);saveWishlist(set);setWishButton(button,id)};

  function chooseInitial(p){
    const all=p.variants||[];
    const preferredForm=p.forms?.includes('Vial')?'Vial':(p.forms?.[0]||all[0]?.form||'Vial');
    const candidate=all.find(v=>v.form===preferredForm&&availableStock(v)>0)||all.find(v=>availableStock(v)>0)||all.find(v=>v.form===preferredForm)||all[0];
    return {strength:candidate?.strength||p.strengths?.[0]||'',form:candidate?.form||preferredForm};
  }

  function renderThumbs(p){
    const host=document.getElementById('pdThumbs');
    if(!host)return;
    host.innerHTML=(p.forms||[]).map(form=>`<button type="button" class="pd-thumb${mf.value===form?' active':''}" data-pd-thumb="${eh(form)}" onclick="selectPDForm(decodeURIComponent('${enc(form)}'))"><div class="visual" data-pd-thumb-vis="${eh(form)}"></div><small>${eh(form)}</small></button>`).join('');
    for(const form of p.forms||[]){
      const el=host.querySelector(`[data-pd-thumb-vis="${CSS.escape(form)}"]`);
      const v=variantFor(p,ms.value,form)||(p.variants||[]).find(x=>x.form===form)||preferred(p);
      if(el)visual(p,v,el);
    }
  }

  window.openProduct=function(id){
    current=id;
    const p=products.find(x=>x.id===id);
    if(!p)return;
    const initial=chooseInitial(p);
    productShell.style.setProperty('--pc',color(p));
    productShell.classList.add('product-detail-shell');
    const related=products.filter(x=>x.id!==p.id).slice(0,6);
    const description=p.short_description||p.description||'View the Research Insight page for molecule-level context and references.';
    productModal.innerHTML=`
      <div class="pd-wrap">
        <div class="pd-breadcrumb"><button type="button" onclick="closeOverlay('productOverlay');scrollTo({top:0,behavior:'smooth'})">Home</button><span>›</span><button type="button" onclick="closeOverlay('productOverlay');document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'})">Peptides</button><span>›</span><b>${eh(CAT[dc(p)]?.label||dc(p))}</b><span>›</span><span>${eh(p.name)}</span></div>
        <div class="pd-main">
          <div class="pd-thumbs" id="pdThumbs"></div>
          <div class="pd-stage"><div class="visual" id="mvis"></div></div>
          <div class="pd-info">
            <span class="tag">${eh(CAT[dc(p)]?.label||dc(p))}</span>
            <h2 class="pd-title">${eh(p.name)}</h2>
            <p class="pd-description">${eh(description)}</p>
            <a class="plain-research-link" href="/research-insight.html?product=${enc(p.id)}">OPEN RESEARCH INSIGHT →</a>
            <div class="pd-badges"><span class="chip">◈ Premium Quality</span><span class="chip">◉ Research Use Only</span><span class="chip">✓ Fresh Made</span></div>
            <span class="pd-label">Strength</span>
            <div class="pd-options" id="pdStrengths">${(p.strengths||[]).map(s=>`<button type="button" class="pd-choice ${s===initial.strength?'active':''}" data-strength="${eh(s)}" onclick="selectPDStrength(this)">${eh(main(s))}</button>`).join('')}</div>
            <span class="pd-label">Format</span>
            <div class="pd-options" id="pdForms">${(p.forms||[]).map(f=>`<button type="button" class="pd-choice ${f===initial.form?'active':''}" data-form="${eh(f)}" onclick="selectPDForm(decodeURIComponent('${enc(f)}'))">${eh(f)}</button>`).join('')}</div>
            <input type="hidden" id="ms" value="${eh(initial.strength)}"><input type="hidden" id="mf" value="${eh(initial.form)}">
            <div id="vinfo"></div>
            <div class="pd-buy"><div class="pd-qty"><button type="button" aria-label="Reduce quantity" onclick="changePDQty(-1)">−</button><span id="pdQtyEl">1</span><button type="button" aria-label="Increase quantity" onclick="changePDQty(1)">+</button></div><button id="addBtn" type="button" class="pd-cart" onclick="addCartPD()">ADD TO CART</button><button id="pdHeart" class="pd-heart" type="button" aria-label="Save product" aria-pressed="false" onclick="togglePDWishlist(this)">♡</button></div>
            <div class="pd-perks"><span>▣ Fresh made same day ship</span><span>❄ Keep refrigerated</span><span>⚗ Variant-specific stock</span></div>
          </div>
        </div>
        <div class="pd-related"><h3>RELATED PRODUCTS</h3><div class="pd-related-grid">${related.map((r,i)=>`<button type="button" class="pd-related-card" style="--rc:${color(r)}" onclick="openProduct(decodeURIComponent('${enc(r.id)}'))"><div class="rvis" id="rvis${i}"></div><b>${eh(r.name)}</b><small>${eh(main(r.strengths?.[0]||''))} / ${eh(r.forms?.[0]||'Vial')}</small><span class="rprice">${minPrice(r)?'RM'+minPrice(r).toFixed(2):'Unavailable'}</span></button>`).join('')}</div></div>
      </div>`;
    window.pdQty=1;
    productOverlay.classList.add('show');
    document.body.style.overflow='hidden';
    setWishButton(document.getElementById('pdHeart'),p.id);
    renderThumbs(p);
    refreshVariantPD();
    related.forEach((r,i)=>{const el=document.getElementById('rvis'+i);if(el)visual(r,preferred(r),el)});
  };

  window.selectPDStrength=function(btn){
    document.querySelectorAll('#pdStrengths .pd-choice').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    ms.value=btn.dataset.strength;
    const p=products.find(x=>x.id===current);
    if(p&&!variantFor(p,ms.value,mf.value)){
      const candidate=(p.variants||[]).find(v=>v.strength===ms.value);
      if(candidate)mf.value=candidate.form;
    }
    window.pdQty=1;
    renderThumbs(p);
    refreshVariantPD();
  };

  window.selectPDForm=function(form){
    const p=products.find(x=>x.id===current);
    if(!p||!p.forms.includes(form))return;
    let variant=variantFor(p,ms.value,form);
    if(!variant){
      variant=(p.variants||[]).find(v=>v.form===form);
      if(variant)ms.value=variant.strength;
    }
    mf.value=form;
    document.querySelectorAll('#pdForms .pd-choice').forEach(x=>x.classList.toggle('active',x.dataset.form===form));
    document.querySelectorAll('#pdStrengths .pd-choice').forEach(x=>x.classList.toggle('active',x.dataset.strength===ms.value));
    window.pdQty=1;
    renderThumbs(p);
    refreshVariantPD();
  };

  window.changePDQty=function(delta){
    const p=products.find(x=>x.id===current),v=p&&variantFor(p,ms.value,mf.value);
    const max=availableStock(v);
    window.pdQty=Math.max(1,Math.min(max||1,Number(window.pdQty||1)+Number(delta||0)));
    if(window.pdQtyEl)pdQtyEl.textContent=window.pdQty;
  };

  window.refreshVariantPD=function(){
    const p=products.find(x=>x.id===current);if(!p)return;
    const v=variantFor(p,ms.value,mf.value);
    const stock=availableStock(v),ok=!!v&&stock>0;
    if(window.pdQty>stock&&stock>0)window.pdQty=stock;
    if(window.pdQtyEl)pdQtyEl.textContent=Math.max(1,window.pdQty||1);
    vinfo.innerHTML=v?`<div class="pd-price">RM${Number(v.price||0).toFixed(2)}</div><p class="pd-stock ${ok?'stock-in':'stock-out'}">${ok?'● '+stock+' available':'OUT OF STOCK'}</p><div class="pd-sku">SKU: ${eh(v.sku||'—')}</div>`:'<p class="stock-out">This strength/format combination is unavailable.</p>';
    addBtn.disabled=!ok;
    if(v)visual(p,v,mvis);else visual(p,null,mvis);
  };

  window.addCartPD=function(){
    const p=products.find(x=>x.id===current),v=p&&variantFor(p,ms.value,mf.value);
    const max=availableStock(v);if(!v||max<=0)return;
    const qty=Math.max(1,Math.min(max,Number(window.pdQty||1))),existing=cart.find(x=>x.variantId===v.id);
    if(existing&&Number(existing.qty||0)+qty>max){alert(`Only ${max} available for this variant.`);return;}
    if(existing)existing.qty+=qty;else cart.push({id:p.id,variantId:v.id,name:p.name,strength:v.strength,form:v.form,price:Number(v.price),qty});
    save();renderCart();closeOverlay('productOverlay');drawer.classList.add('show');document.body.style.overflow='';
  };

  const baseClose=window.closeOverlay;
  window.closeOverlay=function(id){if(typeof baseClose==='function')baseClose(id);if(id==='productOverlay')document.body.style.overflow=''};
})();
