import { useEffect, useState } from 'react';
import { 
  ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, 
  Trash2, XCircle, Users, MessageSquare, FileText, 
  Calendar, Activity, TrendingUp 
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import AdminUsers from './AdminUsers';
import AdminFeedback from './AdminFeedback';

function AdminDashboard({ session }) {
  const [reports, setReports] = useState([]);
  const [deletions, setDeletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('reports');

  useEffect(() => {
    (async () => {
      if (!session?.user?.id) return;
      const { data } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      setIsAdmin(!!data && ['owner', 'admin', 'moderator'].includes(data.role));
    })();
  }, [session?.user?.id]);

  async function load() {
    setLoading(true);
    const [r, d] = await Promise.all([
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('account_deletion_requests').select('*').order('requested_at', { ascending: false })
    ]);
    if (r.error) setMessage(r.error.message);
    setReports(r.data || []);
    setDeletions(d.data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
    else if (session?.user?.id) setLoading(false);
  }, [isAdmin]);

  async function setStatus(id, status) {
    const { error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', id);
    if (error) setMessage(error.message);
    else setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  async function deleteContent(report) {
    if (!report.post_id || !window.confirm('Delete this reported post/reel?')) return;
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', report.post_id);
    if (error) setMessage(error.message);
    else setStatus(report.id, 'resolved');
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto bg-rose-100 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Access Required</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">This area is restricted to authorized personnel only.</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalReports: reports.length,
    openReports: reports.filter(r => r.status === 'open').length,
    resolvedReports: reports.filter(r => r.status === 'resolved').length,
    totalDeletions: deletions.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white">Admin Dashboard</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage reports, users, and content moderation
                </p>
              </div>
            </div>
            <button 
              onClick={load} 
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <TabButton 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')}
            icon={AlertCircle}
            label="Reports"
            count={stats.totalReports}
          />
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')}
            icon={Users}
            label="Users"
          />
          <TabButton 
            active={activeTab === 'feedback'} 
            onClick={() => setActiveTab('feedback')}
            icon={MessageSquare}
            label="Feedback"
          />
          <TabButton 
            active={activeTab === 'deletions'} 
            onClick={() => setActiveTab('deletions')}
            icon={FileText}
            label="Deletions"
            count={stats.totalDeletions}
          />
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            icon={AlertCircle} 
            label="Total Reports" 
            value={stats.totalReports}
            subValue={`${stats.openReports} open`}
            color="rose"
          />
          <StatCard 
            icon={CheckCircle2} 
            label="Resolved" 
            value={stats.resolvedReports}
            color="emerald"
          />
          <StatCard 
            icon={FileText} 
            label="Deletions" 
            value={stats.totalDeletions}
            color="amber"
          />
          <StatCard 
            icon={Activity} 
            label="Active Reports" 
            value={stats.openReports}
            color="blue"
          />
        </div>


        {/* Message */}
        {message && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded-xl p-4 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {message}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {activeTab === 'reports' && (
              <ReportsTab 
                reports={reports} 
                setStatus={setStatus} 
                deleteContent={deleteContent} 
              />
            )}
            {activeTab === 'users' && (
              <AdminUsers />
            )}
            {activeTab === 'feedback' && (
              <AdminFeedback />
            )}
            {activeTab === 'deletions' && (
              <DeletionsTab deletions={deletions} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subValue, color }) {
  const colors = {
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
  };

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-xl ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-800 dark:text-white mt-2">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {subValue && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{subValue}</p>}
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        active
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count !== undefined && (
        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Reports Tab Component
function ReportsTab({ reports, setStatus, deleteContent }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'dismissed': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  if (reports.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center mb-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <p className="text-slate-500 dark:text-slate-400">All clear! No reports to review.</p>
      </div>
    );
  }

  return (
    <div>
      {reports.map((report, index) => (
        <div 
          key={report.id} 
          className={`p-5 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all ${
            index === reports.length - 1 ? 'border-b-0' : ''
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                  {report.status || 'open'}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {report.reason || 'Reported content'}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>Reporter: <span className="font-mono">{report.reporter_id?.slice(0, 8)}...</span></span>
                  <span>User: <span className="font-mono">{report.reported_user_id?.slice(0, 8)}...</span></span>
                  {report.post_id && <span>Post: <span className="font-mono">{report.post_id.slice(0, 8)}...</span></span>}
                </div>
                {report.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.created_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {report.post_id && report.status !== 'resolved' && (
                <button 
                  onClick={() => deleteContent(report)} 
                  className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                  title="Delete content"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {report.status !== 'resolved' && (
                <>
                  <button 
                    onClick={() => setStatus(report.id, 'dismissed')} 
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                    title="Dismiss"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setStatus(report.id, 'resolved')} 
                    className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all"
                    title="Mark resolved"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Deletions Tab Component
function DeletionsTab({ deletions }) {
  if (deletions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center mb-3">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-500 dark:text-slate-400">No deletion requests.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700">
      {deletions.map((d, index) => (
        <div key={d.user_id || index} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-slate-800 dark:text-white">
                {d.user_id}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  d.status === 'completed' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : d.status === 'pending'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {d.status || 'pending'}
                </span>
                {d.scheduled_for && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Scheduled: {new Date(d.scheduled_for).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {d.requested_at && (
              <span className="text-xs text-slate-400">
                Requested: {new Date(d.requested_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Admin({ session }) {
  return <AdminDashboard session={session} />;
}