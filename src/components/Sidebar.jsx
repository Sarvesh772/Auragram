import React from 'react';
import { Home, Compass, MessageCircle, Clapperboard, Bell, Settings, User } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, unreadNotifications = 0, unreadMessages = 0 }) {
  const menuItems = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'reels', label: 'Reels', icon: Clapperboard },
    { id: 'messages', label: 'Messages', icon: MessageCircle, badge: unreadMessages },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 p-4 border-r border-slate-200 dark:border-slate-800">
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-purple-600 px-3 tracking-tight">Auragram</h1>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors font-medium ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}