/* Full-screen premium product detail override. Uses existing catalog, variants, visual renderer and cart. */
(function(){
  window.openProduct=function(id){
    current=id;
    const p=products.find(x=>x.id===id);
    if(!p)return;
    productShell.style.setProperty('--pc',color(p));
    productShell.classList.add('product-detail-shell');
    const initialStrength=p.strengths?.[0]||'';
    const initialForm=p.forms?.[0]||'Vial';
    const related=products.filter(x=>x.id!==p.id).slice(0,6);
    productModal.innerHTML=`
      <div class="pd-wrap">
        <div class="pd-breadcrumb"><span>Home</span><span>›</span><span>Peptides</span><span>›</span><b>${CAT[dc(p)]?.label||dc(p)}</b><span>›</span><span>${p.name}</span></div>
        <div class="pd-main">
          <div class="pd-thumbs">
            <button class="pd-thumb active" id="thumbVial" style="--tc:${color(p)}" onclick="selectPDForm('Vial')"><div class="visual" id="thumbVialVis"></div></button>
            <button class="pd-thumb" id="thumbPen" style="--tc:#7c4dff" onclick="selectPDForm('Pen')"><div class="visual" id="thumbPenVis"></div></button>
          </div>
          <div class="pd-stage"><div class="visual" id="mvis"></div></div>
          <div class="pd-info">
            <span class="tag">${CAT[dc(p)]?.label||dc(p)}</span>
            <h2 class="pd-title">${p.name}</h2>
            <div class="pd-badges"><span class="chip">◈ Premium Quality</span><span class="chip">◉ Research Use Only</span><span class="chip">✓ Fresh Made</span></div>
            <span class="pd-label">Strength</span>
            <div class="pd-options" id="pdStrengths">${p.strengths.map((s,i)=>`<button class="pd-choice ${i===0?'active':''}" data-strength="${s.replace(/"/g,'&quot;')}" onclick="selectPDStrength(this)">${main(s)}</button>`).join('')}</div>
            <span class="pd-label">Format</span>
            <div class="pd-options" id="pdForms">${p.forms.map((f,i)=>`<button class="pd-choice ${i===0?'active':''}" data-form="${f}" onclick="selectPDForm('${f}')">${f}</button>`).join('')}</div>
            <input type="hidden" id="ms" value="${initialStrength.replace(/"/g,'&quot;')}"><input type="hidden" id="mf" value="${initialForm}">
            <div id="vinfo"></div>
            <div class="pd-buy"><div class="pd-qty"><button onclick="pdQty=Math.max(1,pdQty-1);pdQtyEl.textContent=pdQty">−</button><span id="pdQtyEl">1</span><button onclick="pdQty++;pdQtyEl.textContent=pdQty">+</button></div><button id="addBtn" class="pd-cart" onclick="addCartPD()">ADD TO CART</button><button class="pd-heart">♡</button></div>
            <div class="pd-perks"><span>▣ Fresh made same day ship</span><span>❄ Keep refrigerated</span><span>⚗ Lab tested quality</span></div>
          </div>
        </div>
        <div class="pd-related"><h3>RELATED PRODUCTS</h3><div class="pd-related-grid">${related.map((r,i)=>`<div class="pd-related-card" style="--rc:${color(r)}" onclick="openProduct('${r.id}')"><div class="rvis" id="rvis${i}"></div><b>${r.name}</b><small>${main(r.strengths?.[0]||'')} / ${r.forms?.[0]||'Vial'}</small><div class="rprice">${minPrice(r)?'RM'+minPrice(r).toFixed(2):'RM0.00'}</div></div>`).join('')}</div></div>
      </div>`;
    window.pdQty=1;
    productOverlay.classList.add('show');
    document.body.style.overflow='hidden';
    refreshVariantPD();
    const vialV=vfind(p,initialStrength,'Vial')||preferred(p), penV=vfind(p,initialStrength,'Pen')||preferred(p);
    if(document.getElementById('thumbVialVis'))visual(p,vialV,document.getElementById('thumbVialVis'));
    if(document.getElementById('thumbPenVis'))visual(p,penV,document.getElementById('thumbPenVis'));
    related.forEach((r,i)=>{const el=document.getElementById('rvis'+i);if(el)visual(r,preferred(r),el)});
  };

  window.selectPDStrength=function(btn){
    document.querySelectorAll('#pdStrengths .pd-choice').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    ms.value=btn.dataset.strength;
    refreshVariantPD();
  };
  window.selectPDForm=function(form){
    const p=products.find(x=>x.id===current); if(!p||!p.forms.includes(form))return;
    mf.value=form;
    document.querySelectorAll('#pdForms .pd-choice').forEach(x=>x.classList.toggle('active',x.dataset.form===form));
    const tv=document.getElementById('thumbVial'),tp=document.getElementById('thumbPen');
    if(tv)tv.classList.toggle('active',form==='Vial'); if(tp)tp.classList.toggle('active',form==='Pen');
    refreshVariantPD();
  };
  window.refreshVariantPD=function(){
    const p=products.find(x=>x.id===current); if(!p)return;
    const v=vfind(p,ms.value,mf.value)||preferred(p);
    const ok=v&&Number(v.stock)>0&&v.available!==false&&v.status!=='OUT OF STOCK';
    vinfo.innerHTML=`<div class="pd-price">RM${Number(v?.price||0).toFixed(2)}</div><p class="pd-stock ${ok?'stock-in':'stock-out'}">${ok?'● '+v.stock+' in stock':'OUT OF STOCK'}</p><div class="pd-sku">SKU: ${v?.sku||'—'}</div>`;
    addBtn.disabled=!ok;
    visual(p,v,mvis);
  };
  window.addCartPD=function(){
    const p=products.find(x=>x.id===current),v=vfind(p,ms.value,mf.value); if(!v||Number(v.stock)<=0||v.available===false)return;
    const qty=Math.max(1,window.pdQty||1),e=cart.find(x=>x.variantId===v.id);
    if(e)e.qty+=qty;else cart.push({id:p.id,variantId:v.id,name:p.name,strength:v.strength,form:v.form,price:Number(v.price),qty});
    save();renderCart();closeOverlay('productOverlay');drawer.classList.add('show');document.body.style.overflow='';
  };
  const baseClose=window.closeOverlay;
  window.closeOverlay=function(id){baseClose(id);if(id==='productOverlay')document.body.style.overflow=''};
})();
