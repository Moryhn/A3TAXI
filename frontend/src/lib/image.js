// Phone camera photos can be 5-10MB, which times out or gets cut off mid-upload
// on a weak cellular connection (surfaces server-side as a multipart parse error).
// Downscaling + re-encoding as JPEG in-browser keeps uploads small and fast.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

export function compressImage(file) {
    if (!file || !file.type.startsWith('image/')) return Promise.resolve(file);

    return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
                (blob) => {
                    if (!blob || blob.size >= file.size) return resolve(file);
                    resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
                },
                'image/jpeg',
                JPEG_QUALITY
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };

        img.src = objectUrl;
    });
}
