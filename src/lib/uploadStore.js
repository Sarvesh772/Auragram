import { useSyncExternalStore } from 'react';

const initialState = { isUploading: false, progress: 0, uploadedBytes: 0, totalBytes: 0, fileName: '', error: '' };
let state = { ...initialState };
const listeners = new Set();

function update(patch) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export const uploadStore = {
  getState: () => state,
  subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  start: (file) => update({ isUploading: true, progress: 0, uploadedBytes: 0, totalBytes: file.size || 0, fileName: file.name || 'Uploading file', error: '' }),
  progress: (uploadedBytes, totalBytes) => update({ isUploading: true, uploadedBytes, totalBytes, progress: totalBytes ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0 }),
  finish: () => update({ ...initialState }),
  fail: (error = '') => update({ ...initialState, error })
};

export function useUploadStore() {
  return useSyncExternalStore(uploadStore.subscribe, uploadStore.getState, uploadStore.getState);
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}
