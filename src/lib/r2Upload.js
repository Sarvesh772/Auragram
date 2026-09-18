export async function uploadToR2(file, folder = 'avatars', target = 'avatar') {
  const key = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  let response;
  try {
    response = await fetch('/api/r2-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, contentType: file.type, target })
    });
  } catch (error) {
    throw new Error('R2 upload API is unavailable. Run the app with Vercel dev or deploy to Vercel so /api/r2-presign exists.');
  }

  let data;
  const rawText = await response.text();
  if (rawText) {
    try { data = JSON.parse(rawText); }
    catch {
      throw new Error(`R2 upload API returned an invalid response (${response.status}). Run the project with Vercel dev or deploy to Vercel.`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Could not prepare upload (${response.status})`);
  }

  const upload = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!upload.ok) throw new Error('R2 upload failed');
  return data.publicUrl;
}
