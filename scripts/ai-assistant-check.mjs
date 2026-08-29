import fs from 'node:fs';

const requiredFiles = [
  'ai-assistant.js',
  'ai-assistant.css',
  'api/ai-assistant-config.js',
  'api/ai-chat.js',
  'plugins/ai-storefront-assistant/manifest.json',
  'sql/20260829_ai_storefront_assistant.sql'
];

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`Missing ${file}`);
}

if (!failures.length) {
  const js = fs.readFileSync('ai-assistant.js', 'utf8');
  const api = fs.readFileSync('api/ai-chat.js', 'utf8');
  const cfg = fs.readFileSync('api/ai-assistant-config.js', 'utf8');
  const manifest = JSON.parse(fs.readFileSync('plugins/ai-storefront-assistant/manifest.json', 'utf8'));

  const checks = [
    [js.includes('180000'), '3 minute idle timer'],
    [js.includes('Before we chat'), 'disclaimer gate'],
    [js.includes("'condition','language','age','weight','height','medical_history','target'"), 'gentle onboarding sequence'],
    [js.includes("sessionStorage.getItem('aibt_assistant_disclaimer_v1')"), 'session-only disclaimer state'],
    [!js.includes("localStorage.setItem('aibt"), 'no assistant health/chat localStorage persistence'],
    [api.includes("process.env.VERCEL_ENV==='production'"), 'production lock'],
    [api.includes("database_write") === false, 'chat API does not request database write permission'],
    [api.includes('peptidedosages.com'), 'private source priority exists'],
    [api.includes('HIDDEN_SOURCES'), 'private source filtering exists'],
    [cfg.includes("AIBT_PUBLIC_AI_ENABLED!=='true'"), 'config endpoint production lock'],
    [manifest.permissions.database_write === false, 'manifest denies database writes'],
    [manifest.privacy.health_profile_persistence === false, 'manifest denies health profile persistence'],
    [manifest.activation.default_enabled === false, 'plugin defaults disabled']
  ];

  for (const [ok, label] of checks) if (!ok) failures.push(`Failed: ${label}`);
}

if (failures.length) {
  console.error('AI assistant checks failed:\n' + failures.map(x => `- ${x}`).join('\n'));
  process.exit(1);
}
console.log('AI assistant checks passed.');
