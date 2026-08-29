import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),fail=[];const read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of ['ops-automations.js','ops.html'])if(!fs.existsSync(path.join(root,f)))fail.push(`missing ${f}`);
if(fail.length){console.error('Automation safety check FAILED:\n- '+fail.join('\n- '));process.exit(1)}
const ui=read('ops-automations.js'),html=read('ops.html');
if(!html.includes('data-view="automations"')||!html.includes('/ops-automations.js'))fail.push('Operations does not expose/load Automation Builder');
for(const rpc of ['ops_save_automation','ops_dry_run_automation'])if(!ui.includes(rpc))fail.push(`Automation Builder missing controlled RPC ${rpc}`);
for(const bad of ['prompt(','confirm(','alert(','.insert(','.update(','.delete(','.upsert(','fetch(','XMLHttpRequest','WebSocket'])if(ui.includes(bad))fail.push(`Automation Builder contains forbidden direct side-effect pattern: ${bad}`);
if(!ui.includes('enabled=false')||!ui.includes('side effects: NONE')||!ui.includes('Execution Lock'))fail.push('Automation Builder does not clearly enforce/declare dry-run-only execution lock');
if(ui.includes('Enable Automation')||ui.includes('Activate Automation')||ui.includes('enabled:true'))fail.push('Automation Builder exposes execution activation before executor layer exists');
for(const action of ['inventory_low_stock_report','protocol_pending_report','order_pending_payment_report'])if(!ui.includes(action))fail.push(`Automation Builder missing safe dry-run action ${action}`);
if(fail.length){console.error('Automation safety check FAILED:\n- '+[...new Set(fail)].join('\n- '));process.exit(1)}
console.log('Automation safety check passed: definitions are audited and the UI remains dry-run-only with no external or direct-write side effects.');