import { useSyncExternalStore } from 'react';

const initialState = { isUploading: false, progress: 0, uploadedBytes: 0, totalBytes: 0, fileName: '', xhr: null, error: '' };
let state = { ...initialState };
const listeners = new Set();
const emit = (patch) => { state = { ...state, ...patch }; listeners.forEach((listener) => listener()); };

export const useUploadStore = Object.assign(
  () => useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => state, () => state),
  {
    getState: () => state,
    startUpload: (file) => emit({ isUploading: true, progress: 0, uploadedBytes: 0, totalBytes: file?.size || 0, fileName: file?.name || 'Uploading file', xhr: null, error: '' }),
    setXHR: (xhr) => emit({ xhr }),
    setProgress: (uploadedBytes, totalBytes) => emit({ isUploading: true, uploadedBytes, totalBytes, progress: totalBytes ? Math.min(100, Math.round(uploadedBytes / totalBytes * 100)) : 0 }),
    resetUpload: () => emit({ ...initialState }),
    failUpload: (error = '') => emit({ ...initialState, error }),
    cancelUpload: () => { if (state.xhr) state.xhr.abort(); emit({ ...initialState, error: 'Upload cancelled' }); }
  }
);

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}
