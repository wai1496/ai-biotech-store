window.AIBT_CONFIG = Object.freeze({
  environment: 'staging',
  label: 'STAGING PREVIEW — NO PRODUCTION WRITES',
  supabaseUrl: 'https://rpnwssqvurpdennpzplx.supabase.co',
  supabaseKey: 'sb_publishable_x4udjzTcG-t9NW6qusKvZA_Efk2QoXh',
  checkoutEnabled: true,
  memberEnabled: true
});

window.toast = window.toast || function(message){
  let el = document.getElementById('toast');
  if(!el){
    el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el);
  }
  el.textContent = String(message || '');
  el.classList.add('show');
  clearTimeout(window.__aibtToastTimer);
  window.__aibtToastTimer = setTimeout(() => el.classList.remove('show'), 2600);
};
