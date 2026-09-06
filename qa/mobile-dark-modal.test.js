const assert=require('assert'),fs=require('fs'),path=require('path');
const css=fs.readFileSync(path.join(__dirname,'..','mobile-product-alignment.css'),'utf8');
assert.doesNotMatch(css,/#productOverlay \.modal\{[^}]*background:#fff/s,'mobile alignment must not override the dark product modal with white');
assert.doesNotMatch(css,/\.pd-title\{[^}]*color:#10294c/s,'mobile alignment must not force dark text into the dark product detail theme');
assert.doesNotMatch(css,/\.pd-description\{[^}]*background:#f7fafc/s,'mobile alignment must not inject the legacy pale description card');
assert.doesNotMatch(css,/\.pd-choice\{[^}]*background:#fff/s,'mobile alignment must not inject legacy white option buttons');
console.log('mobile product detail theme isolation passed');
