const assert = require('assert');
const fs = require('fs');

const workflow = fs.readFileSync('.github/workflows/preview-visual-qa.yml', 'utf8');
const runner = fs.readFileSync('scripts/playwright-preview-visual.mjs', 'utf8');

for (const width of [360, 390, 620, 720]) assert(runner.includes(`width: ${width}`), `missing exact ${width}px viewport`);
for (const route of ['/', '/research-insight.html', '/peptide-calculator.html', '/visual-composer.html', '/member.html', '/checkout.html', '/payment-return.html', '/admin.html']) assert(runner.includes(`pathname: '${route}'`), `missing visual route ${route}`);

assert(workflow.includes('pull_request:'), 'visual QA must run for PR updates');
assert(workflow.includes('workflow_dispatch:'), 'visual QA must support an exact manual Preview URL');
assert(workflow.startsWith('name: Protected Preview visual QA\n'), 'workflow identity must match the Vercel Trusted Source rule');
assert(workflow.includes('contents: read'), 'checkout must keep the minimum repository read permission');
assert(workflow.includes('id-token: write'), 'GitHub OIDC token minting requires id-token write permission');
assert(workflow.includes('actions/github-script@v7') && workflow.includes('core.getIDToken()'), 'workflow must use short-lived GitHub OIDC');
assert(!workflow.includes('VERCEL_AUTOMATION_BYPASS_SECRET'), 'no long-lived Vercel bypass secret may be used');
assert(workflow.includes('actions/upload-artifact@v4') && workflow.includes('if: always()'), 'visual evidence must always be uploaded');
assert(runner.includes("'x-vercel-trusted-oidc-idp-token': trustedOidcToken"), 'Vercel Trusted Sources OIDC header is required');
assert(runner.includes('request.redirectedFrom()') && runner.includes('trustedPreviewHosts'), 'OIDC must follow only protected Preview alias redirects');
assert(runner.includes("text: 'AI BioTech Member'") && runner.includes("text: 'Checkout'"), 'visual QA must assert the temporary unlocked Member and Checkout UI, not obsolete lock banners');
assert(runner.includes("!READ_METHODS.has(method)"), 'all non-read browser requests must be blocked');
assert(runner.includes("fullPage: true"), 'screenshots must be full-page captures');
assert(runner.includes("deviceScaleFactor: 1"), 'artifact pixels must match exact CSS viewport widths');
assert(runner.includes("isMobile: true") && runner.includes("hasTouch: true"), 'Android mobile emulation must be enabled');
assert(runner.includes("Production and main aliases are forbidden"), 'the QA runner must reject Production/main aliases');
assert(!workflow.includes('vercel deploy') && !workflow.includes('--prod'), 'visual QA must not deploy');

console.log('protected Preview Playwright visual-QA workflow contract PASS');
