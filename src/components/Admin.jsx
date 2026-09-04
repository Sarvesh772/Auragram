import { useEffect, useMemo, useState } from 'react';
import { 
  ShieldCheck, RefreshCw, AlertCircle, CheckCircle2, Users, 
  MessageSquare, FileText, Search, XCircle, UserX, UserCheck,
  Eye, Clock, Calendar, Filter, Trash2, Ban, UserPlus, 
  MoreVertical, ChevronDown, Download, Mail, Phone
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import AdminUsers from './AdminUsers';
import AdminFeedback from './AdminFeedback';

const TABS = [
  ['reports', 'Reports', AlertCircle],
  ['users', 'Users', Users],
  ['feedback', 'Feedback', MessageSquare],
  ['deletions', 'Deletions', Trash2]
/*
  ['reports', 'Reports', '📋'],
  ['users', 'Users', '👥'],
  ['feedback', 'Feedback', '💬'],
  ['deletions', 'Deletions', '🗑️']
*/];

const Card = ({ label, value, sub, Icon, tone = 'purple' }) => {
  const colorMap = {
    rose: 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
    green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
  };
  
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${colorMap[tone] || colorMap.purple}`}>
        <Icon className="h-5 w-5" />
      </div>
      <b className="mt-4 block text-3xl">{value}</b>
      <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
};

// Report Item Component
function ReportItem({ report, onAction }) {
  
  const statusColors = {
    open: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    dismissed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  };

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 border-l-4 border-l-purple-500 p-5 hover:bg-purple-50/30 dark:hover:bg-slate-800/30 transition">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[report.status] || statusColors.open}`}>
              {report.status || 'Open'}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(report.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            {report.reason && (
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {String(report.reason).startsWith('Other:') ? 'Other' : report.reason}
              </span>
            )}
          </div>
          
            <p className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-100">
            {report.description || report.content || (String(report.reason || '').startsWith('Other:') ? String(report.reason).replace(/^Other:\s*/, '') : 'No description provided')}
          </p>
          
          {report.reported_user_id && (
            <p className="mt-1 text-xs text-slate-400">
              Reported User ID: <span className="font-mono">{report.reported_user_id}</span>
            </p>
          )}
          
          {report.post_id && (
            <p className="text-xs text-slate-400">
              Post ID: <span className="font-mono">{report.post_id}</span>
            </p>
          )}
          
          {report.reporter_id && (
            <p className="text-xs text-slate-400">
              Reporter ID: <span className="font-mono">{report.reporter_id}</span>
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {(!report.status || report.status === 'open' || report.status === 'pending') && (
            <>
              <button
                onClick={() => onAction(report, 'resolved')}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50 transition"
              >
                Resolve
              </button>
              <button
                onClick={() => onAction(report, 'dismissed')}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Deletion Request Component
function DeletionItem({ request, onAction }) {
  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
    cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  };

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[request.status] || statusColors.pending}`}>
              {request.status || 'Pending'}
            </span>
            <span className="text-xs text-slate-400">
              Requested {new Date(request.requested_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            {request.scheduled_for && (
              <span className="text-xs text-slate-400">
                Scheduled for: {new Date(request.scheduled_for).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            User ID: <span className="font-mono">{request.user_id}</span>
          </p>
          {request.reason && (
            <p className="text-xs text-slate-400 mt-1">Reason: {request.reason}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {(!request.status || request.status === 'pending') && (
            <>
              <button
                onClick={() => onAction(request, 'approved')}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50 transition"
              >
                Approve
              </button>
              <button
                onClick={() => onAction(request, 'rejected')}
                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50 transition"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Admin({ session }) {
  const [tab, setTab] = useState('reports');
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    reports: [],
    users: [],
    feedback: [],
    deletions: []
  });
  const [query, setQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [showUserModal, setShowUserModal] = useState(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user?.id) return;
      const { data: d } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      setAdmin(!!d);
      if (!d) setLoading(false);
    };
    checkAdmin();
  }, [session?.user?.id]);

  // Load data when admin access is confirmed
  useEffect(() => {
    if (admin) loadData();
  }, [admin]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    const [reportsRes, usersRes, feedbackRes, deletionsRes] = await Promise.all([
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,username,full_name,avatar_url,account_status,created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('account_deletion_requests').select('*').order('requested_at', { ascending: false })
    ]);

    const bad = [reportsRes, usersRes, feedbackRes, deletionsRes].find(x => x.error);
    if (bad) setError(bad.error.message);

    setData({
      reports: reportsRes.data || [],
      users: usersRes.data || [],
      feedback: feedbackRes.data || [],
      deletions: deletionsRes.data || []
    });
    setLoading(false);
  };

  // Stats
  const stats = useMemo(() => ({
    pendingReports: data.reports.filter(x => !x.status || ['open', 'pending'].includes(x.status)).length,
    resolvedReports: data.reports.filter(x => x.status === 'resolved').length,
    activeUsers: data.users.filter(x => x.account_status !== 'suspended').length,
    suspendedUsers: data.users.filter(x => x.account_status === 'suspended').length,
    pendingDeletions: data.deletions.filter(x => (x.status || 'pending') === 'pending').length,
    totalReports: data.reports.length,
    totalUsers: data.users.length,
    totalFeedback: data.feedback.length,
    totalDeletions: data.deletions.length
  }), [data]);

  // Actions
  const handleReportAction = async (report, status) => {
    setActionLoading(prev => ({ ...prev, [report.id]: true }));
    const { error: e } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', report.id);
    
    if (e) setError(e.message);
    else {
      setData(prev => ({
        ...prev,
        reports: prev.reports.map(v => v.id === report.id ? { ...v, status } : v)
      }));
    }
    setActionLoading(prev => ({ ...prev, [report.id]: false }));
  };

  const handleDeletionAction = async (request, status) => {
    if (status === 'approved' && !window.confirm('Approve this account deletion request?')) return;
    
    setActionLoading(prev => ({ ...prev, [request.user_id]: true }));
    const { error: e } = await supabase
      .from('account_deletion_requests')
      .update({ status })
      .eq('user_id', request.user_id);
    
    if (e) setError(e.message);
    else {
      setData(prev => ({
        ...prev,
        deletions: prev.deletions.map(v => v.user_id === request.user_id ? { ...v, status } : v)
      }));
    }
    setActionLoading(prev => ({ ...prev, [request.user_id]: false }));
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.account_status === 'suspended' ? 'active' : 'suspended';
    setActionLoading(prev => ({ ...prev, [user.id]: true }));
    
    const { error: e } = await supabase
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', user.id);
    
    if (e) setError(e.message);
    else {
      setData(prev => ({
        ...prev,
        users: prev.users.map(v => v.id === user.id ? { ...v, account_status: newStatus } : v)
      }));
    }
    setActionLoading(prev => ({ ...prev, [user.id]: false }));
  };

  const getTabContent = () => {
    switch(tab) {
      case 'reports':
        return (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.reports.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No reports found</p>
              </div>
            ) : (
              data.reports.map(report => (
                <ReportItem 
                  key={report.id} 
                  report={report} 
                  onAction={handleReportAction}
                />
              ))
            )}
          </div>
        );

      case 'users':
        return <AdminUsers session={session} data={data.users} onToggleStatus={handleToggleUserStatus} />;

      case 'feedback':
        return <AdminFeedback session={session} data={data.feedback} />;

      case 'deletions':
        return (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.deletions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No deletion requests</p>
              </div>
            ) : (
              data.deletions.map(request => (
                <DeletionItem 
                  key={request.user_id} 
                  request={request} 
                  onAction={handleDeletionAction}
                />
              ))
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // If not admin, show access denied
  if (!admin && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 mx-auto bg-rose-100 dark:bg-rose-950/30 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Admin Access Required</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You don't have permission to access the admin panel. Please contact support if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Cards configuration
  const getCards = () => {
    switch(tab) {
      case 'reports':
        return [
          ['Total Reports', stats.totalReports, 'All submissions', AlertCircle, 'purple'],
          ['Pending', stats.pendingReports, 'Needs review', AlertCircle, 'amber'],
          ['Resolved', stats.resolvedReports, 'Reports closed', CheckCircle2, 'green'],
          ['Active Reports', stats.pendingReports, 'Open cases', AlertCircle, 'blue']
        ];
      case 'users':
        return [
          ['Total Users', stats.totalUsers, 'All accounts', Users, 'purple'],
          ['Active', stats.activeUsers, 'Currently active', UserCheck, 'green'],
          ['Suspended', stats.suspendedUsers, 'Restricted accounts', UserX, 'rose']
        ];
      case 'feedback':
        return [
          ['Total Feedback', stats.totalFeedback, 'All submissions', MessageSquare, 'purple']
        ];
      case 'deletions':
        return [
          ['Total Deletions', stats.totalDeletions, 'All requests', FileText, 'purple'],
          ['Pending', stats.pendingDeletions, 'Needs review', AlertCircle, 'amber'],
          ['Completed', stats.totalDeletions - stats.pendingDeletions, 'Processed requests', CheckCircle2, 'green']
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-500 p-3.5 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white">Admin Dashboard</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage reports, users, feedback and safety</p>
            </div>
          </div>
          <button 
            onClick={loadData} 
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-purple-100 px-4 py-2.5 text-sm font-bold text-purple-600 hover:bg-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:hover:bg-purple-950/50 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </header>

        {/* Tabs */}
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold whitespace-nowrap transition ${
                tab === id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {getCards().map(([label, value, sub, Icon, tone]) => (
            <Card key={label} label={label} value={value} sub={sub} Icon={Icon} tone={tone} />
          ))}
        </div>

        {/* Main Content */}
        <main className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
                <p className="mt-3 text-sm text-slate-400">Loading dashboard...</p>
              </div>
            </div>
          ) : (
            getTabContent()
          )}
        </main>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-2">
          Auragram Admin Panel v1.0 • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
