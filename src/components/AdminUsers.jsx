import { useEffect, useState } from 'react';
import { Search, UserX, UserCheck, UserPlus, Filter, Users as UsersIcon } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id,username,full_name,avatar_url,account_status,created_at')
      .limit(200);
    if (!error) setUsers(data || []);
    setLoading(false);
  }

  async function toggleUserStatus(user) {
    const newStatus = user.account_status === 'suspended' ? 'active' : 'suspended';
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', user.id);
    if (!error) {
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, account_status: newStatus } : u
      ));
    }
  }

  const filteredUsers = users.filter(u => {
    const searchMatch = `${u.full_name || ''} ${u.username || ''}`
      .toLowerCase()
      .includes(query.toLowerCase());
    
    if (filter === 'suspended') return searchMatch && u.account_status === 'suspended';
    if (filter === 'active') return searchMatch && u.account_status !== 'suspended';
    return searchMatch;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.account_status !== 'suspended').length,
    suspended: users.filter(u => u.account_status === 'suspended').length
  };

  return (
    <div>
      <div className="flex justify-end p-3 border-b border-slate-100 dark:border-slate-700">
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
          <button 
            onClick={loadUsers}
            className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium"
          >
            ↻ Refresh
          </button>
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
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 mt-2">Loading users...</p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
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
                  </p>
                </div>
              </div>
              <button 
                onClick={() => toggleUserStatus(user)} 
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
