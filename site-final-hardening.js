(()=>{
'use strict';

const text=v=>String(v??'');

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
  const img=document.createElement('img');
  img.src=image;
  img.alt=text(product?.name||'AI BioTech product');
  img.loading='lazy';
  img.decoding='async';
  img.addEventListener('error',fallback,{once:true});
  host.appendChild(img);
}

try{ visual=renderCleanVisual; window.visual=renderCleanVisual; }catch(_){ }

function finalizeNavigation(){
  document.querySelectorAll('.shell-menu').forEach(el=>el.remove());
  document.body.classList.remove('shell-nav-open');

  const admin=[...document.querySelectorAll('.actions button')].find(b=>/\bADMIN\b/i.test(b.textContent||''));
  if(admin&&!admin.dataset.aibtRealAdmin){
    admin.dataset.aibtRealAdmin='1';
    admin.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href='/admin.html';
    },true);
  }

  const member=document.getElementById('memberNavBtn');
  if(member)member.onclick=()=>location.href='/member.html';
  const checkout=document.getElementById('checkoutCartBtn');
  if(checkout)checkout.onclick=()=>location.href='/checkout.html';
}

const style=document.createElement('style');
style.textContent=`
.aibt-clean-placeholder{width:100%;height:100%;min-height:220px;display:grid;place-items:center;text-align:center;padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:radial-gradient(circle at 75% 15%,rgba(24,201,255,.12),transparent 34%),rgba(8,20,38,.82)}
.aibt-clean-placeholder small{opacity:.65;letter-spacing:.16em}.aibt-clean-placeholder h3{margin:9px 0 5px}.aibt-clean-placeholder p{margin:0;opacity:.8}
.pd-breadcrumb button{border:0;background:none;color:inherit;padding:0;cursor:pointer}.pd-breadcrumb button:hover{color:var(--pc)}
.pd-thumb{flex-direction:column;gap:4px}.pd-thumb small{font-size:9px;color:#d7e5ed}.pd-description{color:#b8c8d4;line-height:1.55;margin:0 0 10px}.pd-info .plain-research-link{display:inline-block;margin:0 0 16px;color:var(--pc);font-weight:800;text-decoration:none}.pd-related-card{width:100%;color:#fff;text-align:left;font:inherit}.pd-related-card .rprice{display:block}
body.catalog-loading #grid,body.catalog-loading #cats{visibility:hidden}
body.catalog-loading #catalog:after{content:'Loading live catalog…';display:block;padding:28px;text-align:center;color:#8fe8ff}
`;
document.head.appendChild(style);

window.addEventListener('aibt:catalog-loaded',()=>{
  document.body.classList.remove('catalog-loading');
  try{renderProducts();renderCart();}catch(_){ }
  finalizeNavigation();
});
window.addEventListener('aibt:catalog-error',event=>{
  document.body.classList.remove('catalog-loading');
  const grid=document.getElementById('grid');
  if(grid&&!grid.children.length)grid.innerHTML='<p>Catalog is temporarily unavailable. Please refresh in a moment.</p>';
  console.error('AI BioTech catalog error',event.detail||event);
});

document.addEventListener('DOMContentLoaded',()=>{
  finalizeNavigation();
  setTimeout(finalizeNavigation,0);
  setTimeout(()=>document.body.classList.remove('catalog-loading'),12000);
},{once:true});
})();
