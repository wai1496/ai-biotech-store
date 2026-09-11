const assert=require('assert'),fs=require('fs');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('mobile-product-reference-fix.css','utf8'),detail=fs.readFileSync('shared-content.css','utf8');
assert(html.includes('/mobile-product-reference-fix.css'));
assert(/\.product-media img\{[^}]*object-fit:contain[^}]*object-position:50% 50%[^}]*transform:none/s.test(css),'active White Clean media must be contained and centered');
for(const format of ['Pen','Vial','Cartridge'])assert(css.includes('data-format="'+format+'"'),'all formats must retain specific padding');
assert(detail.includes('object-fit:contain')&&detail.includes('object-position:center')&&detail.includes('transform:none'));
assert(!html.includes('/mobile-product-alignment.css'),'retired dark-shell offsets must not be imposed on White Clean');
console.log('White Clean mobile containment source contract PASS; 360/390/620/720px screenshots remain unverified');
