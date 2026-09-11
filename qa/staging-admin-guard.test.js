const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('staging-admin-guard.js','utf8');
assert(src.includes('rpnwssqvurpdennpzplx'),'staging admin guard must bind to the isolated staging project');
assert(/AIBT_CONFIG/.test(src),'staging admin guard must inspect runtime staging config');
assert(/PREVIEW ADMIN LOCKED/.test(src),'staging admin guard must retain a hard-lock fallback');
assert(!/document\.querySelectorAll\('input,textarea,select,button'\)\.forEach\(el=>el\.disabled=true\);\s*};\s*if\(document\.readyState/.test(src),'staging admin guard must not unconditionally disable every control');
console.log('staging-admin-guard: ok');
