import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure these only in the serverless environment (never in Vite client code).
const client = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { key, contentType } = req.body || {};
    if (!key || !contentType || !/^image\/(jpeg|png|webp|gif)|^video\//.test(contentType)) return res.status(400).json({ error: 'Invalid upload' });
    const command = new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    return res.status(200).json({ uploadUrl, publicUrl: `${publicBase}/${key}` });
  } catch (error) { return res.status(500).json({ error: 'Could not create upload URL' }); }
}
