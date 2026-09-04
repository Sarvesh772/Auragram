import { useState } from 'react';
import { MessageSquare, Lightbulb, Bug, Calendar, Filter, ThumbsUp, Star } from 'lucide-react';

export default function AdminFeedback({ session, data }) {
  const [filter, setFilter] = useState('all');

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
    ? data 
    : data.filter(item => item.type?.toLowerCase() === filter);

  const stats = {
    total: data.length,
    bug: data.filter(i => i.type?.toLowerCase() === 'bug').length,
    feature: data.filter(i => i.type?.toLowerCase() === 'feature').length,
    suggestion: data.filter(i => i.type?.toLowerCase() === 'suggestion').length
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-slate-900 dark:text-white">{stats.total}</span> total
            </p>
          </div>
          {stats.bug > 0 && (
            <div className="flex items-center gap-1">
              <Bug className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" />
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{stats.bug} bugs</p>
            </div>
          )}
          {stats.feature > 0 && (
            <div className="flex items-center gap-1">
              <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{stats.feature} features</p>
            </div>
          )}
          {stats.suggestion > 0 && (
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{stats.suggestion} suggestions</p>
            </div>
          )}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 flex gap-1.5 flex-wrap">
        <FilterButton 
          active={filter === 'all'} 
          onClick={() => setFilter('all')}
          label="All"
          count={stats.total}
          color="purple"
        />
        <FilterButton 
          active={filter === 'bug'} 
          onClick={() => setFilter('bug')}
          label="🐛 Bug"
          count={stats.bug}
          color="rose"
        />
        <FilterButton 
          active={filter === 'feature'} 
          onClick={() => setFilter('feature')}
          label="💡 Feature"
          count={stats.feature}
          color="blue"
        />
        <FilterButton 
          active={filter === 'suggestion'} 
          onClick={() => setFilter('suggestion')}
          label="👍 Suggestion"
          count={stats.suggestion}
          color="amber"
        />
      </div>

      {/* Feedback List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center mb-3">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
          </div>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">No feedback found</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {filter !== 'all' ? `No ${filter} feedback available` : 'Be the first to receive feedback'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filteredItems.map((item, index) => {
            const Icon = getTypeIcon(item.type);
            return (
              <div 
                key={item.id} 
                className={`p-3 sm:p-4 md:p-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all ${
                  index === filteredItems.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl flex-shrink-0 ${getTypeColor(item.type)}`}>
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-semibold ${getTypeColor(item.type)}`}>
                        {item.type || 'Suggestion'}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      {item.user_id && (
                        <span className="text-[10px] sm:text-xs text-slate-400">
                          ID: {item.user_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                      {item.message || item.content || 'No content provided'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Filter Button Component
function FilterButton({ active, onClick, label, count, color }) {
  const colors = {
    purple: active ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600',
    rose: active ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600',
    blue: active ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600',
    amber: active ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
  };

  return (
    <button
      onClick={onClick}
      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all whitespace-nowrap ${colors[color]}`}
    >
      {label}
      {count > 0 && (
        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] ${
          active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}