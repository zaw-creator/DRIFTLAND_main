import express from 'express';
import { getEvents, getEventById, uploadEventImage } from '../controllers/eventController.js';
import { upload } from '../utils/multerConfig.js';
import { addClient } from '../utils/sseManager.js';

const router = express.Router();

// ─── SSE Routes (must be before /:id to avoid matching "stream" as an ID) ────
router.get('/stream', (req, res) => {
  // Set CORS headers for SSE
  res.set({
    'Access-Control-Allow-Origin': req.get('origin') || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();
  addClient('events-list', res);
});

router.get('/:id/stream', (req, res) => {
  // Set CORS headers for SSE
  res.set({
    'Access-Control-Allow-Origin': req.get('origin') || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();
  addClient(`event-${req.params.id}`, res);
});

// ─── REST Routes ──────────────────────────────────────────────────────────────
router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/:id/image', upload.single('image'), uploadEventImage);

export default router;
