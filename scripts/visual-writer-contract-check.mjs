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

const resolverIndex=index.indexOf('/product-visual-resolver.js');
const storeIndex=index.indexOf('/clean-store.js');
if(resolverIndex<0) failures.push('index.html must load product-visual-resolver.js');
if(resolverIndex>=0&&storeIndex>=0&&resolverIndex>storeIndex) failures.push('product-visual-resolver.js must load before clean-store.js');
if(!/AIBT_PRODUCT_VISUALS/.test(clean)) failures.push('clean-store.js must consume window.AIBT_PRODUCT_VISUALS');
if(!/resolveProductVisual\s*\(/.test(clean)) failures.push('clean-store.js must call resolveProductVisual() for product media');
if(/const\s+MASTER\s*=/.test(clean)) failures.push('clean-store.js must not retain an independent MASTER object');
if(!/media_templates/.test(clean)) failures.push('clean-store.js must load active staging media template records');
if(!/overlayAllowed/.test(clean)) failures.push('clean-store.js must obey resolver overlayAllowed output');

if(failures.length){
 console.error('AI BioTech visual writer contract FAILED:\n');
 failures.forEach(x=>console.error(`- ${x}`));
 process.exit(1);
}
console.log('PASS: one authoritative product visual resolver and no mutation-observer image races');
