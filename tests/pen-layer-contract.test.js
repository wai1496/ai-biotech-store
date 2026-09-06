const fs=require('fs');
const source=fs.readFileSync('storefront-visual-fix.js','utf8');

const required=[
  "const PEN_BASE=`${VIAL_LAYER_ROOT}/base/aibiotech-pen-base-master.webp`",
  ".product-visual-stage[data-format=\"Pen\"]",
  "aibiotech-pen-template-${spec.template}.webp",
  "aibiotech-pen-name-${slugName(name)}.webp",
  "aibiotech-pen-strength-${slugStrength(strength)}-${spec.strength}.webp",
  "stage.dataset.overlayMode='none'"
];

for(const token of required){
  if(!source.includes(token)){
    throw new Error(`Missing supplied Pen layer contract token: ${token}`);
  }
}

console.log('PASS supplied Pen layer contract');
