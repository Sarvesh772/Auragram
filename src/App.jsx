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

import { Home, Compass, MessageCircle, LogOut, Clapperboard } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  
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

  // Check if current tab should hide the Right Panel (e.g. Messages & Reels)
  const isFullWidthPage = activeTab === 'messages' || activeTab === 'reels';

  return (
    <div className={`min-h-screen flex justify-center transition-colors ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="w-full max-w-7xl flex">
        
        {/* Sidebar Left */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          session={session} 
          onLogout={handleLogout} 
        />

        {/* Main Content Area - Full width if Messages/Reels, else normal width */}
        <main className={`flex-1 min-h-screen pb-20 md:pb-6 transition-all ${
          isFullWidthPage ? 'max-w-full' : 'max-w-2xl border-r'
        } ${
          isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}>
          
          {/* Mobile Header */}
          <header className={`md:hidden flex justify-between items-center p-4 border-b sticky top-0 backdrop-blur-md z-20 ${
            isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-white/80'
          }`}>
            <h1 className="text-2xl font-black text-purple-600">Auragram</h1>
            <div className="flex space-x-2 items-center">
              <button onClick={() => setActiveTab(activeTab === 'messages' ? 'feed' : 'messages')} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <MessageCircle className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              </button>
              <button onClick={handleLogout} className="p-2 rounded-full bg-rose-50 text-rose-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Views Conditional Rendering */}
          {activeTab === 'feed' && <Feed session={session} />}
          {activeTab === 'messages' && <Messages session={session} />}
          {activeTab === 'profile' && <Profile session={session} />}
          {activeTab === 'reels' && <Reels session={session} />}
          {activeTab === 'explore' && <Explore session={session} />}
          {activeTab === 'notifications' && <Notifications session={session} />}
          {activeTab === 'settings' && (
            <Settings 
              session={session} 
              isDarkMode={isDarkMode} 
              setIsDarkMode={setIsDarkMode} 
            />
          )}
          
        </main>

        {/* Right Panel - Hidden conditionally on Messages & Reels, also hidden on small screens */}
        {!isFullWidthPage && (
          <div className="hidden lg:block">
            <RightPanel session={session} />
          </div>
        )}

      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t px-6 py-2 flex justify-between items-center z-30 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button onClick={() => setActiveTab('feed')} className={`p-2 rounded-xl ${activeTab === 'feed' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
          <Home className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('explore')} className={`p-2 rounded-xl ${activeTab === 'explore' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
          <Compass className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('reels')} className={`p-2 rounded-xl ${activeTab === 'reels' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
          <Clapperboard className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('messages')} className={`p-2 rounded-xl ${activeTab === 'messages' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
          <MessageCircle className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}