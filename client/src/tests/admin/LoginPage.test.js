import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoginPage from '@/app/admin/(auth)/login/page';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/services/authService', () => ({
  login: jest.fn(),
}));

import { login } from '@/services/authService';

afterEach(() => {
  jest.clearAllMocks();
});

test('renders email field, password field, and submit button', () => {
  login.mockReturnValue(new Promise(() => {}));
  render(<LoginPage />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});

test('submit calls login with entered email and password', async () => {
  login.mockResolvedValue({ success: true });
  render(<LoginPage />);

  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(login).toHaveBeenCalledWith('admin@test.com', 'secret123');
  });
});

test('navigates to /admin/events on successful login', async () => {
  login.mockResolvedValue({ success: true });

  render(<LoginPage />);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/admin/events');
  });
});

test('shows error message on failed login', async () => {
  login.mockRejectedValue(new Error('Invalid credentials'));
  render(<LoginPage />);

  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});

test('submit button is disabled while loading', async () => {
  login.mockReturnValue(new Promise(() => {})); // never resolves
  render(<LoginPage />);

  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'admin@test.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});
