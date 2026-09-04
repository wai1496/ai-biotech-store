const PROD_SUPABASE_URL='https://yjauxyvtrmdriwtmckkl.supabase.co';
const PROD_SUPABASE_PUBLISHABLE_KEY='sb_publishable_xib7Xo5_y1G75gSAmkW9QQ__H5-mgZF';
const STAGING_SUPABASE_URL='https://rpnwssqvurpdennpzplx.supabase.co';
const STAGING_SUPABASE_PUBLISHABLE_KEY='sb_publishable_x4udjzTcG-t9NW6qusKvZA_Efk2QoXh';
const gitRef=String(process.env.VERCEL_GIT_COMMIT_REF||'');
const previewRef=/^(?:feature\/|review\/|staging\/)/i.test(gitRef)||/research-approval-workflow/i.test(gitRef);
const useStaging=process.env.VERCEL_ENV!=='production'||previewRef;
const SUPABASE_URL=useStaging?STAGING_SUPABASE_URL:(process.env.SUPABASE_URL||PROD_SUPABASE_URL);
const SUPABASE_PUBLISHABLE_KEY=useStaging?STAGING_SUPABASE_PUBLISHABLE_KEY:(process.env.SUPABASE_PUBLISHABLE_KEY||PROD_SUPABASE_PUBLISHABLE_KEY);

class ResearchAuthError extends Error{
  constructor(code,message,status){super(message);this.name='ResearchAuthError';this.code=code;this.status=status;}
}

function bearerToken(req){
  const authorization=String(req.headers?.authorization||req.headers?.Authorization||'').trim();
  const match=authorization.match(/^Bearer\s+(.+)$/i);
  if(!match||!match[1])throw new ResearchAuthError('AUTH_REQUIRED','Authentication required',401);
  return match[1].trim();
}

async function supabaseJson(path,token){
  const response=await fetch(`${SUPABASE_URL}${path}`,{
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'}
  });
  let body=null;
  try{body=await response.json();}catch{}
  return {response,body};
}

async function verifyResearchAdmin(req){
  const token=bearerToken(req);
  const userResult=await supabaseJson('/auth/v1/user',token);
  const userId=userResult.body?.id;
  if(!userResult.response.ok||!userId)throw new ResearchAuthError('AUTH_REQUIRED','Authentication required',401);

  const adminPath=`/rest/v1/admin_users?select=role,active&user_id=eq.${encodeURIComponent(userId)}&limit=1`;
  const adminResult=await supabaseJson(adminPath,token);
  const admin=Array.isArray(adminResult.body)?adminResult.body[0]:null;
  if(!adminResult.response.ok||!admin?.active||!['super_admin','catalog_manager'].includes(admin.role)){
    throw new ResearchAuthError('ADMIN_REQUIRED','Administrator access required',403);
  }
  return {userId,role:admin.role,token};
}

module.exports={verifyResearchAdmin,ResearchAuthError,SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY};
