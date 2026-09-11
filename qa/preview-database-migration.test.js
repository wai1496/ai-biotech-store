/* Source regression only. Deployed database behavior still requires isolated runtime tests. */
const assert=require('assert');
const fs=require('fs');

const base=fs.readFileSync('sql/20260909_preview_database_contract_v1.sql','utf8');
const hardening=fs.readFileSync('sql/20260909_preview_database_contract_v1_security_hardening.sql','utf8');
const paymentLockFix=fs.readFileSync('sql/20260909_preview_database_contract_v1_payment_lock_fix.sql','utf8');
const evidence=require('../docs/contracts/preview-database-evidence.json');
const productionProject='yjauxyvtrmdriwtmckkl';

assert(base.includes('rpnwssqvurpdennpzplx only.'));
assert(paymentLockFix.includes('rpnwssqvurpdennpzplx only.'));
assert(!base.includes(productionProject));
assert(!hardening.includes(productionProject));
assert(!paymentLockFix.includes(productionProject));

for(const table of [
  'shipping_quotes',
  'order_contract_events',
  'payment_events',
  'shipping_booking_intents',
  'shipping_booking_events'
]){
  assert(new RegExp(`alter table public\\.${table} enable row level security`,'i').test(base));
}

for(const rpc of [
  'create_order_with_shipping_quote',
  'reconcile_payment_attempt_v1',
  'claim_shipping_booking_v1',
  'advance_shipping_booking_v1',
  'complete_shipping_booking_v1',
  'release_shipping_booking_v1'
]){
  assert(new RegExp(`create or replace function public\\.${rpc}\\b`,'i').test(base+hardening));
}

assert(/security definer\s+set search_path = ''/i.test(base));
assert(/alter function public\.create_order_with_shipping_quote[\s\S]+set schema private/i.test(hardening));
assert(/create or replace function public\.create_order_with_shipping_quote[\s\S]+security invoker\s+set search_path = ''/i.test(hardening));
assert(/revoke execute on function public\.commerce_create_order[\s\S]+from public, anon, authenticated/i.test(base));
assert(/shipping_quotes_own_read_v1[\s\S]+to authenticated[\s\S]+auth\.uid\(\)/i.test(base));
assert.equal((hardening.match(/as restrictive for all to anon, authenticated/g)||[]).length,4);
assert(/create or replace function public\.reconcile_payment_attempt_v1[\s\S]+security definer\s+set search_path = ''/i.test(paymentLockFix));
assert(/perform v\.id\s+from public\.variants v\s+where exists \([\s\S]+oi\.order_id = order_row\.id[\s\S]+oi\.variant_id = v\.id[\s\S]+order by v\.id\s+for update of v;/i.test(paymentLockFix));
assert(!/\) effect on effect\.variant_id = v\.id/i.test(paymentLockFix));
assert(/revoke execute on function public\.reconcile_payment_attempt_v1\(uuid,uuid,text,text,jsonb\)[\s\S]+from public, anon, authenticated/i.test(paymentLockFix));
assert(/grant execute on function public\.reconcile_payment_attempt_v1\(uuid,uuid,text,text,jsonb\)[\s\S]+to service_role/i.test(paymentLockFix));
assert.equal(evidence.status,'unverified');
assert.equal(evidence.installedSchemaDigest,null);

console.log('preview database migration source: Staging target, RLS/RPC grants, private definer wrapper, legacy bypass closure and unlock evidence lock PASS');
