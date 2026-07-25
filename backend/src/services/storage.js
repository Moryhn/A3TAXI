import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Receipt photos and invoice templates are the files this app stores —
// uploaded straight to Cloudinary so they survive backend redeploys (Render's
// free tier has no persistent disk).
export function uploadReceiptPhoto(file) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'a3taxi-receipts', resource_type: 'image' },
            (err, result) => (err ? reject(err) : resolve(result.secure_url))
        );
        stream.end(file.buffer);
    });
}

// Per-client invoice templates (.xlsx) — not an image, so resource_type
// 'raw' skips Cloudinary's image pipeline (no transforms/thumbnails needed).
export function uploadInvoiceTemplate(buffer, clientAccountId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: `a3taxi-invoice-templates/${clientAccountId}`, resource_type: 'raw' },
            (err, result) => (err ? reject(err) : resolve(result.secure_url))
        );
        stream.end(buffer);
    });
}
