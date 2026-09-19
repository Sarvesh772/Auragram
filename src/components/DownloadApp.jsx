import React from 'react';
import { 
  Download, Smartphone, ShieldCheck, AlertCircle, 
  CheckCircle2, ArrowRight, X, ExternalLink, HardDrive
} from 'lucide-react';

export default function DownloadApp({ onClose }) {
  // Direct APK download link (R2 or public folder)
  const apkDownloadUrl = 'https://pub-04868d5be5cb459fa1fb151b103ded5c.r2.dev/apps/app-debug.apk'; 

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">
              Download Auragram App
            </h2>
            <p className="text-xs text-slate-400">Get the native Android experience</p>
          </div>
        </div>

        {/* Download Banner Card */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg shadow-purple-500/20 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-white/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Android APK
              </span>
              <h3 className="text-base font-extrabold mt-1">Auragram for Android</h3>
              <p className="text-xs text-purple-100">Fast, lightweight & full featured</p>
            </div>
            <ShieldCheck className="w-8 h-8 text-purple-200 flex-shrink-0" />
          </div>

          <a
            href={apkDownloadUrl}
            download="Auragram.apk"
            className="w-full bg-white text-purple-700 hover:bg-purple-50 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-md active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Official APK (v1.5.0)</span>
          </a>
        </div>

        {/* Installation Steps Guide */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            How to Install (Step-by-Step)
          </h4>

          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Download APK</p>
                <p className="text-[11px] text-slate-400">Click the download button above to save the APK file.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Allow Unknown Sources</p>
                <p className="text-[11px] text-slate-400">If prompted, enable "Install from Unknown Sources" in your browser/device settings.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Install & Open</p>
                <p className="text-[11px] text-slate-400">Tap the downloaded file in your notifications or downloads folder to complete setup.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notice Box */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <span>This APK is 100% safe & verified directly by the Auragram development team.</span>
        </div>

      </div>
    </div>
  );
}