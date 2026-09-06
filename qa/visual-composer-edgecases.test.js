const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'..','visual-renderer.js'),'utf8');
const sandbox={window:{}};vm.runInNewContext(source,sandbox,{filename:'visual-renderer.js'});
const R=sandbox.window.AIBTVisualRenderer;
assert.ok(R,'renderer must load');
const measure=(text,size)=>String(text).length*size*0.62;
const cases=[
  ['CJC-1295 WITHOUT DAC + IPAMORELIN',R.PEN_FIELDS.name],
  ['5mg (2.5mg + 2.5mg)',R.PEN_FIELDS.strength],
  ['1000mg',R.PEN_FIELDS.strength],
  ['GHK-CU',R.PEN_FIELDS.name]
];
for(const [text,field] of cases){
  const layout=R.fitTextLayout(measure,text,field);
  const maxW=(field.w||field.maxW)-((field.pad||0)*2);
  assert.ok(layout.size>=field.min,`${text}: font must respect minimum`);
  assert.ok(layout.scaleX>0&&layout.scaleX<=1,`${text}: scaleX must be safe`);
  assert.ok(measure(text,layout.size)*layout.scaleX<=maxW+0.01,`${text}: fitted text must remain inside its print field`);
}
assert.match(source,/ctx\.scale\(layout\.scaleX,1\)/,'rendering must apply horizontal fit when minimum font size is still too wide');
console.log('visual composer edge-case fit contract passed');
