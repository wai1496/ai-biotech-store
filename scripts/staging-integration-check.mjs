import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),fail=[];
const req=['staging-member-agent.js','staging-member-wallet.js','api/staging-wallet/_shared.js','api/staging-wallet/start.js','api/staging-wallet/callback.js','api/staging-wallet/return.js','api/staging-shipping/_shared.js','api/staging-shipping/rates.js','api/staging-shipping/book.js','api/staging-shipping/pay.js','api/staging-shipping/status.js','ops-easyparcel.js','member.html','ops.html'];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of req)if(!fs.existsSync(path.join(root,f)))fail.push(`missing ${f}`);
if(fail.length){console.error('Staging integration check FAILED:\n- '+fail.join('\n- '));process.exit(1)}
const agent=read('staging-member-agent.js'),walletUI=read('staging-member-wallet.js'),memberHtml=read('member.html'),opsHtml=read('ops.html');
const walletFiles=['api/staging-wallet/_shared.js','api/staging-wallet/start.js','api/staging-wallet/callback.js','api/staging-wallet/return.js'];
const shipFiles=['api/staging-shipping/_shared.js','api/staging-shipping/rates.js','api/staging-shipping/book.js','api/staging-shipping/pay.js','api/staging-shipping/status.js'];
const walletText=walletFiles.map(read).join('\n'),shipText=shipFiles.map(read).join('\n'),pay=read('api/staging-shipping/pay.js'),callback=read('api/staging-wallet/callback.js'),walletShared=read('api/staging-wallet/_shared.js'),shipShared=read('api/staging-shipping/_shared.js'),opsEp=read('ops-easyparcel.js');
if(!agent.includes('member_get_agent_dashboard'))fail.push('Agent member dashboard is not wired to member_get_agent_dashboard');
if(!memberHtml.includes('/staging-member-agent.js'))fail.push('Member Area is not loading Agent dashboard module');
if(!walletUI.includes('member_wallet_topup_status')||!walletUI.includes('member_create_wallet_topup_intent'))fail.push('Member wallet top-up status/intent contracts are not wired');
if(!memberHtml.includes('/staging-member-wallet.js'))fail.push('Member Area is not loading staged wallet top-up module');
if(!walletUI.includes('adapter_ready')||!walletUI.includes('topup_enabled'))fail.push('Wallet UI must gate payment button on explicit top-up and adapter readiness');
for(const [name,text] of [...walletFiles.map(f=>[f,read(f)]),...shipFiles.map(f=>[f,read(f)])]){
  if(!text.includes("VERCEL_ENV==='production'"))fail.push(`${name}: staging adapter is not explicitly production-blocked`);
  if(text.includes('yjauxyvtrmdriwtmckkl'))fail.push(`${name}: staging adapter references production Supabase`);
}
if(!walletShared.includes("https://dev.toyyibpay.com"))fail.push('ToyyibPay wallet adapter must use sandbox dev.toyyibpay.com');
if(walletText.includes('https://toyyibpay.com')&&!walletText.includes('https://dev.toyyibpay.com'))fail.push('ToyyibPay wallet adapter appears to use live endpoint');
for(const token of ['TOYYIBPAY_SANDBOX_SECRET_KEY','STAGING_SUPABASE_SERVICE_ROLE_KEY'])if(!walletShared.includes(token))fail.push(`ToyyibPay adapter missing server env token ${token}`);
if(!callback.includes('expectedHash')||!callback.includes('getBillTransactions')||!callback.includes('service_capture_wallet_topup'))fail.push('ToyyibPay callback must verify hash, verify transaction and use service-role wallet capture');
if(walletUI.includes('service_capture_wallet_topup')||walletUI.includes('service_fail_wallet_topup'))fail.push('Member browser code must never call wallet capture/failure service functions');
if(!shipShared.includes("https://demo.connect.easyparcel.my/?ac="))fail.push('EasyParcel staging adapter must use demo endpoint');
if(shipText.includes('https://connect.easyparcel.my'))fail.push('EasyParcel staging adapter references live endpoint');
for(const token of ['EASYPARCEL_DEMO_API_KEY','STAGING_SUPABASE_SERVICE_ROLE_KEY'])if(!shipShared.includes(token))fail.push(`EasyParcel adapter missing server env token ${token}`);
if(!pay.includes('confirm_payment')||!pay.includes("String(b.confirm_payment)!=='true'"))fail.push('EasyParcel payment endpoint must require explicit confirm_payment=true');
if(!opsEp.includes('I Understand — Pay EasyParcel Credit'))fail.push('Operations EasyParcel financial confirmation UI is missing');
for(const rpc of ['service_store_shipping_quotes','service_record_easyparcel_booking','service_record_easyparcel_payment','service_record_easyparcel_status'])if(!shipText.includes(rpc))fail.push(`EasyParcel adapter missing service RPC ${rpc}`);
if(!opsHtml.includes('/ops-easyparcel.js'))fail.push('Operations is not loading EasyParcel workspace');
const obviousSecrets=[/sb_secret_[A-Za-z0-9_-]{10,}/,/sk-proj-[A-Za-z0-9_-]{10,}/,/userSecretKey\s*[:=]\s*['"][^'"]{8,}['"]/];
for(const [name,text] of [...walletFiles.map(f=>[f,read(f)]),...shipFiles.map(f=>[f,read(f)])])for(const re of obviousSecrets)if(re.test(text))fail.push(`${name}: possible embedded secret detected`);
if(fail.length){console.error('Staging integration check FAILED:\n- '+[...new Set(fail)].join('\n- '));process.exit(1)}
console.log('Staging integration check passed: Agent dashboard, ToyyibPay sandbox wallet adapter, service-only wallet capture and explicitly confirmed EasyParcel demo payment are enforced.');