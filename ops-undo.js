(()=>{
'use strict';
const cfg=window.AIBT_CONFIG||{};
const db=window.supabase?.createClient(cfg.supabaseUrl,cfg.supabaseKey);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
function openDialog(title,subtitle,body,actions=''){$('#dialogTitle').textContent=title;$('#dialogSubtitle').textContent=subtitle||'';$('#dialogBody').innerHTML=body;$('#dialogFoot').innerHTML=actions;$('#opsDialog').showModal()}
function pretty(v){return esc(JSON.stringify(v??null,null,2))}

window.openBatch=async function(id){
  if(!db)return window.toast?.('Staging database connection is unavailable.');
  const [br,it]=await Promise.all([
    db.from('change_batches').select('*').eq('id',id).maybeSingle(),
    db.from('change_items').select('*').eq('batch_id',id).order('id')
  ]);
  if(br.error||!br.data)return window.toast?.(br.error?.message||'Change batch not found.');
  if(it.error)return window.toast?.(it.error.message);
  const b=br.data,items=it.data||[];
  const undoEligible=b.status==='executed'&&!b.undone_at&&items.length>0;
  const itemHtml=items.map(x=>`<div class="history-item"><header><b>${esc(x.entity_type)} · ${esc(x.action)}</b><span class="badge ${x.status==='changed'?'green':'amber'}">${esc(x.status)}</span></header><p>${esc(x.entity_id)}</p><details><summary>Before / After</summary><pre style="white-space:pre-wrap;font-size:10px;background:#f7f9fc;padding:10px;border-radius:8px">BEFORE\n${pretty(x.before_value)}\n\nAFTER\n${pretty(x.after_value)}</pre></details></div>`).join('')||'<div class="empty">No item records.</div>';
  openDialog('Change Batch',b.reason||id,`<div class="preview"><div class="diff"><div><small>Batch ID</small>${esc(id)}</div><div><small>Status</small>${esc(b.status)}</div></div><div class="diff"><div><small>Source</small>${esc(b.source)}</div><div><small>Created</small>${esc(new Date(b.created_at).toLocaleString())}</div></div></div>${itemHtml}${undoEligible?'<div class="danger-note">Undo is conflict-protected: it will run only if every affected record still exactly matches this batch\'s recorded after-state.</div>':`<div class="danger-note">Undo unavailable because this batch is ${esc(b.status)}${b.undone_at?' and already has an undo record':''}.</div>`}`,`<button class="btn" onclick="closeOpsDialog()">Close</button>${undoEligible?`<button class="btn danger" onclick="openUndoBatch('${esc(id)}')">Undo Batch</button>`:''}`);
};

window.openUndoBatch=function(id){
  openDialog('Undo Change Batch','Conflict protection prevents overwriting newer changes.',`<div class="danger-note">This restores the exact before-values recorded in the selected batch. If any affected record changed later, the entire undo will be refused.</div><div class="form"><label>Reason for undo<input id="undoReason" class="field" placeholder="Required reason"></label><p id="undoMessage" class="muted"></p></div>`,`<button class="btn" onclick="openBatch('${esc(id)}')">Back</button><button id="undoConfirmBtn" class="btn danger" onclick="confirmUndoBatch('${esc(id)}')">Confirm Undo</button>`);
};

window.confirmUndoBatch=async function(id){
  const reason=String($('#undoReason')?.value||'').trim();
  if(reason.length<3){$('#undoMessage').textContent='Enter a meaningful undo reason.';return}
  const btn=$('#undoConfirmBtn');btn.disabled=true;btn.textContent='Checking & undoing…';
  const {data,error}=await db.rpc('ops_undo_batch',{p_batch_id:id,p_reason:reason});
  if(error){btn.disabled=false;btn.textContent='Confirm Undo';$('#undoMessage').textContent=error.message;return}
  window.closeOpsDialog?.();
  await window.refreshHistory?.();
  window.openOpsView?.('history');
  window.toast?.(`Batch undone safely · ${data?.restored_items||0} item(s) restored`);
};
})();
