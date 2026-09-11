const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('admin-shipping.js','utf8');
assert(src.includes('/api/easyparcel/connect'),'Admin EasyParcel setup must start the restored OAuth connect route');
assert(/Connect EasyParcel/i.test(src),'Admin EasyParcel setup must expose a Connect EasyParcel action');
assert(/authorization_url/.test(src),'Admin EasyParcel connect flow must consume the server-provided authorization URL');
console.log('easyparcel-admin-connect: ok');
