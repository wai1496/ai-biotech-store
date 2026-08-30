import fs from 'node:fs';

const failures=[];
const read=file=>fs.readFileSync(file,'utf8');
const index=read('index.html');
const clean=read('clean-store.js');
const visualFix=read('storefront-visual-fix.js');

if(index.includes('uploaded-master-renderer.js')) failures.push('index.html loads uploaded-master-renderer.js, creating a second product image writer');
if(index.includes('vial-layered-renderer.js')) failures.push('index.html loads legacy vial-layered-renderer.js');
if(index.includes('uploaded-master-renderer.css')) failures.push('index.html loads legacy master overlay CSS');
if(/normalizeCards\s*\(|heroCartridge|\.src\s*=\s*CARTRIDGE/.test(visualFix)) failures.push('storefront-visual-fix.js still rewrites product/hero/cart image sources');
if(/new\s+MutationObserver/.test(visualFix)) failures.push('storefront-visual-fix.js still relies on mutation observers instead of the base renderer contract');
if(!/function\s+imageFor\s*\(/.test(clean)) failures.push('clean-store.js must retain the one base image resolver entry point during WP-02');
if(!/media_templates/.test(clean)) failures.push('clean-store.js must load active staging media template records');

if(failures.length){
 console.error('AI BioTech visual writer contract FAILED:\n');
 failures.forEach(x=>console.error(`- ${x}`));
 process.exit(1);
}
console.log('PASS: one active storefront image writer; no mutation-observer image races');
