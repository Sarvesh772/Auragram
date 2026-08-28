import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Privacy({ onBack }) {
  const sections = [
    ['Data Collection', 'We collect account details used for authentication, media you upload, and messages you send through Auragram.'],
    ['Data Usage', 'Your content is used to provide feeds, profiles, messaging and notifications. Media is stored securely using Supabase Storage.'],
    ['Data Protection', 'We use authentication, row-level access controls and secure connections to help protect your information. Never share your password.'],
    ['User Rights', 'You may access, edit or delete your content and account. You can request help with privacy concerns at any time.'],
    ['Contact Info', 'For privacy questions or requests, contact support@auragram.in.']
  ];
  return <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white md:p-8"><div className="mx-auto max-w-3xl"><button onClick={onBack} className="mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> Back</button><div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 md:p-10"><div className="mb-8 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950/50"><ShieldCheck className="h-7 w-7" /></div><div><h1 className="text-3xl font-black">Privacy Policy</h1><p className="text-sm text-slate-500 dark:text-slate-400">Last updated: August 2026</p></div></div>{sections.map(([title, body]) => <section key={title} className="border-t border-slate-100 py-5 dark:border-slate-800"><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{body}</p></section>)}</div></div></div>;
}
