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

const insightApi=read('api/ai-product-insight.js');
if(/catch\(e\)\{res\.status\(500\)/.test(insightApi))failures.push('AI insight quota/upstream failures must not be collapsed into a generic HTTP 500');

const centerFix=read('center-fix.js');
const visualRenderer=read('visual-renderer.js');
if(!centerFix.includes('/assets/cartridge-master-approved.webp'))failures.push('center-fix.js must keep the bundled Cartridge fallback asset');
if(!centerFix.includes('catalog-media/masters/cartridge-master-admin.webp'))failures.push('center-fix.js must keep the admin-managed Cartridge reference from Supabase Storage');
if(!/form\s*===\s*['"]Cartridge['"]/.test(centerFix))failures.push('center-fix.js must have Cartridge-specific rendering logic');
if(!centerFix.includes('isSharedMasterImage'))failures.push('center-fix.js must detect shared master image URLs');
if(!centerFix.includes('AIBTVisualRenderer'))failures.push('center-fix.js must use the shared visual renderer');
if(!centerFix.includes('AIBTVisualRenderer')||!centerFix.includes('renderPreview'))failures.push('center-fix.js must delegate shared-master composition to visual-renderer.js');
if(!visualRenderer.includes('PEN_FIELDS'))failures.push('visual-renderer.js must define fixed Pen name/strength print fields');
if(!visualRenderer.includes('printField'))failures.push('visual-renderer.js must shrink and center Pen text inside fixed print fields');
if(!visualRenderer.includes('VIAL_FIELDS'))failures.push('visual-renderer.js must own fixed Vial field geometry');
if(!visualRenderer.includes('cartridgeVisualMode'))failures.push('visual-renderer.js must own Cartridge dynamic/reference classification');
if(!centerFix.includes('/assets/cartridge-master-blank-approved.webp'))failures.push('center-fix.js must use the approved bundled blank Cartridge master for dynamic short names');

function validateWebp(path,label,minBytes){
  if(!fs.existsSync(path)){failures.push(`${label} is missing`);return}
  const file=fs.readFileSync(path);
  const riff=file.subarray(0,4).toString('ascii');
  const webp=file.subarray(8,12).toString('ascii');
  const declared=file.length>=8?file.readUInt32LE(4)+8:0;
  if(riff!=='RIFF'||webp!=='WEBP')failures.push(`${label} must be a valid WebP RIFF file`);
  if(declared!==file.length)failures.push(`${label} is truncated: WebP declares ${declared} bytes but file has ${file.length}`);
  if(file.length<minBytes)failures.push(`${label} is unexpectedly small`);
}
validateWebp('assets/cartridge-master-approved.webp','approved Cartridge reference master',4000);
validateWebp('assets/cartridge-master-blank-approved.webp','approved blank Cartridge master',10000);

const adminHtml=read('admin.html');
if(!adminHtml.includes('/admin-cartridge-master.js'))failures.push('admin.html must load the Cartridge master management UI');
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
