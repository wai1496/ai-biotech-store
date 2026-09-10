const assert=require('assert');
const fs=require('fs');

const workflow=fs.readFileSync('.github/workflows/preview-visual-qa.yml','utf8');
const script=fs.readFileSync('scripts/playwright-preview-functional-qa.mjs','utf8');
const branch='integration/white-clean-core-v1';
const previewHost='ai-biotech-store-git-integration-white-clean-core-v1-rk-cd1c.vercel.app';

assert(workflow.includes('id-token: write'),'protected Preview QA must reuse the Trusted Sources workflow and short-lived GitHub OIDC');
assert(workflow.includes("github.event.pull_request.number == 39"),'temporary workflow must be restricted to PR #39');
assert(workflow.includes(`github.head_ref == '${branch}'`),'temporary workflow must be restricted to the integration branch');
assert(workflow.includes(`https://${previewHost}`),'workflow must target the protected integration branch Preview alias');
assert(!/VERCEL_AUTOMATION_BYPASS_SECRET|_vercel_share/i.test(workflow+script),'temporary QA must not add a long-lived or public protection bypass');
assert(script.includes(`previewUrl.hostname==='${previewHost}'`),'runtime must start only from the protected integration branch Preview alias');
assert(script.includes('request.redirectedFrom()')&&script.includes('isCommitPreviewHost(url.hostname)'),'OIDC must follow only branch-alias redirects to commit-specific AI BioTech Preview hosts');
assert(script.includes("trustedPreviewHosts.has(url.hostname)")&&script.includes("trustedPreviewHosts.has(new URL(origin.origin).hostname)"),'functional QA must follow the resolved protected commit Preview for API responses and browser storage');
assert(script.includes("hostname!=='ai-biotech-store.vercel.app'")&&script.includes("hostname!=='ai-biotech-store-git-main-rk-cd1c.vercel.app'"),'derived Preview hosts must exclude Production and main aliases');
assert(script.includes("url.hostname==='dev.toyyibpay.com'"),'payment-page evidence must remain on ToyyibPay sandbox');
assert(script.includes("auth.signOut({scope:'global'})"),'workflow must revoke the disposable browser session in cleanup');
assert(workflow.includes('QA_EMAIL_BASE: ${{ secrets.AIBT_QA_EMAIL }}'),'workflow must source the Staging QA mailbox from a GitHub Actions secret');
assert(script.includes("process.env.QA_EMAIL_BASE"),'functional QA must read the private Staging QA mailbox from the environment');
assert(!script.includes('@example.com')&&!script.includes('@example.test'),'functional QA must not use reserved fake email domains');
assert(script.includes("/auth/v1/signup")&&script.includes('signupDiagnostic'),'failed Staging signup must record only sanitized HTTP status/error evidence');
assert(script.includes('EMAIL_CONFIRMATION_WAIT_MS=300000'),'functional QA must allow up to five minutes for normal email confirmation');
assert(script.includes('signInAfterEmailConfirmation'),'functional QA must retry sign-in while waiting for email confirmation instead of racing the user');
assert(script.includes('email_not_confirmed'),'confirmation wait must retry only the expected unconfirmed-email condition');
assert(!/password.*JSON\.stringify|password.*console\.|password.*process\.stdout/i.test(script),'generated QA password must not be written to evidence or logs');

console.log('temporary Preview functional QA workflow: PR/branch/OIDC/private-mailbox/email-confirmation-wait/sandbox/session-revocation boundaries PASS');
