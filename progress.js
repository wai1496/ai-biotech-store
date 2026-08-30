const sb=supabase.createClient('https://yjauxyvtrmdriwtmckkl.supabase.co','sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF');
let currentStatus=null;
let currentSession=null;

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const statusLabel=s=>String(s||'UNKNOWN').replaceAll('_',' ');
const stamp=v=>{if(!v)return 'Unknown';const d=new Date(v);return Number.isNaN(d.getTime())?'Unknown':d.toLocaleString();};

function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
function chip(status,label=statusLabel(status)){return `<span class="status-chip" data-status="${esc(status||'UNKNOWN')}">${esc(label)}</span>`;}

async function adminSession(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session)return null;
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return null;
  const result=await sb.from('admin_users').select('role,active').eq('user_id',user.id).maybeSingle();
  if(result.error||!result.data?.active)return null;
  return {session,user,role:result.data.role};
}

async function boot(){
  const auth=await adminSession();
  if(!auth){$('loginView').hidden=false;$('appView').hidden=true;return;}
  currentSession=auth.session;
  $('loginView').hidden=true;
  $('appView').hidden=false;
  await loadStatus();
}

async function api(path,options={}){
  if(!currentSession){const auth=await adminSession();if(!auth)throw new Error('Admin session required');currentSession=auth.session;}
  const headers={...(options.headers||{}),Authorization:`Bearer ${currentSession.access_token}`};
  if(options.body&&!headers['Content-Type'])headers['Content-Type']='application/json';
  const response=await fetch(path,{...options,headers});
  const data=await response.json().catch(()=>({}));
  if(response.status===401||response.status===403){currentSession=null;await sb.auth.signOut();$('appView').hidden=true;$('loginView').hidden=false;throw new Error(data.error||'Admin authorization expired');}
  if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);
  return data;
}

async function loadStatus(){
  $('refreshBtn').disabled=true;
  $('refreshStamp').textContent='Refreshing live project state…';
  try{
    currentStatus=await api('/api/progress-status');
    render(currentStatus);
    $('refreshStamp').textContent=`Last refreshed ${stamp(currentStatus.generatedAt)}`;
  }catch(error){
    $('refreshStamp').textContent='Project status unavailable';
    toast(error.message||'Could not load project status');
  }finally{$('refreshBtn').disabled=false;}
}

function render(status){
  $('overallPercent').textContent=`${Number(status.health?.overallPercent||0)}%`;
  $('overallBar').style.width=`${Math.max(0,Math.min(100,Number(status.health?.overallPercent||0)))}%`;
  $('currentPhase').textContent=status.health?.phase||'Unknown';
  $('releaseState').innerHTML=chip(status.health?.status||'UNKNOWN');
  const c=status.counts||{};
  $('productionData').textContent=Number.isFinite(c.products)?`${c.products} products / ${Number.isFinite(c.variants)?c.variants:'?'} variants`:'Connected status only';
  renderRoadmap(status.roadmap||[]);
  renderIssues();
  renderCredentials(status.credentials||[]);
  renderBranches(status.branches||[]);
  renderDeployments(status.deployments||[]);
  renderNotifications(status.notifications||[]);
  renderSources(status.sources||{});
  renderCounts(status.counts||{});
}

function renderRoadmap(nodes){
  $('roadmap').innerHTML=nodes.map(n=>`<article class="road-node"><div>${chip(n.status)}</div><h3>${esc(n.id)}. ${esc(n.name)}</h3><p>${esc(n.detail)}</p></article>`).join('')||'<p class="muted">No roadmap data available.</p>';
}

function renderIssues(){
  const issues=currentStatus?.issues||[];
  const filter=$('issueFilter').value;
  const list=filter==='all'?issues:issues.filter(i=>i.bucket===filter);
  $('issues').innerHTML=list.length?list.slice(0,50).map(i=>`<article class="issue"><div class="issue-head"><h3>#${esc(i.id)} ${esc(i.title)}</h3>${chip(i.bucket==='resolved'?'PASS':i.bucket==='blocked'?'BLOCKED':i.bucket==='in_progress'?'IN_PROGRESS':'UNKNOWN',i.bucket)}</div><div class="small-meta">${esc(i.source||'github')} · updated ${esc(stamp(i.updatedAt))}${i.labels?.length?` · ${esc(i.labels.join(', '))}`:''}</div>${i.url?`<a class="small-meta" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">Open issue</a>`:''}</article>`).join(''):'<div class="notice-card"><h3>No matching issues</h3><p>No GitHub issue is currently visible in this group. System-derived warnings appear in Notifications.</p></div>';
}

function renderCredentials(items){
  $('credentials').innerHTML=items.map(item=>`<article class="credential"><div class="credential-head"><h3>${esc(item.key)}</h3>${chip(item.configured?'PASS':item.required?'BLOCKED':'WARNING',item.configured?'Configured':item.required?'Required':'Not configured')}</div><p>${esc(item.purpose)}</p><div class="small-meta">${item.required?'Required for this control center':'Optional / integration-specific'} · values never displayed</div></article>`).join('');
}

function renderBranches(branches){
  const ordered=[...branches].sort((a,b)=>{const rank=x=>x.name==='main'?0:x.classification==='integration'?1:x.classification==='work'?2:3;return rank(a)-rank(b)||a.name.localeCompare(b.name)});
  $('branches').innerHTML=ordered.length?ordered.slice(0,60).map(b=>`<article class="data-card"><div class="title">${esc(b.name)}</div><div class="meta"><span>${esc(b.classification)}</span><span>${esc((b.sha||'').slice(0,12)||'no SHA')}</span>${b.protected?'<span>protected</span>':''}</div></article>`).join(''):'<div class="notice-card"><h3>Branch telemetry unavailable</h3><p>GitHub source is unavailable or returned no branches.</p></div>';
}

function renderDeployments(items){
  $('deployments').innerHTML=items.length?items.map(d=>`<article class="data-card"><div class="title">${esc(d.branch||'Unknown branch')}</div><div>${chip(String(d.state||'UNKNOWN').toUpperCase().includes('READY')?'PASS':String(d.state||'').toUpperCase().match(/ERROR|FAIL|CANCEL/)?'FAILED':'IN_PROGRESS',d.state||'UNKNOWN')}</div><div class="meta"><span>${esc(d.target||'preview/runtime')}</span><span>${esc((d.sha||'').slice(0,12)||'no SHA')}</span><span>${esc(stamp(d.createdAt))}</span></div>${d.message?`<div class="small-meta">${esc(d.message)}</div>`:''}</article>`).join(''):'<div class="notice-card"><h3>Detailed deployments unavailable</h3><p>Configure server-side Vercel telemetry credentials for deployment history. The rest of the dashboard remains available.</p></div>';
}

function renderNotifications(items){
  $('notificationCount').textContent=String(items.length);
  $('notificationList').innerHTML=items.length?items.map(n=>`<article class="notice-card"><div class="notice-head"><h3>${esc(n.title)}</h3>${chip(n.severity==='success'?'PASS':n.severity==='error'?'FAILED':n.severity==='warning'?'WARNING':'IN_PROGRESS',n.type)}</div><p>${esc(n.message)}</p><div class="small-meta">${esc(stamp(n.createdAt))}</div></article>`).join(''):'<div class="notice-card"><h3>No current notifications</h3><p>No system-derived project updates are currently visible.</p></div>';
}

function renderSources(sources){
  const labels={github:'GitHub',vercel:'Vercel',supabase:'Supabase'};
  $('sourceChips').innerHTML=Object.entries(sources).map(([k,v])=>chip(v.available?'PASS':'WARNING',`${labels[k]||k}: ${v.available?'online':'limited'}`)).join('');
  $('sources').innerHTML=Object.entries(sources).map(([k,v])=>`<article class="source-card"><div class="source-head"><h3>${esc(labels[k]||k)}</h3>${chip(v.available?'PASS':'WARNING',v.available?'Available':'Limited')}</div><p>${esc(v.error||((k==='vercel'&&v.detailed)?'Detailed telemetry available.':'Source responding.'))}</p></article>`).join('');
}

function renderCounts(counts){
  const entries=[['Products',counts.products],['Variants',counts.variants],['Orders',counts.orders],['Customers',counts.customer_profiles],['Wallet accounts',counts.wallet_accounts],['Protocols',counts.customer_protocols]];
  $('counts').innerHTML=entries.map(([name,value])=>`<article class="count-card"><span>${esc(name)}</span><strong>${Number.isFinite(value)?esc(value):'—'}</strong></article>`).join('');
}

function addMessage(text,kind){
  const div=document.createElement('div');div.className=`message ${kind}`;div.textContent=text;$('chatLog').appendChild(div);$('chatLog').scrollTop=$('chatLog').scrollHeight;
}

$('loginForm').addEventListener('submit',async event=>{
  event.preventDefault();$('loginError').textContent='';
  const email=$('adminEmail').value.trim(),password=$('adminPassword').value;
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error){$('loginError').textContent=error.message;return;}
  const auth=await adminSession();
  if(!auth){await sb.auth.signOut();$('loginError').textContent='This account is not an active AI BioTech administrator.';return;}
  currentSession=auth.session;$('loginView').hidden=true;$('appView').hidden=false;await loadStatus();
});

$('signOutBtn').addEventListener('click',async()=>{await sb.auth.signOut();currentSession=null;currentStatus=null;$('appView').hidden=true;$('loginView').hidden=false;});
$('refreshBtn').addEventListener('click',loadStatus);
$('issueFilter').addEventListener('change',renderIssues);
$('notificationBtn').addEventListener('click',()=>$('notificationDialog').showModal());
$('closeNotifications').addEventListener('click',()=>$('notificationDialog').close());
$('notificationDialog').addEventListener('click',event=>{if(event.target===$('notificationDialog'))$('notificationDialog').close();});

$('chatForm').addEventListener('submit',async event=>{
  event.preventDefault();const message=$('chatInput').value.trim();if(!message)return;
  addMessage(message,'user');$('chatInput').value='';$('chatSend').disabled=true;$('chatMode').textContent='Thinking…';
  try{
    const data=await api('/api/progress-chat',{method:'POST',body:JSON.stringify({message})});
    addMessage(data.answer||'No response was returned.','assistant');
    $('chatMode').textContent=data.mode==='ai'?'AI mode':data.mode==='credential_required'?'Status mode · AI key missing':'Status mode';
  }catch(error){addMessage(error.message||'Project chat unavailable.','assistant');$('chatMode').textContent='Unavailable';}
  finally{$('chatSend').disabled=false;}
});

sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){currentSession=null;$('appView').hidden=true;$('loginView').hidden=false;}else if(session)currentSession=session;});
boot();