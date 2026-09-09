/* Public deployment diagnostics are deliberately disabled: no provider calls. */
module.exports=async function handler(req,res){return res.status(410).json({error:'Provider diagnostics are disabled on this integration.',code:'DIAGNOSTICS_DISABLED'});};
