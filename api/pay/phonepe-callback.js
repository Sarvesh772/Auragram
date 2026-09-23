const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gpebgfjgoeujomrqxhir.supabase.co';

function redirectToProfile(res, status) {
  return res.redirect(302, `https://www.auragram.in/profile?payment=${status}`);
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).send('Method not allowed');
  if (!process.env.PHONEPE_CLIENT_ID || !process.env.PHONEPE_CLIENT_SECRET || !process.env.PHONEPE_CLIENT_VERSION) {
    return res.status(500).send('PhonePe is not configured on the server');
  }

  try {
    const { user_id: userId, plan = 'monthly', order_id: orderId } = req.query || {};
    if (!userId || !orderId) return redirectToProfile(res, 'failed');

    const hostUrl = process.env.PHONEPE_HOST_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    const tokenResponse = await fetch(`${hostUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.PHONEPE_CLIENT_ID,
        client_version: process.env.PHONEPE_CLIENT_VERSION,
        client_secret: process.env.PHONEPE_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }).toString()
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) return redirectToProfile(res, 'failed');

    const statusResponse = await fetch(`${hostUrl}/checkout/v2/order/${encodeURIComponent(orderId)}/status`, {
      headers: { Authorization: `O-Bearer ${tokenData.access_token}` }
    });
    const statusData = await statusResponse.json();
    if (!statusResponse.ok || statusData.state !== 'COMPLETED') return redirectToProfile(res, 'failed');

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return res.status(500).send('Supabase server configuration is missing');

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + (String(plan).toLowerCase() === 'yearly' ? 12 : 1));
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
