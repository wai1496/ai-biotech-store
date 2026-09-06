import fs from 'node:fs';
import assert from 'node:assert';

const callback=fs.readFileSync('api/easyparcel/callback.js','utf8');
const connect=fs.existsSync('api/easyparcel/connect.js')?fs.readFileSync('api/easyparcel/connect.js','utf8'):'';

assert(connect.includes('https://api.easyparcel.com/oauth/login'),'connect route must use EasyParcel OAuth login endpoint');
assert(connect.includes('HttpOnly'),'OAuth state cookie must be HttpOnly');
assert(connect.includes('SameSite=Lax'),'OAuth state cookie must use SameSite=Lax');
assert(connect.includes('EASYPARCEL_OAUTH_STATE_SECRET'),'OAuth state must be signed with a server-side secret');
assert(callback.includes('https://api.easyparcel.com/oauth/token'),'callback must exchange code at EasyParcel token endpoint');
assert(callback.includes("grant_type', 'authorization_code'"),'callback must use authorization_code grant');
assert(callback.includes("Authorization: `Basic ${basic}`")||callback.includes("authorization:`Basic ${basic}`"),'token exchange must use Basic client authentication');
assert(callback.includes('easyparcel_store_oauth_tokens'),'callback must persist tokens through server-only Supabase RPC');
assert(callback.includes('timingSafeEqual'),'callback must validate state without ordinary string equality');
assert(!callback.includes('access_token: token.access_token'),'callback response must not expose access token');
console.log('EasyParcel OAuth security contract: PASS');
