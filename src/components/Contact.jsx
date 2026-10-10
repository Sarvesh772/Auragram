import React, { useState } from 'react';
import { ArrowLeft, Clock3, LifeBuoy, Mail, MapPin, Phone } from 'lucide-react';
import { REGISTERED_BUSINESS_ADDRESS } from './Footer';

export default function Contact({ onBack }) {
  const [hindi, setHindi] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white md:p-8">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 md:p-10">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-purple-600">Auragram · Sarvesh Kumar</p><h1 className="mt-2 text-3xl font-black">{hindi ? 'संपर्क करें' : 'Contact Us'}</h1></div><div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800"><button onClick={() => setHindi(false)} className={!hindi ? 'rounded-lg bg-white px-2 py-1 text-purple-600 shadow-sm dark:bg-slate-700' : 'px-2 py-1 text-slate-500'}>English</button><button onClick={() => setHindi(true)} className={hindi ? 'rounded-lg bg-white px-2 py-1 text-purple-600 shadow-sm dark:bg-slate-700' : 'px-2 py-1 text-slate-500'}>हिन्दी</button></div></div>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{hindi ? 'खाते, privacy, payment, safety और product से जुड़े सवालों में हम आपकी मदद करेंगे।' : 'We are here to help with account access, privacy requests, payments, safety reports and product questions.'}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a href="mailto:support@auragram.in" className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-purple-300 dark:border-slate-700 dark:hover:border-purple-500"><Mail className="mt-0.5 h-5 w-5 text-purple-600" /><span><strong className="block text-sm">Official email</strong><span className="text-sm text-purple-600">support@auragram.in</span></span></a>
          <a href="tel:+916307728381" className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-purple-300 dark:border-slate-700 dark:hover:border-purple-500"><Phone className="mt-0.5 h-5 w-5 text-purple-600" /><span><strong className="block text-sm">Contact phone</strong><span className="text-sm text-purple-600">+91 6307728381</span></span></a>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><MapPin className="mt-0.5 h-5 w-5 text-purple-600" /><span><strong className="block text-sm">Registered business address</strong><span className="text-sm text-slate-600 dark:text-slate-300">{REGISTERED_BUSINESS_ADDRESS}</span></span></div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><Clock3 className="mt-0.5 h-5 w-5 text-purple-600" /><span><strong className="block text-sm">Response time</strong><span className="text-sm text-slate-600 dark:text-slate-300">We aim to acknowledge requests within 2 business days. Premium priority requests are handled faster where reasonably possible.</span></span></div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><LifeBuoy className="mt-0.5 h-5 w-5 text-purple-600" /><span><strong className="block text-sm">Support topics</strong><span className="text-sm text-slate-600 dark:text-slate-300">Account, privacy, payment, safety and technical assistance.</span></span></div>
        </div>
        <section className="mt-8 rounded-2xl bg-purple-50 p-5 dark:bg-purple-950/30"><h2 className="text-lg font-bold">About Auragram</h2><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Auragram is a social SaaS platform for sharing thoughts, photos, videos and conversations. Sarvesh Kumar operates the platform and can be reached through the official support email above.</p></section>
      </article>
    </div>
  );
}
