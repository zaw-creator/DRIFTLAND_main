import 'dotenv/config';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import Event from '../models/Event.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/driftland';

const events = JSON.parse(
  readFileSync(path.join(__dirname, 'data', 'events.json'), 'utf-8')
);

// Convert $oid / $date extended JSON to plain values
function normalise(raw) {
  return {
    _id: new mongoose.Types.ObjectId(raw._id.$oid),
    name: raw.name,
    description: raw.description,
    eventDate: new Date(raw.eventDate.$date),
    location: raw.location,
    registrationDeadline: raw.registrationDeadline ? new Date(raw.registrationDeadline.$date) : null,
    editDeadlineHours: raw.editDeadlineHours,
    driveTypes: raw.driveTypes,
    startTime: raw.startTime,
    endTime: raw.endTime,
    image: raw.image,
    classes: raw.classes,
    participantCapacity: raw.participantCapacity,
    participantRegisteredCount: raw.participantRegisteredCount,
    riderCapacity: raw.riderCapacity,
    riderRegisteredCount: raw.riderRegisteredCount,
    waitlistCount: raw.waitlistCount,
    createdAt: new Date(raw.createdAt.$date),
    updatedAt: new Date(raw.updatedAt.$date),
  };
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  await Event.deleteMany({});
  console.log('Cleared existing events');

  const docs = events.map(normalise);
  await Event.insertMany(docs);
  console.log(`Inserted ${docs.length} events:`);
  docs.forEach((e) => console.log(`  - ${e.name} (${e._id})`));

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
