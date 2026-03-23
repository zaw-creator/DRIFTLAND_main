import express from "express";
import Event from "../models/Event.js";
import {
  getEvents,
  getEventById,
  uploadEventImage,
  registerTicket,
  attachDerivedFields,
  getLeaderboard,
  getBracket,
} from "../controllers/eventController.js";
import { upload } from "../utils/multerConfig.js";
import { addClient } from "../utils/sseManager.js";

const router = express.Router();

// ═════════════════════════════════════════════════════════════════════════════
// 1. REAL-TIME ENGINE (Server-Sent Events)
// These routes must be defined BEFORE '/:id' so Express doesn't treat 'stream' as an ID
// ═════════════════════════════════════════════════════════════════════════════

// 🟢 GLOBAL FEED STREAM: Pushes updates to the main '/events' page
router.get("/stream", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": req.get("origin") || "*",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // 🛡️ Proxy Bypass: Forces Nginx/AWS to stream instantly
  });
  res.flushHeaders();
  addClient("events-list", res);
});

router.get("/:id/stream", async (req, res) => {
  // 🛡️ THE PROXY BYPASS
  res.set({
    "Access-Control-Allow-Origin": req.get("origin") || "*",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // prevent nginx buffering
  });
  res.flushHeaders();

  const eventId = req.params.id;
  addClient(`event-${eventId}`, res);

  // 🚀 SYNC ON CONNECT
  // The moment the tunnel opens, fetch the absolute truth from the DB and push it down.
  // This overwrites any "stale" data the user got from the Next.js cache.
  try {
    const event = await Event.findById(eventId).lean();
    if (event) {
      const enrichedEvent = attachDerivedFields(event);
      res.write(
        `event: event-updated\ndata: ${JSON.stringify(enrichedEvent)}\n\n`,
      );
    }
  } catch (err) {
    console.error(`Sync on Connect failed for event ${eventId}:`, err);
  }
  addClient(`event-${req.params.id}`, res);
});

// ── REST routes ───────────────────────────────────────────────────────────────
router.get("/", getEvents);
// ── new: leaderboard + bracket (must be before /:id to avoid ID collision) ───
router.get("/:id/leaderboard", getLeaderboard);
router.get("/:id/bracket", getBracket);
// 🧱 THE ATOMIC WALL
router.post("/:id/register", registerTicket);
router.get("/:id", getEventById);
router.post("/:id/image", upload.single("image"), uploadEventImage);

export default router;
