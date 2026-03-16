import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
  {
    driveType: { type: String, required: true }, // "Drift" | "Time Attack"
    name: { type: String, required: true },      // "Class A", "AWT", "RWD", "FWD", etc.
    capacity: { type: Number, required: true, min: 0 },
    registeredCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    eventDate: { type: Date, required: true },
    location: { type: String, required: true },
    registrationDeadline: { type: Date },
    editDeadlineHours: { type: Number, default: 24 },

    // Drive type labels (for badge display)
    driveTypes: [{ type: String }],

    // Driver slots — configurable per event
    classes: [classSchema],

    // Participant role — separate capacity
    participantCapacity: { type: Number, default: 0 },
    participantRegisteredCount: { type: Number, default: 0 },

    // Rider role — separate capacity
    riderCapacity: { type: Number, default: 0 },
    riderRegisteredCount: { type: Number, default: 0 },

    // Waitlist
    waitlistCount: { type: Number, default: 0 },

    // Image (Multer upload path or external URL)
    image: { type: String, default: null },

    // Time range for ongoing detection
    startTime: { type: String, default: null }, // e.g. "10:00"
    endTime: { type: String, default: null },   // e.g. "18:00"

    // Per-event role enable/disable (admin-controlled)
    enabledRoles: {
      driver:      { type: Boolean, default: true },
      participant: { type: Boolean, default: true },
      rider:       { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// ─── Computed virtuals ────────────────────────────────────────────────────────

eventSchema.virtual('driverTotalCapacity').get(function () {
  return this.classes.reduce((sum, c) => sum + c.capacity, 0);
});

eventSchema.virtual('driverTotalRegisteredCount').get(function () {
  return this.classes.reduce((sum, c) => sum + c.registeredCount, 0);
});

eventSchema.virtual('isDriverFull').get(function () {
  if (this.classes.length === 0) return false;
  return this.classes.every((c) => c.registeredCount >= c.capacity);
});

eventSchema.virtual('isParticipantFull').get(function () {
  if (this.participantCapacity === 0) return false;
  return this.participantRegisteredCount >= this.participantCapacity;
});

eventSchema.virtual('isRiderFull').get(function () {
  if (this.riderCapacity === 0) return false;
  return this.riderRegisteredCount >= this.riderCapacity;
});

// Include virtuals in JSON/Object output
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

const Event = mongoose.model('Event', eventSchema);

export default Event;
