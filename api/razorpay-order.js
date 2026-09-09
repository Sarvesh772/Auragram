export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { plan = 'monthly', userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const amount = plan === 'yearly' ? 49900 : 4900;
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: 'INR', receipt: `auragram_${userId.slice(0, 8)}_${Date.now()}`, notes: { user_id: userId, plan } }) });
    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) { return res.status(500).json({ error: error.message }); }
}
