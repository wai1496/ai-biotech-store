const fs=require('fs'),assert=require('assert');
const {fixture}=require('./helpers/offline-page');
const html=fs.readFileSync('index.html','utf8'),f=fixture(html);
f.load();f.context.openStageAccount();assert.equal(f.context.location.href,'/member.html');
assert(html.includes('aria-label="Member account"'));
assert(/openStageAccount\(\);closeMobileMenu\(\)">Member Area<\/button>/.test(html),'mobile menu must visibly label membership');
console.log('mobile member action contract PASS; actual narrow-width fit remains manual QA');
