import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const expectedProjectRef = 'rpnwssqvurpdennpzplx';
const protectedProjectRef = 'yjauxyvtrmdriwtmckkl';

const activeRuntimeFiles = [
  'staging-config.js',
  'index.html',
  'clean-store.js',
  'uploaded-master-renderer.js',
  'storefront-visual-fix.js',
  'ops.html',
  'ops.js',
  'member.html',
  'staging-member.js',
  'checkout.html',
  'staging-checkout.js',
  'admin.html',
  'admin.js',
  'admin-media-master.js',
  'temp-master-upload.html'
];

const failures = [];
function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    failures.push(`${file}: required runtime file is missing`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

const config = read('staging-config.js');
if (!config.includes(`https://${expectedProjectRef}.supabase.co`)) {
  failures.push(`staging-config.js: expected staging project ${expectedProjectRef}`);
}
if (!/environment\s*:\s*['"]staging['"]/.test(config)) {
  failures.push('staging-config.js: environment must be staging');
}

for (const file of activeRuntimeFiles) {
  const source = read(file);
  if (source.includes(protectedProjectRef)) {
    failures.push(`${file}: active review runtime references protected project ${protectedProjectRef}`);
  }
  if (/supabase\.createClient\(\s*['"]https:\/\//.test(source)) {
    failures.push(`${file}: creates a hard-coded Supabase client instead of using AIBT_CONFIG`);
  }
}

const adminHtml = read('admin.html');
const adminUsesSharedConfig = adminHtml.includes('/staging-config.js');
const adminRedirectsToOps = /ops\.html/.test(adminHtml) && /location|refresh|canonical/i.test(adminHtml);
if (!adminUsesSharedConfig && !adminRedirectsToOps) {
  failures.push('admin.html: must use shared staging config or redirect to the authoritative Operations Control Center');
}

const indexHtml = read('index.html');
if (indexHtml.includes('vial-layered-renderer.js')) {
  failures.push('index.html: legacy Vial renderer must not be active');
}

if (failures.length) {
  console.error('AI BioTech staging environment contract FAILED:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: all active review runtimes use staging project ${expectedProjectRef}`);
