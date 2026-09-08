module.exports=async function handler(req,res){
  try{
    if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});
    const mode=String(process.env.TOYYIBPAY_MODE||'').trim().toLowerCase();
    const secret=String(process.env.TOYYIBPAY_SANDBOX_SECRET_KEY||process.env.TOYYIBPAY_SANDBOX_USER_SECRET_KEY||process.env.TOYYIBPAY_SECRET_KEY||'').trim();
    const category=String(process.env.TOYYIBPAY_SANDBOX_CATEGORY_CODE||process.env.TOYYIBPAY_CATEGORY_CODE||'').trim();
    if(mode!=='sandbox')return res.status(503).json({ok:false,code:'MODE_NOT_SANDBOX',mode});
    if(!secret||!category)return res.status(503).json({ok:false,code:'PAYMENT_NOT_CONFIGURED',hasSecret:!!secret,hasCategory:!!category});
    const body=new URLSearchParams({userSecretKey:secret,categoryCode:category});
    const r=await fetch('https://dev.toyyibpay.com/index.php/api/getCategoryDetails',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:body.toString()
    });
    const text=await r.text();
    let data=text; try{data=text?JSON.parse(text):null}catch{}
    const out={ok:r.ok,status:r.status,mode:'sandbox',host:'dev.toyyibpay.com',result:data};
    return res.status(r.ok?200:r.status).json(out);
  }catch(e){
    console.error('ToyyibPay sandbox diagnostic failed',e?.message||e);
    return res.status(500).json({ok:false,code:'SANDBOX_DIAGNOSTIC_FAILED',error:e?.message||String(e)});
  }
};
