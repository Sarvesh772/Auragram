import { useEffect, useState } from 'react';
import { MessageSquare, AlertCircle, Lightbulb, Bug, Calendar, Filter } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AdminFeedback() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadFeedback();
  }, []);

  async function loadFeedback() {
    setLoading(true);
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setItems(data || []);
    setLoading(false);
  }

  const getTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'bug': return Bug;
      case 'feature': return Lightbulb;
      case 'suggestion': return MessageSquare;
      default: return MessageSquare;
    }
  };

  const getTypeColor = (type) => {
    switch(type?.toLowerCase()) {
      case 'bug': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case 'feature': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'suggestion': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.type?.toLowerCase() === filter);

  const stats = {
    total: items.length,
    bug: items.filter(i => i.type?.toLowerCase() === 'bug').length,
    feature: items.filter(i => i.type?.toLowerCase() === 'feature').length,
    suggestion: items.filter(i => i.type?.toLowerCase() === 'suggestion').length
  };

  return (
    <div>
      {/* Header with Stats */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Total: <span className="text-slate-900 dark:text-white">{stats.total}</span>
              </p>
            </div>
            {stats.bug > 0 && (
              <div>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  🐛 Bugs: {stats.bug}
                </p>
              </div>
            )}
            {stats.feature > 0 && (
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  💡 Features: {stats.feature}
                </p>
              </div>
            )}
            {stats.suggestion > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  💬 Suggestions: {stats.suggestion}
                </p>
              </div>
            )}
          </div>
          <button 
            onClick={loadFeedback}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter('bug')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            filter === 'bug'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          🐛 Bug ({stats.bug})
        </button>
        <button
          onClick={() => setFilter('feature')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            filter === 'feature'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          💡 Feature ({stats.feature})
        </button>
        <button
          onClick={() => setFilter('suggestion')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            filter === 'suggestion'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          💬 Suggestion ({stats.suggestion})
        </button>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center mb-3">
            <MessageSquare className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">No feedback {filter !== 'all' ? `of type "${filter}"` : ''} found</p>
        </div>
      ) : (
        filteredItems.map((item, index) => {
          const Icon = getTypeIcon(item.type);
          return (
            <div 
              key={item.id} 
              className={`p-5 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all ${
                index === filteredItems.length - 1 ? 'border-b-0' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl flex-shrink-0 ${getTypeColor(item.type)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(item.type)}`}>
                      {item.type || 'Suggestion'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {item.message}
                  </p>
                  {item.user_id && (
                    <p className="text-xs text-slate-400 mt-2 font-mono">
                      User ID: {item.user_id.slice(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}