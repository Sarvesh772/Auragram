const BASE_URL = (typeof window !== 'undefined' && (window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost'))
  ? 'https://www.auragram.in'
  : '';
import { supabase } from '../supabaseClient';
import { useUploadStore } from '../store/useUploadStore';
import { uploadWithProgress } from '../utils/uploadWithProgress';

export async function uploadToR2(file, folder = 'posts', target = 'media') {
  useUploadStore.startUpload(file);
  let session;
  try {
    ({ data: { session } } = await supabase.auth.getSession());
  } catch {
    useUploadStore.failUpload('Please sign in again before uploading.');
    throw new Error('Please sign in again before uploading.');
  }
  if (!session?.access_token) { useUploadStore.failUpload('Please sign in again before uploading.'); throw new Error('Please sign in again before uploading.'); }
  const cleanFolder = folder.replace(/\/+$/, '');
  const key = `${cleanFolder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}/api/r2-presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ key, contentType: file.type, target })
    });
  } catch (error) {
    useUploadStore.failUpload(error.message);
    throw new Error('R2 upload API is unavailable.');
  }

  let data;
  const rawText = await response.text();
  if (rawText) {
    try { 
      data = JSON.parse(rawText); 
    } catch {
      useUploadStore.failUpload(`R2 upload API returned an invalid response (${response.status}).`);
      throw new Error(`R2 upload API returned an invalid response (${response.status}).`);
    }
  }

  if (!response.ok) {
    const message = data?.error || `Could not prepare upload (${response.status})`;
    useUploadStore.failUpload(message);
    throw new Error(message);
  }

  let upload;
  try {
    upload = await uploadWithProgress(file, data.uploadUrl, file.type);
  } catch {
    const bucketType = target === 'avatar' || target === 'profile' ? 'avatar bucket' : 'R2 bucket';
    useUploadStore.failUpload(`R2 ${bucketType} upload failed.`);
    throw new Error(`R2 ${bucketType} blocked the APK upload. Add capacitor://localhost to that bucket's CORS Allowed Origins.`);
  }
  if (upload.status < 200 || upload.status >= 300) { useUploadStore.failUpload('R2 upload failed'); throw new Error('R2 upload failed'); }
  return data.publicUrl;
}
