import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const PHONEPE_PATH = '/pg/v1/pay';
const PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gpebgfjgoeujomrqxhir.supabase.co';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function resolveUser(req, body) {
  const authorization = req.headers.authorization || req.headers.Authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (token && supabaseKey) {
    const supabase = createClient(SUPABASE_URL, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return { error: 'Your session has expired. Please sign in again.' };
    return { user: data.user };
  }

  if (body.userId && body.userEmail) return { user: { id: body.userId, email: body.userEmail } };
  return { error: 'You must be signed in to purchase Blue Tick.' };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const plan = String(body.planType).toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
  const amount = plan === 'yearly' ? 499 : 49;
  const { user, error: authError } = await resolveUser(req, body);

  if (authError) return res.status(401).json({ error: authError });
  if (Number(body.amount) !== amount) return res.status(400).json({ error: 'Invalid Blue Tick amount' });
  if (!process.env.PHONEPE_SALT_KEY || !process.env.PHONEPE_SALT_INDEX) {
    return res.status(500).json({ error: 'PhonePe is not configured on the server' });
  }

  try {
    const merchantTransactionId = `MT_${Date.now()}`;
    const payload = {
      merchantId: process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT',
      merchantTransactionId,
      merchantUserId: `MUID_${user.id}`,
      amount: amount * 100,
      redirectUrl: 'https://www.auragram.in/profile',
      redirectMode: 'POST',
      paymentInstrument: { type: 'PAY_PAGE' }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = crypto.createHash('sha256')
      .update(`${base64Payload}${PHONEPE_PATH}${process.env.PHONEPE_SALT_KEY}`)
      .digest('hex');

    const response = await fetch(`${PHONEPE_HOST_URL}${PHONEPE_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': `${checksum}###${process.env.PHONEPE_SALT_INDEX}`
      },
      body: JSON.stringify({ request: base64Payload })
    });
    const data = await response.json();
    const url = data.data?.instrumentResponse?.redirectInfo?.url;

    if (!response.ok || !data.success || !url) {
      return res.status(response.ok ? 502 : response.status).json({ error: data.message || data.code || 'Could not create PhonePe payment' });
    }

    return res.status(200).json({ success: true, url });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'PhonePe request failed' });
  }
}
