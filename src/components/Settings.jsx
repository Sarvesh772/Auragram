import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Moon, Sun, Lock, User, LogOut, CheckCircle2, AlertCircle, 
  Loader2, ChevronRight, ArrowLeft, Palette, Bookmark, Trash2, X, Eye 
} from 'lucide-react';

export default function Settings({ session, isDarkMode, setIsDarkMode }) {
  const [activeSubTab, setActiveSubTab] = useState(null);

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Saved Posts State
  const [savedPosts, setSavedPosts] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [previewPost, setPreviewPost] = useState(null); // Full Preview Modal State
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  async function fetchBlockedUsers() {
    setLoadingBlocked(true);
    const { data } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', session.user.id);
    const ids = (data || []).map(row => row.blocked_id);
    const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids) : { data: [] };
    setBlockedUsers(profiles || []); setLoadingBlocked(false);
  }

  async function unblockUser(userId) {
    const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', session.user.id).eq('blocked_id', userId);
    if (!error) setBlockedUsers(prev => prev.filter(user => user.id !== userId));
  }

  useEffect(() => {
    getProfile();
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setUsername(data.username || '');
        setFullName(data.full_name || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch Bookmarked Posts
  async function fetchSavedPosts() {
    setLoadingSaved(true);
    const { data: bookmarkData } = await supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', session.user.id);

    if (!bookmarkData || bookmarkData.length === 0) {
      setSavedPosts([]);
      setLoadingSaved(false);
      return;
    }

    const postIds = bookmarkData.map(b => b.post_id);
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds)
      .order('created_at', { ascending: false });

    if (postsData) {
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
      const profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

      const fullSaved = postsData.map(p => ({
        ...p,
        profiles: profilesMap[p.user_id] || null
      }));

      setSavedPosts(fullSaved);
    }
    setLoadingSaved(false);
  }

  async function handleRemoveBookmark(e, postId) {
    e.stopPropagation(); // Modal open hone se roke
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', session.user.id)
      .eq('post_id', postId);

    if (!error) {
      setSavedPosts(prev => prev.filter(p => p.id !== postId));
      if (previewPost?.id === postId) {
        setPreviewPost(null);
      }
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        username: username,
        updated_at: new Date(),
      })
      .eq('id', session.user.id);

    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (!newPassword.trim()) return;

    setMessage({ type: '', text: '' });
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setNewPassword('');
      setMessage({ type: 'success', text: 'Password updated successfully!' });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const RenderHeader = ({ title }) => (
    <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
      <button
        onClick={() => {
          setActiveSubTab(null);
          setMessage({ type: '', text: '' });
        }}
        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
      >
        <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
      </button>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-16">
      
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. MAIN SETTINGS MENU */}
      {activeSubTab === null && (
        <div className="space-y-6">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Settings</h1>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            
            {/* SAVED POSTS OPTION */}
            <div
              onClick={() => {
                setActiveSubTab('saved');
                fetchSavedPosts();
              }}
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Saved Posts</h3>
                  <p className="text-[11px] text-slate-400">View your bookmarked posts</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>

            {/* EDIT PROFILE */}
            <div onClick={() => { setActiveSubTab('blocked'); fetchBlockedUsers(); }} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition">
              <div className="flex items-center space-x-3.5"><div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600"><User className="w-5 h-5" /></div><div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Blocked Accounts</h3><p className="text-[11px] text-slate-400">Manage blocked users</p></div></div><ChevronRight className="w-5 h-5 text-slate-400" />
            </div>

            {/* EDIT PROFILE */}
            <div
              onClick={() => setActiveSubTab('profile')}
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Edit Profile</h3>
                  <p className="text-[11px] text-slate-400">Change username and full name</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>

            {/* SECURITY & PASSWORD */}
            <div
              onClick={() => setActiveSubTab('security')}
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Security & Password</h3>
                  <p className="text-[11px] text-slate-400">Update account password</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>

            {/* APPEARANCE */}
            <div
              onClick={() => setActiveSubTab('appearance')}
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-500">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Appearance</h3>
                  <p className="text-[11px] text-slate-400">Switch between Light & Dark mode</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-400">{isDarkMode ? 'Dark' : 'Light'}</span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            {/* LOGOUT */}
            <div
              onClick={handleLogout}
              className="flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-500">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Log Out</h3>
                  <p className="text-[11px] text-slate-400">Sign out from Auragram</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. SAVED POSTS VIEW */}
      {activeSubTab === 'blocked' && (
        <div className="space-y-4"><button onClick={() => setActiveSubTab(null)} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"><ArrowLeft className="w-4 h-4" /> Settings</button><h2 className="text-xl font-black text-slate-800 dark:text-white">Blocked Accounts</h2>{loadingBlocked ? <Loader2 className="w-5 h-5 animate-spin text-purple-600" /> : blockedUsers.length === 0 ? <p className="text-sm text-slate-400">No blocked accounts.</p> : <div className="space-y-2">{blockedUsers.map(user => <div key={user.id} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3"><div className="w-10 h-10 rounded-full overflow-hidden bg-purple-600 text-white flex items-center justify-center font-bold">{user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : (user.username || 'U')[0].toUpperCase()}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.full_name || user.username}</p><p className="text-xs text-slate-400">@{user.username}</p></div><button onClick={() => unblockUser(user.id)} className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white">Unblock</button></div>)}</div>}</div>
      )}

      {activeSubTab === 'saved' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <RenderHeader title="Saved Posts" />

          {loadingSaved ? (
            <p className="text-xs text-slate-400 text-center py-8">Loading saved posts...</p>
          ) : savedPosts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No saved posts yet.</p>
          ) : (
            <div className="space-y-3">
              {savedPosts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => setPreviewPost(post)}
                  className="p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50/50 dark:hover:bg-slate-800 rounded-2xl flex justify-between items-center cursor-pointer transition border border-transparent hover:border-purple-200 dark:hover:border-slate-700"
                >
                  <div className="flex space-x-3 items-center min-w-0">
                    {post.media_url ? (
                      post.media_type === 'video' ? (
                        <video src={post.media_url} className="w-12 h-12 rounded-xl object-cover bg-black" />
                      ) : (
                        <img 
                          src={post.media_url} 
                          className="w-12 h-12 rounded-xl object-cover bg-slate-200" 
                          alt="saved" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )
                    ) : (
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0">
                        TXT
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-800 dark:text-white block truncate">
                        @{post.profiles?.username || 'User'}
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px] md:max-w-[320px]">
                        {post.content || 'Media post'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-slate-400 hover:text-purple-600 transition" title="Preview">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleRemoveBookmark(e, post.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition"
                      title="Unsave"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FULL SAVED POST PREVIEW MODAL */}
      {previewPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            
            {/* Modal Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                {previewPost.profiles?.avatar_url ? (
                  <img src={previewPost.profiles.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="avatar" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 font-bold flex items-center justify-center text-xs">
                    {(previewPost.profiles?.username || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-white">@{previewPost.profiles?.username || 'User'}</p>
                  <p className="text-[10px] text-slate-400">{new Date(previewPost.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <button 
                onClick={() => setPreviewPost(null)}
                className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white transition rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {previewPost.content && (
                <p className="text-sm text-slate-700 dark:text-slate-200">{previewPost.content}</p>
              )}

              {previewPost.media_url && (
                previewPost.media_type === 'video' ? (
                  <video src={previewPost.media_url} playsInline muted className="w-full rounded-2xl max-h-80 bg-black" />
                ) : (
                  <img src={previewPost.media_url} className="w-full rounded-2xl max-h-80 object-cover" alt="Saved Preview" />
                )
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-xs text-purple-600 font-medium flex items-center space-x-1">
                <Bookmark className="w-4 h-4 fill-purple-600" />
                <span>Saved Post</span>
              </span>

              <button
                onClick={(e) => handleRemoveBookmark(e, previewPost.id)}
                className="bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Bookmark</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. EDIT PROFILE SUB PAGE */}
      {activeSubTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <RenderHeader title="Edit Profile" />

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-xs px-4 py-3 rounded-2xl border bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs px-4 py-3 rounded-2xl border bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-6 py-3 rounded-2xl transition disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </form>
        </div>
      )}

      {/* 4. SECURITY SUB PAGE */}
      {activeSubTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <RenderHeader title="Security & Password" />

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">New Password</label>
              <input
                type="password"
                placeholder="Enter new password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-xs px-4 py-3 rounded-2xl border bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-6 py-3 rounded-2xl transition disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Update Password</span>
            </button>
          </form>
        </div>
      )}

      {/* 5. APPEARANCE SUB PAGE */}
      {activeSubTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <RenderHeader title="Appearance" />

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <div className="flex items-center space-x-3">
              {isDarkMode ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">Dark Mode</h4>
                <p className="text-[10px] text-slate-400">Toggle dark / light theme</p>
              </div>
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                isDarkMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
              }`}
            >
              {isDarkMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
