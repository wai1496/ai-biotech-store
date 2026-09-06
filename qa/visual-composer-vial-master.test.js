const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'visual-composer.html'),'utf8');
const js=fs.readFileSync(path.join(root,'visual-composer.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'visual-renderer.js'),'utf8');

assert.match(html,/id="vcLocalMaster"[^>]*type="file"/,'composer must accept a browser-only local master image');
assert.match(html,/id="vcVialCapMode"/,'composer must expose a Vial cap mode control');
assert.match(js,/URL\.createObjectURL/,'local master must stay in-browser via object URL');
assert.doesNotMatch(js,/\.upload\(|\.insert\(|\.update\(|\.upsert\(/,'local master flow must never persist anything');
assert.match(renderer,/VIAL_CAP_MASK/,'renderer must define a fixed Vial top-cap mask');
assert.match(renderer,/recolorVialCap/,'renderer must recolor only the fixed Vial cap region');
assert.match(renderer,/recolorLabelAccents/,'renderer must recolor Vial label accents separately from hardware');
assert.doesNotMatch(renderer,/recolorOrangePixels\(ctx,accent\);\s*const name/s,'Vial must not use whole-image orange recoloring before text placement');
console.log('visual composer Vial master safety contract passed');
