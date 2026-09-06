const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'mobile-product-alignment.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(css,/@media\(max-width:720px\)/,'Pen offset must remain mobile-only');
assert.match(css,/\.product>\.visual \.aibt-visual-frame:has\(\.aibt-master-pen\)>img\{[^}]*transform:translateY\(24px\)/s,'catalog Pen image should move down 24px on mobile');
assert.match(css,/\.pd-stage \.aibt-visual-frame:has\(\.aibt-master-pen\)>img\{[^}]*transform:translateY\(24px\)/s,'product-detail Pen image should move down 24px on mobile');
assert.doesNotMatch(css,/aibt-master-(?:vial|cartridge)[^}]*translateY\(/s,'Vial and Cartridge positions must remain unchanged');
assert.match(html,/mobile-product-alignment\.css\?v=20260906/,'mobile CSS version must be bumped so the Pen offset reaches browsers');
console.log('mobile Pen vertical offset contract passed');
