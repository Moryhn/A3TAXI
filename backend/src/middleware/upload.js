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

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function templateFileFilter(req, file, cb) {
    if (file.mimetype !== XLSX_MIME && !file.originalname.toLowerCase().endsWith('.xlsx')) {
        return cb(new Error('Only .xlsx files are allowed for invoice templates'));
    }
    cb(null, true);
}

export const uploadTemplate = multer({
    storage: multer.memoryStorage(),
    fileFilter: templateFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

// multer's own errors (rejected file type, size limit) reach Express's error
// middleware as a generic 500 unless caught here first — this turns them back
// into the 400 they actually are before they hit the global handler.
export function multerErrors(uploadMiddleware) {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) return res.status(400).json({ error: err.message });
            next();
        });
    };
}
