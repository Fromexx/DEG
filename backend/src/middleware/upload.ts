import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => {
        const ext = path.extname(file.originalname);
        callback(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
});

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ
    fileFilter: (req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        if (!ok) {
            return cb(new Error('Only images allowed'));
        }
        cb(null, true);
    },
});