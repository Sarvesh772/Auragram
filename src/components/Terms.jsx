import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Terms({ onBack }) {
  const sections = [
    ['User Conduct & Content Policy', 'Use Auragram respectfully. Do not post illegal, abusive, hateful, misleading or infringing content, and do not attempt to compromise another account.'],
    ['Account Termination', 'We may restrict or terminate accounts that violate these terms or endanger the community. You may delete your account from Settings.'],
    ['Intellectual Property', 'You retain rights to content you create. By posting, you grant Auragram a limited license to display it as needed to operate the service.'],
    ['Limitation of Liability', 'Auragram is provided on an “as available” basis. We work to keep the service reliable but cannot guarantee uninterrupted access or loss-free storage.'],
    ['Changes to Terms', 'We may update these terms as the service evolves. Continued use after an update means you accept the revised terms.']
  ];
  return <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white md:p-8"><div className="mx-auto max-w-3xl"><button onClick={onBack} className="mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> Back</button><div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 md:p-10"><div className="mb-8 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950/50"><FileText className="h-7 w-7" /></div><div><h1 className="text-3xl font-black">Terms of Service</h1><p className="text-sm text-slate-500 dark:text-slate-400">Last updated: August 2026</p></div></div>{sections.map(([title, body]) => <section key={title} className="border-t border-slate-100 py-5 dark:border-slate-800"><h2 className="text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{body}</p></section>)}</div></div></div>;
}
