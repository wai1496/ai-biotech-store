const assert = require('assert');
const fs = require('fs');

const workflow = fs.readFileSync('.github/workflows/preview-visual-qa.yml', 'utf8');
const runner = fs.readFileSync('scripts/playwright-preview-visual.mjs', 'utf8');

for (const width of [360, 390, 620, 720]) {
  assert(runner.includes(`width: ${width}`), `missing exact ${width}px viewport`);
}
for (const route of ['/', '/research-insight.html', '/peptide-calculator.html', '/visual-composer.html', '/member.html', '/checkout.html', '/payment-return.html', '/admin.html']) {
  assert(runner.includes(`pathname: '${route}'`), `missing visual route ${route}`);
}

assert(workflow.includes('pull_request:'), 'visual QA must run for PR updates');
assert(workflow.includes('workflow_dispatch:'), 'visual QA must support an exact manual Preview URL');
assert(workflow.includes("secrets.VERCEL_AUTOMATION_BYPASS_SECRET"), 'protected Preview access must come from a GitHub secret');
assert(workflow.includes('actions/upload-artifact@v4'), 'screenshots must be uploaded as CI artifacts');
assert(workflow.includes('if: always()'), 'blocked evidence must still be uploaded');
assert(runner.includes("'x-vercel-protection-bypass': bypassSecret"), 'Vercel automation header is required');
assert(runner.includes("requestUrl.hostname === previewUrl.hostname"), 'bypass secret must only be sent to the Preview origin');
assert(runner.includes("!READ_METHODS.has(method)"), 'all non-read browser requests must be blocked');
assert(runner.includes("fullPage: true"), 'screenshots must be full-page captures');
assert(runner.includes("deviceScaleFactor: 1"), 'artifact pixels must match exact CSS viewport widths');
assert(runner.includes("isMobile: true") && runner.includes("hasTouch: true"), 'Android mobile emulation must be enabled');
assert(runner.includes("Production and main aliases are forbidden"), 'the QA runner must reject Production/main aliases');
assert(!workflow.includes('vercel deploy') && !workflow.includes('--prod'), 'visual QA must not deploy');

console.log('protected Preview Playwright visual-QA workflow contract PASS');
