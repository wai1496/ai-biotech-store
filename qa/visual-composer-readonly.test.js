const assert=require('assert'),fs=require('fs'),path=require('path');
const js=fs.readFileSync(path.join(__dirname,'..','visual-composer.js'),'utf8');
assert.match(js,/from\(['"]products['"]\)\.select\(/,'composer may read published products');
assert.match(js,/from\(['"]media_templates['"]\)\.select\(/,'composer may read media templates');
assert.match(js,/\.eq\(['"]published['"],true\)/,'catalog read must stay published-only');
for(const forbidden of ['.insert(','.update(','.upsert(','.delete(','.rpc(','.storage.from(','method:\'POST\'','method:"POST"','method:\'PUT\'','method:"PUT"','method:\'PATCH\'','method:"PATCH"'])assert.ok(!js.includes(forbidden),`composer must remain read-only: ${forbidden}`);
assert.match(js,/manual/i,'manual input fallback must remain available when read-only lookup fails');
console.log('visual composer read-only contract passed');
