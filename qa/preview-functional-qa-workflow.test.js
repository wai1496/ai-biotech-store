const assert=require('assert');
const fs=require('fs');

const workflow=fs.readFileSync('.github/workflows/preview-functional-qa.yml','utf8');
const script=fs.readFileSync('scripts/playwright-preview-functional-qa.mjs','utf8');
const branch='integration/white-clean-core-v1';
const previewHost='ai-biotech-store-git-integration-white-clean-core-v1-rk-cd1c.vercel.app';

assert(workflow.includes('id-token: write'),'protected Preview QA must use short-lived GitHub OIDC');
assert(workflow.includes("github.event.pull_request.number == 39"),'temporary workflow must be restricted to PR #39');
assert(workflow.includes(`github.head_ref == '${branch}'`),'temporary workflow must be restricted to the integration branch');
assert(workflow.includes(`https://${previewHost}`),'workflow must target the protected branch alias only');
assert(!/VERCEL_AUTOMATION_BYPASS_SECRET|_vercel_share/i.test(workflow+script),'temporary QA must not add a long-lived or public protection bypass');
assert(script.includes(`previewUrl.hostname==='${previewHost}'`),'runtime must reject every other deployment host');
assert(script.includes("url.hostname==='dev.toyyibpay.com'"),'payment-page evidence must remain on ToyyibPay sandbox');
assert(script.includes("auth.signOut({scope:'global'})"),'workflow must revoke the disposable browser session in cleanup');
assert(script.includes("@example.test"),'workflow must use a clearly reserved test-only email');
assert(!/password.*JSON\.stringify|password.*console\.|password.*process\.stdout/i.test(script),'generated QA password must not be written to evidence or logs');

console.log('temporary Preview functional QA workflow: PR/branch/OIDC/sandbox/session-revocation boundaries PASS');
