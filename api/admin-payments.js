import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL || 'https://gpebgfjgoeujomrqxhir.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function getUserClient(token) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://gpebgfjgoeujomrqxhir.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZWJnZmpnb2V1am9tcnF4aGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzY0NjYsImV4cCI6MjEwMDA1MjQ2Nn0.Yp4XUjBMkkf36tjs2ahQFxaJJZ8Y0d0E9bzgLSRE-DQ';
  return createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
}

async function authorize(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: 'Unauthorized', status: 401 };
  const adminClient = getAdminClient();
  const userClient = getUserClient(token);
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return { error: 'Unauthorized', status: 401 };
  const { data: adminRow, error: adminError } = await userClient
    .from('admin_users').select('role').eq('user_id', userData.user.id).maybeSingle();
  if (adminError || !adminRow) return { error: 'Forbidden', status: 403 };
  return { client: adminClient };
}

export default async function handler(req, res) {
  const auth = await authorize(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const client = auth.client;

  if (req.method === 'GET') {
    const { data: payments, error } = await client
      .from('payments')
      .select('id,user_id,email,txnid,payu_mihpayid,amount,status,created_at')
      .order('created_at', { ascending: false }).limit(200);
    if (error) return res.status(500).json({ error: error.message });
    const ids = [...new Set((payments || []).map((row) => row.user_id).filter(Boolean))];
    const { data: profileRows } = ids.length
      ? await client.from('profiles').select('id,is_verified,verified_until,subscription_plan').in('id', ids)
      : { data: [] };
    const profiles = Object.fromEntries((profileRows || []).map((profile) => [profile.id, profile]));
    return res.status(200).json({ payments: payments || [], profiles });
  }

  if (req.method === 'POST') {
    const userId = String(req.body?.user_id || '').trim();
    if (!userId) return res.status(400).json({ error: 'user_id is required' });
    const started = new Date();
    const expires = new Date(started);
    expires.setMonth(expires.getMonth() + 1);
    const { error } = await client.from('profiles').update({
      is_verified: true,
      verified_until: expires.toISOString(),
      subscription_started_at: started.toISOString(),
      subscription_plan: 'monthly',
    }).eq('id', userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, profile: { id: userId, is_verified: true, verified_until: expires.toISOString(), subscription_plan: 'monthly' } });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
