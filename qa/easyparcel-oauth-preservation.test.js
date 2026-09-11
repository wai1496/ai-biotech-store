const assert=require('assert'),fs=require('fs');

const easy=fs.readFileSync('lib/easyparcel.js','utf8');
assert(!easy.includes('EASYPARCEL_API_KEY'),'White Clean EasyParcel adapter must not fall back to the obsolete direct API-key integration');
assert(easy.includes('EASYPARCEL_CLIENT_ID'),'EasyParcel adapter must preserve the existing OAuth client integration');
assert(easy.includes('easyparcel_get_oauth_tokens'),'EasyParcel adapter must read the existing server-side OAuth token from Staging');
assert(easy.includes('easyparcel_store_oauth_tokens'),'EasyParcel adapter must preserve OAuth refresh-token rotation through Staging Vault');
for(const file of ['api/easyparcel/connect.js','api/easyparcel/callback.js'])assert(fs.existsSync(file),`${file} must survive White Clean reintegration`);
const connect=fs.readFileSync('api/easyparcel/connect.js','utf8');
const callback=fs.readFileSync('api/easyparcel/callback.js','utf8');
assert(connect.includes('EASYPARCEL_CLIENT_ID')&&connect.includes('Authenticated staging admin required'),'Connect route must stay admin-gated and OAuth-based');
assert(callback.includes('easyparcel_store_oauth_tokens')&&callback.includes('timingSafeEqual'),'Callback must validate state and keep OAuth tokens server-side');
console.log('EasyParcel OAuth preservation contract: PASS');
