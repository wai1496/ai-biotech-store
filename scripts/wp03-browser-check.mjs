import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.AIBT_BASE_URL || 'https://ai-biotech-store-git-review-master-build-20260829-rk-cd1c.vercel.app';
const evidenceDir = path.resolve(process.env.AIBT_EVIDENCE_DIR || 'artifacts/wp03-browser');
const viewports = [
  ['mobile-360x800',{width:360,height:800}],
  ['mobile-390x844',{width:390,height:844}],
  ['mobile-412x915',{width:412,height:915}],
  ['tablet-768x1024',{width:768,height:1024}],
  ['desktop-1366x768',{width:1366,height:768}],
  ['desktop-1440x900',{width:1440,height:900}]
];
fs.mkdirSync(evidenceDir,{recursive:true});

async function inspectFormat(page,format){
  return page.evaluate(async target=>{
    const cards=[...document.querySelectorAll('#productGrid .product-card')];
    const card=cards.find(c=>{const s=c.querySelector('select[aria-label="Format"]');return s&&[...s.options].some(o=>o.value===target)});
    if(!card)return {skipped:true,format:target};
    const select=card.querySelector('select[aria-label="Format"]');
    select.value=target;select.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(r=>setTimeout(r,450));
    const live=document.getElementById(card.id);
    const stage=live?.querySelector('.product-visual-stage');
    const image=stage?.querySelector('.product-visual-image');
    const visibleMasks=[...stage?.querySelectorAll('.product-visual-color')||[]].filter(el=>getComputedStyle(el).display!=='none').length;
    const overlay=stage?.querySelector('.product-visual-overlay');
    const name=stage?.querySelector('.product-visual-name');
    const strength=stage?.querySelector('.product-visual-strength');
    return {
      skipped:false,format:stage?.dataset.format||target,source:stage?.dataset.visualSource||'',overlayMode:stage?.dataset.overlayMode||'',
      image:image?.getAttribute('src')||'',naturalWidth:image?.naturalWidth||0,naturalHeight:image?.naturalHeight||0,
      textCount:stage?.querySelectorAll('.product-visual-text').length||0,visibleMasks,
      overlayDisplay:overlay?getComputedStyle(overlay).display:'',nameWeight:name?getComputedStyle(name).fontWeight:'',strengthWeight:strength?getComputedStyle(strength).fontWeight:'',
      stageRect:stage?.getBoundingClientRect().toJSON()||null,nameRect:name?.getBoundingClientRect().toJSON()||null,strengthRect:strength?.getBoundingClientRect().toJSON()||null,
      cardId:live?.id||''
    };
  },format);
}

function validate(row,failures){
  if(row.skipped){failures.push(`No visible ${row.format} variant available`);return;}
  if(!row.naturalWidth||!row.naturalHeight)failures.push(`${row.format}: master image did not render`);
  if(row.source!=='master')failures.push(`${row.format}: expected master visual source, got ${row.source||'empty'}`);
  if(/master-pending|cartoon|cartridge-master-v2|yjauxyvtrmdriwtmckkl/i.test(row.image))failures.push(`${row.format}: legacy/protected visual remains`);
  if(row.format==='Vial'){
    if(row.overlayMode!=='vial')failures.push('Vial overlay mode must remain vial for label text');
    if(!/vial-master-v4\.svg/i.test(row.image))failures.push(`Vial wrong master: ${row.image}`);
    if(row.textCount!==2)failures.push('Vial must have exactly product-name and strength text');
    if(row.visibleMasks!==0)failures.push('Vial cap/stopper/field recolour masks must be disabled');
  }
  if(row.format==='Pen'){
    if(row.overlayMode!=='pen')failures.push('Pen overlay mode must be pen');
    if(!/pen-master-v4\.svg/i.test(row.image))failures.push(`Pen wrong master: ${row.image}`);
    if(row.textCount!==2)failures.push('Pen must have exactly product-name and strength text');
    if(Number(row.nameWeight)<700||Number(row.strengthWeight)<700)failures.push('Pen label text must be bold/UV-print style');
  }
  if(row.format==='Cartridge'){
    if(row.overlayMode!=='none')failures.push('Cartridge must have no dynamic overlay');
    if(row.textCount!==0||row.overlayDisplay!=='none')failures.push('Cartridge must render master image only');
    if(!/cartridge-master-v5\.svg/i.test(row.image))failures.push(`Cartridge wrong master: ${row.image}`);
  }
  for(const rect of [row.nameRect,row.strengthRect]){
    if(!rect||!row.stageRect)continue;
    const s=row.stageRect;
    if(rect.x<s.x-1||rect.y<s.y-1||rect.right>s.right+1||rect.bottom>s.bottom+1)failures.push(`${row.format}: label escaped image stage`);
  }
  if(row.format==='Vial'&&row.nameRect&&row.strengthRect&&row.stageRect){
    const nr=(row.nameRect.y-row.stageRect.y)/row.stageRect.height;
    const sr=(row.strengthRect.y-row.stageRect.y)/row.stageRect.height;
    if(nr<.50)failures.push('Vial product name is too high and risks logo overlap');
    if(sr<=nr)failures.push('Vial strength must remain below product name');
  }
}

async function inspectViewport(browser,name,viewport){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,ignoreHTTPSErrors:true});
  const page=await context.newPage();
  const failures=[];const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  await page.goto(baseUrl,{waitUntil:'networkidle',timeout:120000});
  await page.waitForSelector('#productGrid .product-card',{timeout:60000});
  await page.waitForTimeout(1200);
  const initial=await page.evaluate(()=>({
    cards:document.querySelectorAll('#productGrid .product-card').length,
    stages:document.querySelectorAll('#productGrid .product-visual-stage').length,
    bodyScrollWidth:document.body.scrollWidth,viewportWidth:innerWidth,
    summary:document.querySelector('#catalogSummary')?.textContent||'',
    broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc||i.src),
    hero:['Vial','Pen','Cartridge'].map(format=>{const i=document.getElementById(`hero${format}`);return{format,src:i?.getAttribute('src')||'',width:i?.naturalWidth||0}})
  }));
  if(initial.cards<1||initial.cards!==initial.stages)failures.push('Product cards/visual stages are incomplete');
  if(initial.bodyScrollWidth>initial.viewportWidth+2)failures.push('Horizontal storefront overflow detected');
  if(initial.broken.length)failures.push(`Broken images: ${initial.broken.join(', ')}`);
  if(!/39 products/i.test(initial.summary))failures.push(`Unexpected catalog summary: ${initial.summary}`);
  for(const h of initial.hero){if(!h.width)failures.push(`Hero ${h.format} failed to render`);}
  await page.evaluate(()=>window.showAllProducts?.());await page.waitForTimeout(500);
  const formatResults={};
  for(const f of ['Vial','Pen','Cartridge']){formatResults[f]=await inspectFormat(page,f);validate(formatResults[f],failures);}
  const categories=await page.evaluate(()=>[...document.querySelectorAll('#categoryFilter option')].map(o=>o.value).filter(v=>v&&v!=='All'));
  if(categories.length<6)failures.push(`Expected at least 6 live categories, found ${categories.length}`);
  for(const cat of categories.slice(0,6)){
    const result=await page.evaluate(async value=>{const s=document.getElementById('categoryFilter');s.value=value;s.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,250));const stage=document.querySelector('#productGrid .product-visual-stage');return{cards:document.querySelectorAll('#productGrid .product-card').length,color:stage?getComputedStyle(stage).getPropertyValue('--visual-category').trim():''}},cat);
    if(result.cards<1)failures.push(`Category ${cat} rendered no products`);
    if(result.color&&!/^#[0-9a-f]{6}$/i.test(result.color))failures.push(`Category ${cat} has invalid colour ${result.color}`);
  }
  await page.evaluate(()=>{const s=document.getElementById('categoryFilter');if(s){s.value='All';s.dispatchEvent(new Event('change',{bubbles:true}))}});await page.waitForTimeout(300);
  await page.locator('#productGrid .info-btn').first().click();await page.waitForTimeout(300);
  const modal=await page.evaluate(()=>{const w=document.querySelector('#modalWrap.show');const m=w?.querySelector('.modal');const s=w?.querySelector('.product-visual-stage');return{visible:!!w,stage:!!s,width:m?.getBoundingClientRect().width||0,viewport:innerWidth}});
  if(!modal.visible||!modal.stage)failures.push('Product modal is not using the shared visual renderer');
  if(modal.width>modal.viewport+1)failures.push('Product modal exceeds viewport width');
  await page.evaluate(()=>window.closeModal?.());
  if(pageErrors.length)failures.push(`Page errors: ${pageErrors.join(' | ')}`);
  const screenshotPath=path.join(evidenceDir,`${name}.png`);await page.screenshot({path:screenshotPath,fullPage:true});
  await context.close();
  return{name,viewport,pass:failures.length===0,failures,initial,formatResults,categories,screenshotPath};
}

const browser=await chromium.launch({headless:true});const results=[];
try{for(const [name,viewport] of viewports)results.push(await inspectViewport(browser,name,viewport));}finally{await browser.close();}
const report={workPackage:'WP-03 Product Visuals',baseUrl,testedAt:new Date().toISOString(),pass:results.every(r=>r.pass),results};
fs.writeFileSync(path.join(evidenceDir,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.pass)process.exit(1);
