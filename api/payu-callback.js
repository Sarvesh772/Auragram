import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function sha512(value) { return crypto.createHash('sha512').update(value, 'utf8').digest('hex'); }
function reverseHash(data, salt) {
  const sequence = [salt, data.status || '', '', '', '', '', '', '', '', '', '', data.udf5 || '', data.udf4 || '', data.udf3 || '', data.udf2 || '', data.udf1 || '', data.email || '', data.firstname || '', data.productinfo || '', data.amount || '', data.txnid || '', data.key || ''];
  return sha512(sequence.join('|'));
}
function parseBody(req) {
  if (typeof req.body === 'object' && req.body) return req.body;
  return Object.fromEntries(new URLSearchParams(String(req.body || '')));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const data = parseBody(req);
  const salt = process.env.PAYU_MERCHANT_SALT;
  const valid = Boolean(salt && data.hash && data.hash === reverseHash(data, salt));
  const success = valid && String(data.status).toLowerCase() === 'success';
  if (success && data.udf1 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const startedAt = new Date();
    const yearly = Number(data.amount) >= 499;
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + (yearly ? 12 : 1));
    const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://gpebgfjgoeujomrqxhir.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    await supabase.from('profiles').update({ is_verified: true, verified_until: expiresAt.toISOString(), subscription_started_at: startedAt.toISOString(), subscription_plan: yearly ? 'yearly' : 'monthly' }).eq('id', data.udf1);
  }
  const destination = success ? '/premium?payment=success' : `/premium?payment=failed&reason=${encodeURIComponent(valid ? (data.error_Message || 'Payment failed') : 'Invalid payment response')}`;
  return res.redirect(303, destination);
}
