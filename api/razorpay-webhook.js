import crypto from 'crypto';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
  if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).json({ error: 'Invalid signature' });
  const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const payment = event.payload?.payment?.entity;
    const userId = payment?.notes?.user_id || event.payload?.order?.entity?.notes?.user_id;
    const plan = payment?.notes?.plan || event.payload?.order?.entity?.notes?.plan || 'monthly';
    if (userId) {
      const until = new Date();
      until.setMonth(until.getMonth() + (plan === 'yearly' ? 12 : 1));
      await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, { method: 'PATCH', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ is_verified: true, verified_until: until.toISOString() }) });
    }
  }
  return res.status(200).json({ received: true });
}
