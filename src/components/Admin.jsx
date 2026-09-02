import { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Admin({ session }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  async function loadReports() {
    setLoading(true);
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (error) setMessage(error.message); else setReports(data || []);
    setLoading(false);
  }

  useEffect(() => { (async () => { if (!session?.user?.id) return setLoading(false); const { data } = await supabase.from('admin_users').select('role').eq('user_id', session.user.id).maybeSingle(); setIsAdmin(!!data && ['owner', 'admin', 'moderator'].includes(data.role)); })(); }, [session?.user?.id]);
  useEffect(() => { if (isAdmin) loadReports(); else if (session?.user?.id) setLoading(false); }, [isAdmin]);

  async function resolveReport(id) {
    const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
    if (error) setMessage(error.message); else setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
  }

  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center p-6"><div className="text-center"><AlertCircle className="mx-auto text-rose-500 mb-3" /><h1 className="text-xl font-bold">Admin access required</h1><p className="text-sm text-slate-500 mt-1">This area is restricted.</p></div></div>;

  return <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
    <div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><ShieldCheck className="text-purple-600" /><h1 className="text-2xl font-black">Admin moderation</h1></div><p className="text-sm text-slate-500 mt-1">Review reports and keep Auragram safe.</p></div><button onClick={loadReports} className="p-2 rounded-full bg-purple-100 text-purple-600"><RefreshCw className="w-4 h-4" /></button></div>
    {message && <p className="rounded-xl bg-rose-50 text-rose-600 p-3 text-sm">{message}</p>}
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {loading ? <p className="p-8 text-center text-slate-500">Loading reports...</p> : reports.length === 0 ? <p className="p-8 text-center text-slate-500">No reports found.</p> : reports.map(report => <div key={report.id} className="p-4 border-b last:border-b-0 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4"><div><p className="font-bold text-sm">{report.reason || 'Reported content'}</p><p className="text-xs text-slate-500 mt-1">Reported user: {report.reported_user_id || '—'} · {report.status || 'open'}</p></div>{report.status !== 'resolved' && <button onClick={() => resolveReport(report.id)} className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4" />Resolve</button>}</div>)}
    </div>
  </div>;
}
