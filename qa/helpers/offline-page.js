/* Minimal deterministic DOM fixture, not browser/layout evidence. No network. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Element{
  constructor(tag='div',document){this.tagName=tag.toUpperCase();this.ownerDocument=document;this.children=[];this.attributes={};this.style={};this.dataset={};this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.textContent='';this._html='';this.className='';this.classList={add:(...xs)=>{this.className=[...new Set([...this.className.split(' '),...xs])].join(' ');},remove:(...xs)=>{this.className=this.className.split(' ').filter(x=>!xs.includes(x)).join(' ');},contains:x=>this.className.split(' ').includes(x),toggle:x=>{const had=this.classList.contains(x);this.classList[had?'remove':'add'](x);return !had;}};}
  set id(v){this.attributes.id=v;if(this.ownerDocument)this.ownerDocument.ids[v]=this;}get id(){return this.attributes.id||'';}
  set innerHTML(html){this._html=html;this.children=[];parse(html,this,this.ownerDocument);}get innerHTML(){return this._html;}
  setAttribute(k,v){this.attributes[k]=String(v);if(k==='id')this.id=v;if(k==='class')this.className=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=v;}
  getAttribute(k){return this.attributes[k]??null;}
  appendChild(x){x.parentNode=this;this.children.push(x);return x;}append(...xs){xs.forEach(x=>this.appendChild(x));}prepend(x){x.parentNode=this;this.children.unshift(x);}replaceChildren(...xs){this.children=[];this.append(...xs);}insertBefore(x){this.prepend(x);}remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);}replaceWith(x){const p=this.parentNode;if(p){const i=p.children.indexOf(this);p.children[i]=x;x.parentNode=p;}}
  addEventListener(event,fn){(this.listeners[event]??=[]).push(fn);}removeEventListener(){}
  async dispatch(event){const e={type:event,target:this,preventDefault(){}};if(this['on'+event])await this['on'+event](e);for(const f of this.listeners[event]||[])await f(e);}
  focus(){this.ownerDocument.activeElement=this;}scrollIntoView(){}closest(selector){let x=this;while(x){if(matches(x,selector))return x;x=x.parentNode;}return null;}
  querySelectorAll(selector){const all=[];const visit=x=>{for(const child of x.children){if(selector.split(',').some(s=>matchesPath(child,s.trim())))all.push(child);visit(child);}};visit(this);return all;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  get cells(){return this.children.filter(x=>['TD','TH'].includes(x.tagName));}
  toDataURL(){return 'data:image/png;base64,offline-fixture';}
}
function matches(el,selector){if(selector==='*')return true;const tag=selector.match(/^[a-z]+/i)?.[0];if(tag&&el.tagName!==tag.toUpperCase())return false;for(const m of selector.matchAll(/#([\w-]+)/g))if(el.id!==m[1])return false;for(const m of selector.matchAll(/\.([\w-]+)/g))if(!el.classList.contains(m[1]))return false;for(const m of selector.matchAll(/\[([\w-]+)(?:=['"]?([^'"\]]+)['"]?)?\]/g))if(!(m[1] in el.attributes)||(m[2]!==undefined&&el.attributes[m[1]]!==m[2]))return false;return !!(tag||/[#.[*]/.test(selector));}
function matchesPath(el,selector){const parts=selector.split(/\s+/);if(!matches(el,parts.pop()))return false;let p=el.parentNode;while(parts.length){const wanted=parts.pop();while(p&&!matches(p,wanted))p=p.parentNode;if(!p)return false;p=p.parentNode;}return true;}
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
function parse(html,root,doc){const stack=[root],voids=new Set(['IMG','INPUT','BR','META','LINK','HR']);for(const match of String(html).matchAll(/<\/?([a-z][\w-]*)([^>]*)>|([^<]+)/gi)){if(match[3]){stack.at(-1).textContent+=decode(match[3]);continue;}if(match[0].startsWith('</')){if(stack.length>1)stack.pop();continue;}const e=new Element(match[1],doc);for(const a of match[2].matchAll(/([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){e.setAttribute(a[1],decode(a[2]??a[3]??a[4]??''));if(a[1]==='hidden')e.hidden=true;if(a[1]==='disabled')e.disabled=true;if(a[1]==='value')e.value=e.getAttribute('value');}stack.at(-1).appendChild(e);if(!voids.has(e.tagName))stack.push(e);}}
function storage(seed={}){const data=new Map(Object.entries(seed));return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),data};}
function fixture(html='',options={}){
  const document={ids:{},readyState:'loading',listeners:{},addEventListener(event,fn){(this.listeners[event]??=[]).push(fn);},createElement(tag){return new Element(tag,this);},getElementById(id){return this.ids[id]||null;},querySelectorAll(s){return this.body.querySelectorAll(s);},querySelector(s){return this.body.querySelector(s);}};
  document.body=new Element('body',document);document.head=new Element('head',document);document.documentElement=new Element('html',document);
  parse(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),document.body,document);
  const calls=[],timers=[];
  const query=table=>{const q=new Proxy({}, {get:(_,key)=>key==='then'?((ok,bad)=>Promise.resolve({data:options.rows?.[table]||[],error:null}).then(ok,bad)):(...args)=>{calls.push({table,method:key,args});return q;}});return q;};
  const context={document,console,URL,URLSearchParams,Map,Set,Date,Promise,Proxy,JSON,Number,String,Boolean,Array,Math,Error,Intl,localStorage:options.storage||storage(),crypto:{randomUUID:()=> 'fixture-intent'},location:{href:'https://offline.vercel.app/',origin:'https://offline.vercel.app',search:'',pathname:'/',hash:'',reload(){},replace(url){this.href=url;}},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},requestAnimationFrame:fn=>fn(),cancelAnimationFrame(){},addEventListener(){},dispatchEvent(){},scrollTo(){},innerWidth:390,alert(){},confirm:()=>false,fetch:()=>{throw new Error('NETWORK FORBIDDEN');},supabase:{createClient(url,key,config){calls.push({client:url,config});return {from:query,auth:{getUser:async()=>({data:{user:null}}),getSession:async()=>({data:{session:null}})},rpc:()=>{throw new Error('Raw RPC forbidden');}};}}};
  Object.assign(context,document.ids);context.window=context;context.globalThis=context;context.MutationObserver=class{observe(){}disconnect(){}};context.ResizeObserver=class{observe(){}disconnect(){}};
  vm.createContext(context);
  const run=file=>vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  const drain=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
  const boot=async()=>{document.readyState='complete';for(const fn of document.listeners.DOMContentLoaded||[])await fn();const pending=timers.splice(0);for(const fn of pending)await fn();await drain();};
  const scripts=[...html.matchAll(/<script[^>]+src="([^"?]+)[^"]*"[^>]*><\/script>/g)].map(x=>x[1]).filter(x=>x.startsWith('/')).map(x=>x.slice(1));
  const load=(omit=[])=>{for(const file of scripts)if(!omit.includes(file))run(file);};
  return {context,document,calls,run,load,boot,drain,scripts,storage:context.localStorage,assert};
}
module.exports={fixture,storage,Element};
