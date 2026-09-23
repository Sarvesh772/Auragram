const INSTAMOJO_BASE_URL = process.env.INSTAMOJO_ENDPOINT || 'https://www.instamojo.com/api/1.1/';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gpebgfjgoeujomrqxhir.supabase.co';

function redirectToProfile(res, status) {
  return res.redirect(302, `https://auragram.in/profile?payment=${status}`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  const {
    payment_id: paymentId,
    payment_status: paymentStatus,
    payment_request_id: paymentRequestId,
    user_id: userId,
    plan
  } = req.query || {};

  if (!paymentId || !paymentRequestId || !userId || !plan) return redirectToProfile(res, 'failed');
  if (!process.env.INSTAMOJO_API_KEY || !process.env.INSTAMOJO_AUTH_TOKEN || !process.env.INSTAMOJO_SALT) {
    return res.status(500).send('Instamojo is not configured on the server');
  }

  try {
    const response = await fetch(`${INSTAMOJO_BASE_URL}payment-requests/${encodeURIComponent(paymentRequestId)}/${encodeURIComponent(paymentId)}/`, {
      headers: {
        'X-Api-Key': process.env.INSTAMOJO_API_KEY,
        'X-Auth-Token': process.env.INSTAMOJO_AUTH_TOKEN,
        Accept: 'application/json'
      }
    });
    const data = await response.json();
    const verifiedStatus = data.payment_request?.payment?.payment_status || data.payment?.payment_status;
    const redirectUrl = data.payment_request?.redirect_url;
    const redirectParams = redirectUrl ? new URL(redirectUrl).searchParams : null;

    if (!response.ok || verifiedStatus !== 'Completed' || redirectParams?.get('user_id') !== userId || redirectParams?.get('plan') !== plan) {
      return redirectToProfile(res, 'failed');
    }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + (String(plan).toLowerCase() === 'yearly' ? 12 : 1));
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return res.status(500).send('Supabase server configuration is missing');

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
