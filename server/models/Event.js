import mongoose from 'mongoose';

const classSchema = new mongoose.Schema(
  {
    driveType: { type: String, required: true },
    name: { type: String, required: true },
    capacity: { type: Number, required: true, min: 0 },
    registeredCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ── NEW: Safety rules ─────────────────────────────────────────────────────────
const safetyRuleSchema = new mongoose.Schema(
  {
    category:    { type: String, required: true }, // e.g. 'helmet', 'harness'
    description: { type: String, required: true },
    mandatory:   { type: Boolean, default: true },
  },
  { _id: false }
);

// ── NEW: Leaderboard entry (temp — cleared after 7 days) ──────────────────────
const leaderboardEntrySchema = new mongoose.Schema(
  {
    driverId:     { type: String, required: true }, // from register DB
    driverName:   { type: String, required: true },
    driveType: { type: String, enum: ['Drift', 'Time Attack', 'Both'] },
class:     { type: String, default: null },
    qualifyScore: { type: Number, default: 0 },
    qualifyRank:  { type: Number, default: 0 },
    wins:         { type: Number, default: 0 },
    losses:       { type: Number, default: 0 },
    eliminated:   { type: Boolean, default: false },
  },
  { _id: false }
);

// ── NEW: Bracket match (stays forever) ───────────────────────────────────────
const bracketMatchSchema = new mongoose.Schema(
  {
    matchId:   { type: String, required: true }, // e.g. 'R1-M1', 'SF-1', 'F-1'
    round:     { type: String, required: true }, // 'round1', 'semifinal', 'final'
    roundNum:  { type: Number, required: true },
    class:     { type: String, default: null }, 
    driver1Id: { type: String, default: null },
    driver2Id: { type: String, default: null },
    winnerId:  { type: String, default: null },
    status: {
      type:    String,
      enum:    ['pending', 'live', 'completed'],
      default: 'pending',
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    // ── existing fields — untouched ──────────────────────────────────────────
    name:                       { type: String, required: true, trim: true },
    description:                { type: String, default: '' },
    eventDate:                  { type: Date, required: true },
    // Add to eventSchema after eventDate
eventEndDate: { type: Date, default: null },
    location:                   { type: String, required: true },
    registrationDeadline:       { type: Date },
    editDeadlineHours:          { type: Number, default: 24 },
    driveTypes:                 [{ type: String }],
    classes:                    [classSchema],
    participantCapacity:        { type: Number, default: 0 },
    participantRegisteredCount: { type: Number, default: 0 },
    riderCapacity:              { type: Number, default: 0 },
    riderRegisteredCount:       { type: Number, default: 0 },
    waitlistCount:              { type: Number, default: 0 },
    image:                      { type: String, default: null },
    startTime:                  { type: String, default: null },
    endTime:                    { type: String, default: null },
    enabledRoles: {
      driver:      { type: Boolean, default: true },
      participant: { type: Boolean, default: true },
      rider:       { type: Boolean, default: true },
    },

    // ── NEW: link to register site event ─────────────────────────────────────
    registerEventId: { type: String, default: null },

    // ── NEW: safety rules (cleared after 7 days, pushed to register DB) ──────
    safetyRules: [safetyRuleSchema],

    // ── NEW: live scoring (cleared after 7 days, pushed to register DB) ──────
    leaderboard:      [leaderboardEntrySchema],
    bracketGenerated: { type: Boolean, default: false },
    bracket:          [bracketMatchSchema],

    // ── NEW: event lifecycle ─────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['upcoming', 'active', 'ended', 'archived'],
      default: 'upcoming',
    },
    endedAt:            { type: Date, default: null },
    pushedToRegisterAt: { type: Date, default: null },
    cleanupScheduledAt: { type: Date, default: null }, // endedAt + 7 days
    dataCleanedAt:      { type: Date, default: null },

    // ── NEW: top 5 snapshot (stays forever after cleanup) ────────────────────
    top5: [
      {
        driverId:    { type: String },
        driverName:  { type: String },
        driveType:   { type: String },
        qualifyRank: { type: Number },
        wins:        { type: Number },
        losses:      { type: Number },
        _id:         false,
      },
    ],
  },
  { timestamps: true }
);

// ── existing virtuals — untouched ─────────────────────────────────────────────

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

// ── NEW virtual: is event currently live based on date + time ─────────────────
eventSchema.virtual('isLive').get(function () {
  if (!this.startTime || !this.endTime) return false;
  const now = new Date();
  const eventDay = new Date(this.eventDate).toDateString();
  const todayStr = now.toDateString();
  if (eventDay !== todayStr) return false;

  const [startH, startM] = this.startTime.split(':').map(Number);
  const [endH,   endM]   = this.endTime.split(':').map(Number);
  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const startMins = startH * 60 + startM;
  const endMins   = endH   * 60 + endM;
  return nowMins >= startMins && nowMins <= endMins;
});

eventSchema.set('toJSON',   { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

const Event = mongoose.model('Event', eventSchema);

export default Event;