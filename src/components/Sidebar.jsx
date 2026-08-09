import React from 'react';
import { Home, Compass, Settings, Bell, Clapperboard, MessageCircle, User } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 h-screen sticky top-0 bg-white border-r border-slate-200 p-4 justify-between">
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-purple-600 hidden lg:block px-2">Auragram</h1>
        <h1 className="text-2xl font-black text-purple-600 lg:hidden text-center">A</h1>
        
        <nav className="space-y-2">
          <SidebarItem icon={<Home />} label="Home" active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
          <SidebarItem icon={<MessageCircle />} label="Messages" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
          <SidebarItem icon={<User />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <SidebarItem icon={<Compass />} label="Explore" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')}/>
          <SidebarItem icon={<Clapperboard />} label="Reels" active={activeTab === 'reels'} onClick={() => setActiveTab('reels')} />
          <SidebarItem icon={<Bell />} label="Notifications" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')}/>
          <SidebarItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
      </div>
    </aside>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-4 w-full p-3 rounded-xl transition font-semibold text-sm ${
        active 
          ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
      <span className="hidden lg:block">{label}</span>
    </button>
  );
}