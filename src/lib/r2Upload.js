export async function uploadToR2(file, folder = 'media', target = 'media') {
  const key = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const response = await fetch('/api/r2-presign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, contentType: file.type, target }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not prepare upload');
  const upload = await fetch(data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!upload.ok) throw new Error('R2 upload failed');
  return data.publicUrl;
}
