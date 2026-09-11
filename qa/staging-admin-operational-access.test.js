const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('client-runtime-bridge.js','utf8');
assert(/admin\.html/.test(src),'verified Staging Admin must be an allowed authenticated operational route');
assert(/qaRoutes|operationalRoutes/.test(src),'authenticated Preview routes must remain explicitly allowlisted');
console.log('staging-admin-operational-access: ok');
