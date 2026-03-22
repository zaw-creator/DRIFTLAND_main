import Event from '../models/Event.js';
import { computeStatus } from '../utils/computeStatus.js';
import { broadcast } from '../utils/sseManager.js';
import { endEvent } from '../utils/eventLifecycle.js';

const ALLOWED_UPDATE_FIELDS = [
  'name', 'description', 'eventDate', 'location', 'registrationDeadline',
  'editDeadlineHours', 'driveTypes', 'classes', 'participantCapacity',
  'participantRegisteredCount', 'riderCapacity', 'riderRegisteredCount',
  'waitlistCount', 'image', 'startTime', 'endTime', 'enabledRoles',
];

function attachDerivedFields(event) {
  const classes = event.classes || [];
  const driverTotalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);
  const driverTotalRegisteredCount = classes.reduce((sum, c) => sum + c.registeredCount, 0);
  const isDriverFull = classes.length > 0 && classes.every((c) => c.registeredCount >= c.capacity);
  const isParticipantFull =
    event.participantCapacity > 0 &&
    event.participantRegisteredCount >= event.participantCapacity;
  const isRiderFull =
    event.riderCapacity > 0 && event.riderRegisteredCount >= event.riderCapacity;

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

// GET /api/admin/events
export async function getAdminEvents(req, res) {
  try {
    const events = await Event.find().lean().sort({ eventDate: -1 });
    const enriched = events.map(attachDerivedFields);
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('getAdminEvents error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
}

// GET /api/admin/events/:id
export async function getAdminEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: attachDerivedFields(event) });
  } catch (err) {
    console.error('getAdminEventById error:', err);
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch event' });
  }
}

// POST /api/admin/events
export async function createEvent(req, res) {
  try {
    const { name, eventDate, location } = req.body;
    if (!name || !eventDate || !location) {
      return res.status(400).json({ success: false, message: 'name, eventDate, and location are required' });
    }
    const event = await Event.create(req.body);
    res.status(201).json({ success: true, data: event.toJSON() });
  } catch (err) {
    console.error('createEvent error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Failed to create event' });
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

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).lean();

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const enriched = attachDerivedFields(event);

    broadcast(`event-${enriched._id}`, 'event-updated', {
      classes:                    enriched.classes,
      participantRegisteredCount: enriched.participantRegisteredCount,
      riderRegisteredCount:       enriched.riderRegisteredCount,
      waitlistCount:              enriched.waitlistCount,
      isDriverFull:               enriched.isDriverFull,
      isParticipantFull:          enriched.isParticipantFull,
      isRiderFull:                enriched.isRiderFull,
      enabledRoles:               enriched.enabledRoles,
    });

    broadcast('events-list', 'event-updated', {
      _id:                        enriched._id,
      driverTotalRegisteredCount: enriched.driverTotalRegisteredCount,
      driverTotalCapacity:        enriched.driverTotalCapacity,
      isDriverFull:               enriched.isDriverFull,
      status:                     enriched.status,
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('updateEvent error:', err);
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Failed to update event' });
  }
}

// DELETE /api/admin/events/:id
export async function deleteEvent(req, res) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('deleteEvent error:', err);
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
}

// POST /api/admin/events/:id/image
export async function uploadAdminEventImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Cloudinary returns the URL in req.file.path
    const imageUrl = req.file.path;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { image: imageUrl },
      { new: true }
    ).lean();

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error('uploadAdminEventImage error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
}

// GET /api/admin/events/:id/drivers
export async function getApprovedDrivers(req, res) {
  try {
    const event = await Event.findById(req.params.id).select('registerEventId');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    if (!event.registerEventId) {
      return res.status(400).json({ success: false, message: 'No register event linked. Set a Register Event ID first.' });
    }

    const response = await fetch(
      `${process.env.REGISTER_API_URL}/api/events/${event.registerEventId}/approved-drivers`,
      { headers: { 'x-api-key': process.env.REGISTER_API_KEY } }
    );

    if (!response.ok) {
      return res.status(502).json({ success: false, message: 'Failed to fetch drivers from register DB' });
    }

    const json = await response.json();
    // unwrap nested data — register site returns { success, data: [...] }
    const drivers = json.data ?? json;
    res.json({ success: true, data: Array.isArray(drivers) ? drivers : [] });
  } catch (err) {
    console.error('getApprovedDrivers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch approved drivers' });
  }
}

// PUT /api/admin/events/:id/leaderboard/:driverId
export async function updateDriverScore(req, res) {
  try {
    const { id, driverId } = req.params;
    const { score, driverName, driveType } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const entry = event.leaderboard.find((d) => d.driverId === driverId);
    if (entry) {
      entry.qualifyScore = score;
    } else {
      event.leaderboard.push({ driverId, driverName, driveType, qualifyScore: score });
    }

    // Recompute ranks per driveType — sorted descending by score
    // ['drift', 'timeattack'].forEach((type) => {
    //   const group = event.leaderboard
    //     .filter((d) => d.driveType === type)
    //     .sort((a, b) => b.qualifyScore - a.qualifyScore);
    //   group.forEach((d, i) => { d.qualifyRank = i + 1; });
    // });
const driveTypes  = ['Drift', 'Time Attack'];
const classMap    = {
  'Drift':       ['Class A', 'Class B', 'Class C'],
  'Time Attack': ['AWD', 'RWD', 'FWD'],
};

driveTypes.forEach((driveType) => {
  (classMap[driveType] || []).forEach((cls) => {
    const group = event.leaderboard
      .filter((d) => d.driveType === driveType && d.class === cls)
      .sort((a, b) => b.qualifyScore - a.qualifyScore);
    group.forEach((d, i) => { d.qualifyRank = i + 1; });
  });
});
    await event.save();

    broadcast(`event-${id}`, 'event-updated', {
      type: 'LEADERBOARD_UPDATE',
      leaderboard: event.leaderboard,
    });

    res.json({ success: true, data: event.leaderboard });
  } catch (err) {
    console.error('updateDriverScore error:', err);
    res.status(500).json({ success: false, message: 'Failed to update score' });
  }
}

// POST /api/admin/events/:id/bracket/generate
export async function generateBracket(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const DRIFT_CLASSES = ['Class A', 'Class B', 'Class C'];
    const matches = [];
    let hasAtLeastOneClass = false;

    DRIFT_CLASSES.forEach((cls) => {
      // Match driveType case-insensitively and match class
      const classDrivers = event.leaderboard
        .filter((d) =>
          d.driveType?.toLowerCase() === 'drift' &&
          d.class === cls &&
          !d.eliminated
        )
        .sort((a, b) => a.qualifyRank - b.qualifyRank);

      // Skip this class if fewer than 2 drivers
      if (classDrivers.length < 2) return;

      hasAtLeastOneClass = true;

      // Pad to nearest power of 2 for bye slots
      const padded = [...classDrivers];
      const n = Math.pow(2, Math.ceil(Math.log2(padded.length)));
      while (padded.length < n) padded.push(null);

      // Seed: #1 vs last, #2 vs 2nd last, etc.
      const classPrefix = cls.replace(' ', ''); // 'ClassA', 'ClassB', 'ClassC'
      for (let i = 0; i < n / 2; i++) {
        const top    = padded[i];
        const bottom = padded[n - 1 - i];
        matches.push({
          matchId:   `${classPrefix}-R1-M${i + 1}`,
          round:     'round1',
          roundNum:  1,
          class:     cls,
          driver1Id: top    ? top.driverId    : null,
          driver2Id: bottom ? bottom.driverId : null,
          winnerId:  !bottom ? top.driverId   : null,
          status:    !bottom ? 'completed'    : 'pending',
        });
      }
    });

    if (!hasAtLeastOneClass) {
      return res.status(400).json({
        success: false,
        message: 'Need at least 2 drift drivers in at least one class to generate a bracket',
      });
    }

    event.bracket          = matches;
    event.bracketGenerated = true;
    await event.save();

    broadcast(`event-${req.params.id}`, 'event-updated', {
      type:    'BRACKET_GENERATED',
      bracket: event.bracket,
    });

    res.json({ success: true, data: event.bracket });
  } catch (err) {
    console.error('generateBracket error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate bracket' });
  }
}

// PUT /api/admin/events/:id/bracket/:matchId/winner
export async function setMatchWinner(req, res) {
  try {
    const { id, matchId } = req.params;
    const { winnerId } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const match = event.bracket.find((m) => m.matchId === matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    if (match.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Match already completed' });
    }

    const loserId = match.driver1Id === winnerId ? match.driver2Id : match.driver1Id;
    match.winnerId = winnerId;
    match.status   = 'completed';

    const winner = event.leaderboard.find((d) => d.driverId === winnerId);
    const loser  = event.leaderboard.find((d) => d.driverId === loserId);
    if (winner) winner.wins += 1;
    if (loser)  { loser.losses += 1; loser.eliminated = true; }

    // Auto-generate next round if all matches in current round are done
    const currentRound = match.roundNum;
    const roundMatches = event.bracket.filter((m) => m.roundNum === currentRound);
    const allDone      = roundMatches.every((m) => m.status === 'completed');

    if (allDone) {
      const winners = roundMatches.map((m) => m.winnerId).filter(Boolean);
      if (winners.length > 1) {
        const nextRound = currentRound + 1;
        const roundName = winners.length === 2 ? 'final' : `round${nextRound}`;
        for (let i = 0; i < winners.length; i += 2) {
          event.bracket.push({
            matchId:   `R${nextRound}-M${Math.floor(i / 2) + 1}`,
            round:     roundName,
            roundNum:  nextRound,
            driver1Id: winners[i],
            driver2Id: winners[i + 1] || null,
            winnerId:  winners[i + 1] ? null : winners[i],
            status:    winners[i + 1] ? 'pending' : 'completed',
          });
        }
      }
    }

    await event.save();

    broadcast(`event-${id}`, 'event-updated', {
      type:        'BRACKET_UPDATE',
      bracket:     event.bracket,
      leaderboard: event.leaderboard,
    });

    res.json({ success: true, data: { bracket: event.bracket, leaderboard: event.leaderboard } });
  } catch (err) {
    console.error('setMatchWinner error:', err);
    res.status(500).json({ success: false, message: 'Failed to set match winner' });
  }
}

// POST /api/admin/events/:id/safety-rules
export async function addSafetyRule(req, res) {
  try {
    const { category, description, mandatory } = req.body;
    if (!category || !description) {
      return res.status(400).json({ success: false, message: 'category and description are required' });
    }
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $push: { safetyRules: { category, description, mandatory: mandatory ?? true } } },
      { new: true }
    );
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event.safetyRules });
  } catch (err) {
    console.error('addSafetyRule error:', err);
    res.status(500).json({ success: false, message: 'Failed to add safety rule' });
  }
}

// PUT /api/admin/events/:id/safety-rules/:index
export async function updateSafetyRule(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const index = parseInt(req.params.index);
    if (index < 0 || index >= event.safetyRules.length) {
      return res.status(404).json({ success: false, message: 'Safety rule not found' });
    }
    event.safetyRules[index] = { ...event.safetyRules[index].toObject(), ...req.body };
    await event.save();
    res.json({ success: true, data: event.safetyRules });
  } catch (err) {
    console.error('updateSafetyRule error:', err);
    res.status(500).json({ success: false, message: 'Failed to update safety rule' });
  }
}

// DELETE /api/admin/events/:id/safety-rules/:index
export async function deleteSafetyRule(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const index = parseInt(req.params.index);
    if (index < 0 || index >= event.safetyRules.length) {
      return res.status(404).json({ success: false, message: 'Safety rule not found' });
    }
    event.safetyRules.splice(index, 1);
    await event.save();
    res.json({ success: true, data: event.safetyRules });
  } catch (err) {
    console.error('deleteSafetyRule error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete safety rule' });
  }
}

// POST /api/admin/events/:id/end
export async function forceEndEvent(req, res) {
  try {
    await endEvent(req.params.id);
    res.json({ success: true, message: 'Event ended and data pushed to register DB' });
  } catch (err) {
    console.error('forceEndEvent error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/admin/events/:id
export async function patchEvent(req, res) {
  try {
    const allowed = ['registerEventId', 'status'];
    const update  = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });
    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error('patchEvent error:', err);
    res.status(500).json({ success: false, message: 'Failed to patch event' });
  }
}
// GET /api/admin/events/register-site/events
export async function getRegisterSiteEvents(req, res) {
  try {
    const response = await fetch(
      `${process.env.REGISTER_API_URL}/api/events`,
      { headers: { 'x-api-key': process.env.REGISTER_API_KEY } }
    );
    if (!response.ok) {
      return res.status(502).json({ success: false, message: 'Failed to fetch register site events' });
    }
    const data = await response.json();
    res.json({ success: true, data: data.data ?? data });
  } catch (err) {
    console.error('getRegisterSiteEvents error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}