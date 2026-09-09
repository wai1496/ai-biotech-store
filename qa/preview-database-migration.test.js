/* Source regression only. Deployed database behavior still requires isolated runtime tests. */
const assert=require('assert');
const fs=require('fs');

const base=fs.readFileSync('sql/20260909_preview_database_contract_v1.sql','utf8');
const hardening=fs.readFileSync('sql/20260909_preview_database_contract_v1_security_hardening.sql','utf8');
const evidence=require('../docs/contracts/preview-database-evidence.json');
const productionProject='yjauxyvtrmdriwtmckkl';

assert(base.includes('rpnwssqvurpdennpzplx only.'));
assert(!base.includes(productionProject));
assert(!hardening.includes(productionProject));

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
assert.equal(evidence.status,'unverified');
assert.equal(evidence.installedSchemaDigest,null);

console.log('preview database migration source: Staging target, RLS/RPC grants, private definer wrapper, legacy bypass closure and unlock evidence lock PASS');
