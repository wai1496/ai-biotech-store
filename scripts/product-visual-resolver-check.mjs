import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const resolverPath = path.join(root, 'product-visual-resolver.js');

assert.equal(
  fs.existsSync(resolverPath),
  true,
  'product-visual-resolver.js must exist before the visual architecture gate can pass'
);

const source = fs.readFileSync(resolverPath, 'utf8');
assert.equal(source.includes('yjauxyvtrmdriwtmckkl'), false, 'resolver must not reference the protected Supabase project');

const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox.window;
vm.runInNewContext(source, sandbox, { filename: 'product-visual-resolver.js' });

const api = sandbox.window.AIBT_PRODUCT_VISUALS;
assert.ok(api, 'resolver must expose window.AIBT_PRODUCT_VISUALS');
assert.equal(typeof api.resolveProductVisual, 'function');
assert.equal(typeof api.buildMasterMap, 'function');
assert.equal(typeof api.versionAssetUrl, 'function');

const masters = api.buildMasterMap(
  [
    { format: 'Vial', master_image_url: '/assets/vial-master.svg', version: 4 },
    { format: 'Pen', master_image_url: '/assets/pen-master.svg?x=1', version: 3 },
    { format: 'Cartridge', master_image_url: '/assets/cartridge-master.svg', version: 5 }
  ],
  { neutral: '/assets/product-image-unavailable.svg' }
);

assert.equal(masters.Vial.url, '/assets/vial-master.svg?masterv=4');
assert.equal(masters.Pen.url, '/assets/pen-master.svg?x=1&masterv=3');
assert.equal(masters.Cartridge.url, '/assets/cartridge-master.svg?masterv=5');

const masterResult = api.resolveProductVisual({
  variant: { format: 'Vial', image_url: '/legacy/cartoon-vial.svg' },
  masters,
  neutralFallback: '/assets/product-image-unavailable.svg'
});
assert.equal(masterResult.source, 'master');
assert.equal(masterResult.url, '/assets/vial-master.svg?masterv=4');
assert.equal(masterResult.overlayAllowed, true);

const approvedCustom = api.resolveProductVisual({
  variant: {
    format: 'Pen',
    image_url: 'https://cdn.example.test/approved-pen.png',
    use_custom_image: true
  },
  masters,
  neutralFallback: '/assets/product-image-unavailable.svg'
});
assert.equal(approvedCustom.source, 'approved-custom');
assert.equal(approvedCustom.url, 'https://cdn.example.test/approved-pen.png');

const unsafeCustom = api.resolveProductVisual({
  variant: {
    format: 'Pen',
    image_url: 'javascript:alert(1)',
    use_custom_image: true
  },
  masters,
  neutralFallback: '/assets/product-image-unavailable.svg'
});
assert.equal(unsafeCustom.source, 'master');
assert.equal(unsafeCustom.url, '/assets/pen-master.svg?x=1&masterv=3');

const cartridge = api.resolveProductVisual({
  variant: { format: 'Cartridge' },
  masters,
  neutralFallback: '/assets/product-image-unavailable.svg'
});
assert.equal(cartridge.source, 'master');
assert.equal(cartridge.overlayAllowed, false, 'Cartridge must never receive a dynamic text overlay');

const fallback = api.resolveProductVisual({
  variant: { format: 'Unknown' },
  masters: {},
  neutralFallback: '/assets/product-image-unavailable.svg'
});
assert.equal(fallback.source, 'neutral-fallback');
assert.equal(fallback.url, '/assets/product-image-unavailable.svg');
assert.equal(fallback.overlayAllowed, false);

assert.equal(api.isSafeAssetUrl('/assets/local.svg'), true);
assert.equal(api.isSafeAssetUrl('https://cdn.example.test/a.png'), true);
assert.equal(api.isSafeAssetUrl('data:image/png;base64,AA=='), true);
assert.equal(api.isSafeAssetUrl('data:text/html;base64,AA=='), false);
assert.equal(api.isSafeAssetUrl('javascript:alert(1)'), false);

console.log('PASS: authoritative product visual resolver contract');
