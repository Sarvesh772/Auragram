import { useState } from 'react';
import { Calendar, CheckCircle2, AlertCircle, UserX, Loader2 } from 'lucide-react';

export default function AdminDeletions({ data, onAction }) {
  const [loading, setLoading] = useState({});

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
    cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  };

  const stats = {
    total: data.length,
    pending: data.filter(d => (d.status || 'pending') === 'pending').length,
    approved: data.filter(d => d.status === 'approved').length,
    rejected: data.filter(d => d.status === 'rejected').length
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-slate-900 dark:text-white">{stats.total}</span> total
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{stats.pending} pending</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{stats.approved} approved</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{stats.rejected} rejected</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {data.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No deletion requests</p>
          </div>
        ) : (
          data.map((request) => (
            <div key={request.user_id} className="border-b border-slate-100 dark:border-slate-800 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[request.status] || statusColors.pending}`}>
                      {request.status || 'Pending'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(request.requested_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {request.scheduled_for && (
                      <span className="text-xs text-slate-400">
                        Scheduled: {new Date(request.scheduled_for).toLocaleDateString()}
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
                
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-shrink-0">
                  {(!request.status || request.status === 'pending') && (
                    <>
                      <button
                        onClick={() => onAction(request, 'approved')}
                        disabled={loading[request.user_id]}
                        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50 transition disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onAction(request, 'rejected')}
                        disabled={loading[request.user_id]}
                        className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50 transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
