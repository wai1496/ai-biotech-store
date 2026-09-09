const fs=require('fs');
const assert=require('assert');
const cfg=fs.readFileSync('staging-config.js','utf8');
const bridge=fs.readFileSync('client-runtime-bridge.js','utf8');
const checkout=fs.readFileSync('checkout.html','utf8');
const member=fs.readFileSync('member.html','utf8');
const checkoutGuard=fs.readFileSync('staging-checkout-guard.js','utf8');
const memberGuard=fs.readFileSync('staging-member-guard.js','utf8');
assert(cfg.includes("environment: 'staging'"));
assert(cfg.includes('rpnwssqvurpdennpzplx.supabase.co'),'staging config must point to isolated Supabase');
assert(cfg.includes('checkoutEnabled: false'));
assert(cfg.includes('memberEnabled: false'));
assert(bridge.includes('writesEnabled:false'),'configuration flags must not bypass the unverified database gate');
for(const html of [checkout,member]){
  const configPos=html.indexOf('/staging-config.js');
  const bridgePos=html.indexOf('/client-runtime-bridge.js');
  assert(configPos>=0&&bridgePos>configPos,'staging config must load before runtime bridge');
}
assert(checkout.indexOf('/staging-checkout-guard.js')>checkout.indexOf('/checkout.js'),'checkout guard must load after shared checkout functions');
assert(member.indexOf('/staging-member-guard.js')>member.indexOf('/member.js'),'member guard must load after shared member functions');
assert(checkoutGuard.includes('STAGING CHECKOUT LOCKED'));
assert(memberGuard.includes('Staging member writes are disabled.'));
console.log('staging-client-isolation: ok');
