import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import eventRoutes from '../routes/events.js';
import Event from '../models/Event.js';

let mongoServer;
let app;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeEvent(overrides = {}) {
  return {
    name: 'Test Event',
    description: 'A test event',
    location: 'Test Circuit',
    registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    driveTypes: ['Drift'],
    classes: [
      { driveType: 'Drift', name: 'Class A', capacity: 20, registeredCount: 0 },
    ],
    participantCapacity: 10,
    participantRegisteredCount: 0,
    riderCapacity: 5,
    riderRegisteredCount: 0,
    ...overrides,
  };
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/events', eventRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Event.deleteMany({});
});

// ─── GET /api/events ─────────────────────────────────────────────────────────

describe('GET /api/events', () => {
  test('returns 200 with events array', async () => {
    await Event.create(makeEvent({ eventDate: new Date(Date.now() + 8 * 86400000) }));
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('excludes previous events by default', async () => {
    const past = new Date(Date.now() - 2 * 86400000); // 2 days ago
    await Event.create(makeEvent({ name: 'Past Event', eventDate: past }));
    const res = await request(app).get('/api/events');
    expect(res.body.data).toHaveLength(0);
  });

  test('includeAll=true returns previous events', async () => {
    const past = new Date(Date.now() - 2 * 86400000);
    await Event.create(makeEvent({ name: 'Past Event', eventDate: past }));
    const res = await request(app).get('/api/events?includeAll=true');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('previous');
  });

  test('returns events sorted: ongoing → nearby → upcoming', async () => {
    const now = new Date();
    const nearbyDate = new Date(now); nearbyDate.setDate(nearbyDate.getDate() + 3);
    const upcomingDate = new Date(now); upcomingDate.setDate(upcomingDate.getDate() + 14);

    await Event.create([
      makeEvent({ name: 'Upcoming', eventDate: upcomingDate }),
      makeEvent({ name: 'Nearby',   eventDate: nearbyDate }),
    ]);

    const res = await request(app).get('/api/events');
    const names = res.body.data.map((e) => e.name);
    expect(names.indexOf('Nearby')).toBeLessThan(names.indexOf('Upcoming'));
  });

  test('each event has computed status field', async () => {
    await Event.create(makeEvent({ eventDate: new Date(Date.now() + 14 * 86400000) }));
    const res = await request(app).get('/api/events');
    expect(res.body.data[0]).toHaveProperty('status', 'upcoming');
  });

  test('each event has virtual capacity fields', async () => {
    await Event.create(makeEvent({ eventDate: new Date(Date.now() + 14 * 86400000) }));
    const res = await request(app).get('/api/events');
    const ev = res.body.data[0];
    expect(ev).toHaveProperty('driverTotalCapacity', 20);
    expect(ev).toHaveProperty('driverTotalRegisteredCount', 0);
    expect(ev).toHaveProperty('isDriverFull', false);
  });
});

// ─── GET /api/events/:id ─────────────────────────────────────────────────────

describe('GET /api/events/:id', () => {
  test('returns single event with computed status', async () => {
    const ev = await Event.create(makeEvent({ eventDate: new Date(Date.now() + 14 * 86400000) }));
    const res = await request(app).get(`/api/events/${ev._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(ev._id.toString());
    expect(res.body.data.status).toBe('upcoming');
  });

  test('returns previous events when fetched by id', async () => {
    const past = new Date(Date.now() - 2 * 86400000);
    const ev = await Event.create(makeEvent({ name: 'Old Event', eventDate: past }));
    const res = await request(app).get(`/api/events/${ev._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('previous');
  });

  test('returns 404 for non-existent id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/events/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('returns 404 for invalid id format', async () => {
    const res = await request(app).get('/api/events/not-a-valid-id');
    expect(res.status).toBe(404);
  });

  test('isDriverFull is true when all classes are full', async () => {
    const ev = await Event.create(makeEvent({
      eventDate: new Date(Date.now() + 14 * 86400000),
      classes: [
        { driveType: 'Drift', name: 'Class A', capacity: 5, registeredCount: 5 },
      ],
    }));
    const res = await request(app).get(`/api/events/${ev._id}`);
    expect(res.body.data.isDriverFull).toBe(true);
  });
});
