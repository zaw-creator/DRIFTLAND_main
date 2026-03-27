import express from 'express';
import { verifyToken, requireAdmin } from '../../middleware/auth.js';
import { uploadGalleryImage } from '../../utils/cloudinaryConfig.js';
import {
  getGallery,
  uploadGalleryItem,
  deleteGalleryItem,
} from '../../controllers/galleryController.js';

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get('/',           getGallery);
router.post('/',          uploadGalleryImage.single('image'), uploadGalleryItem);
router.delete('/:id',     deleteGalleryItem);

export default router;
