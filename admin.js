(()=>{
'use strict';
// Legacy compatibility entry point. The review branch uses /ops.html as the
// single staging administration surface so no second Supabase client is
// created here.
if(location.pathname.toLowerCase().endsWith('/admin.html')) location.replace('/ops.html');
})();
