import multer from 'multer';

function fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed for receipts'));
    }
    cb(null, true);
}

// Buffered in memory, then handed to uploadReceiptPhoto() (R2) by the route —
// no local disk write, since the host running this has no persistent filesystem.
export const uploadReceipt = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});
