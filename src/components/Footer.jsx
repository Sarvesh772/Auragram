import React from 'react';
import { Link } from 'react-router-dom';

export const REGISTERED_BUSINESS_ADDRESS = 'Shemara Jamalpur, Mirzapur, Uttar Pradesh - 231302, India';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          <div><Link to="/" className="text-xl font-black text-purple-600">Auragram</Link><p className="mt-3 max-w-sm text-sm leading-6">A social platform for sharing thoughts, photos, reels and conversations.</p></div>
          <div><h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Company</h2><nav className="mt-3 flex flex-col items-start gap-2 text-sm font-semibold"><Link to="/about" className="hover:text-purple-600">About Us</Link><Link to="/contact" className="hover:text-purple-600">Contact Us</Link></nav></div>
          <div><h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Legal</h2><nav className="mt-3 flex flex-col items-start gap-2 text-sm font-semibold"><Link to="/privacy" className="hover:text-purple-600">Privacy Policy</Link><Link to="/terms" className="hover:text-purple-600">Terms &amp; Conditions</Link><Link to="/refund-cancellation" className="hover:text-purple-600">Refund &amp; Cancellation Policy</Link></nav></div>
        </div>
        <div className="mt-8 grid gap-2 border-t border-slate-200 pt-5 text-xs leading-5 dark:border-slate-800 md:grid-cols-2">
          <p><strong>Official email:</strong> <a href="mailto:support@auragram.in" className="font-semibold text-purple-600 hover:underline">support@auragram.in</a><span className="mx-2 text-slate-300">|</span><strong>Phone:</strong> <a href="tel:+916307728381" className="font-semibold text-purple-600 hover:underline">+91 6307728381</a></p>
          <p className="md:text-right"><strong>Registered office:</strong> {REGISTERED_BUSINESS_ADDRESS}</p>
        </div>
        <p className="mt-5 text-xs text-slate-400">© {new Date().getFullYear()} Auragram. All rights reserved.</p>
      </div>
    </footer>
  );
}
