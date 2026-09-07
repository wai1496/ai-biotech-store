const { requireSandboxConfig } = require('../lib/toyyibpay');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const cfg = requireSandboxConfig();
    const origin = `https://${String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()}`;
    const ref = `DIAG${Date.now()}`.slice(0, 30);
    const form = new URLSearchParams({
      userSecretKey: cfg.secret,
      categoryCode: cfg.category,
      billName: 'AI BioTech Test',
      billDescription: 'AI BioTech sandbox test',
      billPriceSetting: '1',
      billPayorInfo: '1',
      billAmount: '100',
      billReturnUrl: `${origin}/payment-return.html`,
      billCallbackUrl: `${origin}/api/toyyibpay-callback`,
      billExternalReferenceNo: ref,
      billTo: 'AI BioTech Customer',
      billEmail: 'aibiotechs@gmail.com',
      billPhone: '0123456789',
      billSplitPayment: '0',
      billSplitPaymentArgs: '',
      billPaymentChannel: '0',
      billContentEmail: 'AI BioTech sandbox payment test',
      billChargeToCustomer: '',
      billExpiryDays: '1'
    });

    const upstream = await fetch('https://dev.toyyibpay.com/index.php/api/createBill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const text = await upstream.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }

    return res.status(200).json({
      ok: upstream.ok,
      status: upstream.status,
      mode: cfg.mode,
      host: 'dev.toyyibpay.com',
      result: body
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Diagnostic failed',
      code: error.code || 'DIAGNOSTIC_FAILED'
    });
  }
};
