import React, { useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';

export default function RefundCancellation({ onBack }) {
  const [hindi, setHindi] = useState(false);
  const sections = [
    {
      title: '1. Subscription & Digital Verification Fees',
      body: 'All payments made for profile verification (including the "Blue Tick" verification badge), digital feature subscriptions, or premium services on Auragram are final, non-refundable, and non-transferable.'
    },
    {
      title: '2. No Refunds',
      body: 'Once a subscription or verification service has been purchased and processed successfully, no full or partial refunds will be issued under any circumstances, including but not limited to:',
      bullets: [
        'User decision to discontinue using the platform.',
        'Accidental or duplicate purchases initiated by the user.',
        'Account suspension or termination due to a violation of our Terms of Service.'
      ]
    },
    {
      title: '3. Cancellation Policy',
      body: 'Subscriptions and digital feature activations are processed immediately upon payment completion. Therefore, cancellations for activated billing cycles are not applicable, and users are responsible for managing their intended purchases before authorizing transactions.'
    },
    {
      title: '4. Technical Failures & Contact',
      body: 'If your payment was debited from your account but the verification status or digital service was not activated due to a technical error, please reach out to our support team with payment proof at support@auragram.in. Verified technical failures will be resolved or credited accordingly within 5-7 business days.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white md:p-8">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900 md:p-10">
        <button 
          onClick={onBack} 
          className="mb-8 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-950/50">
            <RotateCcw className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-purple-600">Auragram</p>
            <h1 className="text-3xl font-black">{hindi ? 'रिफंड और कैंसिलेशन नीति' : 'Refund &amp; Cancellation Policy'}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last updated: September 24, 2026</p>
          </div>
          </div>
          <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800"><button onClick={() => setHindi(false)} className={!hindi ? 'rounded-lg bg-white px-2 py-1 text-purple-600 shadow-sm dark:bg-slate-700' : 'px-2 py-1 text-slate-500'}>English</button><button onClick={() => setHindi(true)} className={hindi ? 'rounded-lg bg-white px-2 py-1 text-purple-600 shadow-sm dark:bg-slate-700' : 'px-2 py-1 text-slate-500'}>हिन्दी</button></div>
        </div>

        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
          {hindi ? 'Auragram चुनने के लिए धन्यवाद।' : 'Thank you for choosing Auragram.'}
        </p>

        {(hindi ? sections.map((section, index) => ({ ...section, title: ['1. Subscription और Digital Verification Fees', '2. रिफंड उपलब्ध नहीं है', '3. कैंसिलेशन नीति', '4. तकनीकी समस्या और संपर्क'][index], body: ['Profile verification, Blue Tick, digital subscription या Premium service के लिए किए गए सभी payment final, non-refundable और non-transferable हैं।', 'Payment process होने के बाद किसी भी परिस्थिति में full या partial refund नहीं दिया जाएगा।', 'Subscription और digital features payment के तुरंत बाद activate होते हैं, इसलिए activated billing cycle को cancel नहीं किया जा सकता।', 'Payment कट गया लेकिन service activate नहीं हुई तो payment proof के साथ support@auragram.in पर संपर्क करें। Verified technical issue को 5-7 business days में resolve या credit किया जाएगा।'][index], bullets: index === 1 ? ['Platform का उपयोग बंद करना', 'गलती से या duplicate purchase', 'Terms violation के कारण account suspension या termination'] : undefined })) : sections).map(({ title, body, bullets }) => (
          <section key={title} className="border-t border-slate-100 py-5 dark:border-slate-800">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{body}</p>
            {bullets && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {bullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
