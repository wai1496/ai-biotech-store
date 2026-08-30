// AI BioTech EasyParcel OAuth callback — staging/review scaffold.
// SECURITY: Client secret and token exchange remain server-side environment variables.
// No production shipment writes are performed by this route.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { code, state, error, error_description } = req.query || {};

  if (error) {
    return res.status(400).send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>EasyParcel Authorization</title><body style="font-family:system-ui;padding:32px;max-width:680px;margin:auto"><h1>EasyParcel authorization was not completed</h1><p>${escapeHtml(error_description || error)}</p><p>You can close this page and return to AI BioTech.</p></body>`);
  }

  // Until EASYPARCEL_CLIENT_ID / EASYPARCEL_CLIENT_SECRET and a state store are configured,
  // acknowledge the callback route without exchanging authorization codes.
  // This lets the exact redirect URI be registered safely first.
  if (!code) {
    return res.status(200).json({
      ok: true,
      service: 'easyparcel-oauth-callback',
      environment: process.env.VERCEL_ENV || 'unknown',
      ready_for_registration: true,
      token_exchange_enabled: false,
      message: 'Callback route is deployed. OAuth token exchange will be enabled after server-side credentials and state validation are configured.'
    });
  }

  if (!process.env.EASYPARCEL_CLIENT_ID || !process.env.EASYPARCEL_CLIENT_SECRET) {
    return res.status(503).send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>EasyParcel Authorization</title><body style="font-family:system-ui;padding:32px;max-width:680px;margin:auto"><h1>EasyParcel callback received</h1><p>The callback is working, but server-side EasyParcel credentials have not been configured yet. No authorization code was exchanged or stored.</p><p>You can close this page and return to AI BioTech.</p></body>');
  }

  // Deliberately fail closed until state/PKCE/token persistence is wired and tested in staging.
  return res.status(501).json({
    ok: false,
    code_received: true,
    state_received: Boolean(state),
    message: 'OAuth callback reached successfully. Secure state validation and token exchange are pending staging integration.'
  });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
