import { jest, describe, test, expect, afterEach } from '@jest/globals';
import { computeStatus } from '../utils/computeStatus.js';

// Helper: creates a Date for N days from "now" (using a fixed reference date)
const TODAY = new Date('2026-03-10T12:00:00'); // noon today

function daysFromToday(n) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d;
}

function mockDate(date) {
  jest.useFakeTimers();
  jest.setSystemTime(date);
}

afterEach(() => {
  jest.useRealTimers();
});

// ─── previous ──────────────────────────────────────────────────────────────

describe('previous', () => {
  test('eventDate yesterday → previous', () => {
    mockDate(TODAY);
    const event = { eventDate: daysFromToday(-1), startTime: null, endTime: null };
    expect(computeStatus(event)).toBe('previous');
  });

  test('eventDate 30 days ago → previous', () => {
    mockDate(TODAY);
    const event = { eventDate: daysFromToday(-30), startTime: null, endTime: null };
    expect(computeStatus(event)).toBe('previous');
  });

  test('event today but time already ended → previous', () => {
    const eventDay = new Date('2026-03-10T08:00:00'); // today
    mockDate(new Date('2026-03-10T20:00:00')); // current time: 20:00
    const event = { eventDate: eventDay, startTime: '09:00', endTime: '18:00' };
    expect(computeStatus(event)).toBe('previous');
  });
});

// ─── ongoing ───────────────────────────────────────────────────────────────

describe('ongoing', () => {
  test('eventDate today, no time range → ongoing', () => {
    mockDate(TODAY);
    const event = { eventDate: new Date('2026-03-10T00:00:00'), startTime: null, endTime: null };
    expect(computeStatus(event)).toBe('ongoing');
  });

  test('eventDate today, current time within range → ongoing', () => {
    mockDate(new Date('2026-03-10T12:00:00')); // noon
    const event = { eventDate: new Date('2026-03-10T09:00:00'), startTime: '09:00', endTime: '18:00' };
    expect(computeStatus(event)).toBe('ongoing');
  });

  test('eventDate today, at exactly startTime → ongoing', () => {
    mockDate(new Date('2026-03-10T09:00:00'));
    const event = { eventDate: new Date('2026-03-10T09:00:00'), startTime: '09:00', endTime: '18:00' };
    expect(computeStatus(event)).toBe('ongoing');
  });

  test('eventDate today, at exactly endTime → ongoing', () => {
    mockDate(new Date('2026-03-10T18:00:00'));
    const event = { eventDate: new Date('2026-03-10T09:00:00'), startTime: '09:00', endTime: '18:00' };
    expect(computeStatus(event)).toBe('ongoing');
  });
});

// ─── upcoming (same day, before start) ────────────────────────────────────

describe('upcoming (today, before start)', () => {
  test('eventDate today but current time before startTime → upcoming', () => {
    mockDate(new Date('2026-03-10T07:00:00')); // 7am
    const event = { eventDate: new Date('2026-03-10T09:00:00'), startTime: '09:00', endTime: '18:00' };
    expect(computeStatus(event)).toBe('upcoming');
  });
});

// ─── nearby ────────────────────────────────────────────────────────────────

describe('nearby', () => {
  test('eventDate tomorrow → nearby', () => {
    mockDate(TODAY);
    const event = { eventDate: daysFromToday(1), startTime: null, endTime: null };
    expect(computeStatus(event)).toBe('nearby');
  });

  test('eventDate in 7 days → nearby', () => {
    mockDate(TODAY);
    const event = { eventDate: daysFromToday(7), startTime: null, endTime: null };
    expect(computeStatus(event)).toBe('nearby');
  });
});

// ─── upcoming (future, beyond 7 days) ─────────────────────────────────────

describe('upcoming (beyond 7 days)', () => {
  test('eventDate in 8 days → upcoming', () => {
    mockDate(TODAY);
    const event = { eventDate: daysFromToday(8), startTime: null, endTime: null };
    expect(computeStatus(event)).toBe('upcoming');
  });

  test('eventDate 6 months away → upcoming', () => {
    mockDate(TODAY);
    const event = { eventDate: daysFromToday(180), startTime: null, endTime: null };
    expect(computeStatus(event)).toBe('upcoming');
  });
});
