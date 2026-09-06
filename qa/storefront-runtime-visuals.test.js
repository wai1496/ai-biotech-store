const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const center=fs.readFileSync(path.join(root,'center-fix.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'visual-renderer.js'),'utf8');
const navCss=fs.readFileSync(path.join(root,'storefront-navigation.css'),'utf8');

assert.match(center,/AIBTVisualRenderer\.renderPreview/,'storefront must delegate shared-master composition to shared renderer');
assert.match(center,/real\(p,v\)/,'real uploaded variant image priority must remain explicit');
assert.match(center,/cartridgeVisualMode/,'storefront must use shared Cartridge classifier');
assert.match(center,/cartridge-master-admin\.webp/,'storefront must retain approved standard Cartridge reference');
assert.match(center,/cartridge-master-approved\.webp/,'storefront must retain bundled Cartridge fallback');
assert.match(center,/cartridge-master-blank-approved\.webp/,'storefront must retain approved blank Cartridge master');
assert.match(center,/cartridge-master(?!-admin)/,'legacy shared Cartridge master must be recognized as a placeholder, not a real variant image');
assert.match(center,/onerror|catch/,'storefront adapter must retain non-blocking fallback handling');
assert.match(center,/MASTER NOT UPLOADED|missing/i,'missing compatible master must degrade visibly and non-destructively');
assert.match(renderer,/function cartridgeVisualMode/,'renderer must own Cartridge short-name classification');
assert.ok(!/pen-master[^}]*object-fit:cover/i.test(navCss),'mobile Pen master must not use cover cropping');

const realIndex=center.indexOf('real(p,v)');
const renderIndex=center.indexOf('AIBTVisualRenderer.renderPreview');
assert.ok(realIndex>=0&&renderIndex>realIndex,'real image resolution must occur before dynamic composition');

const sandbox={window:{}};
vm.runInNewContext(renderer,sandbox,{filename:'visual-renderer.js'});
const R=sandbox.window.AIBTVisualRenderer;
assert.equal(R.cartridgeVisualMode('GHK-CU'),'dynamic');
assert.equal(R.cartridgeVisualMode('CAGRILINTIDE'),'dynamic');
assert.equal(R.cartridgeVisualMode('TESAMORELIN'),'dynamic');
assert.equal(R.cartridgeVisualMode('SEMAGLUTIDE + CAGRILINTIDE'),'reference-only');
assert.equal(R.cartridgeVisualMode('CJC-1295 WITHOUT DAC + IPAMORELIN'),'reference-only');

for(const forbidden of ['.insert(','.update(','.upsert(','.delete(','.upload(']){
  assert.ok(!center.includes(forbidden),`center-fix must not mutate production data: ${forbidden}`);
  assert.ok(!renderer.includes(forbidden),`renderer must not mutate production data: ${forbidden}`);
}
console.log('storefront runtime visuals contract passed');
