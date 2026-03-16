import Event from '../models/Event.js';
import { computeStatus } from '../utils/computeStatus.js';

const STATUS_ORDER = { ongoing: 0, nearby: 1, upcoming: 2, previous: 3 };

/**
 * Computes and attaches derived fields that were defined as Mongoose virtuals.
 * We compute them here explicitly for lean() responses to ensure JSON serialization.
 */
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

// GET /api/events
// Query: ?includeAll=true to include previous events
export async function getEvents(req, res) {
  try {
    const events = await Event.find().lean().sort({ eventDate: 1 });

    const enriched = events
      .map(attachDerivedFields)
      .filter((event) => req.query.includeAll === 'true' || event.status !== 'previous')
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        return new Date(a.eventDate) - new Date(b.eventDate);
      });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('getEvents error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
}

// GET /api/events/:id
export async function getEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id).lean();

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: attachDerivedFields(event) });
  } catch (err) {
    console.error('getEventById error:', err);
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch event' });
  }
}

// POST /api/events/:id/image  (Multer handles file, called after upload middleware)
export async function uploadEventImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const imageUrl = `/uploads/events/${req.file.filename}`;

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
    console.error('uploadEventImage error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
}
