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
    const events = await Event.find().lean().sort({ eventDate: 1 });

    const enriched = events
      .map(attachDerivedFields)
      .filter(
        (event) =>
          req.query.includeAll === "true" || event.status !== "previous",
      )
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
    //Change to Cloudinary URL, from the multer upload middleware.
    // In production, this would be the Cloudinary URL returned by the upload middleware
    const imageUrl = req.file.path;

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

// GET /api/events/:id/leaderboard
// GET /api/events/:id/leaderboard
export async function getLeaderboard(req, res) {
  try {
    const event = await Event.findById(req.params.id).select(
      "registerEventId status top5 leaderboard",
    );

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Archived — serve stored top5 directly
    if (event.status === "archived") {
      return res.json({ success: true, source: "top5", data: event.top5 });
    }

    // No register event linked — return main DB leaderboard as-is
    if (!event.registerEventId) {
      return res.json({
        success: true,
        source: "main",
        data: event.leaderboard,
      });
    }

    // Fetch driver list from register DB
    const response = await fetch(
      `${process.env.REGISTER_API_URL}/api/events/${event.registerEventId}/leaderboard`,
      { headers: { "x-api-key": process.env.REGISTER_API_KEY } },
    );

    if (!response.ok) {
      // Fallback to main DB if register DB is unreachable
      return res.json({
        success: true,
        source: "main",
        data: event.leaderboard,
      });
    }

    const json = await response.json();
    const registerDrivers = json.data ?? [];

    // Merge register DB driver list with main DB scores
    const merged = registerDrivers.map((driver) => {
      const mainEntry = event.leaderboard.find(
        (d) => d.driverId === driver.driverId.toString(),
      );
      return {
        ...driver,
        qualifyScore: mainEntry?.qualifyScore ?? 0,
        qualifyRank: mainEntry?.qualifyRank ?? 0,
        wins: mainEntry?.wins ?? 0,
        losses: mainEntry?.losses ?? 0,
        eliminated: mainEntry?.eliminated ?? false,
        class: mainEntry?.class ?? driver.class,
      };
    });

    res.json({ success: true, source: "register", data: merged });
  } catch (err) {
    console.error("getLeaderboard error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch leaderboard" });
  }
}

export async function getBracket(req, res) {
  try {
    const event = await Event.findById(req.params.id).select(
      "bracket bracketGenerated",
    );

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Return bracket and generated flag directly — not nested under data
    res.json({
      success: true,
      bracket: event.bracket ?? [],
      generated: event.bracketGenerated ?? false,
    });
  } catch (err) {
    console.error("getBracket error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bracket" });
  }
}
