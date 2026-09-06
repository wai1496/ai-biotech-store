const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('id="memberNavMenuBtn"'),'main navigation must include a dedicated Member entry');
assert(html.includes("location.href='/member.html'"),'Member navigation must link to member.html');
assert(/memberNavMenuBtn[^>]*>[^<]*MEMBER/i.test(html),'Member entry must be visibly labelled MEMBER');
console.log('mobile member navigation contract: ok');
