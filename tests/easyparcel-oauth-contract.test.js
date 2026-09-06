import fs from 'node:fs';
import assert from 'node:assert';

const callback=fs.readFileSync('api/easyparcel/callback.js','utf8');
const connect=fs.existsSync('api/easyparcel/connect.js')?fs.readFileSync('api/easyparcel/connect.js','utf8'):'';
const ops=fs.readFileSync('ops-easyparcel.js','utf8');
const status=fs.readFileSync('api/staging-integrations/status.js','utf8');

assert(connect.includes('https://api.easyparcel.com/oauth/login'),'connect route must use EasyParcel OAuth login endpoint');
assert(connect.includes('Authenticated staging admin required'),'connect route must require an authenticated staging admin');
assert(connect.includes('admin_users'),'connect route must verify staging admin permission');
assert(connect.includes("process.env.EASYPARCEL_OAUTH_STATE_SECRET||process.env.EASYPARCEL_CLIENT_SECRET"),'connect route may use client secret as state-signing fallback to avoid extra owner setup');
assert(connect.includes('HttpOnly'),'OAuth state cookie must be HttpOnly');
assert(connect.includes('SameSite=Lax'),'OAuth state cookie must use SameSite=Lax');
assert(callback.includes('https://api.easyparcel.com/oauth/token'),'callback must exchange code at EasyParcel token endpoint');
assert(callback.includes("process.env.EASYPARCEL_OAUTH_STATE_SECRET||process.env.EASYPARCEL_CLIENT_SECRET"),'callback must use the same state-signing fallback');
assert(callback.includes("grant_type', 'authorization_code'"),'callback must use authorization_code grant');
assert(callback.includes("Authorization: `Basic ${basic}`")||callback.includes("authorization:`Basic ${basic}`"),'token exchange must use Basic client authentication');
assert(callback.includes('easyparcel_store_oauth_tokens'),'callback must persist tokens through server-only Supabase RPC');
assert(callback.includes('timingSafeEqual'),'callback must validate state without ordinary string equality');
assert(!callback.includes('access_token: token.access_token'),'callback response must not expose access token');
assert(ops.includes('/api/easyparcel/connect'),'Operations must expose a no-Postman EasyParcel connect action');
assert(ops.includes('authorization:`Bearer ${t}`')||ops.includes("authorization:`Bearer ${t}`"),'Operations connect action must send the staging admin session');
assert(status.includes('oauth_connected'),'integration status must recognize stored EasyParcel OAuth connection metadata');
assert(status.includes('EASYPARCEL_CLIENT_ID')&&status.includes('EASYPARCEL_CLIENT_SECRET'),'integration readiness must recognize EasyParcel OAuth credentials');
console.log('EasyParcel OAuth security contract: PASS');
