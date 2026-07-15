import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Receipt photos are the only files this app stores — uploaded straight to R2 so
// they survive backend redeploys (Render's free tier has no persistent disk).
export async function uploadReceiptPhoto(file) {
    const ext = path.extname(file.originalname);
    const key = `receipts/${Date.now()}-${crypto.randomUUID()}${ext}`;

    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    }));

    return `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
}
