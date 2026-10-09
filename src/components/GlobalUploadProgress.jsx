import React from 'react';
import { UploadCloud, X } from 'lucide-react';
import { formatBytes, useUploadStore } from '../store/useUploadStore';

export default function GlobalUploadProgress() {
  const upload = useUploadStore();
  if (!upload.isUploading) return null;
  return <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-[120] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-purple-100 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-purple-900/50 dark:bg-slate-900/95 md:bottom-5 md:right-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-purple-100 p-2 text-purple-600 dark:bg-purple-950/50"><UploadCloud className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold text-slate-800 dark:text-white">Uploading {upload.fileName}</p><span className="shrink-0 text-xs font-black text-purple-600">{upload.progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 transition-[width] duration-200" style={{ width: `${upload.progress}%` }} /></div><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{formatBytes(upload.uploadedBytes)} / {formatBytes(upload.totalBytes)}</p></div><button type="button" aria-label="Cancel upload" onClick={useUploadStore.cancelUpload} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button></div></div>;
}
