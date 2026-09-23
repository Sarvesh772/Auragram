import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gpebgfjgoeujomrqxhir.supabase.co';

function redirectToProfile(res, status) {
  return res.redirect(302, `https://www.auragram.in/profile?payment=${status}`);
}

function getCallbackPayload(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body || {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  if (!process.env.PHONEPE_SALT_KEY || !process.env.PHONEPE_SALT_INDEX) return res.status(500).send('PhonePe is not configured on the server');

  try {
    const body = getCallbackPayload(req);
    const base64Response = body.response || body.base64Response || body.data?.response;
    const receivedChecksum = req.headers['x-verify'] || req.headers['X-VERIFY'] || body.xVerify;
    if (!base64Response || !receivedChecksum) return redirectToProfile(res, 'failed');

    const expectedChecksum = `${crypto.createHash('sha256').update(`${base64Response}${process.env.PHONEPE_SALT_KEY}`).digest('hex')}###${process.env.PHONEPE_SALT_INDEX}`;
    if (receivedChecksum !== expectedChecksum) return redirectToProfile(res, 'failed');

    const decoded = JSON.parse(Buffer.from(base64Response, 'base64').toString('utf8'));
    const paymentData = decoded.data || {};
    const status = decoded.code || decoded.responseCode || decoded.data?.responseCode;
    const isSuccess = status === 'SUCCESS' || paymentData.state === 'COMPLETED';
    const merchantUserId = paymentData.merchantUserId || decoded.merchantUserId || '';
    const userId = String(merchantUserId).replace(/^MUID_/, '');

    if (!isSuccess || !userId) return redirectToProfile(res, 'failed');

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return res.status(500).send('Supabase server configuration is missing');

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ is_verified: true, verified_until: expiry.toISOString() })
    });

    return updateResponse.ok ? redirectToProfile(res, 'success') : redirectToProfile(res, 'failed');
  } catch {
    return redirectToProfile(res, 'failed');
  }
}
