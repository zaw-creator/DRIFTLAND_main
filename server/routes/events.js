import express from 'express';
import { getEvents, getEventById, uploadEventImage } from '../controllers/eventController.js';
import { upload } from '../utils/multerConfig.js';

const router = express.Router();

// ─── Routes ──────────────────────────────────────────────────────────────────
router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/:id/image', upload.single('image'), uploadEventImage);

export default router;
