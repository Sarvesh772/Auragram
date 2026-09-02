import { useEffect, useState } from 'react';
import { Search, UserX, UserCheck, UserPlus, Filter } from 'lucide-react';
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
      {/* Header with Stats */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Total: <span className="text-slate-900 dark:text-white">{stats.total}</span>
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Active: <span>{stats.active}</span>
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                Suspended: <span>{stats.suspended}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={loadUsers}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Search by name or username..." 
            className="bg-transparent outline-none text-sm w-full text-slate-800 dark:text-white placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('suspended')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'suspended'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Suspended
          </button>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center mb-3">
            <UserPlus className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">No users found</p>
        </div>
      ) : (
        filteredUsers.map((user, index) => (
          <div 
            key={user.id} 
            className={`p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all ${
              index === filteredUsers.length - 1 ? 'border-b-0' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img 
                src={user.avatar_url || '/auragram.png'} 
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600 flex-shrink-0"
                alt={user.username}
                onError={(e) => { e.target.src = '/auragram.png'; }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                  {user.full_name || user.username || 'User'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                  @{user.username || 'user'}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
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
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                user.account_status === 'suspended'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                  : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30'
              }`}
              title={user.account_status === 'suspended' ? 'Activate user' : 'Suspend user'}
            >
              {user.account_status === 'suspended' ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <UserX className="w-4 h-4" />
              )}
            </button>
          </div>
        ))
      )}
    </div>
  );
}