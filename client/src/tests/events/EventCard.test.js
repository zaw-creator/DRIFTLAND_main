import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import EventCard from '@/components/events/EventCard';

// Mock next/image (not available in jsdom)
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={props.src} alt={props.alt} />;
  },
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const baseEvent = {
  _id: 'abc123',
  name: 'DriftLand Championship',
  eventDate: '2026-04-20T18:00:00.000Z',
  location: 'Mandalay Racing Complex',
  driveTypes: ['Drift', 'Time Attack'],
  status: 'upcoming',
  image: null,
  driverTotalRegisteredCount: 2,
  driverTotalCapacity: 100,
  isDriverFull: false,
};

afterEach(() => {
  jest.clearAllMocks();
});

test('renders event name', () => {
  render(<EventCard event={baseEvent} />);
  expect(screen.getByText('DriftLand Championship')).toBeInTheDocument();
});

test('renders location', () => {
  render(<EventCard event={baseEvent} />);
  expect(screen.getByText(/Mandalay Racing Complex/)).toBeInTheDocument();
});

test('renders capacity indicator', () => {
  render(<EventCard event={baseEvent} />);
  expect(screen.getByText(/2 \/ 100/)).toBeInTheDocument();
});

test('renders drive type badges', () => {
  render(<EventCard event={baseEvent} />);
  expect(screen.getByText('Drift')).toBeInTheDocument();
  expect(screen.getByText('Time Attack')).toBeInTheDocument();
});

test('renders status badge', () => {
  render(<EventCard event={baseEvent} />);
  expect(screen.getByText('Upcoming')).toBeInTheDocument();
});

test('shows FULL badge when isDriverFull is true', () => {
  render(<EventCard event={{ ...baseEvent, isDriverFull: true }} />);
  expect(screen.getByText('FULL')).toBeInTheDocument();
});

test('renders placeholder when no image', () => {
  render(<EventCard event={baseEvent} />);
  // Placeholder icon should be visible
  expect(screen.getByText('🏁')).toBeInTheDocument();
});

test('renders event image when image url is set', () => {
  render(<EventCard event={{ ...baseEvent, image: '/uploads/events/test.jpg' }} />);
  const img = screen.getByRole('img');
  expect(img).toHaveAttribute('src', '/uploads/events/test.jpg');
  expect(img).toHaveAttribute('alt', 'DriftLand Championship');
});

test('View Details button navigates to /events/:id', () => {
  render(<EventCard event={baseEvent} />);
  fireEvent.click(screen.getByText('View Details'));
  expect(mockPush).toHaveBeenCalledWith('/events/abc123');
});

test('clicking the card navigates to /events/:id', () => {
  render(<EventCard event={baseEvent} />);
  fireEvent.click(screen.getByRole('article'));
  expect(mockPush).toHaveBeenCalledWith('/events/abc123');
});
