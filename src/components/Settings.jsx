import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Moon, Sun, Lock, User, LogOut, CheckCircle2, AlertCircle, 
  Loader2, ChevronRight, ArrowLeft, Palette, Bookmark, Trash2 
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

  async function handleRemoveBookmark(postId) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', session.user.id)
      .eq('post_id', postId);

    if (!error) {
      setSavedPosts(prev => prev.filter(p => p.id !== postId));
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
      {activeSubTab === 'saved' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <RenderHeader title="Saved Posts" />

          {loadingSaved ? (
            <p className="text-xs text-slate-400 text-center py-8">Loading saved posts...</p>
          ) : savedPosts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No saved posts yet.</p>
          ) : (
            <div className="space-y-4">
              {savedPosts.map(post => (
                <div key={post.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center">
                  <div className="flex space-x-3 items-center">
                    {post.media_url ? (
                      <img src={post.media_url} className="w-12 h-12 rounded-xl object-cover" alt="saved" />
                    ) : (
                      <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold text-xs">
                        TXT
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-white block">@{post.profiles?.username || 'User'}</span>
                      <p className="text-xs text-slate-500 line-clamp-1">{post.content || 'Media post'}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleRemoveBookmark(post.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition"
                    title="Unsave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. SUB PAGE: EDIT PROFILE */}
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

      {/* 4. SUB PAGE: SECURITY */}
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

      {/* 5. SUB PAGE: APPEARANCE */}
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