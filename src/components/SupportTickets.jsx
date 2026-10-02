import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Send, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

const statusStyles = { open: 'bg-amber-100 text-amber-700', in_progress: 'bg-blue-100 text-blue-700', resolved: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-100 text-slate-600' };

export default function SupportTickets({ session, onClose }) {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase.from('support_tickets').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setTickets(data || []);
    setLoading(false);
  }
  useEffect(() => { loadTickets(); }, [session.user.id]);

  async function openTicket(ticket) {
    setSelected(ticket);
    const { data } = await supabase.from('support_ticket_messages').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
    setThread(data || []);
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    const { data, error } = await supabase.from('support_ticket_messages').insert([{ ticket_id: selected.id, sender_id: session.user.id, sender_role: 'user', message: reply.trim() }]).select().single();
    if (!error && data) { setThread((items) => [...items, data]); setReply(''); await supabase.from('support_tickets').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', selected.id); }
  }

  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800"><div className="flex items-center gap-3">{selected && <button onClick={() => setSelected(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></button>}<div><h2 className="text-lg font-black text-slate-800 dark:text-white">{selected ? 'Ticket conversation' : 'My Support Tickets'}</h2><p className="text-xs text-slate-400">{selected ? selected.subject : 'Track your support requests'}</p></div></div><button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      {!selected ? <div className="flex-1 overflow-y-auto p-4">{loading ? <p className="py-10 text-center text-sm text-slate-400">Loading tickets...</p> : tickets.length === 0 ? <div className="py-12 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-2 text-sm text-slate-400">No support tickets yet.</p></div> : <div className="space-y-2">{tickets.map((ticket) => <button key={ticket.id} onClick={() => openTicket(ticket)} className="w-full rounded-2xl border border-slate-100 p-4 text-left hover:border-purple-200 hover:bg-purple-50/40 dark:border-slate-800 dark:hover:bg-slate-800"><div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusStyles[ticket.status] || statusStyles.open}`}>{ticket.status?.replace('_', ' ') || 'open'}</span>{ticket.tier === 'premium' && <span className="rounded-full bg-purple-600 px-2 py-1 text-[9px] font-black text-white">PRIORITY</span>}</div><p className="mt-2 text-sm font-bold text-slate-800 dark:text-white">{ticket.subject}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{ticket.description || ticket.message}</p><p className="mt-2 text-[10px] text-slate-400">{new Date(ticket.created_at).toLocaleString()}</p></button>)}</div>}</div> : <><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-950/30">{thread.map((item) => <div key={item.id} className={`flex ${item.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${item.sender_role === 'user' ? 'bg-purple-600 text-white' : 'bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'}`}><p>{item.message}</p><span className="mt-1 block text-[9px] opacity-60">{item.sender_role === 'admin' ? 'Support team' : 'You'} · {new Date(item.created_at).toLocaleString()}</span></div></div>)}</div><form onSubmit={sendReply} className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800"><input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a follow-up..." className="min-w-0 flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-800 dark:text-white" /><button className="rounded-full bg-purple-600 p-3 text-white disabled:opacity-50" disabled={!reply.trim()}><Send className="h-4 w-4" /></button></form></>}
    </div>
  </div>;
}
