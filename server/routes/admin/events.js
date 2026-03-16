import express from 'express';
import { verifyToken, requireAdmin } from '../../middleware/auth.js';
import { upload } from '../../utils/multerConfig.js';
import {
  getAdminEvents,
  getAdminEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  uploadAdminEventImage,
} from '../../controllers/adminEventController.js';

const router = express.Router();

// All routes require a valid admin JWT
router.use(verifyToken, requireAdmin);

router.get('/', getAdminEvents);
router.post('/', createEvent);
router.get('/:id', getAdminEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.post('/:id/image', upload.single('image'), uploadAdminEventImage);

export default router;
