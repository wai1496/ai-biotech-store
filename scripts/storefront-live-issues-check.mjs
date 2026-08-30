import fs from 'node:fs';

const failures=[];
const read=file=>fs.readFileSync(file,'utf8');

const storefront=read('supabase-storefront.js');
if(!/location\.pathname/.test(storefront)||!/\/product\//.test(storefront))failures.push('supabase-storefront.js must resolve clean /product/<slug> permalinks from location.pathname');

const finalHardening=read('site-final-hardening.js');
if(/visual\s*=\s*renderCleanVisual/.test(finalHardening))failures.push('site-final-hardening.js must not override the canvas master renderer with flat HTML label overlays');
if(/if\s*\(grid\s*&&\s*!grid\.children\.length\)/.test(finalHardening))failures.push('catalog-error handling must replace the grid even when a previous placeholder child exists');
if(!/get\(['"]view['"]\)\s*===\s*['"]guides['"]/.test(finalHardening))failures.push('site-final-hardening.js must support the calculator Guides deep link');

const calculator=read('peptide-calculator.html');
if(!calculator.includes('<a href="/#catalog">PEPTIDES</a>'))failures.push('calculator PEPTIDES nav must link to /#catalog');
if(!calculator.includes('<a href="/?view=guides">GUIDES</a>'))failures.push('calculator GUIDES nav must link to /?view=guides');

const insightApi=read('api/ai-product-insight.js');
if(/catch\(e\)\{res\.status\(500\)/.test(insightApi))failures.push('AI insight quota/upstream failures must not be collapsed into a generic HTTP 500');

if(failures.length){
  console.error('Storefront live-issues check FAILED:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log('Storefront live-issues check passed.');
