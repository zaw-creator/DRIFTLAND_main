import Event from '../models/Event.js';
import { computeStatus } from '../utils/computeStatus.js';

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
    // Whitelist fields to prevent mass assignment
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

    res.json({ success: true, data: attachDerivedFields(event) });
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

// POST /api/admin/events/:id/image  (Multer handles file, called after upload middleware)
export async function uploadAdminEventImage(req, res) {
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
    console.error('uploadAdminEventImage error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
}
