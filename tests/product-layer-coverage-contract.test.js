const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('product-layer-coverage-fix.js','utf8');

assert(src.includes("'glow-70mg':'glow'"), 'GLOW 70MG must resolve to supplied GLOW name layer');
assert(src.includes("'oxytocin-acetate':'oxytocin'"), 'Oxytocin Acetate must resolve to supplied Oxytocin name layer');
assert(src.includes("'cjc-1295-with-dac':'cjc-1295'"), 'CJC WITH DAC must resolve to supplied CJC-1295 name layer');
assert(src.includes("'cjc-1295-without-dac':'cjc-1295'"), 'CJC WITHOUT DAC must resolve to supplied CJC-1295 name layer');
assert(src.includes("'cjc-1295-without-dac-ipamorelin':'cjc-1295-ipamorelin'"), 'CJC+IPA must resolve to supplied CJC+IPA name layer');
assert(/match\(\/\^\\s\*\(\\d\+\(\?:\\.\\d\+\)\?\)\\s\*\(mg\|ml\)/i.test(src), 'blend strength must normalize to leading total strength');
assert(src.includes('aibt-layer-fallback'), 'missing supplied layers must have a visible fallback instead of broken image');
console.log('product layer coverage contract: PASS');
