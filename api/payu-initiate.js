import crypto from 'node:crypto';
import { requireUser } from './_auth.js';

const PAYU_URL = 'https://secure.payu.in/_payment';

function sha512(value) {
  return crypto.createHash('sha512').update(value, 'utf8').digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT;
  if (!key || !salt) return res.status(500).json({ error: 'PayU is not configured' });

  const { amount, productinfo, firstname, email, phone, plan } = req.body || {};
  const amountNumber = Number(amount);
  const allowedPlans = { monthly: 49, yearly: 499 };
  const safeAmount = allowedPlans[plan] || amountNumber;
  if (![49, 499].includes(safeAmount) || !productinfo || !email || !firstname) return res.status(400).json({ error: 'Invalid payment details' });

  const txnid = `AURA${Date.now()}${crypto.randomBytes(4).toString('hex')}`;
  const cleanAmount = safeAmount.toFixed(2);
  const udf1 = user.id;
  // Hosted checkout hash: key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT
  const hash = sha512([key, txnid, cleanAmount, productinfo, firstname, email, udf1, '', '', '', '', '', salt].join('|'));
  const origin = process.env.APP_URL || `https://${req.headers.host}`;
  return res.status(200).json({ action: PAYU_URL, params: { key, txnid, amount: cleanAmount, productinfo, firstname, email, phone: phone || '', udf1, hash, surl: `${origin}/api/payu-callback`, furl: `${origin}/api/payu-callback` } });
}
