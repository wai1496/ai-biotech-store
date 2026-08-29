import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),fail=[];
const req=['ops-recovery.js','ops-recovery.css','ops.html'];
for(const f of req)if(!fs.existsSync(path.join(root,f)))fail.push(`missing ${f}`);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
if(!fail.length){
 const ui=read('ops-recovery.js'),html=read('ops.html');
 for(const token of ['ops_create_recovery_snapshot','ops_compare_recovery_snapshot','ops_preview_recovery_restore','ops_restore_recovery_module','p_expected_current_hash','RESTORE ${module}','non_destructive_upsert','Automatic pre-restore safety snapshot'])if(!ui.includes(token))fail.push(`Recovery UI missing safety contract token: ${token}`);
 for(const bad of [".delete(",".remove(","truncate(","drop table","reset database","reset website now"])if(ui.toLowerCase().includes(bad.toLowerCase()))fail.push(`Recovery UI contains destructive pattern: ${bad}`);
 if(!ui.includes('Deleted rows: <b>${Number(data.deleted_rows||0)}</b>'))fail.push('Recovery completion must disclose deleted-row count');
 if(!ui.includes("reason.length<5"))fail.push('Recovery restore must require a meaningful reason');
 if(!ui.includes("typed!==phrase"))fail.push('Recovery restore must require typed confirmation phrase');
 if(!html.includes('data-view="recovery"')||!html.includes('/ops-recovery.js')||!html.includes('/ops-recovery.css'))fail.push('Operations is not loading Demo & Recovery module');
 if(/prompt\s*\(|confirm\s*\(|alert\s*\(/.test(ui))fail.push('Recovery UI contains forbidden native browser dialog');
 if(ui.includes('yjauxyvtrmdriwtmckkl'))fail.push('Recovery UI references production Supabase');
}
if(fail.length){console.error('Recovery safety check FAILED:\n- '+[...new Set(fail)].join('\n- '));process.exit(1)}
console.log('Recovery safety check passed: logical snapshots, preview hash guard, typed confirmation and non-destructive selective restore are enforced.');