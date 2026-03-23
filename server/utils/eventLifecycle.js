import Event from '../models/Event.js';
import { broadcast } from './sseManager.js';

export async function checkAndEndEvents() {
  const now = new Date();
  const toEnd = await Event.find({ status: 'active', eventDate: { $lte: now } });
  for (const event of toEnd) {
    await endEvent(event._id.toString());
  }
}

export async function endEvent(eventId) {
  const event = await Event.findById(eventId);
  if (!event || event.status === 'ended' || event.status === 'archived') return;

  const now = new Date();

  // Carve out top 5 per driveType before clearing
  const top5 = [];
  ['drift', 'timeattack'].forEach((type) => {
    event.leaderboard
      .filter((d) => d.driveType === type)
      .sort((a, b) => a.qualifyRank - b.qualifyRank)
      .slice(0, 5)
      .forEach((d) => top5.push({
        driverId:    d.driverId,
        driverName:  d.driverName,
        driveType:   d.driveType,
        qualifyRank: d.qualifyRank,
        wins:        d.wins,
        losses:      d.losses,
      }));
  });

  event.status             = 'ended';
  event.endedAt            = now;
  event.top5               = top5;
  event.cleanupScheduledAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await event.save();

  await pushToRegisterDB(event);

  broadcast(`event-${eventId}`, 'event-updated', {
    type:    'EVENT_ENDED',
    eventId,
  });
}

export async function pushToRegisterDB(event) {
  if (!event.registerEventId || !process.env.REGISTER_API_URL) return;

  try {
    const payload = {
      scores: event.leaderboard.map((d) => ({
        driverId:     d.driverId,
        driveType:    d.driveType,
        qualifyScore: d.qualifyScore,
        qualifyRank:  d.qualifyRank,
        wins:         d.wins,
        losses:       d.losses,
        eliminated:   d.eliminated,
      })),
      bracket:     event.bracket,
      safetyRules: event.safetyRules,
      top5:        event.top5,
      endedAt:     event.endedAt,
    };

    const res = await fetch(
      `${process.env.REGISTER_API_URL}/api/events/${event.registerEventId}/results`,
      {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key':    process.env.REGISTER_API_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      await Event.findByIdAndUpdate(event._id, { pushedToRegisterAt: new Date() });
    } else {
      console.error('Push to register DB failed with status:', res.status);
    }
  } catch (err) {
    console.error('Push to register DB failed:', err.message);
  }
}

export async function cleanupExpiredData() {
  const now = new Date();
  const toClean = await Event.find({
    status:             'ended',
    cleanupScheduledAt: { $lte: now },
    dataCleanedAt:      null,
    pushedToRegisterAt: { $ne: null },
  });

  for (const event of toClean) {
    await Event.findByIdAndUpdate(event._id, {
      $set: {
        leaderboard:   [],
        safetyRules:   [],
        status:        'archived',
        dataCleanedAt: now,
      },
    });
    console.log(`Cleaned up event ${event._id} (${event.name})`);
  }
}