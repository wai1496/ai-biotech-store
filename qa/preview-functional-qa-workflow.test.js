const assert=require('assert');
const fs=require('fs');

const workflow=fs.readFileSync('.github/workflows/preview-visual-qa.yml','utf8');
const wrapper=fs.readFileSync('scripts/playwright-preview-functional-qa.mjs','utf8');
const script=fs.readFileSync('scripts/playwright-preview-functional-qa-v2.mjs','utf8');
const bootstrap=fs.readFileSync('api/preview-qa-user.js','utf8');
const branch='integration/white-clean-core-v1';
const previewHost='ai-biotech-store-git-integration-white-clean-core-v1-rk-cd1c.vercel.app';

assert(wrapper.includes("playwright-preview-functional-qa-v2.mjs"),'legacy workflow entrypoint must delegate to the deterministic QA runner');
assert(workflow.includes('id-token: write'),'protected Preview QA must reuse the Trusted Sources workflow and short-lived GitHub OIDC');
assert(workflow.includes("github.event.pull_request.number == 39"),'temporary workflow must be restricted to PR #39');
assert(workflow.includes(`github.head_ref == '${branch}'`),'temporary workflow must be restricted to the integration branch');
assert(workflow.includes(`https://${previewHost}`),'workflow must target the protected integration branch Preview alias');
assert(!/VERCEL_AUTOMATION_BYPASS_SECRET|_vercel_share/i.test(workflow+script+bootstrap),'temporary QA must not add a long-lived or public protection bypass');
assert(script.includes(`preview.hostname==='${previewHost}'`),'runtime must start only from the protected integration branch Preview alias');
assert(script.includes('redirectedFrom()')&&script.includes('isCommit(u.hostname)'),'OIDC must follow only branch-alias redirects to commit-specific AI BioTech Preview hosts');
assert(script.includes("h!=='ai-biotech-store.vercel.app'")&&script.includes("h!=='ai-biotech-store-git-main-rk-cd1c.vercel.app'"),'derived Preview hosts must exclude Production and main aliases');
assert(script.includes("u.hostname==='dev.toyyibpay.com'"),'payment-page evidence must remain on ToyyibPay sandbox');
assert(workflow.includes('QA_EMAIL_BASE: ${{ secrets.AIBT_QA_EMAIL }}'),'workflow must source the Staging QA mailbox from a GitHub Actions secret');
assert(script.includes("process.env.QA_EMAIL_BASE"),'functional QA must read the private Staging QA mailbox from the environment');
assert(!script.includes('@example.com')&&!script.includes('@example.test'),'functional QA must not use reserved fake email domains');
assert(script.includes("'/api/preview-qa-user'")||script.includes('"/api/preview-qa-user"'),'functional QA must provision its disposable user through the protected Preview QA bootstrap');
assert(!script.includes('/auth/v1/signup'),'functional QA must not depend on external email delivery for disposable account provisioning');
assert(bootstrap.includes("require('../lib/preview-safety')"),'QA bootstrap must inherit the existing Preview fail-closed safety gate');
assert(bootstrap.includes('SUPABASE_SERVICE_ROLE_KEY')||bootstrap.includes('requireServiceRuntime'),'QA bootstrap must use only the existing server-side Supabase service role');
assert(bootstrap.includes('/auth/v1/admin/users'),'QA bootstrap must use Supabase Admin user creation rather than direct auth-schema writes');
assert(bootstrap.includes('email_confirm:true')||bootstrap.includes('email_confirm: true'),'QA bootstrap must auto-confirm only the disposable QA user');
assert(bootstrap.includes("req.method==='DELETE'")||bootstrap.includes("req.method === 'DELETE'"),'QA bootstrap must support disposable-user deletion');
assert(script.includes("bootstrap('DELETE'")||script.includes('bootstrap("DELETE"'),'functional QA cleanup must delete its disposable Auth user');
assert(!/password.*JSON\.stringify|password.*console\.|password.*process\.stdout/i.test(script+bootstrap),'generated QA password must not be written to evidence or logs');

console.log('temporary Preview functional QA workflow: PR/branch/OIDC/private-mailbox/server-admin-bootstrap/delete-cleanup/sandbox boundaries PASS');
