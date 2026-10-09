import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function PayUCheckoutButton({ plan = 'monthly', className = '' }) {
  const [loading, setLoading] = useState(false);
  async function checkout() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in before payment.');
      const amount = plan === 'yearly' ? 499 : 49;
      const response = await fetch('/api/payu-initiate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan, amount, productinfo: `Auragram Premium ${plan}`, firstname: session.user.user_metadata?.full_name || 'Auragram User', email: session.user.email, phone: session.user.user_metadata?.phone || '' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to start payment.');
      const form = document.createElement('form'); form.method = 'POST'; form.action = result.action; form.style.display = 'none';
      Object.entries(result.params).forEach(([name, value]) => { const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = String(value ?? ''); form.appendChild(input); });
      document.body.appendChild(form); form.submit();
    } catch (error) { window.alert(error.message); setLoading(false); }
  }
  return <button type="button" onClick={checkout} disabled={loading} className={className}>{loading && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}Pay with PayU</button>;
}
