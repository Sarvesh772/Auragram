import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure these only in the serverless environment (never in Vite client code).
const client = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { key, contentType, target = 'media' } = req.body || {};
    if (!key || !contentType || !/^image\/(jpeg|png|webp|gif)|^video\//.test(contentType)) return res.status(400).json({ error: 'Invalid upload' });
    const isChat = target === 'chat';
    const bucket = isChat ? process.env.R2_CHAT_BUCKET : process.env.R2_BUCKET;
    const configuredPublicUrl = isChat ? process.env.R2_CHAT_PUBLIC_URL : process.env.R2_PUBLIC_URL;
    if (!bucket || !configuredPublicUrl) return res.status(500).json({ error: 'R2 bucket is not configured' });
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const publicBase = configuredPublicUrl.replace(/\/$/, '');
    // R2 public development URLs expose the bucket as the first path segment.
    const bucketPath = publicBase.endsWith(`/${bucket}`) ? '' : `/${bucket}`;
    return res.status(200).json({ uploadUrl, publicUrl: `${publicBase}${bucketPath}/${key}` });
  } catch (error) { return res.status(500).json({ error: 'Could not create upload URL' }); }
}
