module.exports=async function handler(req,res){
  try{
    if(process.env.VERCEL_ENV==='production')return res.status(403).json({ok:false,error:'Staging integration status is disabled in production'});
    if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});
    const sbUrl=process.env.STAGING_SUPABASE_URL,pub=process.env.STAGING_SUPABASE_PUBLISHABLE_KEY,service=process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
    if(!sbUrl||!pub||!service)return res.status(503).json({ok:false,error:'Staging Supabase server environment is not configured',readiness:{staging_supabase:false,toyyibpay:false,easyparcel:false}});
    const h=String(req.headers.authorization||''),m=/^Bearer\s+(.+)$/i.exec(h);
    if(!m)return res.status(401).json({ok:false,error:'Authenticated staging admin required'});
    const ur=await fetch(`${sbUrl}/auth/v1/user`,{headers:{apikey:pub,authorization:`Bearer ${m[1]}`}}),u=await ur.json();
    if(!ur.ok||!u?.id)return res.status(401).json({ok:false,error:'Invalid staging admin session'});
    const ar=await fetch(`${sbUrl}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(u.id)}&active=eq.true&select=role`,{headers:{apikey:service,authorization:`Bearer ${service}`}}),admins=await ar.json(),admin=admins?.[0];
    if(!ar.ok||!admin)return res.status(403).json({ok:false,error:'Staging admin permission required'});

    const ir=await fetch(`${sbUrl}/rest/v1/integration_configs?integration_key=eq.easyparcel&select=enabled,mode,status,config`,{headers:{apikey:service,authorization:`Bearer ${service}`}}),rows=await ir.json();
    const epConfig=ir.ok&&Array.isArray(rows)?rows[0]:null;
    const oauthCreds=!!(process.env.EASYPARCEL_CLIENT_ID&&process.env.EASYPARCEL_CLIENT_SECRET);
    const oauthConnected=!!epConfig?.enabled&&['healthy','connected'].includes(epConfig?.status)&&!!epConfig?.config?.oauth_connected;
    const ep=oauthCreds&&oauthConnected;
    const tp=!!process.env.TOYYIBPAY_SANDBOX_SECRET_KEY;
    const epRequirements=[];
    if(!process.env.EASYPARCEL_CLIENT_ID)epRequirements.push('EASYPARCEL_CLIENT_ID');
    if(!process.env.EASYPARCEL_CLIENT_SECRET)epRequirements.push('EASYPARCEL_CLIENT_SECRET');
    if(oauthCreds&&!oauthConnected)epRequirements.push('Connect EasyParcel from Operations');

    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({
      ok:true,environment:'staging',
      readiness:{staging_supabase:true,toyyibpay:tp,easyparcel:ep},
      modes:{toyyibpay:'sandbox',easyparcel:oauthConnected?'oauth-openapi-2026-06':'setup'},
      easyparcel:{oauth_credentials_configured:oauthCreds,oauth_connected:oauthConnected,api_version:'2026-06',legacy_demo_key_required:false,token_values_exposed:false},
      requirements:{toyyibpay:tp?[]:['TOYYIBPAY_SANDBOX_SECRET_KEY'],easyparcel:epRequirements}
    });
  }catch(e){console.error(e);return res.status(500).json({ok:false,error:e.message||String(e)})}
};
