import React, { useState, useEffect } from 'react';
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
import RightPanel from './components/RightPanel';

import { Home, Compass, MessageCircle, Clapperboard, Bell, Settings as SettingsIcon, User } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  const [profileUserId, setProfileUserId] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
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

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    const loadUnread = async () => {
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('recipient_id', session.user.id).eq('is_read', false);
      setUnreadNotifications(count || 0);
    };
    loadUnread();
    const channel = supabase.channel('notification-badge').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${session.user.id}` }, loadUnread).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

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

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function handleTabChange(tab) {
    if (tab === 'profile') setProfileUserId(null);
    setActiveTab(tab);
  }

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

  const isFullWidthPage = activeTab === 'messages' || activeTab === 'reels';
  const showMobileTopBar = activeTab !== 'messages';

  return (
    <div className={`min-h-screen flex justify-center transition-colors ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="w-full max-w-7xl flex">
        
        {/* Sidebar Left (Desktop Only) */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          session={session} 
          onLogout={handleLogout} 
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
              <h1 className="text-2xl font-black text-purple-600 tracking-tight">Auragram</h1>
              
              <div className="flex space-x-2 items-center">
                <button 
                  onClick={() => setActiveTab('notifications')} 
                  className={`relative p-2 rounded-full transition ${activeTab === 'notifications' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
                </button>

                <button 
                  onClick={() => setActiveTab('settings')} 
                  className={`p-2 rounded-full transition ${activeTab === 'settings' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
              </div>
            </header>
          )}

          {/* Views Conditional Rendering */}
          {activeTab === 'feed' && <Feed session={session} onViewProfile={(id) => { setProfileUserId(id); setActiveTab('profile'); }} />}
          {activeTab === 'messages' && <Messages session={session} initialUserId={profileUserId} onViewProfile={(id) => { setProfileUserId(id); setActiveTab('profile'); }} />}
          {activeTab === 'profile' && <Profile session={session} profileUserId={profileUserId} onMessage={(id) => { setProfileUserId(id); setActiveTab('messages'); }} />}
          {activeTab === 'reels' && <Reels session={session} onViewProfile={(userId) => { setProfileUserId(userId); setActiveTab('profile'); }} />}
          {activeTab === 'explore' && <Explore session={session} onViewProfile={(id) => { setProfileUserId(id); setActiveTab('profile'); }} />}
          {activeTab === 'notifications' && <Notifications session={session} />}
          {activeTab === 'settings' && (
            <Settings 
              session={session} 
              isDarkMode={isDarkMode} 
              setIsDarkMode={setIsDarkMode} 
            />
          )}
          
        </main>

        {/* Right Panel (Desktop Only) */}
        {!isFullWidthPage && (
          <div className="hidden lg:block">
            <RightPanel session={session} />
          </div>
        )}

      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-4 py-2 flex justify-between items-center z-30 shadow-lg ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800 backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md'
      }`}>
        <button 
          onClick={() => setActiveTab('feed')} 
          className={`p-2.5 rounded-2xl transition ${activeTab === 'feed' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Home className="w-5 h-5" />
        </button>

        <button 
          onClick={() => setActiveTab('explore')} 
          className={`p-2.5 rounded-2xl transition ${activeTab === 'explore' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Compass className="w-5 h-5" />
        </button>

        <button 
          onClick={() => setActiveTab('reels')} 
          className={`p-2.5 rounded-2xl transition ${activeTab === 'reels' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Clapperboard className="w-5 h-5" />
        </button>

        <button 
          onClick={() => setActiveTab('messages')} 
          className={`p-2.5 rounded-2xl transition ${activeTab === 'messages' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <MessageCircle className="w-5 h-5" />
        </button>

        {/* Profile Icon (Message ke right side) */}
        <button 
          onClick={() => { setProfileUserId(null); setActiveTab('profile'); }} 
          className={`p-2.5 rounded-2xl transition ${activeTab === 'profile' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <User className="w-5 h-5" />
        </button>
      </nav>
    </div>
  );
}
