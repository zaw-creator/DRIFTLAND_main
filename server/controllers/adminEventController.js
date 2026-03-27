import Event from "../models/Event.js";
import { computeStatus } from "../utils/computeStatus.js";
import { broadcast } from "../utils/sseManager.js";
import { endEvent } from "../utils/eventLifecycle.js";

const ALLOWED_UPDATE_FIELDS = [
  "name",
  "description",
  "eventDate",
  "eventEndDate",
  "location",
  "registrationDeadline",
  "editDeadlineHours",
  "driveTypes",
  "classes",
  "participantCapacity",
  "participantRegisteredCount",
  "riderCapacity",
  "riderRegisteredCount",
  "waitlistCount",
  "image",
  "startTime",
  "endTime",
  "enabledRoles",
];

function attachDerivedFields(event) {
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

/**
 * reapplyCutoffs — shared helper called after any qualifying rank recompute.
 *
 * Problem it solves:
 *   setCutoff() marks drivers as eliminated based on their rank AT THAT MOMENT.
 *   If a score is later corrected and ranks shift, the eliminated flags become
 *   stale — a driver who moved from rank 9 to rank 3 stays eliminated: true.
 *
 * How it works:
 *   Reads every saved cutoff from event.qualifyingCutoffs (a Mongoose Map keyed
 *   by "driveType__className") and re-applies the threshold to the now-current
 *   qualifyRank values.  Must be called AFTER qualifyRank has been recomputed.
 *
 * @param {Document} event  Mongoose Event document (not lean — must be mutable)
 */
function reapplyCutoffs(event) {
  // Nothing to do if no cutoffs have been set yet
  if (!event.qualifyingCutoffs || event.qualifyingCutoffs.size === 0) return;

  for (const [key, cutoff] of event.qualifyingCutoffs.entries()) {
    // Key format: "Drift__Class A", "Time Attack__Class AWD", etc.
    const [driveType, cls] = key.split("__");

    // Gather every leaderboard entry in this driveType + class group
    const group = event.leaderboard
      .filter(
        (d) =>
          d.driveType === driveType &&
          d.class?.trim().toLowerCase() === cls?.trim().toLowerCase(),
      )
      // Sort ascending so index 0 = rank 1 (best score)
      .sort((a, b) => a.qualifyRank - b.qualifyRank);

    group.forEach((d, i) => {
      // Drivers at index < cutoff advance; index >= cutoff are eliminated
      d.eliminated = i >= cutoff;
    });
  }
}

// GET /api/admin/events
export async function getAdminEvents(req, res) {
  try {
    const events = await Event.find().lean().sort({ eventDate: -1 });
    const enriched = events.map(attachDerivedFields);
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("getAdminEvents error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
}

// GET /api/admin/events/:id
export async function getAdminEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Convert Map to plain object for JSON serialization
    if (event.qualifyingCutoffs instanceof Map) {
      event.qualifyingCutoffs = Object.fromEntries(event.qualifyingCutoffs);
    }

    res.json({ success: true, data: attachDerivedFields(event) });
  } catch (err) {
    console.error("getAdminEventById error:", err);
    if (err.name === "CastError") {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.status(500).json({ success: false, message: "Failed to fetch event" });
  }
}

// POST /api/admin/events
export async function createEvent(req, res) {
  try {
    const { name, eventDate, location } = req.body;
    if (!name || !eventDate || !location) {
      return res.status(400).json({
        success: false,
        message: "name, eventDate, and location are required",
      });
    }
    const event = await Event.create(req.body);
    res.status(201).json({ success: true, data: event.toJSON() });
  } catch (err) {
    console.error("createEvent error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Failed to create event" });
  }
}

// PUT /api/admin/events/:id
export async function updateEvent(req, res) {
  try {
    const updates = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const event = await Event.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const enriched = attachDerivedFields(event);

    broadcast(`event-${enriched._id}`, "event-updated", {
      classes: enriched.classes,
      participantRegisteredCount: enriched.participantRegisteredCount,
      riderRegisteredCount: enriched.riderRegisteredCount,
      waitlistCount: enriched.waitlistCount,
      isDriverFull: enriched.isDriverFull,
      isParticipantFull: enriched.isParticipantFull,
      isRiderFull: enriched.isRiderFull,
      enabledRoles: enriched.enabledRoles,
    });

    broadcast("events-list", "event-updated", {
      _id: enriched._id,
      driverTotalRegisteredCount: enriched.driverTotalRegisteredCount,
      driverTotalCapacity: enriched.driverTotalCapacity,
      isDriverFull: enriched.isDriverFull,
      status: enriched.status,
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("updateEvent error:", err);
    if (err.name === "CastError") {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Failed to update event" });
  }
}

// DELETE /api/admin/events/:id
export async function deleteEvent(req, res) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("deleteEvent error:", err);
    if (err.name === "CastError") {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.status(500).json({ success: false, message: "Failed to delete event" });
  }
}

// POST /api/admin/events/:id/image
export async function uploadAdminEventImage(req, res) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file provided" });
    }

    // Cloudinary returns the URL in req.file.path
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
    console.error("uploadAdminEventImage error:", err);
    res.status(500).json({ success: false, message: "Failed to upload image" });
  }
}

// GET /api/admin/events/:id/drivers
export async function getApprovedDrivers(req, res) {
  try {
    const event = await Event.findById(req.params.id).select("registerEventId");
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    if (!event.registerEventId) {
      return res.status(400).json({
        success: false,
        message: "No register event linked. Set a Register Event ID first.",
      });
    }

    const response = await fetch(
      `${process.env.REGISTER_API_URL}/api/events/${event.registerEventId}/approved-drivers`,
      { headers: { "x-api-key": process.env.REGISTER_API_KEY } },
    );

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Failed to fetch drivers from register DB",
      });
    }

    const json = await response.json();
    // unwrap nested data — register site returns { success, data: [...] }
    const drivers = json.data ?? json;
    res.json({ success: true, data: Array.isArray(drivers) ? drivers : [] });
  } catch (err) {
    console.error("getApprovedDrivers error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch approved drivers" });
  }
}

// PUT /api/admin/events/:id/leaderboard/:driverId
export async function updateDriverScore(req, res) {
  try {
    const { id, driverId } = req.params;
    const { score, driverName, driveType, class: driverClass } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Match by driverId + class combo — one driver can race in multiple classes
    const entry = event.leaderboard.find(
      (d) => d.driverId === driverId && d.class === (driverClass || null),
    );

    if (entry) {
      entry.qualifyScore = score;
    } else {
      event.leaderboard.push({
        driverId,
        driverName,
        driveType,
        class: driverClass || null,
        qualifyScore: score,
        qualifyRank: 0,
        wins: 0,
        losses: 0,
        eliminated: false,
      });
    }

    // Recompute ranks per driveType + class separately
    const driveTypes = ["Drift", "Time Attack"];
    const classMap = {
      Drift: ["Class A", "Class B", "Class C"],
      "Time Attack": ["Class AWD", "Class RWD", "Class FWD"],
    };

    driveTypes.forEach((type) => {
      (classMap[type] || []).forEach((cls) => {
        const group = event.leaderboard
          .filter((d) => d.driveType === type && d.class === cls)
          .sort((a, b) => b.qualifyScore - a.qualifyScore);
        group.forEach((d, i) => {
          d.qualifyRank = i + 1;
        });
      });

      // Handle unassigned class
      const unassigned = event.leaderboard
        .filter(
          (d) => d.driveType === type && (!d.class || d.class === "pending"),
        )
        .sort((a, b) => b.qualifyScore - a.qualifyScore);
      unassigned.forEach((d, i) => {
        d.qualifyRank = i + 1;
      });
    });

    // Re-apply any saved qualifying cutoffs so that drivers whose rank changed
    // due to this score update get the correct eliminated flag immediately.
    // Without this, a driver corrected from rank 9 → rank 3 would stay eliminated.
    reapplyCutoffs(event);

    await event.save();

    broadcast(`event-${id}`, "event-updated", {
      type: "LEADERBOARD_UPDATE",
      leaderboard: event.leaderboard,
    });

    res.json({ success: true, data: event.leaderboard });
  } catch (err) {
    console.error("updateDriverScore error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update score" });
  }
}

// POST /api/admin/events/:id/leaderboard/bulk
export async function saveAllScores(req, res) {
  try {
    const { id } = req.params;
    const { scores } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    for (const item of scores) {
      const normalizeClass = (cls) => cls?.trim().toLowerCase() || "";

      const entry = event.leaderboard.find(
        (d) =>
          String(d.driverId) === String(item.driverId) &&
          normalizeClass(d.class) === normalizeClass(item.class),
      );

      if (entry) {
        entry.qualifyScore = Number(item.score);
        entry.driverName = item.driverName;
        entry.driveType = item.driveType;
        entry.class = item.class || null;
      } else {
        event.leaderboard.push({
          driverId: String(item.driverId),
          driverName: item.driverName,
          driveType: item.driveType,
          class: item.class || null,
          qualifyScore: Number(item.score),
          qualifyRank: 0,
          wins: 0,
          losses: 0,
          eliminated: false,
        });
      }
    }

    // Recompute ranks — separate per driveType + class
    const driveTypes = ["Drift", "Time Attack"];
    const classMap = {
      Drift: ["Class A", "Class B", "Class C"],
      "Time Attack": ["Class AWD", "Class RWD", "Class FWD"],
    };

    driveTypes.forEach((type) => {
      (classMap[type] || []).forEach((cls) => {
        const group = event.leaderboard
          .filter(
            (d) =>
              d.driveType === type &&
              d.class?.trim().toLowerCase() === cls.toLowerCase(),
          )
          .sort((a, b) => b.qualifyScore - a.qualifyScore);
        group.forEach((d, i) => {
          d.qualifyRank = i + 1;
        });
      });

      // Handle unassigned
      const unassigned = event.leaderboard
        .filter(
          (d) =>
            d.driveType === type &&
            (!d.class || d.class === "pending" || d.class === "Unassigned"),
        )
        .sort((a, b) => b.qualifyScore - a.qualifyScore);
      unassigned.forEach((d, i) => {
        d.qualifyRank = i + 1;
      });
    });

    // Re-apply any saved qualifying cutoffs across the freshly recomputed ranks.
    // Bulk score uploads can shift many ranks at once, so every cutoff group
    // needs to be re-evaluated against the new order.
    reapplyCutoffs(event);

    // Tell Mongoose the leaderboard array was modified
    event.markModified("leaderboard");
    await event.save();

    broadcast(`event-${id}`, "event-updated", {
      type: "LEADERBOARD_UPDATE",
      leaderboard: event.leaderboard,
    });

    res.json({ success: true, data: event.leaderboard });
  } catch (err) {
    console.error("saveAllScores error:", err.message);
    res.status(500).json({ success: false, message: "Failed to save scores" });
  }
}

export async function generateBracket(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Check if regenerating — if bracket exists, clear it first
    const isRegenerate = event.bracketGenerated;

    const DRIFT_CLASSES = ["Class A", "Class B", "Class C"];
    const matches = [];
    let hasAtLeastOneClass = false;

    DRIFT_CLASSES.forEach((cls) => {
      const classDrivers = event.leaderboard
        .filter(
          (d) =>
            (d.driveType === "Drift" || d.driveType === "drift") &&
            d.class?.trim().toLowerCase() === cls.toLowerCase() &&
            !d.eliminated &&
            d.qualifyScore > 0,
        )
        .sort((a, b) => a.qualifyRank - b.qualifyRank);

      if (classDrivers.length < 2) return;

      hasAtLeastOneClass = true;

      const padded = [...classDrivers];
      const n = Math.pow(2, Math.ceil(Math.log2(padded.length)));
      while (padded.length < n) padded.push(null);

      const classPrefix = cls.replace(" ", "");
      for (let i = 0; i < n / 2; i++) {
        const top = padded[i];
        const bottom = padded[n - 1 - i];
        matches.push({
          matchId: `${classPrefix}-R1-M${i + 1}`,
          round: "round1",
          roundNum: 1,
          class: cls,
          driver1Id: top ? top.driverId : null,
          driver2Id: bottom ? bottom.driverId : null,
          winnerId: !bottom ? top.driverId : null,
          status: !bottom ? "completed" : "pending",
        });
      }
    });

    if (!hasAtLeastOneClass) {
      return res.status(400).json({
        success: false,
        message:
          "No drift class has 2 or more drivers with scores. Enter qualifying scores first.",
      });
    }

    // Clear existing bracket and regenerate from scratch
    event.bracket = matches;
    event.bracketGenerated = true;
    await event.save();

    broadcast(`event-${req.params.id}`, "event-updated", {
      type: isRegenerate ? "BRACKET_REGENERATED" : "BRACKET_GENERATED",
      bracket: event.bracket,
      regenerated: isRegenerate,
    });

    res.json({
      success: true,
      data: event.bracket,
      regenerated: isRegenerate,
    });
  } catch (err) {
    console.error("generateBracket error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate bracket" });
  }
}

// GET /api/admin/events/:id/scores
export async function getEventScores(req, res) {
  try {
    const event = await Event.findById(req.params.id).select(
      "leaderboard qualifyingCutoffs",
    );
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Convert Map to plain object
    const cutoffs =
      event.qualifyingCutoffs instanceof Map
        ? Object.fromEntries(event.qualifyingCutoffs)
        : event.qualifyingCutoffs || {};

    res.json({
      success: true,
      data: event.leaderboard,
      cutoffs, // include cutoffs in scores response too
    });
  } catch (err) {
    console.error("getEventScores error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch scores" });
  }
}
// PUT /api/admin/events/:id/bracket/:matchId/winner
export async function setMatchWinner(req, res) {
  try {
    const { id, matchId } = req.params;
    const { winnerId } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const match = event.bracket.find((m) => m.matchId === matchId);
    if (!match) {
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });
    }
    if (match.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Match already completed" });
    }

    const loserId =
      match.driver1Id === winnerId ? match.driver2Id : match.driver1Id;
    match.winnerId = winnerId;
    match.status = "completed";
    const matchClass = match.class;

    // Update wins/losses on leaderboard
    const winner = event.leaderboard.find((d) => d.driverId === winnerId);
    const loser = event.leaderboard.find((d) => d.driverId === loserId);
    if (winner) winner.wins += 1;
    if (loser) {
      loser.losses += 1;
      loser.eliminated = true;
    }

    // Check if all matches in this class + round are done
    const currentRound = match.roundNum;
    const roundMatches = event.bracket.filter(
      (m) => m.roundNum === currentRound && m.class === matchClass,
    );
    const allDone = roundMatches.every((m) => m.status === "completed");

    if (allDone) {
      // Collect winners from this round for this class
      const roundWinners = roundMatches.map((m) => m.winnerId).filter(Boolean);

      if (roundWinners.length > 1) {
        // Generate next round matches for this class
        const nextRound = currentRound + 1;
        const totalLeft = roundWinners.length;
        let roundName;

        if (totalLeft === 2) roundName = "final";
        else if (totalLeft === 4) roundName = "semifinal";
        else roundName = `round${nextRound}`;

        const classPrefix = matchClass.replace(" ", "");

        for (let i = 0; i < roundWinners.length; i += 2) {
          const d1 = roundWinners[i];
          const d2 = roundWinners[i + 1] || null;
          event.bracket.push({
            matchId: `${classPrefix}-R${nextRound}-M${Math.floor(i / 2) + 1}`,
            round: roundName,
            roundNum: nextRound,
            class: matchClass,
            driver1Id: d1,
            driver2Id: d2,
            winnerId: d2 ? null : d1,
            status: d2 ? "pending" : "completed",
          });
        }
      } else if (roundWinners.length === 1) {
        // This class has a champion
        console.log(`Champion for ${matchClass}: ${roundWinners[0]}`);
      }
    }

    event.markModified("bracket");
    event.markModified("leaderboard");
    await event.save();

    broadcast(`event-${id}`, "event-updated", {
      type: "BRACKET_UPDATE",
      bracket: event.bracket,
      leaderboard: event.leaderboard,
    });

    res.json({
      success: true,
      data: { bracket: event.bracket, leaderboard: event.leaderboard },
    });
  } catch (err) {
    console.error("setMatchWinner error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to set match winner" });
  }
}

// POST /api/admin/events/:id/cutoff
export async function setCutoff(req, res) {
  try {
    const { id } = req.params;
    const { driveType, class: cls, cutoff } = req.body;

    // Cutoff must be even and at least 2
    if (cutoff % 2 !== 0 || cutoff < 2) {
      return res
        .status(400)
        .json({ success: false, message: "Cutoff must be an even number" });
    }

    const event = await Event.findById(id);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    // 🚀 THE PROGRESSION LOCK: Protect the historical data
    if (event.bracketGenerated) {
      return res.status(403).json({
        success: false,
        message:
          "LOCKED: You cannot change qualifying cutoffs after the tournament has started.",
      });
    }

    const key = `${driveType}__${cls}`;
    event.qualifyingCutoffs.set(key, cutoff);

    // Apply cutoff ONLY if the tournament hasn't started
    const group = event.leaderboard
      .filter(
        (d) =>
          d.driveType === driveType &&
          d.class?.trim().toLowerCase() === cls.trim().toLowerCase(),
      )
      .sort((a, b) => a.qualifyRank - b.qualifyRank);

    group.forEach((d, i) => {
      d.eliminated = i >= cutoff;
    });

    event.markModified("leaderboard");
    event.markModified("qualifyingCutoffs");
    await event.save();

    // Push updated eliminated flags to all clients watching this event.
    // Without this broadcast, the admin panel and any live viewers would only
    // see the new elimination state after a manual page refresh.
    broadcast(`event-${id}`, "event-updated", {
      type: "LEADERBOARD_UPDATE",
      leaderboard: event.leaderboard,
    });

    res.json({ success: true, data: event.leaderboard });
  } catch (err) {
    console.error("setCutoff error:", err.message);
    res.status(500).json({ success: false, message: "Failed to set cutoff" });
  }
}

// POST /api/admin/events/:id/safety-rules
export async function addSafetyRule(req, res) {
  try {
    const { category, description, mandatory } = req.body;
    if (!category || !description) {
      return res.status(400).json({
        success: false,
        message: "category and description are required",
      });
    }
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          safetyRules: { category, description, mandatory: mandatory ?? true },
        },
      },
      { new: true },
    );
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.json({ success: true, data: event.safetyRules });
  } catch (err) {
    console.error("addSafetyRule error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to add safety rule" });
  }
}

// PUT /api/admin/events/:id/safety-rules/:index
export async function updateSafetyRule(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    const index = parseInt(req.params.index);
    if (index < 0 || index >= event.safetyRules.length) {
      return res
        .status(404)
        .json({ success: false, message: "Safety rule not found" });
    }
    event.safetyRules[index] = {
      ...event.safetyRules[index].toObject(),
      ...req.body,
    };
    await event.save();
    res.json({ success: true, data: event.safetyRules });
  } catch (err) {
    console.error("updateSafetyRule error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update safety rule" });
  }
}

// DELETE /api/admin/events/:id/safety-rules/:index
export async function deleteSafetyRule(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    const index = parseInt(req.params.index);
    if (index < 0 || index >= event.safetyRules.length) {
      return res
        .status(404)
        .json({ success: false, message: "Safety rule not found" });
    }
    event.safetyRules.splice(index, 1);
    await event.save();
    res.json({ success: true, data: event.safetyRules });
  } catch (err) {
    console.error("deleteSafetyRule error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete safety rule" });
  }
}

// POST /api/admin/events/:id/end
export async function forceEndEvent(req, res) {
  try {
    await endEvent(req.params.id);
    res.json({
      success: true,
      message: "Event ended and data pushed to register DB",
    });
  } catch (err) {
    console.error("forceEndEvent error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/admin/events/:id
export async function patchEvent(req, res) {
  try {
    const allowed = ["registerEventId", "status"];
    const update = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });
    const event = await Event.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error("patchEvent error:", err);
    res.status(500).json({ success: false, message: "Failed to patch event" });
  }
}
// GET /api/admin/events/register-site/events
export async function getRegisterSiteEvents(req, res) {
  try {
    const response = await fetch(`${process.env.REGISTER_API_URL}/api/events`, {
      headers: { "x-api-key": process.env.REGISTER_API_KEY },
    });
    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Failed to fetch register site events",
      });
    }
    const data = await response.json();
    res.json({ success: true, data: data.data ?? data });
  } catch (err) {
    console.error("getRegisterSiteEvents error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
