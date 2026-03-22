import { v2 as cloudinary } from 'cloudinary';
import { createRequire } from 'module';
import multer from 'multer';

const require = createRequire(import.meta.url);
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const eventImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'driftland-main/events',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation:  [
      { width: 1200, height: 600, crop: 'fill', quality: 'auto' }
    ],
  },
});

export const uploadEventImage = multer({ storage: eventImageStorage });
export default cloudinary;