import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminEventsPage from '@/app/admin/(protected)/events/page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/services/adminEventService', () => ({
  getAdminEvents: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('@/components/admin/EventsTable', () => ({
  __esModule: true,
  default: ({ events, onDelete }) => (
    <div>
      {events.map((e) => (
        <div key={e._id}>
          <span>{e.name}</span>
          <button onClick={() => onDelete(e._id, e.name)}>Delete {e.name}</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/admin/ConfirmDialog', () => ({
  __esModule: true,
  default: ({ open, message, onConfirm, onCancel, loading }) =>
    open ? (
      <div>
        <p data-testid="confirm-message">{message}</p>
        <button onClick={onConfirm} disabled={loading}>Confirm Delete</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

import { getAdminEvents, deleteEvent } from '@/services/adminEventService';

const sampleEvents = [
  { _id: '1', name: 'Event Alpha', status: 'upcoming', enabledRoles: { driver: true, participant: true, rider: true } },
  { _id: '2', name: 'Event Beta', status: 'nearby', enabledRoles: { driver: true, participant: false, rider: false } },
];

afterEach(() => {
  jest.clearAllMocks();
});

test('shows loading state on mount', () => {
  getAdminEvents.mockReturnValue(new Promise(() => {}));
  render(<AdminEventsPage />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

test('renders event rows after data loads', async () => {
  getAdminEvents.mockResolvedValue({ data: sampleEvents });
  render(<AdminEventsPage />);
  await waitFor(() => {
    expect(screen.getByText('Event Alpha')).toBeInTheDocument();
    expect(screen.getByText('Event Beta')).toBeInTheDocument();
  });
});

test('"Create Event" button navigates to /admin/events/new', async () => {
  getAdminEvents.mockResolvedValue({ data: sampleEvents });

  render(<AdminEventsPage />);
  await waitFor(() => screen.getByText('Event Alpha'));

  fireEvent.click(screen.getByRole('button', { name: /create event/i }));
  expect(mockPush).toHaveBeenCalledWith('/admin/events/new');
});

test('clicking Delete shows ConfirmDialog', async () => {
  getAdminEvents.mockResolvedValue({ data: sampleEvents });
  render(<AdminEventsPage />);
  await waitFor(() => screen.getByText('Event Alpha'));

  fireEvent.click(screen.getByText('Delete Event Alpha'));
  expect(screen.getByTestId('confirm-message')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument();
});

test('confirming delete calls deleteEvent and refreshes list', async () => {
  getAdminEvents
    .mockResolvedValueOnce({ data: sampleEvents })
    .mockResolvedValueOnce({ data: [sampleEvents[1]] });
  deleteEvent.mockResolvedValue({ success: true });

  render(<AdminEventsPage />);
  await waitFor(() => screen.getByText('Event Alpha'));

  fireEvent.click(screen.getByText('Delete Event Alpha'));
  fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));

  await waitFor(() => {
    expect(deleteEvent).toHaveBeenCalledWith('1');
    expect(getAdminEvents).toHaveBeenCalledTimes(2);
  });
});

test('cancelling delete does not call deleteEvent', async () => {
  getAdminEvents.mockResolvedValue({ data: sampleEvents });
  render(<AdminEventsPage />);
  await waitFor(() => screen.getByText('Event Alpha'));

  fireEvent.click(screen.getByText('Delete Event Alpha'));
  fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

  expect(deleteEvent).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /confirm delete/i })).not.toBeInTheDocument();
});
