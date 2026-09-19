import React from 'react';
import {
  Download,
  Smartphone,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

export default function DownloadApp({ onClose }) {
  // Cloudflare R2 direct APK URL
  const apkDownloadUrl =
    'https://pub-04868d5be5cb459fa1fb151b103ded5c.r2.dev/apps/app-debug.apk';

  const steps = [
    {
      number: 1,
      title: 'Download Official APK',
      description:
        'Auragram ke download page par “Download Official APK (v1.5.0)” button par tap karein.',
      image: '/auragram-install/step-1.jpg',
    },
    {
      number: 2,
      title: 'Download Anyway',
      description:
        'Browser agar “File might be harmful” warning dikhaye, to source verify karein aur trusted source hone par “Download anyway” par tap karein.',
      image: '/auragram-install/step-2.jpg',
    },
    {
      number: 3,
      title: 'Download Complete',
      description:
        'Download complete hone ke baad Downloads section mein app-debug.apk file dikhai degi.',
      image: '/auragram-install/step-3.jpg',
    },
    {
      number: 4,
      title: 'Open APK File',
      description:
        'Downloads mein app-debug.apk par tap karein. Android installation screen par Auragram app ka naam aur icon dikhai dega.',
      image: '/auragram-install/step-4.jpg',
    },
    {
      number: 5,
      title: 'Tap Install',
      description:
        '“Do you want to install this app?” screen par “Install” button par tap karein.',
      image: '/auragram-install/step-5.jpg',
    },
    {
      number: 6,
      title: 'Scan with Play Protect',
      description:
        'Google Play Protect agar “App scan recommended” dikhaye, to “Scan app” par tap karein aur scan complete hone dein.',
      image: '/auragram-install/step-6.jpg',
    },
    {
      number: 7,
      title: 'Check Security Result',
      description:
        'Agar Play Protect “This app looks safe” dikhata hai, to “Install” par tap karke installation continue karein.',
      image: '/auragram-install/step-7.jpg',
    },
    {
      number: 8,
      title: 'App Installed',
      description:
        '“App installed.” message aane ke baad “Open” par tap karke Auragram launch karein.',
      image: '/auragram-install/step-8.jpg',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">

      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-800 relative">

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 p-2 rounded-full
          bg-white/90 dark:bg-slate-800/90
          text-slate-400 hover:text-slate-700
          dark:hover:text-white
          shadow-sm transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center space-x-3 pr-8">
            <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">
                Download Auragram App
              </h2>

              <p className="text-xs text-slate-400">
                Official Android APK installation guide
              </p>
            </div>
          </div>

          {/* Download Banner */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg shadow-purple-500/20 space-y-3">

            <div className="flex justify-between items-start">

              <div>
                <span className="bg-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Official Android APK
                </span>

                <h3 className="text-base font-extrabold mt-2">
                  Auragram for Android
                </h3>

                <p className="text-xs text-purple-100">
                  Fast, lightweight & full featured
                </p>
              </div>

              <ShieldCheck className="w-8 h-8 text-purple-200 flex-shrink-0" />
            </div>

            {/* Download Button */}
            <a
              href={apkDownloadUrl}
              download="Auragram.apk"
              className="w-full bg-white text-purple-700
              hover:bg-purple-50
              font-bold py-3 px-4 rounded-xl
              text-xs sm:text-sm transition
              flex items-center justify-center
              space-x-2 shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />

              <span>
                Download Official APK (v1.5.0)
              </span>
            </a>
          </div>

          {/* Guide Heading */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              How to Install
            </h4>

            <p className="text-[11px] text-slate-400 mt-1">
              Follow these simple steps to install Auragram.
            </p>
          </div>

          {/* Installation Steps */}
          <div className="space-y-5">

            {steps.map((step) => (
              <div
                key={step.number}
                className="overflow-hidden rounded-2xl
                bg-slate-50 dark:bg-slate-800/60
                border border-slate-100 dark:border-slate-700
                shadow-sm"
              >

                {/* Step Header */}
                <div className="p-3 sm:p-4 flex items-start gap-3">

                  <span
                    className="w-7 h-7 rounded-full
                    bg-purple-600 text-white
                    font-bold flex items-center justify-center
                    text-xs flex-shrink-0"
                  >
                    {step.number}
                  </span>

                  <div className="min-w-0">

                    <p className="font-bold text-sm text-slate-800 dark:text-white">
                      {step.title}
                    </p>

                    <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400 mt-1">
                      {step.description}
                    </p>

                  </div>
                </div>

                {/* Screenshot */}
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">

                  <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">

                    <img
                      src={step.image}
                      alt={`Auragram installation step ${step.number}`}
                      loading="lazy"
                      className="w-full h-auto block"
                    />

                  </div>

                </div>

              </div>
            ))}

          </div>

          {/* Play Protect Information */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">

            <div className="flex items-start gap-2">

              <CheckCircle2
                className="w-4 h-4 text-emerald-600
                dark:text-emerald-400 flex-shrink-0 mt-0.5"
              />

              <div>

                <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  Google Play Protect
                </p>

                <p className="text-[10px] leading-4 text-emerald-700 dark:text-emerald-400 mt-0.5">
                  The provided installation screenshot shows Play Protect
                  reporting: “This app looks safe.”
                </p>

              </div>

            </div>

          </div>

          {/* Security Warning */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">

            <div className="flex items-start gap-2">

              <AlertTriangle
                className="w-4 h-4 text-amber-600
                dark:text-amber-400 flex-shrink-0 mt-0.5"
              />

              <p className="text-[10px] leading-4 text-amber-800 dark:text-amber-300">
                APK ko sirf trusted/official source se download karein.
                “Download anyway” select karne se pehle source verify karein.
                Play Protect scan available ho to scan karna recommended hai.
              </p>

            </div>

          </div>

          {/* Bottom Download Button */}
          <a
            href={apkDownloadUrl}
            download="Auragram.apk"
            className="w-full bg-purple-600
            hover:bg-purple-700
            text-white font-bold py-3.5
            rounded-xl text-sm
            transition flex items-center
            justify-center gap-2
            shadow-lg shadow-purple-500/20
            active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download Auragram APK
          </a>

          {/* Version */}
          <p className="text-center text-[10px] text-slate-400">
            Auragram Android APK • Version 1.5.0
          </p>

        </div>
      </div>
    </div>
  );
}