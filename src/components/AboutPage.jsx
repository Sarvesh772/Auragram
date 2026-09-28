import React from 'react';
import { ArrowLeft, Heart, ShieldCheck, Users, Camera } from 'lucide-react';

export default function AboutPage({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white md:p-8">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 md:p-10">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> Back</button>
        <p className="text-xs font-black uppercase tracking-widest text-purple-600">About Auragram</p>
        <h1 className="mt-2 text-3xl font-black">A social space for meaningful connection</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">Auragram helps people share thoughts, photos, reels, and conversations with their community in a simple and respectful environment.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[['Share', Camera], ['Connect', Users], ['Community', ShieldCheck]].map(([label, Icon]) => <div key={label} className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800"><Icon className="mx-auto h-6 w-6 text-purple-600" /><p className="mt-2 text-sm font-bold">{label}</p></div>)}
        </div>
        <p className="mt-8 flex items-center justify-center gap-1 text-sm text-slate-500 dark:text-slate-400">Made with <Heart className="h-4 w-4 fill-rose-500 text-rose-500" /> for Auragram users.</p>
      </article>
    </div>
  );
}
