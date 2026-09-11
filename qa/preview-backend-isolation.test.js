const fs=require('fs');
const assert=require('assert');
const helper=fs.readFileSync('lib/preview-safety.js','utf8');
assert(helper.includes("VERCEL_ENV"));
assert(helper.includes('PREVIEW_BACKEND_ISOLATION_REQUIRED'));
assert(helper.includes('PREVIEW_LIVE_SHIPPING_BLOCKED'));
for(const path of [
  'api/toyyibpay-create.js',
  'api/toyyibpay-reconcile.js',
  'api/toyyibpay-callback.js',
  'api/toyyibpay-duitnow-status.js',
  'api/easyparcel-rates.js',
  'api/easyparcel-quote.js',
  'api/easyparcel-book.js',
  'api/easyparcel-track.js',
  'api/easyparcel-status.js'
]){
  const source=fs.readFileSync(path,'utf8');
  assert(source.includes("require('../lib/preview-safety')"),`${path} must import preview safety`);
  assert(source.includes('previewSafety();'),`${path} must enforce preview safety`);
}
console.log('preview-backend-isolation: ok');
