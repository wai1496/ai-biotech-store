const assert=require('assert');
const fs=require('fs');
const src=fs.readFileSync('api/easyparcel-rates.js','utf8');
assert(src.includes('EASYPARCEL_CLIENT_ID')&&src.includes('EASYPARCEL_CLIENT_SECRET')&&src.includes('EASYPARCEL_PICK_POSTCODE')&&src.includes('EASYPARCEL_PICK_STATE'),'Preview EasyParcel rate handler must identify required OAuth and pickup config keys');
assert(src.includes('configured:')||src.includes('present:'),'diagnostic must report presence-only EasyParcel config state');
assert(!/console\.(?:log|error)\([^\n]*process\.env\.EASYPARCEL_CLIENT_SECRET/.test(src),'diagnostic must never log EasyParcel Client Secret value');
assert(!/json\([^\n]*process\.env\.EASYPARCEL_CLIENT_SECRET/.test(src),'diagnostic response must never expose EasyParcel Client Secret value');
console.log('EasyParcel Preview OAuth config diagnostic contract PASS');
