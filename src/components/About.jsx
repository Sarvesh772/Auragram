import React from 'react';
import { Heart, Sparkles, X, Camera, Clapperboard, MessageCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function About({ onClose }) {
  const navigate = useNavigate();
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-slate-900" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="float-right rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500 to-purple-700 text-white shadow-lg">
          <Sparkles className="h-10 w-10" />
        </div>

        <h2 className="mt-5 text-3xl font-black text-purple-600">Auragram</h2>
        
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Share thoughts, photos and reels with your community.
        </p>

        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Auragram is a friendly social space where you can express yourself, discover people and stay connected through meaningful content.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 text-left">
          {[[Camera, 'Share moments'], [Clapperboard, 'Create reels'], [MessageCircle, 'Chat together'], [ShieldCheck, 'Safe community']].map(([Icon, label]) => <div key={label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Icon className="h-4 w-4 text-purple-500" />{label}</div>)}
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
          <p className="font-bold dark:text-white">Version 1.1.0</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">You’re using the latest version</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Made with <Heart className="mx-1 inline h-3.5 w-3.5 fill-rose-500 text-rose-500" /> for Auragram users
          </p>
        </div>

        <p className="mt-5 text-xs text-slate-400">
          © {new Date().getFullYear()} Auragram
        </p>
        <div className="mt-4 flex justify-center gap-4 text-xs font-semibold"><button onClick={() => { onClose?.(); navigate('/privacy'); }} className="text-purple-600 hover:underline">Privacy Policy</button><button onClick={() => { onClose?.(); navigate('/terms'); }} className="text-purple-600 hover:underline">Terms of Service</button></div>
      </div>
    </div>
  );
}
