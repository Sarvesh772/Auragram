import { requireUser } from '../_auth.js';
import crypto from 'node:crypto';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const { planType } = req.body || {};
    const userId = user.id;
    const plan = planType === 'yearly' ? 'yearly' : planType === 'monthly' ? 'monthly' : null;
    if (!plan) return res.status(400).json({ error: 'Invalid subscription plan' });
    const amount = plan === 'yearly' ? 499 : 49;
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    const clientVersion = process.env.PHONEPE_CLIENT_VERSION;
    const hostUrl = process.env.PHONEPE_HOST_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    if (!clientId || !clientSecret || !clientVersion) {
      return res.status(500).json({ success: false, error: 'PhonePe credentials are not configured' });
    }

    const tokenResponse = await fetch(`${hostUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_version: clientVersion,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      }).toString()
    });
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!tokenResponse.ok || !accessToken) {
      return res.status(tokenResponse.status || 502).json({
        success: false,
        message: tokenData.message || tokenData.code || 'PhonePe authorization failed',
        details: tokenData
      });
    }

    const merchantOrderId = `MT${Date.now()}`;
    const callbackUrl = new URL('https://www.auragram.in/api/pay/phonepe-callback');
    callbackUrl.searchParams.set('user_id', userId || '');
    callbackUrl.searchParams.set('plan', plan);
    callbackUrl.searchParams.set('order_id', merchantOrderId);
    callbackUrl.searchParams.set('sig', crypto.createHmac('sha256', clientSecret).update(`${userId}|${plan}|${merchantOrderId}`).digest('hex'));

    const paymentResponse = await fetch(`${hostUrl}/checkout/v2/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `O-Bearer ${accessToken}`
      },
      body: JSON.stringify({
        merchantOrderId,
        amount: (amount || 49) * 100,
        expireAfter: 1200,
        paymentFlow: {
          type: 'PG_CHECKOUT',
          merchantUrls: { redirectUrl: callbackUrl.toString() }
        },
        metaInfo: {
          udf1: `MUID${userId || '12345'}`,
          udf2: 'blue_tick'
        }
      })
    });
    const data = await paymentResponse.json();
    const url = data.redirectUrl || data.data?.redirectUrl;
    if (paymentResponse.ok && url) {
      return res.status(200).json({ success: true, url });
    }

    return res.status(400).json({
      success: false,
      message: data.message || data.code || 'Could not create PhonePe payment',
      details: data
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
