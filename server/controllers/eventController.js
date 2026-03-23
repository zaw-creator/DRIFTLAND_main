import Event from "../models/Event.js";
import { computeStatus } from "../utils/computeStatus.js";
import { broadcast } from "../utils/sseManager.js";

const STATUS_ORDER = { ongoing: 0, nearby: 1, upcoming: 2, previous: 3 };

/**
 * Computes and attaches derived fields that were defined as Mongoose virtuals.
 * We compute them here explicitly for lean() responses to ensure JSON serialization.
 */
export function attachDerivedFields(event) {
  const classes = event.classes || [];

  const driverTotalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);
  const driverTotalRegisteredCount = classes.reduce(
    (sum, c) => sum + c.registeredCount,
    0,
  );
  const isDriverFull =
    classes.length > 0 && classes.every((c) => c.registeredCount >= c.capacity);
  const isParticipantFull =
    event.participantCapacity > 0 &&
    event.participantRegisteredCount >= event.participantCapacity;
  const isRiderFull =
    event.riderCapacity > 0 &&
    event.riderRegisteredCount >= event.riderCapacity;

  return {
    ...event,
    status: computeStatus(event),
    driverTotalCapacity,
    driverTotalRegisteredCount,
    isDriverFull,
    isParticipantFull,
    isRiderFull,
  };
}

// GET /api/events
export async function getEvents(req, res) {
  try {
    const includeAll = req.query.includeAll === "true";

    // 🚀 Premium DB Optimization: The "Memory Fix"
    // Instead of loading 500 past events into Node.js RAM, we filter them at the database level.
    // We subtract 1 day from "now" to account for global timezone overlaps safely.
    let dbQuery = {};
    if (!includeAll) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      dbQuery = { eventDate: { $gte: yesterday } };
    }

    // Only the relevant events are pulled into server memory
    const events = await Event.find(dbQuery).lean().sort({ eventDate: 1 });

    // Attach derived fields and apply your exact strict status logic
    const enriched = events
      .map(attachDerivedFields)
      .filter((event) => includeAll || event.status !== "previous")
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(a.eventDate) - new Date(b.eventDate);
      });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("getEvents error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
}

// GET /api/events/:id
export async function getEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id).lean();

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, data: attachDerivedFields(event) });
  } catch (err) {
    console.error("getEventById error:", err);
    if (err.name === "CastError") {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.status(500).json({ success: false, message: "Failed to fetch event" });
  }
}

// POST /api/events/:id/image
export async function uploadEventImage(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file provided" });
    }

    const imageUrl = `/uploads/events/${req.file.filename}`;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { image: imageUrl },
      { new: true },
    ).lean();

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error("uploadEventImage error:", err);
    res.status(500).json({ success: false, message: "Failed to upload image" });
  }
}

// POST /api/events/:id/register
export async function registerTicket(req, res) {
  const { id } = req.params;
  const { role, className } = req.body; // e.g., role: 'Participant', or role: 'Driver', className: 'AWT'

  try {
    let updatedEvent;

    // 🧱 THE ATOMIC WALL: Handle based on the selected role
    if (role === "Participant") {
      updatedEvent = await Event.findOneAndUpdate(
        {
          _id: id,
          // Database STRICTLY checks this before doing anything
          $expr: {
            $lt: ["$participantRegisteredCount", "$participantCapacity"],
          },
        },
        { $inc: { participantRegisteredCount: 1 } }, // Atomically adds 1
        { new: true },
      ).lean();
    } else if (role === "Rider") {
      updatedEvent = await Event.findOneAndUpdate(
        {
          _id: id,
          $expr: { $lt: ["$riderRegisteredCount", "$riderCapacity"] },
        },
        { $inc: { riderRegisteredCount: 1 } },
        { new: true },
      ).lean();
    } else if (role === "Driver") {
      // For drivers, we must target the specific class array element
      updatedEvent = await Event.findOneAndUpdate(
        {
          _id: id,
          // Find the exact class and ensure it has room
          classes: {
            $elemMatch: {
              name: className,
              $expr: { $lt: ["$registeredCount", "$capacity"] },
            },
          },
        },
        // Increment that specific class's count
        { $inc: { "classes.$.registeredCount": 1 } },
        { new: true },
      ).lean();
    }

    // ⛔ IF NULL: The transaction bounced off the wall.
    // This means another user bought the exact last ticket milliseconds before this request.
    if (!updatedEvent) {
      return res.status(409).json({
        success: false,
        message:
          "Registration failed. The selected class or role is completely sold out.",
      });
    }

    // 🟢 IF SUCCESS: Calculate derived fields and instantly tell the SSE radio!
    const enrichedEvent = attachDerivedFields(updatedEvent);

    // 🚀 THE REAL-TIME BYPASS IN ACTION:
    // Instantly push the new capacity to everyone looking at the website
    broadcast(`event-${id}`, "event-updated", enrichedEvent);
    broadcast("events-list", "event-updated", enrichedEvent);

    res.json({ success: true, message: "Registration successful!" });
  } catch (err) {
    console.error("Registration error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error during checkout" });
  }
}
