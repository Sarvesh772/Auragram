import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function sha512(value) { return crypto.createHash('sha512').update(value, 'utf8').digest('hex'); }
function reverseHash(data, salt) {
  const amount = Number(data.amount);
  const cleanAmount = Number.isFinite(amount) ? amount.toFixed(2) : '';
  const status = String(data.status || '');
  const tail = [data.udf5 || '', data.udf4 || '', data.udf3 || '', data.udf2 || '', data.udf1 || '', data.email || '', data.firstname || '', data.productinfo || '', cleanAmount, data.txnid || '', data.key || ''];
  // PayU uses six separators between status and udf5 (five empty slots).
  const prefix = data.additionalCharges !== undefined && data.additionalCharges !== ''
    ? `${data.additionalCharges}|${salt}|${status}||||||`
    : `${salt}|${status}||||||`;
  return sha512(`${prefix}${tail.join('|')}`);
}
function parseBody(req) {
  if (typeof req.body === 'object' && req.body) return req.body;
  return Object.fromEntries(new URLSearchParams(String(req.body || '')));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const data = parseBody(req);
  const salt = String(process.env.PAYU_MERCHANT_SALT || '').trim();
  const receivedHash = String(data.hash || '').toLowerCase();
  const calculatedHash = salt ? reverseHash(data, salt).toLowerCase() : '';
  console.log('[PayU callback] receivedHash:', receivedHash);
  console.log('[PayU callback] calculatedHash:', calculatedHash);
  const valid = Boolean(salt && receivedHash && receivedHash === calculatedHash);
  let success = valid && String(data.status).toLowerCase() === 'success';
  if (success && (!data.udf1 || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('[PayU callback] cannot activate subscription: missing user id or Supabase service role key');
    success = false;
  }
  if (success) {
    const startedAt = new Date();
    const yearly = Number(data.amount) >= 499;
    const expiresAt = new Date(startedAt);
    expiresAt.setMonth(expiresAt.getMonth() + (yearly ? 12 : 1));
    const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://gpebgfjgoeujomrqxhir.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: profileError } = await supabase.from('profiles').update({ is_verified: true, verified_until: expiresAt.toISOString(), subscription_started_at: startedAt.toISOString(), subscription_plan: yearly ? 'yearly' : 'monthly' }).eq('id', data.udf1);
    if (profileError) { console.error('[PayU callback] profile update failed:', profileError.message); success = false; }
  }
  const destination = success ? '/premium?payment=success' : `/premium?payment=failed&reason=${encodeURIComponent(valid ? (data.error_Message || 'Payment failed') : 'Invalid payment response')}`;
  return res.redirect(303, destination);
}
