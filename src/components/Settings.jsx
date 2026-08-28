import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Moon, Sun, Lock, User, LogOut, CheckCircle2, AlertCircle, 
  Loader2, ChevronRight, ArrowLeft, Palette, Bookmark, Trash2, X, Eye,
  Bell, Shield, HelpCircle, MessageCircle, Download, Smartphone,
  Globe, Users, Heart, Star, Award, Zap, Share2, UserCheck,
  Settings as SettingsIcon, TrendingUp, Mail, FileText, Image
} from 'lucide-react';
import HelpSupport from './HelpSupport';
import About from './About';
import Feedback from './Feedback';

export default function Settings({ session, isDarkMode, setIsDarkMode, onLogout }) {
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [supportModal, setSupportModal] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Saved Posts State
  const [savedPosts, setSavedPosts] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [previewPost, setPreviewPost] = useState(null);
  
  // Blocked Users State
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Notifications State
  const [notificationSettings, setNotificationSettings] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    messages: true
  });
  useEffect(() => {
    const saved = localStorage.getItem('auragram_notification_settings');
    if (saved) try { setNotificationSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem('auragram_notification_settings', JSON.stringify(notificationSettings)); }, [notificationSettings]);

  // Stats State
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
    totalLikes: 0
  });

  useEffect(() => {
    getProfile();
    fetchStats();
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, bio')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setBio(data.bio || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    const [postsRes, followersRes, followingRes, likesRes] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', session.user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', session.user.id),
      supabase.from('likes').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id)
    ]);

    setStats({
      posts: postsRes.count || 0,
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
      totalLikes: likesRes.count || 0
    });
  }

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

  async function fetchBlockedUsers() {
    setLoadingBlocked(true);
    const { data } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', session.user.id);
    const ids = (data || []).map(row => row.blocked_id);
    const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', ids) : { data: [] };
    setBlockedUsers(profiles || []); 
    setLoadingBlocked(false);
  }

  async function unblockUser(userId) {
    const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', session.user.id).eq('blocked_id', userId);
    if (!error) {
      setBlockedUsers(prev => prev.filter(user => user.id !== userId));
      setMessage({ type: 'success', text: 'User unblocked successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  }

  async function handleRemoveBookmark(e, postId) {
    e.stopPropagation();
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', session.user.id)
      .eq('post_id', postId);

    if (!error) {
      setSavedPosts(prev => prev.filter(p => p.id !== postId));
      if (previewPost?.id === postId) setPreviewPost(null);
      setMessage({ type: 'success', text: 'Bookmark removed!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
        bio: bio,
        updated_at: new Date(),
      })
      .eq('id', session.user.id);

    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  }

  async function handleLogout() {
    setLogoutConfirm(false);
    await supabase.auth.signOut();
    if (onLogout) onLogout();
  }

  async function requestAccountDeletion() {
    setDeleteError('');
    if (!deletePassword) { setDeleteError('Password required.'); return; }
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: session.user.email, password: deletePassword });
    if (verifyError) { setDeleteError('Password incorrect.'); return; }
    const { error } = await supabase.from('account_deletion_requests').upsert([{ user_id: session.user.id, requested_at: new Date().toISOString(), scheduled_for: new Date(Date.now() + 30 * 86400000).toISOString(), status: 'pending' }]);
    if (error) { setDeleteError(error.message); return; }
    await supabase.auth.signOut();
    window.location.href = '/';
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
      {deleteOpen && <div className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5"><h3 className="text-lg font-bold text-rose-600">Delete account permanently?</h3><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">This cannot be recovered. You have 30 days to contact support; after that all data is permanently removed.</p><input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Enter password" className="mt-4 w-full rounded-xl border p-3 text-sm dark:bg-slate-800" />{deleteError && <p className="mt-2 text-xs text-rose-600">{deleteError}</p>}<div className="mt-4 flex justify-end gap-2"><button onClick={() => setDeleteOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button><button onClick={requestAccountDeletion} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Confirm deletion</button></div></div></div>}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-16">
      {supportModal === 'help' && <HelpSupport onClose={() => setSupportModal(null)} />}
      {supportModal === 'about' && <About onClose={() => setSupportModal(null)} />}
      {supportModal === 'feedback' && <Feedback onClose={() => setSupportModal(null)} />}
      
      {/* Toast Messages */}
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

      {/* MAIN SETTINGS MENU */}
      {activeSubTab === null && (
        <div className="space-y-6">
          {deleteOpen && <div className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5"><h3 className="text-lg font-bold text-rose-600">Delete account permanently?</h3><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">This cannot be recovered. You have 30 days to contact support; after that all data is permanently removed.</p><input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Enter password" className="mt-4 w-full rounded-xl border p-3 text-sm dark:bg-slate-800" />{deleteError && <p className="mt-2 text-xs text-rose-600">{deleteError}</p>}<div className="mt-4 flex justify-end gap-2"><button onClick={() => setDeleteOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancel</button><button onClick={requestAccountDeletion} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Confirm deletion</button></div></div></div>}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">Settings</h1>
          </div>

          
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            
            {/* Account Section */}
            <div className="p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Account</p>
              
              <div onClick={() => { setActiveSubTab('profile'); }} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600"><User className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Edit Profile</h3><p className="text-[10px] text-slate-400">Change username, name & bio</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => { setActiveSubTab('security'); }} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600"><Lock className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Security & Password</h3><p className="text-[10px] text-slate-400">Update account password</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => { setActiveSubTab('appearance'); }} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500"><Palette className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Appearance</h3><p className="text-[10px] text-slate-400">Switch between Light & Dark mode</p></div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-semibold text-slate-400">{isDarkMode ? '🌙 Dark' : '☀️ Light'}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Content</p>

              <div onClick={() => { setActiveSubTab('saved'); fetchSavedPosts(); }} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600"><Bookmark className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Saved Posts</h3><p className="text-[10px] text-slate-400">View your bookmarked posts</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-400">{savedPosts.length}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div onClick={() => { setActiveSubTab('blocked'); fetchBlockedUsers(); }} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600"><Shield className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Blocked Accounts</h3><p className="text-[10px] text-slate-400">Manage blocked users</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-400">{blockedUsers.length}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Privacy Section */}
            <div className="p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Privacy</p>

              <div onClick={() => { setActiveSubTab('notifications'); }} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-500"><Bell className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Notifications</h3><p className="text-[10px] text-slate-400">Manage notification preferences</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-500"><Globe className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Privacy Settings</h3><p className="text-[10px] text-slate-400">Control who can see your content</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Support Section */}
            <div className="p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Support</p>

              <div onClick={() => setSupportModal('help')} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500"><HelpCircle className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Help & Support</h3><p className="text-[10px] text-slate-400">Get help with Auragram</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => setSupportModal('feedback')} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-500"><MessageCircle className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">Send Feedback</h3><p className="text-[10px] text-slate-400">Share your thoughts with us</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => setSupportModal('about')} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500"><Zap className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-slate-800 dark:text-white">About Auragram</h3><p className="text-[10px] text-slate-400">Version 1.1.0</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Data Section */}
            <div className="p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Data</p>

             

              <div onClick={() => setDeleteOpen(true)} className="flex items-center justify-between p-3 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition rounded-xl">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-500"><Trash2 className="w-4 h-4" /></div>
                  <div><h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Delete Account</h3><p className="text-[10px] text-slate-400">Permanently delete your account</p></div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Logout */}
            <div
              onClick={() => setLogoutConfirm(true)}
              className="flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-500">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Log Out</h3>
                  <p className="text-[11px] text-slate-400">Sign out from Auragram</p>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-[10px] text-slate-400">Auragram v1.1.0</p>
            <p className="text-[10px] text-slate-400 mt-1">
              &copy; {new Date().getFullYear()} Auragram. All rights reserved.
            </p>
          </div>
        </div>
      )}

      {/* SAVED POSTS VIEW */}
      {activeSubTab === 'saved' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <RenderHeader title="Saved Posts" />

          {loadingSaved ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
          ) : savedPosts.length === 0 ? (
            <div className="text-center py-8">
              <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No saved posts yet</p>
              <p className="text-xs text-slate-300 mt-1">Posts you bookmark will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPosts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => setPreviewPost(post)}
                  className="p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50/50 dark:hover:bg-slate-700 rounded-2xl flex justify-between items-center cursor-pointer transition border border-transparent hover:border-purple-200 dark:hover:border-slate-600"
                >
                  <div className="flex space-x-3 items-center min-w-0">
                    {post.media_url ? (
                      post.media_type === 'video' ? (
                        <video src={post.media_url} className="w-12 h-12 rounded-xl object-cover bg-black" />
                      ) : (
                        <img src={post.media_url} className="w-12 h-12 rounded-xl object-cover bg-slate-200" alt="saved" />
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px] md:max-w-[300px]">
                        {post.content || 'Media post'}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => handleRemoveBookmark(e, post.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BLOCKED ACCOUNTS VIEW */}
      {activeSubTab === 'blocked' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <RenderHeader title="Blocked Accounts" />

          {loadingBlocked ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No blocked accounts</p>
              <p className="text-xs text-slate-300 mt-1">Users you block will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map(user => (
                <div key={user.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" alt={user.username} />
                    ) : (
                      (user.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                      {user.full_name || user.username}
                    </p>
                    <p className="text-xs text-slate-400">@{user.username}</p>
                  </div>
                  <button 
                    onClick={() => unblockUser(user.id)} 
                    className="rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white transition hover:scale-105"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS VIEW */}
      {activeSubTab === 'notifications' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <RenderHeader title="Notifications" />

          <div className="space-y-4">
            {[
              { key: 'likes', label: 'Likes', desc: 'When someone likes your post' },
              { key: 'comments', label: 'Comments', desc: 'When someone comments on your post' },
              { key: 'follows', label: 'Follows', desc: 'When someone follows you' },
              { key: 'mentions', label: 'Mentions', desc: 'When someone mentions you' },
              { key: 'messages', label: 'Messages', desc: 'When you receive a message' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">{item.label}</h4>
                  <p className="text-[10px] text-slate-400">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notificationSettings[item.key]} 
                    onChange={() => setNotificationSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT PROFILE VIEW */}
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
                className="w-full text-sm px-4 py-3 rounded-2xl border bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-sm px-4 py-3 rounded-2xl border bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell something about yourself..."
                className="w-full text-sm px-4 py-3 rounded-2xl border bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/25 text-white text-sm font-bold px-6 py-3 rounded-2xl transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </form>
        </div>
      )}

      {/* SECURITY VIEW */}
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
                className="w-full text-sm px-4 py-3 rounded-2xl border bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[10px] text-slate-400 mt-1.5">Password must be at least 6 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/25 text-white text-sm font-bold px-6 py-3 rounded-2xl transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Update Password</span>
            </button>
          </form>
        </div>
      )}

      {/* APPEARANCE VIEW */}
      {activeSubTab === 'appearance' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <RenderHeader title="Appearance" />

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="flex items-center space-x-3">
                {isDarkMode ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Dark Mode</h4>
                  <p className="text-[10px] text-slate-400">Toggle dark / light theme</p>
                </div>
              </div>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  isDarkMode
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
                }`}
              >
                {isDarkMode ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                isDarkMode ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 hover:border-slate-300'
              }`} onClick={() => setIsDarkMode(true)}>
                <Moon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-center text-slate-700 dark:text-white">Dark</p>
              </div>
              <div className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                !isDarkMode ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 hover:border-slate-300'
              }`} onClick={() => setIsDarkMode(false)}>
                <Sun className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-center text-slate-700 dark:text-white">Light</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW POST MODAL */}
      {previewPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewPost(null)}>
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative" onClick={(e) => e.stopPropagation()}>
            
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                {previewPost.profiles?.avatar_url ? (
                  <img src={previewPost.profiles.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="avatar" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                    {(previewPost.profiles?.username || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-white">@{previewPost.profiles?.username || 'User'}</p>
                  <p className="text-[10px] text-slate-400">{new Date(previewPost.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <button onClick={() => setPreviewPost(null)} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white transition rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

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
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {logoutConfirm && <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl"><h3 className="text-lg font-bold text-slate-800 dark:text-white">Log out?</h3><p className="mt-2 text-sm text-slate-500">Are you sure you want to log out of Auragram?</p><div className="mt-5 flex justify-end gap-2"><button onClick={() => setLogoutConfirm(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500">Cancel</button><button onClick={handleLogout} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Log out</button></div></div></div>}
    </div>
  );
}
