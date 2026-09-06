const fs=require('fs');
const source=fs.readFileSync('storefront-visual-fix.js','utf8');

for(const token of [
  'composeStandaloneStage',
  "#modalWrap.show .modal-head h2",
  ".info-layout h3",
  "stage.dataset.format",
  "aibiotech-${prefix}-template-${spec.template}.webp",
  "stage.dataset.overlayMode='none'"
]){
  if(!source.includes(token)) throw new Error(`Missing product-detail visual contract token: ${token}`);
}
console.log('PASS product detail layered visual contract');
