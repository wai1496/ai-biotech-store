const assert=require('assert');const {fixture}=require('./helpers/offline-page');
(async()=>{
 const f=fixture(),calls=[];f.run('visual-renderer.js');f.run('product-visual-adapter.js');const p={name:'CAGRILINTIDE',categories:{color:'#1477ff'}},img=f.document.createElement('img');
 f.context.AIBTVisualRenderer.renderPreview=async options=>{calls.push(options);return {mode:'dynamic-preview'};};
 await f.context.AIBTProductVisual.render(p,{format:'Pen',strength_label:'5mg',image_url:'https://isolated.example/upload.webp'},img);assert.equal(calls.length,0);assert.equal(img.src,'https://isolated.example/upload.webp');img.onerror();assert.equal(img.src,'/assets/pen-master-approved.webp');
 f.context.AIBTProductVisual.setTemplates([{format:'Vial',master_image_url:'/assets/vial-master-approved.webp'}]);
 for(const format of ['Vial','Pen','Cartridge']){await f.context.AIBTProductVisual.render(p,{format,strength_label:'5mg',image_url:'https://old.example/storage/v1/object/public/catalog-media/masters/'+format.toLowerCase()+'-master-old.webp'},img);assert.equal(calls.at(-1).format,format);assert.equal(calls.at(-1).productName,p.name);assert.equal(calls.at(-1).strength,'5mg');assert(img.src.startsWith('data:image/png'));}
 const count=calls.length;await f.context.AIBTProductVisual.render({name:'LONG BLEND + COMPOUND NAME'},{format:'Cartridge',strength_label:'5mg'},img);assert.equal(calls.length,count);assert.equal(img.src,'/assets/cartridge-master-approved.webp');
 f.context.AIBTVisualRenderer.renderPreview=async()=>{throw new Error('bad image');};await f.context.AIBTProductVisual.render(p,{format:'Pen',strength_label:'5mg'},img);assert.equal(img.src,'/assets/pen-master-approved.webp');
 console.log('product visual adapter behavior: uploads, placeholders, templates, all formats, Cartridge reference and failures PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
