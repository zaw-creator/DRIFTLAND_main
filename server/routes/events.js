import express from 'express';
import {
  getEvents,
  getEventById,
  uploadEventImage,
  getLeaderboard,
  getBracket,
} from '../controllers/eventController.js';
import { upload } from '../utils/multerConfig.js';
import { addClient } from '../utils/sseManager.js';

const router = express.Router();

// ── SSE routes (must be before /:id to avoid matching "stream" as an ID) ─────
router.get('/stream', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin':      req.get('origin') || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type':                     'text/event-stream',
    'Cache-Control':                    'no-cache',
    'Connection':                       'keep-alive',
  });
  res.flushHeaders();
  addClient('events-list', res);
});

router.get('/:id/stream', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin':      req.get('origin') || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type':                     'text/event-stream',
    'Cache-Control':                    'no-cache',
    'Connection':                       'keep-alive',
  });
  res.flushHeaders();
  addClient(`event-${req.params.id}`, res);
});

// ── REST routes ───────────────────────────────────────────────────────────────
router.get('/',    getEvents);
// ── new: leaderboard + bracket (must be before /:id to avoid ID collision) ───
router.get('/:id/leaderboard', getLeaderboard);
router.get('/:id/bracket',     getBracket);
router.get('/:id', getEventById);
router.post('/:id/image', upload.single('image'), uploadEventImage);



export default router;