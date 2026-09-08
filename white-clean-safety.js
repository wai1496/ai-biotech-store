(()=>{
  const show=(title,message)=>{
    let wrap=document.getElementById('wcSafetyModal');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='wcSafetyModal';
      wrap.className='modal-wrap';
      wrap.innerHTML='<div class="modal"><div class="drawer-head"><h2 id="wcSafetyTitle"></h2><button class="close-btn" id="wcSafetyClose">×</button></div><div class="drawer-body" id="wcSafetyBody"></div></div>';
      document.body.appendChild(wrap);
      wrap.querySelector('#wcSafetyClose').onclick=()=>wrap.classList.remove('show');
      wrap.onclick=e=>{if(e.target===wrap)wrap.classList.remove('show')};
    }
    wrap.querySelector('#wcSafetyTitle').textContent=title;
    wrap.querySelector('#wcSafetyBody').innerHTML=`<p>${message}</p><p><b>Staging safety:</b> no production order, payment, member, wallet or inventory write is performed from this action.</p>`;
    wrap.classList.add('show');
  };
  window.openStageAccount=()=>show('Member Area — Staging','Member routing is temporarily gated while the current member flow is reconnected to the isolated staging data path.');
  window.stageCheckout=()=>show('Checkout — Staging Safety Gate','Your cart UI is available, but checkout remains gated until the shared checkout flow is confirmed to use the isolated staging data path.');
})();
