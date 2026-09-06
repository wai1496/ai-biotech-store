import fs from 'node:fs';

const source=fs.readFileSync('center-fix.js','utf8');
const failures=[];
const guard="if(form==='Cartridge')";
const guardIndex=source.indexOf(guard);
const canvasIndex=source.indexOf('const im=new Image()');

if(guardIndex<0) failures.push('center-fix.js must have an explicit Cartridge rendering branch');
if(guardIndex>=0&&canvasIndex>=0&&guardIndex>canvasIndex) failures.push('Cartridge branch must return before canvas/recolour/overlay rendering starts');
if(!/if\(form==='Cartridge'\)\{[\s\S]*?<img src=\\?"\$\{src\}\\?" alt=\\?"\$\{p\.name\}\\?">[\s\S]*?return[\s\S]*?\}/.test(source)) failures.push('Cartridge must render the approved master image directly and return');

if(failures.length){
  console.error('AI BioTech Cartridge no-overlay contract FAILED:\n');
  failures.forEach(x=>console.error(`- ${x}`));
  process.exit(1);
}

console.log('PASS: Cartridge uses its approved master directly with no canvas, recolour, name or strength overlay');
