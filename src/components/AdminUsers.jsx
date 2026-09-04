import { useState } from 'react';
import { Search, UserX, UserCheck, UserPlus, Filter, Users as UsersIcon, Loader2 } from 'lucide-react';

export default function AdminUsers({ session, data, onToggleStatus }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const filteredUsers = data.filter(u => {
    const searchMatch = `${u.full_name || ''} ${u.username || ''}`
      .toLowerCase()
      .includes(query.toLowerCase());
    
    if (filter === 'suspended') return searchMatch && u.account_status === 'suspended';
    if (filter === 'active') return searchMatch && u.account_status !== 'suspended';
    return searchMatch;
  });

  const stats = {
    total: data.length,
    active: data.filter(u => u.account_status !== 'suspended').length,
    suspended: data.filter(u => u.account_status === 'suspended').length
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="text-slate-900 dark:text-white">{stats.total}</span> total
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.active} active
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <p className="text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400">
              {stats.suspended} suspended
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
        <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-xl px-3 sm:px-4 py-2">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
          <input 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Search users..." 
            className="bg-transparent outline-none text-xs sm:text-sm w-full text-slate-800 dark:text-white placeholder:text-slate-400 min-w-0"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'active', 'suspended'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all capitalize ${
                filter === f
                  ? f === 'all' ? 'bg-purple-600 text-white' :
                    f === 'active' ? 'bg-emerald-600 text-white' :
                    'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center mb-3">
            <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
          </div>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">No users found</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {filteredUsers.map((user, index) => (
            <div 
              key={user.id} 
              className={`p-3 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all ${
                index === filteredUsers.length - 1 ? 'border-b-0' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <img 
                  src={user.avatar_url || '/auragram.png'} 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600 flex-shrink-0"
                  alt={user.username}
                  onError={(e) => { e.target.src = '/auragram.png'; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                    {user.full_name || user.username || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    @{user.username || 'user'}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium ${
                      user.account_status === 'suspended' 
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {user.account_status || 'active'}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onToggleStatus(user)} 
                className={`p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0 ${
                  user.account_status === 'suspended'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30'
                }`}
                title={user.account_status === 'suspended' ? 'Activate user' : 'Suspend user'}
              >
                {user.account_status === 'suspended' ? (
                  <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}