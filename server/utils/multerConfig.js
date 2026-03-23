import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadEventImage } from './cloudinaryConfig.js';

// Export using the same name so existing routes don't break
export const upload = uploadEventImage;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads', 'events'));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `event-${req.params.id}-${Date.now()}${ext}`);
  },
});

// export const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
//   fileFilter(req, file, cb) {
//     if (file.mimetype.startsWith('image/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image files are allowed'));
//     }
//   },
// });
