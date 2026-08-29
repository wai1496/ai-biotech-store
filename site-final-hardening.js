(()=>{
'use strict';

const text=v=>String(v??'');
const escapeClass=v=>String(v||'product').toLowerCase().replace(/[^a-z0-9]+/g,'-');

function masterFormat(image,variant){
  const url=String(image||'').toLowerCase();
  if(!url.includes('/catalog-media/masters/'))return '';
  if(url.includes('vial-master'))return 'Vial';
  if(url.includes('cartridge-master'))return 'Cartridge';
  if(url.includes('pen-master'))return 'Pen';
  return variant?.form||variant?.format||'';
}

function renderCleanVisual(product,variant,host){
  if(!host)return;
  host.replaceChildren();
  const image=variant?.image||variant?.image_url||product?.productImage||product?.main_image_url||'';
  const fallback=()=>{
    host.replaceChildren();
    const wrap=document.createElement('div');
    wrap.className='aibt-clean-placeholder';
    wrap.innerHTML='<div><small>AI BIOTECH</small><h3></h3><p></p></div>';
    wrap.querySelector('h3').textContent=text(product?.name||'Research Product');
    const strength=variant?.strength||variant?.strength_label||product?.strengths?.[0]||'';
    const format=variant?.form||variant?.format||'Product';
    wrap.querySelector('p').textContent=[strength,format].filter(Boolean).join(' · ');
    host.appendChild(wrap);
  };
  if(!image){fallback();return;}
  const frame=document.createElement('div');
  frame.className='aibt-visual-frame';
  const img=document.createElement('img');
  img.src=image;
  img.alt=text(product?.name||'AI BioTech product');
  img.loading='lazy';
  img.decoding='async';
  img.addEventListener('error',fallback,{once:true});
  frame.appendChild(img);

  const format=masterFormat(image,variant);
  if(format){
    const label=document.createElement('div');
    label.className=`aibt-master-label aibt-master-${escapeClass(format)}`;
    label.style.setProperty('--label-accent',typeof color==='function'?color(product):'#18c9ff');
    const name=document.createElement('b');
    name.className='aibt-master-name';
    name.textContent=text(product?.name||'Research Product').replace(/\s+\d+(?:\.\d+)?\s*(?:MG|ML)$/i,'').trim();
    const strength=document.createElement('span');
    strength.className='aibt-master-strength';
    strength.textContent=text(variant?.strength||variant?.strength_label||product?.strengths?.[0]||'');
    label.append(name,strength);
    frame.appendChild(label);
  }
  host.appendChild(frame);
}

try{visual=renderCleanVisual;window.visual=renderCleanVisual}catch(_){ }

function finalizeNavigation(){
  document.querySelectorAll('.shell-menu').forEach(el=>el.remove());
  document.body.classList.remove('shell-nav-open');
  const admin=document.getElementById('adminNavBtn')||[...document.querySelectorAll('.actions button')].find(b=>/\bADMIN\b/i.test(b.textContent||''));
  if(admin&&!admin.dataset.aibtRealAdmin){
    admin.dataset.aibtRealAdmin='1';
    admin.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();location.href='/admin.html'},true);
  }
  const member=document.getElementById('memberNavBtn');if(member)member.onclick=()=>location.href='/member.html';
  const checkout=document.getElementById('checkoutCartBtn');if(checkout)checkout.onclick=()=>location.href='/checkout.html';
}

const style=document.createElement('style');
style.textContent=`
.aibt-visual-frame{container-type:inline-size;position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}.aibt-visual-frame>img{display:block;width:100%;height:100%;object-fit:contain}
.aibt-clean-placeholder{width:100%;height:100%;min-height:220px;display:grid;place-items:center;text-align:center;padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:radial-gradient(circle at 75% 15%,rgba(24,201,255,.12),transparent 34%),rgba(8,20,38,.82)}
.aibt-clean-placeholder small{opacity:.65;letter-spacing:.16em}.aibt-clean-placeholder h3{margin:9px 0 5px}.aibt-clean-placeholder p{margin:0;opacity:.8}
.aibt-master-label{position:absolute;inset:0;pointer-events:none;font-family:Arial,sans-serif}.aibt-master-name,.aibt-master-strength{position:absolute;display:block;text-align:center;line-height:1.05;overflow:hidden;text-overflow:ellipsis}.aibt-master-name{color:var(--label-accent);font-weight:900;text-shadow:0 1px 1px rgba(255,255,255,.75);white-space:nowrap}.aibt-master-strength{color:#111;font-weight:900;text-shadow:0 1px 1px rgba(255,255,255,.8);white-space:nowrap}
.aibt-master-vial .aibt-master-name{left:34%;top:51%;width:32%;font-size:clamp(8px,4.2cqw,18px)}.aibt-master-vial .aibt-master-strength{left:41%;top:62%;width:18%;font-size:clamp(8px,3.7cqw,16px)}
.aibt-master-pen .aibt-master-name{left:47%;top:45.7%;width:23%;font-size:clamp(7px,3.5cqw,15px)}.aibt-master-pen .aibt-master-strength{left:72.5%;top:46.4%;width:10%;font-size:clamp(6px,2.6cqw,12px)}
.aibt-master-cartridge .aibt-master-name{left:34%;top:43%;width:32%;font-size:clamp(7px,3.4cqw,15px)}.aibt-master-cartridge .aibt-master-strength{left:42%;top:53%;width:16%;font-size:clamp(7px,3cqw,13px)}
.pd-breadcrumb button{border:0;background:none;color:inherit;padding:0;cursor:pointer}.pd-breadcrumb button:hover{color:var(--pc)}
.pd-thumb{flex-direction:column;gap:4px}.pd-thumb small{font-size:9px;color:#d7e5ed}.pd-description{color:#b8c8d4;line-height:1.55;margin:0 0 10px}.pd-info .plain-research-link{display:inline-block;margin:0 0 16px;color:var(--pc);font-weight:800;text-decoration:none}.pd-related-card{width:100%;color:#fff;text-align:left;font:inherit}.pd-related-card .rprice{display:block}
body.catalog-loading #grid,body.catalog-loading #cats{visibility:hidden}body.catalog-loading #catalog:after{content:'Loading live catalog…';display:block;padding:28px;text-align:center;color:#8fe8ff}
.guide-image-fallback{min-height:220px;border:1px dashed #52718a;border-radius:12px;display:grid;place-items:center;text-align:center;padding:24px;background:#071522;color:#eaf8ff}.guide-image-fallback b{color:#55dbff}.guide-image-fallback h3{margin:6px 0}.guide-image-fallback p{margin:0;color:#a8bbc9}
`;
document.head.appendChild(style);

window.addEventListener('aibt:catalog-loaded',()=>{document.body.classList.remove('catalog-loading');try{renderProducts();renderCart()}catch(_){ }finalizeNavigation()});
window.addEventListener('aibt:catalog-error',event=>{document.body.classList.remove('catalog-loading');const grid=document.getElementById('grid');if(grid&&!grid.children.length)grid.innerHTML='<p>Catalog is temporarily unavailable. Please refresh in a moment.</p>';console.error('AI BioTech catalog error',event.detail||event)});
document.addEventListener('DOMContentLoaded',()=>{finalizeNavigation();setTimeout(finalizeNavigation,0);setTimeout(()=>document.body.classList.remove('catalog-loading'),12000)},{once:true});
})();
