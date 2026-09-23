const INSTAMOJO_BASE_URL = process.env.INSTAMOJO_ENDPOINT || 'https://www.instamojo.com/api/1.1/';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, planType, userId, userEmail, userName } = req.body || {};
  const plan = String(planType).toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
  const expectedAmount = plan === 'yearly' ? 499 : 49;

  if (!userId || !userEmail) return res.status(400).json({ error: 'userId and userEmail are required' });
  if (Number(amount) !== expectedAmount) return res.status(400).json({ error: 'Invalid Blue Tick amount' });
  if (!process.env.INSTAMOJO_API_KEY || !process.env.INSTAMOJO_AUTH_TOKEN || !process.env.INSTAMOJO_SALT) {
    return res.status(500).json({ error: 'Instamojo is not configured on the server' });
  }

  try {
    const redirectUrl = `https://auragram.in/api/pay/verify-instamojo?user_id=${encodeURIComponent(userId)}&plan=${plan}`;
    const response = await fetch(`${INSTAMOJO_BASE_URL}payment-requests/`, {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.INSTAMOJO_API_KEY,
        'X-Auth-Token': process.env.INSTAMOJO_AUTH_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        purpose: `Auragram Blue Tick - ${plan}`,
        amount: String(expectedAmount),
        buyer_name: String(userName || 'Auragram User'),
        email: String(userEmail),
        redirect_url: redirectUrl,
        send_email: 'false',
        allow_repeated_payments: 'false'
      }).toString()
    });

    const data = await response.json();
    if (!response.ok || !data.payment_request?.longurl) {
      return res.status(response.ok ? 502 : response.status).json({ error: data.message || data.error || 'Could not create payment request' });
    }

    return res.status(200).json({ longurl: data.payment_request.longurl });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Instamojo request failed' });
  }
}
