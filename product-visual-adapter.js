/* Shared, theme-independent adapter for an image target, product and variant. */
(()=>{
  const masters={Vial:'/assets/vial-master-approved.webp',Pen:'/assets/pen-master-approved.webp',Cartridge:'/assets/cartridge-master-approved.webp'};
  let templates={};
  const setTemplates=rows=>{templates=Object.fromEntries((rows||[]).filter(r=>r.format&&r.master_image_url).map(r=>[r.format,r.master_image_url]));};
  const placeholder=url=>/\/(?:masters\/|assets\/)(?:vial|pen|cartridge)-master/i.test(String(url||''));
  async function render(product,variant,target){
    if(!target)return;
    const form=variant?.format||variant?.form||'Vial',fallback=masters[form]||masters.Vial;
    const token=(target.__visualToken||0)+1;target.__visualToken=token;
    const src=variant?.image_url||'',renderer=window.AIBTVisualRenderer;
    target.alt=product?.name||'AI BioTech '+form;
    target.onerror=()=>{target.onerror=null;target.src=fallback;};
    if(src&&!placeholder(src)){target.src=src;return;}
    target.src=fallback;
    if(!renderer||!product?.name||!variant?.strength_label)return;
    if(form==='Cartridge'&&renderer.cartridgeVisualMode(product.name)!=='dynamic')return;
    const canvas=document.createElement('canvas');
    try{
      const result=await renderer.renderPreview({canvas,masterUrl:form==='Cartridge'?'/assets/cartridge-master-blank-approved.webp':templates[form]||fallback,productName:product.name,strength:variant.strength_label,format:form,accent:product.categories?.color||'#1477ff',cartridgeBlank:form==='Cartridge',vialCapMode:'white'});
      if(target.__visualToken===token&&result?.mode!=='reference-only')target.src=canvas.toDataURL('image/png');
    }catch{/* Keep the non-blocking bundled fallback on CORS/image/canvas errors. */}
  }
  window.AIBTProductVisual={render,placeholder,setTemplates};
})();
