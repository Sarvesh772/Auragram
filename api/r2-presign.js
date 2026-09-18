import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const client = new S3Client({ 
  region: 'auto', 
  endpoint: process.env.R2_ENDPOINT, 
  credentials: { 
    accessKeyId: process.env.R2_ACCESS_KEY_ID, 
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY 
  } 
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { key, contentType, target = 'media' } = req.body || {};
    
    if (!key || !contentType || !/^image\/(jpeg|png|webp|gif)|^video\//.test(contentType)) {
      return res.status(400).json({ error: 'Invalid upload format' });
    }
    
    if (typeof key !== 'string' || key.length > 512 || key.includes('..') || key.startsWith('/') || /[^a-zA-Z0-9_./-]/.test(key)) {
      return res.status(400).json({ error: 'Invalid object key' });
    }

    const isChat = target === 'chat';
    const isStory = target === 'story';
    const isAvatar = target === 'avatar' || target === 'profile';

    // Prefix validation match
    const allowedPrefix = isChat ? 'chat/' : isStory ? 'stories/' : isAvatar ? 'avatars/' : 'posts/';
    if (!key.startsWith(allowedPrefix)) {
      return res.status(400).json({ error: `Invalid upload folder. Key must start with ${allowedPrefix}` });
    }

    // Dynamic Bucket selection with safe fallbacks
    let bucket = process.env.R2_BUCKET || process.env.NEXT_PUBLIC_R2_BUCKET;
    let configuredPublicUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    if (isAvatar) {
      bucket = process.env.R2_AVATAR_BUCKET_NAME || 'avatar';
      configuredPublicUrl = process.env.NEXT_PUBLIC_R2_AVATAR_PUBLIC_URL || configuredPublicUrl;
    } else if (isStory) {
      bucket = process.env.R2_STORY_BUCKET_NAME || bucket;
    } else if (isChat) {
      bucket = process.env.R2_CHAT_BUCKET_NAME || bucket;
    }

    if (!bucket || !configuredPublicUrl) {
      return res.status(500).json({ 
        error: 'R2 Environment Variables missing for selected target', 
        details: { bucket: !!bucket, publicUrl: !!configuredPublicUrl } 
      });
    }

    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    const publicBase = configuredPublicUrl.replace(/\/$/, '');
    const finalPublicUrl = `${publicBase}/${key}`;

    return res.status(200).json({ uploadUrl, publicUrl: finalPublicUrl });
  } catch (error) { 
    console.error('R2 presign error:', error); 
    return res.status(500).json({ error: `Could not create upload URL: ${error.message}` }); 
  }
}