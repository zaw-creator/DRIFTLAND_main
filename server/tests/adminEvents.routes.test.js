import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import adminEventRoutes from '../routes/admin/events.js';
import Event from '../models/Event.js';
import User from '../models/User.js';

const JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

let mongoServer;
let app;
let adminCookie;
let userCookie;

function makeEvent(overrides = {}) {
  return {
    name: 'Test Event',
    description: 'A test event',
    location: 'Test Circuit',
    eventDate: new Date(Date.now() + 14 * 86400000), // 2 weeks from now
    driveTypes: ['Drift'],
    classes: [{ driveType: 'Drift', name: 'Class A', capacity: 20, registeredCount: 0 }],
    participantCapacity: 10,
    riderCapacity: 5,
    ...overrides,
  };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create admin and regular users
  const adminUser = await User.create({
    email: 'admin@test.com',
    password: 'secret123',
    role: 'admin',
  });
  const regularUser = await User.create({
    email: 'user@test.com',
    password: 'secret123',
    role: 'user',
  });

  // Sign tokens manually (bypass the login endpoint)
  const adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, JWT_SECRET);
  const userToken = jwt.sign({ id: regularUser._id, role: 'user' }, JWT_SECRET);

  adminCookie = `adminToken=${adminToken}`;
  userCookie = `adminToken=${userToken}`;

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/admin/events', adminEventRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Event.deleteMany({});
});

// ─── Auth guards ─────────────────────────────────────────────────────────────

describe('Auth guards on admin event routes', () => {
  test('GET / without token → 401', async () => {
    const res = await request(app).get('/api/admin/events');
    expect(res.status).toBe(401);
  });

  test('GET / with non-admin token → 403', async () => {
    const res = await request(app)
      .get('/api/admin/events')
      .set('Cookie', userCookie);
    expect(res.status).toBe(403);
  });

  test('POST / without token → 401', async () => {
    const res = await request(app).post('/api/admin/events').send(makeEvent());
    expect(res.status).toBe(401);
  });

  test('DELETE /:id without token → 401', async () => {
    const ev = await Event.create(makeEvent());
    const res = await request(app).delete(`/api/admin/events/${ev._id}`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/admin/events ────────────────────────────────────────────────────

describe('GET /api/admin/events', () => {
  test('returns 200 with all events including previous', async () => {
    const past = new Date(Date.now() - 2 * 86400000);
    await Event.create([
      makeEvent({ name: 'Future Event' }),
      makeEvent({ name: 'Past Event', eventDate: past }),
    ]);

    const res = await request(app)
      .get('/api/admin/events')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const statuses = res.body.data.map((e) => e.status);
    expect(statuses).toContain('previous');
    expect(statuses).toContain('upcoming');
  });

  test('returns events sorted reverse-chronological', async () => {
    const earlier = new Date(Date.now() + 7 * 86400000);
    const later = new Date(Date.now() + 21 * 86400000);
    await Event.create([
      makeEvent({ name: 'Earlier', eventDate: earlier }),
      makeEvent({ name: 'Later', eventDate: later }),
    ]);

    const res = await request(app)
      .get('/api/admin/events')
      .set('Cookie', adminCookie);

    expect(res.body.data[0].name).toBe('Later');
  });
});

// ─── POST /api/admin/events ───────────────────────────────────────────────────

describe('POST /api/admin/events', () => {
  test('creates event with valid body → 201', async () => {
    const res = await request(app)
      .post('/api/admin/events')
      .set('Cookie', adminCookie)
      .send(makeEvent({ name: 'New Event' }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('New Event');
    expect(res.body.data._id).toBeDefined();
  });

  test('returns 400 when name is missing', async () => {
    const { name, ...withoutName } = makeEvent();
    const res = await request(app)
      .post('/api/admin/events')
      .set('Cookie', adminCookie)
      .send(withoutName);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when eventDate is missing', async () => {
    const { eventDate, ...withoutDate } = makeEvent();
    const res = await request(app)
      .post('/api/admin/events')
      .set('Cookie', adminCookie)
      .send(withoutDate);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when location is missing', async () => {
    const { location, ...withoutLocation } = makeEvent();
    const res = await request(app)
      .post('/api/admin/events')
      .set('Cookie', adminCookie)
      .send(withoutLocation);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('created event includes enabledRoles with defaults', async () => {
    const res = await request(app)
      .post('/api/admin/events')
      .set('Cookie', adminCookie)
      .send(makeEvent());

    expect(res.body.data.enabledRoles).toEqual({
      driver: true,
      participant: true,
      rider: true,
    });
  });
});

// ─── PUT /api/admin/events/:id ────────────────────────────────────────────────

describe('PUT /api/admin/events/:id', () => {
  test('updates event with valid body → 200', async () => {
    const ev = await Event.create(makeEvent({ name: 'Original Name' }));

    const res = await request(app)
      .put(`/api/admin/events/${ev._id}`)
      .set('Cookie', adminCookie)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  test('can update enabledRoles', async () => {
    const ev = await Event.create(makeEvent());

    const res = await request(app)
      .put(`/api/admin/events/${ev._id}`)
      .set('Cookie', adminCookie)
      .send({ enabledRoles: { driver: true, participant: false, rider: false } });

    expect(res.status).toBe(200);
    expect(res.body.data.enabledRoles.participant).toBe(false);
    expect(res.body.data.enabledRoles.rider).toBe(false);
  });

  test('returns 404 for non-existent id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/admin/events/${fakeId}`)
      .set('Cookie', adminCookie)
      .send({ name: 'New Name' });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/admin/events/:id ────────────────────────────────────────────

describe('DELETE /api/admin/events/:id', () => {
  test('deletes event → 200', async () => {
    const ev = await Event.create(makeEvent());

    const res = await request(app)
      .delete(`/api/admin/events/${ev._id}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deleted = await Event.findById(ev._id);
    expect(deleted).toBeNull();
  });

  test('returns 404 for non-existent id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/admin/events/${fakeId}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
  });
});
