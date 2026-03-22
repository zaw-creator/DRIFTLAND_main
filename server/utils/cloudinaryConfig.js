import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Main site events folder — completely separate from register site
const eventImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'driftland-main/events',  // ← stored here in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 600, crop: 'fill', quality: 'auto' }
    ],
  },
});

export const uploadEventImage = multer({ storage: eventImageStorage });
export default cloudinary;