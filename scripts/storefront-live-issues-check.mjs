import fs from 'node:fs';

const failures=[];
const read=file=>fs.readFileSync(file,'utf8');

const storefront=read('supabase-storefront.js');
if(!/location\.pathname/.test(storefront)||!storefront.includes('pathMatch')||!storefront.includes('pathRequested'))failures.push('supabase-storefront.js must resolve clean /product/<slug> permalinks from location.pathname');

const finalHardening=read('site-final-hardening.js');
if(/visual\s*=\s*renderCleanVisual/.test(finalHardening))failures.push('site-final-hardening.js must not override the canvas master renderer with flat HTML label overlays');
if(/if\s*\(grid\s*&&\s*!grid\.children\.length\)/.test(finalHardening))failures.push('catalog-error handling must replace the grid even when a previous placeholder child exists');
if(!/get\(['"]view['"]\)/.test(finalHardening)||!/view\s*===\s*['"]guides['"]/.test(finalHardening))failures.push('site-final-hardening.js must support the calculator Guides deep link');

const calculator=read('peptide-calculator.html');
if(!calculator.includes('<a href="/#catalog">PEPTIDES</a>'))failures.push('calculator PEPTIDES nav must link to /#catalog');
if(!calculator.includes('<a href="/?view=guides">GUIDES</a>'))failures.push('calculator GUIDES nav must link to /?view=guides');

const publicInsight=read('research-insight.js');
if(publicInsight.includes('/api/ai-product-insight')||publicInsight.includes('/api/admin-research-refresh'))failures.push('public Research Insight must never call an AI research endpoint');
if(publicInsight.includes('localStorage'))failures.push('public Research Insight must not use browser-local AI draft caching');
if(!publicInsight.includes('research_entries')||!publicInsight.includes('profile_json')||!publicInsight.includes('published_version_id'))failures.push('public Research Insight must read the approved Supabase research projection');
for(const marker of ['OPENAI_API_KEY','GEMINI_API_KEY','AI_QUOTA_EXHAUSTED','Vercel environment'])if(publicInsight.includes(marker))failures.push(`public Research Insight exposes technical provider detail: ${marker}`);

const researchCatalog=read('research-approved-catalog.js');
if(researchCatalog.includes('research_entry_versions'))failures.push('public Research Catalog must not read private research drafts/history');
if(!researchCatalog.includes('research_entries')||!researchCatalog.includes('short_summary')||!researchCatalog.includes('published_version_id'))failures.push('public Research Catalog must use the approved Supabase projection');
if(!researchCatalog.includes('Research profile is being prepared.'))failures.push('public Research Catalog must have an unapproved/prepared state');

const adminResearch=read('admin-research.js');
if(!adminResearch.includes('/api/admin-research-refresh'))failures.push('Admin Research workspace must own the authenticated AI refresh flow');
if(!adminResearch.includes('admin_publish_research_version')||!adminResearch.includes('admin_reject_research_version'))failures.push('Admin Research workspace must publish/reject through protected RPCs');
if(/\.from\(['"]research_entries['"]\)\.update\(/i.test(adminResearch))failures.push('Admin Research workspace must not update the public projection directly');

const centerFix=read('center-fix.js');
if(!centerFix.includes('/assets/cartridge-master-approved.webp'))failures.push('center-fix.js must keep the bundled Cartridge fallback asset');
if(!centerFix.includes('catalog-media/masters/cartridge-master-admin.webp'))failures.push('center-fix.js must prefer the admin-managed Cartridge master from Supabase Storage');
if(!/form\s*===\s*['"]Cartridge['"]/.test(centerFix))failures.push('center-fix.js must have Cartridge-specific rendering logic');
if(!centerFix.includes('isSharedMasterImage'))failures.push('center-fix.js must detect shared Vial/Pen master image URLs');
if(!centerFix.includes('masterImageSource'))failures.push('center-fix.js must composite shared Vial/Pen master images through canvas instead of returning the blank image directly');
if(!centerFix.includes('PEN_FIELDS'))failures.push('center-fix.js must define fixed Pen name/strength print fields');
if(!centerFix.includes('printField'))failures.push('center-fix.js must shrink and center Pen text inside its fixed print fields');
const cartridgePath='assets/cartridge-master-approved.webp';
if(!fs.existsSync(cartridgePath)){
  failures.push('approved Cartridge master asset is missing');
}else{
  const cartridge=fs.readFileSync(cartridgePath);
  const riff=cartridge.subarray(0,4).toString('ascii');
  const webp=cartridge.subarray(8,12).toString('ascii');
  const declared=cartridge.length>=8?cartridge.readUInt32LE(4)+8:0;
  if(riff!=='RIFF'||webp!=='WEBP')failures.push('approved Cartridge master must be a valid WebP RIFF file');
  if(declared!==cartridge.length)failures.push(`approved Cartridge master is truncated: WebP declares ${declared} bytes but file has ${cartridge.length}`);
  if(cartridge.length<4000)failures.push('approved Cartridge master is unexpectedly small');
}

const adminHtml=read('admin.html');
if(!adminHtml.includes('/admin-cartridge-master.js'))failures.push('admin.html must load the Cartridge master management UI');
if(!adminHtml.includes('/admin-research.js')||!adminHtml.includes('/admin-research.css'))failures.push('admin.html must load the Research approval workspace');
if(!fs.existsSync('admin-cartridge-master.js')){
  failures.push('admin Cartridge master management script is missing');
}else{
  const adminCartridge=read('admin-cartridge-master.js');
  for(const marker of ['Cartridge Master Image','Choose Image','Replace Cartridge Image','Save Changes','Restore Previous Cartridge Image']){
    if(!adminCartridge.includes(marker))failures.push(`admin Cartridge UI missing: ${marker}`);
  }
  if(!adminCartridge.includes('masters/cartridge-master-admin.webp'))failures.push('admin Cartridge Save must persist to the live master storage path');
  if(!adminCartridge.includes('masters/archive/cartridge-master-previous.webp'))failures.push('admin Cartridge Save must preserve a previous master for restore');
}

if(failures.length){
  console.error('Storefront live-issues check FAILED:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log('Storefront live-issues check passed.');