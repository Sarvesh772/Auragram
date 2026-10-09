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
  const key = String(process.env.PAYU_MERCHANT_KEY || '').trim();
  const salt = String(process.env.PAYU_MERCHANT_SALT || '').trim();
  if (!key || !salt) return res.status(500).json({ error: 'PayU is not configured' });

  const { amount, productinfo, firstname, email, phone, plan } = req.body || {};
  const amountNumber = Number(amount);
  const allowedPlans = { monthly: 49, yearly: 499 };
  const safeAmount = allowedPlans[plan] || amountNumber;
  const cleanProductInfo = String(productinfo || '').trim();
  const cleanFirstname = String(firstname || '').trim();
  const cleanEmail = String(email || '').trim();
  if (!Number.isFinite(safeAmount) || ![49, 499].includes(safeAmount) || !cleanProductInfo || !cleanEmail || !cleanFirstname) return res.status(400).json({ error: 'Invalid payment details' });

  const txnid = `AURA${Date.now()}${crypto.randomBytes(4).toString('hex')}`;
  const cleanAmount = Number(safeAmount).toFixed(2);
  const udf1 = user.id;
  const udf2 = ''; const udf3 = ''; const udf4 = ''; const udf5 = '';
  // PayU hosted checkout requires this exact sequence. Keep all five UDF
  // slots and the six separators before SALT, even when they are empty.
  const hashInput = [key, txnid, cleanAmount, cleanProductInfo, cleanFirstname, cleanEmail, udf1, udf2, udf3, udf4, udf5, '', '', '', '', '', salt].join('|');
  const hash = sha512(hashInput);
  console.log('[PayU] hash input', `${hashInput.slice(0, hashInput.lastIndexOf('|'))}|[SALT_REDACTED]`, { txnid, amount: cleanAmount });
  const origin = process.env.APP_URL || `https://${req.headers.host}`;
  return res.status(200).json({ action: PAYU_URL, params: { key, txnid, amount: cleanAmount, productinfo: cleanProductInfo, firstname: cleanFirstname, email: cleanEmail, phone: String(phone || '').trim(), udf1, udf2, udf3, udf4, udf5, hash, surl: `${origin}/api/payu-callback`, furl: `${origin}/api/payu-callback` } });
}
