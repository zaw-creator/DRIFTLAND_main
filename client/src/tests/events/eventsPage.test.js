import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EventsPage from '@/app/events/page';

// Mock sub-components to keep tests focused
jest.mock('@/components/events/EventCard', () => ({
  __esModule: true,
  default: ({ event }) => <div data-testid="event-card">{event.name}</div>,
}));

jest.mock('@/components/events/EventSkeleton', () => ({
  __esModule: true,
  default: () => <div data-testid="skeleton" />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock eventService
jest.mock('@/services/eventService', () => ({
  getEvents: jest.fn(),
}));

import { getEvents } from '@/services/eventService';

const upcomingEvent = { _id: '1', name: 'Upcoming Race', status: 'upcoming' };
const nearbyEvent   = { _id: '2', name: 'Nearby Race',   status: 'nearby' };
const ongoingEvent  = { _id: '3', name: 'Ongoing Race',  status: 'ongoing' };

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Loading state ────────────────────────────────────────────────────────────

test('shows skeleton while loading', () => {
  getEvents.mockReturnValue(new Promise(() => {})); // never resolves
  render(<EventsPage />);
  expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
});

// ─── Error state ──────────────────────────────────────────────────────────────

test('shows error message and retry button on API failure', async () => {
  getEvents.mockRejectedValue(new Error('Network error'));
  render(<EventsPage />);
  await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument());
  expect(screen.getByText('Retry')).toBeInTheDocument();
});

test('retry button re-fetches events', async () => {
  getEvents.mockRejectedValueOnce(new Error('oops')).mockResolvedValueOnce([upcomingEvent]);
  render(<EventsPage />);
  await waitFor(() => screen.getByText('Retry'));
  fireEvent.click(screen.getByText('Retry'));
  await waitFor(() => screen.getByText('Upcoming Race'));
});

// ─── Empty state ──────────────────────────────────────────────────────────────

test('shows empty state when no events returned', async () => {
  getEvents.mockResolvedValue([]);
  render(<EventsPage />);
  await waitFor(() => expect(screen.getByText(/No upcoming events/)).toBeInTheDocument());
});

// ─── Sections order ───────────────────────────────────────────────────────────

test('renders sections in order: Ongoing → Nearby → Upcoming', async () => {
  getEvents.mockResolvedValue([ongoingEvent, nearbyEvent, upcomingEvent]);
  render(<EventsPage />);
  await waitFor(() => screen.getByText('Ongoing Race'));

  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual(['Ongoing', 'Nearby', 'Upcoming']);
});

test('hides section header when section has no events', async () => {
  getEvents.mockResolvedValue([upcomingEvent]); // no ongoing, no nearby
  render(<EventsPage />);
  await waitFor(() => screen.getByText('Upcoming Race'));

  expect(screen.queryByText('Ongoing')).not.toBeInTheDocument();
  expect(screen.queryByText('Nearby')).not.toBeInTheDocument();
  expect(screen.getByText('Upcoming')).toBeInTheDocument();
});

test('renders event cards inside correct sections', async () => {
  getEvents.mockResolvedValue([nearbyEvent, upcomingEvent]);
  render(<EventsPage />);
  await waitFor(() => screen.getAllByTestId('event-card'));
  const cards = screen.getAllByTestId('event-card');
  const names = cards.map((c) => c.textContent);
  expect(names).toContain('Nearby Race');
  expect(names).toContain('Upcoming Race');
});
