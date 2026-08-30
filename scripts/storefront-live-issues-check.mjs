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