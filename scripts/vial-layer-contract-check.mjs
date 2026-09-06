import fs from 'node:fs';

const source=fs.readFileSync('storefront-visual-fix.js','utf8');
const failures=[];

if(!source.includes('aibiotech-vial-base-master.webp'))failures.push('Vial base layer is not used.');
if(!source.includes('aibiotech-vial-template-metabolism-orange.webp'))failures.push('Retatrutide/metabolism orange vial template is not wired.');
if(!source.includes("#F57C00"))failures.push('Retatrutide orange #F57C00 mapping is missing.');
if(!source.includes('data-aibt-vial-layered'))failures.push('Layered vial marker is missing.');
if(!source.includes('aibt-vial-layer'))failures.push('Vial layer elements are missing.');
if(/tintNeutral\s*\(|recolorOrange\s*\(/.test(source))failures.push('Vial layer runtime must not recolor the physical vial/cap.');

if(failures.length){
 console.error('AI BioTech vial layer contract FAILED:\n');
 failures.forEach(x=>console.error(`- ${x}`));
 process.exit(1);
}
console.log('PASS: vial uses supplied base/category layers and preserves physical vial/cap.');
