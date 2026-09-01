import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from './supabaseClient';

import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Feed from './components/Feed';
import Explore from './components/Explore';
import Messages from './components/Messages';
import Reels from './components/Reels';
import Notifications from './components/Notifications';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import RightPanel from './components/RightPanel';

import { Home, Compass, MessageCircle, Clapperboard, Bell, Settings as SettingsIcon, User } from 'lucide-react';

const APP_VERSION = '1.1.0';

// Wrapper to handle dynamic /profile/:username and default logged-in user profile
function ProfileWrapper({ session }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const profileUserId = username || session?.user?.id;

  return (
    <Profile 
      session={session} 
      profileUserId={profileUserId} 
      onMessage={(id) => navigate(`/messages?user=${id}`)} 
    />
  );
}

// Wrapper for Feed to support ?post=id query parameter link sharing
function FeedWrapper({ session }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPostId = searchParams.get('post');

  return (
    <Feed 
      session={session} 
      initialPostId={initialPostId} 
      onViewProfile={(id) => navigate(`/profile/${id}`)} 
    />
  );
}

// Wrapper for Messages to handle ?user=id query param
function MessagesWrapper({ session }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get('user');

  return (
    <Messages 
      session={session} 
      initialUserId={initialUserId} 
      onViewProfile={(id) => navigate(`/profile/${id}`)} 
    />
  );
}

function ReelsWrapper({ session }) {
  const [searchParams] = useSearchParams();
  return <Reels session={session} initialReelId={searchParams.get('reel')} onViewProfile={(id) => window.history.pushState({}, '', `/profile/${id}`)} />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [deletionRequest, setDeletionRequest] = useState(null);
  const [cancellingDeletion, setCancellingDeletion] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('auragram_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('auragram_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('auragram_theme', 'light');
    }
  }, [isDarkMode]);

  // Check the deployed web version without interrupting startup.
  useEffect(() => {
    fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((version) => {
        if (version?.version && version.version !== APP_VERSION) setAvailableUpdate(version);
      })
      .catch(() => {});
  }, []);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Notifications Unread Count Listener
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from('account_deletion_requests').select('status, scheduled_for').eq('user_id', session.user.id).eq('status', 'pending').maybeSingle().then(({ data }) => {
      if (data && new Date(data.scheduled_for) > new Date()) {
        setDeletionRequest(data);
      }
    });
  }, [session?.user?.id]);

  const cancelDeletionRequest = async () => {
    if (!session?.user?.id) return;
    setCancellingDeletion(true);
    const { error } = await supabase
      .from('account_deletion_requests')
      .update({ status: 'cancelled' })
      .eq('user_id', session.user.id)
      .eq('status', 'pending');
    setCancellingDeletion(false);
    if (error) {
      alert(`Could not cancel request: ${error.message}`);
      return;
    }
    setDeletionRequest(null);
    localStorage.removeItem('auragram_deletion_notice');
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    const loadUnreadNotifs = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', session.user.id)
        .eq('is_read', false);
      setUnreadNotifications(count || 0);
    };
    loadUnreadNotifs();
    const channel = supabase
      .channel('notification-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${session.user.id}` }, loadUnreadNotifs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // Unread Messages Listener
  useEffect(() => {
    if (!session?.user?.id) return;
    const loadUnreadMsgs = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', session.user.id)
        .eq('is_read', false);
      setUnreadMessages(count || 0);
    };
    loadUnreadMsgs();
    const channel = supabase
      .channel('messages-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` }, loadUnreadMsgs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 font-medium">Loading Auragram...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  // Active Tab determination based on Current Route
  const pathname = location.pathname;
  let activeTab = 'feed';
  if (pathname.startsWith('/explore')) activeTab = 'explore';
  else if (pathname.startsWith('/reels')) activeTab = 'reels';
  else if (pathname.startsWith('/messages')) activeTab = 'messages';
  else if (pathname.startsWith('/notifications')) activeTab = 'notifications';
  else if (pathname.startsWith('/profile')) activeTab = 'profile';
  else if (pathname.startsWith('/settings')) activeTab = 'settings';

  const isFullWidthPage = activeTab === 'messages' || activeTab === 'reels';
  const showMobileTopBar = activeTab !== 'messages';

  const handleTabChange = (tab) => {
    if (tab === 'feed') navigate('/');
    else if (tab === 'profile') navigate(`/profile/${session.user.id}`);
    else navigate(`/${tab}`);
  };

  return (
    <div className={`min-h-screen flex justify-center transition-colors ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {deletionRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-2xl dark:bg-rose-950/60">!</div>
            <h2 className="text-2xl font-black">Deletion request active</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your account is scheduled for permanent deletion on <strong>{new Date(deletionRequest.scheduled_for).toLocaleDateString()}</strong>. You can cancel this request anytime before that date.
            </p>
            <button onClick={cancelDeletionRequest} disabled={cancellingDeletion} className="mt-6 w-full rounded-xl bg-purple-600 px-4 py-3 font-bold text-white disabled:opacity-60">
              {cancellingDeletion ? 'Cancelling…' : 'Cancel deletion and keep my account'}
            </button>
            <button onClick={() => supabase.auth.signOut()} className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Sign out</button>
          </div>
        </div>
      )}
      {availableUpdate && (
        <div className="fixed left-1/2 top-3 z-[90] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center gap-3 rounded-2xl bg-purple-600 px-4 py-3 text-white shadow-xl">
          <div className="min-w-0 flex-1 text-sm"><strong>New Auragram update available</strong><span className="ml-1 opacity-90">v{availableUpdate.version}</span></div>
          <button onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-purple-700">Update now</button>
          <button onClick={() => setAvailableUpdate(null)} aria-label="Dismiss" className="shrink-0 text-xl leading-none opacity-80">×</button>
        </div>
      )}
      <div className="w-full max-w-7xl flex relative">
        
        {/* Sidebar Left (Desktop Only) */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
        />

        {/* Main Content Area */}
        <main className={`flex-1 transition-all ${
          isFullWidthPage ? 'max-w-full h-[100dvh] overflow-hidden pb-0' : 'min-h-screen pb-24 md:pb-6 max-w-2xl border-r'
        } ${
          isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}>
          
          {/* MOBILE HEADER */}
          {showMobileTopBar && (
            <header className={`md:hidden flex justify-between items-center px-4 py-3 border-b sticky top-0 backdrop-blur-md z-20 ${
              isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-white/90'
            }`}>
              <h1 className="text-2xl font-black text-purple-600 tracking-tight cursor-pointer" onClick={() => navigate('/')}>Auragram</h1>
              
              <div className="flex space-x-2 items-center">
                <button 
                  onClick={() => navigate('/notifications')} 
                  className={`relative p-2 rounded-full transition ${activeTab === 'notifications' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => navigate('/settings')} 
                  className={`p-2 rounded-full transition ${activeTab === 'settings' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
              </div>
            </header>
          )}

          {/* Clean Route Structure */}
          <Routes>
            <Route path="/" element={<FeedWrapper session={session} />} />
            <Route path="/explore" element={<Explore session={session} onViewProfile={(id) => navigate(`/profile/${id}`)} />} />
            <Route path="/reels" element={<ReelsWrapper session={session} />} />
            <Route path="/messages" element={<MessagesWrapper session={session} />} />
            <Route path="/notifications" element={<Notifications session={session} onViewProfile={(id) => navigate(`/profile/${id}`)} />} />
            <Route path="/profile" element={<ProfileWrapper session={session} />} />
            <Route path="/profile/:username" element={<ProfileWrapper session={session} />} />
            <Route path="/settings" element={<Settings session={session} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />} />
            <Route path="/privacy" element={<Privacy onBack={() => navigate(-1)} />} />
            <Route path="/terms" element={<Terms onBack={() => navigate(-1)} />} />
          </Routes>
          
        </main>

        {/* Right Panel (Desktop Only) */}
        {!isFullWidthPage && (
          <div className="hidden lg:block">
            <RightPanel session={session} onViewProfile={(id) => navigate(`/profile/${id}`)} onSeeAll={() => navigate('/explore')} />
          </div>
        )}

      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-4 py-2 flex justify-between items-center z-30 shadow-lg ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md'
      }`}>
        <button 
          onClick={() => navigate('/')} 
          className={`p-2.5 rounded-2xl transition ${activeTab === 'feed' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Home className="w-5 h-5" />
        </button>

        <button 
          onClick={() => navigate('/explore')} 
          className={`p-2.5 rounded-2xl transition ${activeTab === 'explore' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Compass className="w-5 h-5" />
        </button>

        <button 
          onClick={() => navigate('/reels')} 
          className={`p-2.5 rounded-2xl transition ${activeTab === 'reels' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Clapperboard className="w-5 h-5" />
        </button>

        <button 
          onClick={() => navigate('/messages')} 
          className={`relative p-2.5 rounded-2xl transition ${activeTab === 'messages' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <MessageCircle className="w-5 h-5" />
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </button>

        <button 
          onClick={() => navigate(`/profile/${session.user.id}`)} 
          className={`p-2.5 rounded-2xl transition ${activeTab === 'profile' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <User className="w-5 h-5" />
        </button>
      </nav>
    </div>
  );
}
