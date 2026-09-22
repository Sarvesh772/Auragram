const BASE_URL = (typeof window !== 'undefined' && (window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost'))
  ? 'https://www.auragram.in'
  : '';

export async function uploadToR2(file, folder = 'posts', target = 'media') {
  const cleanFolder = folder.replace(/\/+$/, '');
  const key = `${cleanFolder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}/api/r2-presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, contentType: file.type, target })
    });
  } catch (error) {
    throw new Error('R2 upload API is unavailable.');
  }

  let data;
  const rawText = await response.text();
  if (rawText) {
    try { 
      data = JSON.parse(rawText); 
    } catch {
      throw new Error(`R2 upload API returned an invalid response (${response.status}).`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Could not prepare upload (${response.status})`);
  }

  const upload = await fetch(data.uploadUrl, { 
    method: 'PUT', 
    headers: { 'Content-Type': file.type }, 
    body: file 
  });
  
  if (!upload.ok) throw new Error('R2 upload failed');
  return data.publicUrl;
}