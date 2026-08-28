import React from 'react';
import { HelpCircle, Mail, ShieldCheck, X, MessageCircle, BookOpen, ChevronRight, ExternalLink } from 'lucide-react';

export default function HelpSupport({ onClose }) {
  const faqs = [
    { q: 'How do I reset my password?', a: 'Go to Settings > Security & Password to update your password.' },
    { q: 'How to report a post?', a: 'Tap the three dots (⋮) on any post and select "Report".' },
    { q: 'How to block a user?', a: 'Go to their profile > tap More (⋮) > Block user.' },
    { q: 'How do I save a post?', a: 'Tap the bookmark icon on any post to save it.' },
    { q: 'How do I create a story?', a: 'Tap Your Story on Home, choose a photo or video, add text or filters, select who can view it, then share.' },
    { q: 'How do I choose Close Friends for a story?', a: 'During story sharing, choose Close Friends and select the people who should see it.' },
    { q: 'How do I create a reel?', a: 'Open Reels, choose the create option, select your video, add a caption or music, then publish.' },
    { q: 'How do I edit my profile?', a: 'Open Profile or Settings > Edit Profile to update your name, username, bio and photo.' },
    { q: 'How do I share a profile or post?', a: 'Use the copy/share icon. Profile links open the selected user directly.' },
    { q: 'Why can’t I see someone’s content?', a: 'They may have blocked you, their content may be private, or you may have muted them.' },
    { q: 'How do notifications work?', a: 'Likes, comments, replies, follows, mentions and messages appear in Notifications.' },
    { q: 'How do I switch Light/Dark mode?', a: 'Open Settings > Appearance and choose Light or Dark.' },
    { q: 'How do I update the app?', a: 'Web users can reload from the update banner. APK users must install a new APK for native updates.' },
    { q: 'How do I cancel account deletion?', a: 'Sign in before the scheduled date and choose Cancel deletion on the recovery screen.' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full h-full bg-white dark:bg-slate-900 overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 p-5 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Help & Support</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">We're here to help you 24/7</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-110"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Quick Contact */}
          <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-5 border border-purple-100 dark:border-purple-800/30">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-slate-800 dark:text-white">Need urgent help?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              For account recovery, safety concerns, or any urgent issues, contact our support team.
            </p>
            <a 
              href="mailto:support@auragram.in" 
              className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-bold text-white hover:bg-purple-700 transition-all hover:shadow-lg hover:shadow-purple-500/25"
            >
              <Mail className="h-4 w-4" />
              support@auragram.in
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          </div>

          {/* FAQs */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Frequently Asked Questions
            </h3>
            <div className="space-y-2.5">
              {faqs.map((faq, idx) => (
                <details key={idx} className="group rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{faq.q}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform duration-200" />
                  </summary>
                  <div className="px-4 pb-3 pt-1 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Community */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">Join our community</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Connect with other Auragram users</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-slate-400 pt-2">
            Response time: Usually within 24-48 hours
          </p>
        </div>
      </div>
    </div>
  );
}
