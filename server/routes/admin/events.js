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
  getApprovedDrivers,
  updateDriverScore,
  generateBracket,
  setMatchWinner,
  addSafetyRule,
  updateSafetyRule,
  deleteSafetyRule,
  forceEndEvent,
  patchEvent,
  getRegisterSiteEvents,
} from '../../controllers/adminEventController.js';

const router = express.Router();

router.use(verifyToken, requireAdmin);

// ── static routes first (must be before /:id) ─────────────────────────────────
router.get('/',                        getAdminEvents);
router.post('/',                       createEvent);
router.get('/register-site/events',    getRegisterSiteEvents);

// ── /:id routes ───────────────────────────────────────────────────────────────
router.get('/:id',                             getAdminEventById);
router.put('/:id',                             updateEvent);
router.delete('/:id',                          deleteEvent);
router.patch('/:id',                           patchEvent);
router.post('/:id/image',                      upload.single('image'), uploadAdminEventImage);
router.post('/:id/end',                        forceEndEvent);
router.post('/:id/safety-rules',               addSafetyRule);
router.put('/:id/safety-rules/:index',         updateSafetyRule);
router.delete('/:id/safety-rules/:index',      deleteSafetyRule);
router.get('/:id/drivers',                     getApprovedDrivers);
router.put('/:id/leaderboard/:driverId',       updateDriverScore);
router.post('/:id/bracket/generate',           generateBracket);
router.put('/:id/bracket/:matchId/winner',     setMatchWinner);

export default router;