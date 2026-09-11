const assert=require('assert');
const fs=require('fs');
const src=fs.readFileSync('api/easyparcel-rates.js','utf8');
assert(src.includes('EASYPARCEL_API_KEY')&&src.includes('EASYPARCEL_PICK_POSTCODE')&&src.includes('EASYPARCEL_PICK_STATE'),'Preview EasyParcel rate handler must identify required config keys');
assert(src.includes('configured:')||src.includes('present:'),'diagnostic must report presence-only EasyParcel config state');
assert(!/console\.(?:log|error)\([^\n]*process\.env\.EASYPARCEL_API_KEY/.test(src),'diagnostic must never log EasyParcel API key value');
assert(!/json\([^\n]*process\.env\.EASYPARCEL_API_KEY/.test(src),'diagnostic response must never expose EasyParcel API key value');
console.log('EasyParcel Preview config diagnostic contract PASS');
