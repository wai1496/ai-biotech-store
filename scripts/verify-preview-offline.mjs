import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
function run(command,args){const result=spawnSync(command,args,{encoding:'utf8'});if(result.status!==0){process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);}return result.stdout;}
const tests=fs.readdirSync('qa').filter(f=>f.endsWith('.test.js')).sort();
for(const file of tests){run(process.execPath,['qa/'+file]);console.log('PASS qa/'+file);}
console.log(`QA TOTAL: ${tests.length} PASS, 0 FAIL`);
for(const script of ['scripts/smoke-check.mjs','scripts/storefront-live-issues-check.mjs'])process.stdout.write(run(process.execPath,[script]));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>['.git','node_modules'].includes(e.name)?[]:e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const sources=files('.').filter(f=>/\.(js|mjs)$/.test(f));
for(const file of sources)run(process.execPath,['--check',file]);
console.log(`SYNTAX: ${sources.length} JavaScript files PASS`);
run('git',['diff','--check']);console.log('git diff --check PASS');
