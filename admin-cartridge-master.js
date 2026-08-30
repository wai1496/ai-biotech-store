(()=>{
'use strict';

const BUCKET='catalog-media';
const LIVE_PATH='masters/cartridge-master-admin.webp';
const PREVIOUS_PATH='masters/archive/cartridge-master-previous.webp';
const FALLBACK_URL='/assets/cartridge-master-approved.webp';
const PUBLIC_BASE='https://yjauxyvtrmdriwtmckkl.supabase.co/storage/v1/object/public/catalog-media/';
let candidateBlob=null;
let candidateUrl='';

function liveUrl(){return PUBLIC_BASE+LIVE_PATH+'?v='+Date.now()}
function revokeCandidate(){if(candidateUrl){URL.revokeObjectURL(candidateUrl);candidateUrl=''}}
function setStatus(d,msg,type='info'){
  const el=d.querySelector('[data-cartridge-status]');
  if(!el)return;
  el.textContent=msg;
  el.dataset.type=type;
}
function setBusy(d,busy){d.querySelectorAll('button,input').forEach(el=>{if(el.dataset.keepEnabled!=='1')el.disabled=busy})}
function setPreview(img,url){img.onerror=()=>{if(img.src.endsWith(FALLBACK_URL))return;img.onerror=null;img.src=FALLBACK_URL};img.src=url}

async function imageToSquareWebp(file){
  if(!file||!/^image\/(png|jpeg|webp)$/i.test(file.type))throw new Error('Choose a PNG, WebP, JPG or JPEG image.');
  if(file.size>12*1024*1024)throw new Error('Image is too large. Please use a file under 12 MB.');
  const bitmap=await createImageBitmap(file).catch(()=>null);
  if(!bitmap)throw new Error('The selected image could not be decoded.');
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
  const ctx=canvas.getContext('2d',{alpha:true});ctx.clearRect(0,0,1024,1024);
  const scale=Math.min(1024/bitmap.width,1024/bitmap.height),w=bitmap.width*scale,h=bitmap.height*scale;
  ctx.drawImage(bitmap,(1024-w)/2,(1024-h)/2,w,h);bitmap.close?.();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.92));
  if(!blob)throw new Error('Could not prepare the image for upload.');
  return {blob,wasSquare:Math.abs(file.width-file.height)<2,width:file.width,height:file.height};
}

async function currentMasterBlob(){
  const r=await sb.storage.from(BUCKET).download(LIVE_PATH);
  if(!r.error&&r.data)return r.data;
  const fallback=await fetch(FALLBACK_URL,{cache:'no-store'});
  if(!fallback.ok)throw new Error('Could not load the current Cartridge image for backup.');
  return await fallback.blob();
}

function buildDialog(){
  const d=document.createElement('dialog');d.className='aibt-modal aibt-cartridge-master-modal';
  d.innerHTML=`<form method="dialog">
    <h2>Cartridge Master Image</h2>
    <p class="sub">Upload one fixed Cartridge image for the storefront. Cartridge product name and strength overlays remain disabled.</p>
    <div class="cartridge-master-preview"><img data-cartridge-preview alt="Current Cartridge master preview"></div>
    <div class="cartridge-master-actions">
      <label class="btn cartridge-file-label">Choose Image<input data-cartridge-file type="file" accept="image/png,image/webp,image/jpeg" hidden></label>
      <button type="button" class="btn" data-replace>Replace Cartridge Image</button>
      <button type="button" class="btn primary" data-save>Save Changes</button>
      <button type="button" class="btn" data-restore>Restore Previous Cartridge Image</button>
    </div>
    <p class="cartridge-master-status" data-cartridge-status>Current live image loaded. Choose an image to prepare a replacement.</p>
    <p class="sub">PNG, WebP, JPG or JPEG. The saved asset is normalized to a transparent 1:1 WebP canvas with the full image contained inside.</p>
    <footer><button class="btn" value="cancel" data-keep-enabled="1">Close</button></footer>
  </form>`;
  document.getElementById('aibtModalHost')?.appendChild(d);
  const img=d.querySelector('[data-cartridge-preview]'),input=d.querySelector('[data-cartridge-file]');
  setPreview(img,liveUrl());
  input.addEventListener('change',()=>{candidateBlob=null;revokeCandidate();setStatus(d,input.files?.[0]?`Selected ${input.files[0].name}. Click Replace Cartridge Image to preview it.`:'Choose an image to continue.');});
  d.querySelector('[data-replace]').onclick=async()=>{
    const file=input.files?.[0];if(!file)return setStatus(d,'Choose an image first.','error');
    setBusy(d,true);setStatus(d,'Checking and preparing image…');
    try{
      const bitmap=await createImageBitmap(file);const original={width:bitmap.width,height:bitmap.height};bitmap.close?.();
      const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const ctx=canvas.getContext('2d',{alpha:true});ctx.clearRect(0,0,1024,1024);
      const src=await createImageBitmap(file),scale=Math.min(1024/src.width,1024/src.height),w=src.width*scale,h=src.height*scale;ctx.drawImage(src,(1024-w)/2,(1024-h)/2,w,h);src.close?.();
      candidateBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.92));if(!candidateBlob)throw new Error('Could not prepare the image.');
      candidateUrl=URL.createObjectURL(candidateBlob);img.onerror=null;img.src=candidateUrl;
      const ratio=Math.abs(original.width/original.height-1)<0.02?'1:1 source confirmed':'source was not 1:1; it has been safely contained on a 1:1 transparent canvas';
      setStatus(d,`Preview updated (${ratio}). Click Save Changes to make this live.`,'success');
    }catch(err){setStatus(d,err.message||String(err),'error')}
    finally{setBusy(d,false)}
  };
  d.querySelector('[data-save]').onclick=async()=>{
    if(!candidateBlob)return setStatus(d,'Preview a replacement image before saving.','error');
    setBusy(d,true);setStatus(d,'Backing up current image and saving…');
    try{
      const previous=await currentMasterBlob();
      const backup=await sb.storage.from(BUCKET).upload(PREVIOUS_PATH,previous,{upsert:true,contentType:'image/webp',cacheControl:'60'});if(backup.error)throw backup.error;
      const save=await sb.storage.from(BUCKET).upload(LIVE_PATH,candidateBlob,{upsert:true,contentType:'image/webp',cacheControl:'60'});if(save.error)throw save.error;
      candidateBlob=null;revokeCandidate();input.value='';setPreview(img,liveUrl());
      setStatus(d,'Cartridge master image saved successfully. The storefront will use this image with no overlay text.','success');
    }catch(err){setStatus(d,`Save failed: ${err.message||err}`,'error')}
    finally{setBusy(d,false)}
  };
  d.querySelector('[data-restore]').onclick=async()=>{
    setBusy(d,true);setStatus(d,'Restoring previous Cartridge image…');
    try{
      const old=await sb.storage.from(BUCKET).download(PREVIOUS_PATH);if(old.error||!old.data)throw old.error||new Error('No previous Cartridge image is available.');
      const now=await sb.storage.from(BUCKET).download(LIVE_PATH);
      if(!now.error&&now.data)await sb.storage.from(BUCKET).upload(PREVIOUS_PATH,now.data,{upsert:true,contentType:'image/webp',cacheControl:'60'});
      const restore=await sb.storage.from(BUCKET).upload(LIVE_PATH,old.data,{upsert:true,contentType:'image/webp',cacheControl:'60'});if(restore.error)throw restore.error;
      candidateBlob=null;revokeCandidate();input.value='';setPreview(img,liveUrl());setStatus(d,'Previous Cartridge image restored successfully.','success');
    }catch(err){setStatus(d,`Restore failed: ${err.message||err}`,'error')}
    finally{setBusy(d,false)}
  };
  d.addEventListener('close',()=>{revokeCandidate();d.remove()},{once:true});
  return d;
}

function installButton(){
  const top=document.querySelector('#app .top');if(!top||document.getElementById('cartridgeMasterAdminBtn'))return;
  const b=document.createElement('button');b.id='cartridgeMasterAdminBtn';b.type='button';b.className='btn';b.textContent='Cartridge Master';b.onclick=()=>{const d=buildDialog();d.showModal()};
  const store=top.querySelector('a[href="/"]');top.insertBefore(b,store||top.lastElementChild);
}

const style=document.createElement('style');style.textContent=`
.aibt-cartridge-master-modal{max-width:760px}.cartridge-master-preview{width:min(100%,520px);aspect-ratio:1/1;margin:14px auto;border:1px solid #294453;border-radius:16px;background:repeating-conic-gradient(#11202a 0 25%,#172a35 0 50%) 50%/24px 24px;display:grid;place-items:center;overflow:hidden}.cartridge-master-preview img{width:100%;height:100%;object-fit:contain}.cartridge-master-actions{display:flex;gap:9px;flex-wrap:wrap}.cartridge-file-label{display:inline-flex;align-items:center}.cartridge-master-status{padding:11px 13px;border-radius:10px;background:#0c1b24;color:#b9cfdb}.cartridge-master-status[data-type="success"]{border:1px solid #2e8f72;color:#bfffe8}.cartridge-master-status[data-type="error"]{border:1px solid #8a3d4c;color:#ffd0d7}@media(max-width:640px){.cartridge-master-actions>*{width:100%;justify-content:center}}
`;document.head.appendChild(style);

const observer=new MutationObserver(installButton);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installButton,{once:true});else installButton();
})();
