(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.AIBTNavigationCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  const categories=['Metabolism','Regeneration','Healing','Brain & Sleep','Bonding','Longevity','Hormone','Special Blend','Solvent'];
  function clean(label){return String(label||'').replace(/[^A-Z &]/gi,' ').replace(/\s+/g,' ').trim().toUpperCase()}
  function navPurpose(label){
    const value=clean(label);
    if(value.includes('CATALOG'))return 'catalog';
    if(value.includes('PEPTIDES'))return 'peptides-menu';
    if(value.includes('RESEARCH'))return 'research';
    if(value.includes('GUIDES'))return 'guides';
    if(value.includes('FAQ'))return 'faq';
    if(value.includes('CALCULATOR'))return 'calculator';
    if(value.includes('ABOUT US'))return 'about';
    if(value.includes('HOME'))return 'home';
    return 'unknown';
  }
  return {navPurpose,categoryKeys:()=>categories.slice()};
});
