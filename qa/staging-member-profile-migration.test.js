const assert=require('assert');
const fs=require('fs');

const migrationPath='sql/20260909_ensure_my_customer_profile.sql';
const sql=fs.readFileSync(migrationPath,'utf8');
const productionProject='yjauxyvtrmdriwtmckkl';

assert(sql.includes('rpnwssqvurpdennpzplx only.'),'migration must identify the isolated Staging project');
assert(!sql.includes(productionProject),'migration must never reference the Production project');
assert(/create or replace function public\.ensure_my_customer_profile\(\)\s+returns uuid\s+language plpgsql\s+security definer\s+set search_path = ''/i.test(sql),'profile bootstrap must be a fixed-search-path SECURITY DEFINER RPC');
assert(/v_user_id uuid := auth\.uid\(\)/i.test(sql),'profile bootstrap must derive ownership only from auth.uid()');
assert(/if v_user_id is null then[\s\S]+errcode = '42501'/i.test(sql),'unauthenticated calls must fail explicitly');
assert(/from auth\.users[\s\S]+where id = v_user_id/i.test(sql),'profile fields must come from the authenticated auth.users row');
assert(/insert into public\.customer_profiles[\s\S]+on conflict \(user_id\) do nothing/i.test(sql),'only a missing own customer profile may be inserted');
assert(/insert into public\.wallet_accounts[\s\S]+values \(v_user_id, 0, 0, 0\)[\s\S]+on conflict \(user_id\) do nothing/i.test(sql),'only a missing zero-balance wallet may be inserted');
assert(!/\bupdate\s+public\.(customer_profiles|wallet_accounts)\b/i.test(sql),'existing member records must not be updated');
assert(!/\bdelete\s+from\b|\btruncate\b/i.test(sql),'migration must not delete member data');
assert(/revoke all on function public\.ensure_my_customer_profile\(\) from public, anon, authenticated, service_role/i.test(sql),'default and app-role execution must be revoked before the narrow grant');
assert(/grant execute on function public\.ensure_my_customer_profile\(\) to authenticated/i.test(sql),'only authenticated clients may receive EXECUTE');

console.log('staging member profile migration: ownership, idempotency, zero-wallet and least-privilege source contract PASS');
