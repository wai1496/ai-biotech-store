const fs=require('fs');
const assert=require('assert');

const guard=fs.readFileSync('lib/preview-safety.js','utf8');
for(const token of ['PREVIEW_BACKEND_ISOLATION_REQUIRED','PREVIEW_LIVE_SHIPPING_BLOCKED','PREVIEW_LIVE_PAYMENT_BLOCKED','PROD_SUPABASE_URL','PROD_SUPABASE_PUBLISHABLE_KEY']){
  assert(guard.includes(token),`preview guard missing ${token}`);
}

const protectedHandlers=[
  'api/easyparcel-rates.js',
  'api/easyparcel-quote.js',
  'api/easyparcel-book.js',
  'api/easyparcel-track.js',
  'api/easyparcel-status.js',
  'api/toyyibpay-create.js',
  'api/toyyibpay-callback.js',
  'api/toyyibpay-reconcile.js',
  'api/toyyibpay-duitnow-status.js'
];

for(const path of protectedHandlers){
  assert(fs.existsSync(path),`missing protected handler ${path}`);
  const src=fs.readFileSync(path,'utf8');
  assert(src.includes("require('../lib/preview-safety')"),`${path} must import preview safety`);
  assert(src.includes('previewSafety();'),`${path} must execute preview safety before external work`);
}

console.log('preview-backend-safety: ok');
