import express from "express";
import Event from "../models/Event.js";
import {
  getEvents,
  getEventById,
  uploadEventImage,
  registerTicket,
  attachDerivedFields,
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
    "X-Accel-Buffering": "no", // Strictly tells Nginx/AWS NOT to buffer this stream
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
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. STANDARD REST API (Data Fetching & Mutations)
// ═════════════════════════════════════════════════════════════════════════════

// Fetch all active events (Optimized to filter out old events in MongoDB)
router.get("/", getEvents);

// Fetch a single event's details
router.get("/:id", getEventById);

// Upload a banner image for an event
router.post("/:id/image", upload.single("image"), uploadEventImage);

// 🧱 THE ATOMIC WALL
// Handles ticket checkouts with strict MongoDB $inc and $expr limits to prevent overselling
router.post("/:id/register", registerTicket);
export default router;
