import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EventDetailPage from '@/app/events/[id]/page';

// Mock components
jest.mock('@/components/events/StatusBadge', () => ({
  __esModule: true,
  default: ({ status }) => <span data-testid="status-badge">{status}</span>,
}));
jest.mock('@/components/events/DriveTypeBadge', () => ({
  __esModule: true,
  default: ({ type }) => <span data-testid="drive-type-badge">{type}</span>,
}));
jest.mock('@/components/events/RoleSelector', () => ({
  __esModule: true,
  default: ({ value, onChange }) => (
    <div data-testid="role-selector">
      {['Driver', 'Participant', 'Rider'].map((r) => (
        <button key={r} onClick={() => onChange(r)} aria-pressed={value === r}>
          {r}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => <img src={props.src} alt={props.alt} />,
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'event123' }),
}));

jest.mock('@/services/eventService', () => ({
  getEventById: jest.fn(),
}));

import { getEventById } from '@/services/eventService';

const futureDeadline = new Date(Date.now() + 7 * 86400000).toISOString();
const pastDeadline   = new Date(Date.now() - 1 * 86400000).toISOString();

const baseEvent = {
  _id: 'event123',
  name: 'Test Event',
  description: 'A great event',
  eventDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  location: 'Test Circuit',
  driveTypes: ['Drift'],
  status: 'upcoming',
  image: null,
  registrationDeadline: futureDeadline,
  classes: [
    { driveType: 'Drift', name: 'Class A', capacity: 20, registeredCount: 2 },
  ],
  driverTotalCapacity: 20,
  driverTotalRegisteredCount: 2,
  isDriverFull: false,
  isParticipantFull: false,
  isRiderFull: false,
  participantCapacity: 10,
  participantRegisteredCount: 0,
  riderCapacity: 5,
  riderRegisteredCount: 0,
  waitlistCount: 0,
};

afterEach(() => {
  jest.clearAllMocks();
});

// ─── Register button state ────────────────────────────────────────────────────

test('Register button is disabled before role selection', async () => {
  getEventById.mockResolvedValue(baseEvent);
  render(<EventDetailPage />);
  await waitFor(() => screen.getByText('Test Event'));
  const btn = screen.getByRole('button', { name: /Register/i });
  expect(btn).toBeDisabled();
});

test('Register button is enabled after role selection', async () => {
  getEventById.mockResolvedValue(baseEvent);
  render(<EventDetailPage />);
  await waitFor(() => screen.getByRole('button', { name: 'Driver' }));
  fireEvent.click(screen.getByRole('button', { name: 'Driver' }));
  const btn = screen.getByRole('button', { name: /Register/i });
  expect(btn).not.toBeDisabled();
});

test('clicking Register navigates to /register?event=id&role=Driver', async () => {
  getEventById.mockResolvedValue(baseEvent);
  render(<EventDetailPage />);
  await waitFor(() => screen.getByRole('button', { name: 'Driver' }));
  fireEvent.click(screen.getByRole('button', { name: 'Driver' }));
  fireEvent.click(screen.getByRole('button', { name: /Register/i }));
  expect(mockPush).toHaveBeenCalledWith('/register?event=event123&role=Driver');
});

test('clicking Register with Rider role navigates correctly', async () => {
  getEventById.mockResolvedValue(baseEvent);
  render(<EventDetailPage />);
  await waitFor(() => screen.getByRole('button', { name: 'Rider' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rider' }));
  fireEvent.click(screen.getByRole('button', { name: /Register/i }));
  expect(mockPush).toHaveBeenCalledWith('/register?event=event123&role=Rider');
});

// ─── Previous events ─────────────────────────────────────────────────────────

test('previous events show read-only mode with no role selector or Register', async () => {
  getEventById.mockResolvedValue({ ...baseEvent, status: 'previous' });
  render(<EventDetailPage />);
  await waitFor(() => screen.getByText('Test Event'));
  expect(screen.queryByTestId('role-selector')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Register/i })).not.toBeInTheDocument();
  expect(screen.getByText(/This event has ended/)).toBeInTheDocument();
});

// ─── Full event ───────────────────────────────────────────────────────────────

test('Register disabled and shows FULL when Driver role is full', async () => {
  getEventById.mockResolvedValue({ ...baseEvent, isDriverFull: true });
  render(<EventDetailPage />);
  await waitFor(() => screen.getByRole('button', { name: 'Driver' }));
  fireEvent.click(screen.getByRole('button', { name: 'Driver' }));
  const btn = screen.getByRole('button', { name: /FULL/i });
  expect(btn).toBeDisabled();
});

test('Register disabled when Participant is full', async () => {
  getEventById.mockResolvedValue({ ...baseEvent, isParticipantFull: true });
  render(<EventDetailPage />);
  await waitFor(() => screen.getByRole('button', { name: 'Participant' }));
  fireEvent.click(screen.getByRole('button', { name: 'Participant' }));
  const btn = screen.getByRole('button', { name: /FULL/i });
  expect(btn).toBeDisabled();
});

// ─── Deadline passed ─────────────────────────────────────────────────────────

test('Register disabled and shows Registration Closed when deadline passed', async () => {
  getEventById.mockResolvedValue({ ...baseEvent, registrationDeadline: pastDeadline });
  render(<EventDetailPage />);
  await waitFor(() => screen.getByRole('button', { name: 'Driver' }));
  fireEvent.click(screen.getByRole('button', { name: 'Driver' }));
  const btn = screen.getByRole('button', { name: /Registration Closed/i });
  expect(btn).toBeDisabled();
});

// ─── Full event info ──────────────────────────────────────────────────────────

test('displays event name and description', async () => {
  getEventById.mockResolvedValue(baseEvent);
  render(<EventDetailPage />);
  await waitFor(() => screen.getByText('Test Event'));
  expect(screen.getByText('A great event')).toBeInTheDocument();
});

test('displays drive type badges', async () => {
  getEventById.mockResolvedValue(baseEvent);
  render(<EventDetailPage />);
  await waitFor(() => screen.getByTestId('drive-type-badge'));
  // "Drift" appears in multiple places (badge + capacity table heading), use the badge testid
  expect(screen.getByTestId('drive-type-badge')).toBeInTheDocument();
});

test('shows banner placeholder when no image', async () => {
  getEventById.mockResolvedValue(baseEvent);
  render(<EventDetailPage />);
  await waitFor(() => screen.getByText('Test Event'));
  expect(screen.getByText('🏁')).toBeInTheDocument();
});

test('renders error state on API failure', async () => {
  getEventById.mockRejectedValue(new Error('Not found'));
  render(<EventDetailPage />);
  await waitFor(() => screen.getByText(/Not found/));
  expect(screen.getByText('← Back to Events')).toBeInTheDocument();
});
