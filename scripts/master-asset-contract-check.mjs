import assert from 'node:assert/strict';
import fs from 'node:fs';

const configSource=fs.readFileSync('staging-config.js','utf8');
const requiredAssets={
  Vial:'/assets/vial-master-v4.svg',
  Pen:'/assets/pen-master-v4.svg',
  Cartridge:'/assets/cartridge-master-v5.svg'
};

for(const [format,asset] of Object.entries(requiredAssets)){
  assert.equal(fs.existsSync(asset.slice(1)),true,`${format} approved staging asset is missing: ${asset}`);
  assert.equal(configSource.includes(asset),true,`staging-config.js must use ${asset} for ${format}`);
}

assert.equal(/master-pending\.svg/i.test(configSource),false,'staging-config.js must not ship temporary Vial/Pen migration placeholders once WP-03 starts');

for(const file of Object.values(requiredAssets)){
  const source=fs.readFileSync(file.slice(1),'utf8');
  assert.match(source,/viewBox="0 0 512 512"/i,`${file} must be 1:1`);
  assert.equal(/<rect[^>]+(?:fill="#000|fill="black)/i.test(source),false,`${file} must not contain a black background rectangle`);
}

console.log('PASS: approved staging-owned Vial, Pen and Cartridge master assets are active');
