/* Admin is intentionally unavailable until isolated admin/RLS evidence exists. */
(()=>{
  const lock=()=>{
    const note=document.createElement('p');note.setAttribute('role','status');
    note.textContent='PREVIEW ADMIN LOCKED — isolated database and administrator permissions are not verified. No sign-in or writes are enabled.';
    document.body.prepend(note);
    document.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=true);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lock,{once:true});else lock();
})();
