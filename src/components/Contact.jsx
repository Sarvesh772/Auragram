import React from 'react';
import { ArrowLeft, Mail, MapPin } from 'lucide-react';
import { REGISTERED_BUSINESS_ADDRESS } from './Footer';

export default function Contact({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white md:p-8">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 md:p-10">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> Back</button>
        <p className="text-xs font-black uppercase tracking-widest text-purple-600">Auragram</p>
        <h1 className="mt-2 text-3xl font-black">Contact Us</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">For account support, privacy requests, payment assistance, or other enquiries, contact our support team.</p>
        <div className="mt-8 space-y-4">
          <a href="mailto:support@auragram.in" className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-purple-300 dark:border-slate-700 dark:hover:border-purple-500"><Mail className="mt-0.5 h-5 w-5 text-purple-600" /><span><strong className="block text-sm">Official email</strong><span className="text-sm text-purple-600">support@auragram.in</span></span></a>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><MapPin className="mt-0.5 h-5 w-5 text-purple-600" /><span><strong className="block text-sm">Registered business address</strong><span className="text-sm text-slate-600 dark:text-slate-300">{REGISTERED_BUSINESS_ADDRESS}</span></span></div>
        </div>
      </article>
    </div>
  );
}
