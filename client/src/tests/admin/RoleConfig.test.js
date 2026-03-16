import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import RoleConfig from '@/components/admin/RoleConfig';

function makeValue(overrides = {}) {
  return {
    enabledRoles: { driver: true, participant: true, rider: true },
    participantCapacity: 0,
    riderCapacity: 0,
    ...overrides,
  };
}

test('renders all three role toggles', () => {
  const onChange = jest.fn();
  render(
    <RoleConfig
      value={makeValue()}
      onChange={onChange}
      driverEnabled={true}
      onDriverToggle={jest.fn()}
    />
  );
  expect(screen.getByText('Driver')).toBeInTheDocument();
  expect(screen.getByText('Participant')).toBeInTheDocument();
  expect(screen.getByText('Rider')).toBeInTheDocument();
});

test('toggling Participant off hides its capacity input and calls onChange with participant=false', () => {
  const onChange = jest.fn();
  render(
    <RoleConfig
      value={makeValue()}
      onChange={onChange}
      driverEnabled={true}
      onDriverToggle={jest.fn()}
    />
  );

  const checkboxes = screen.getAllByRole('checkbox');
  // Participant checkbox is second (after Driver)
  const participantCheckbox = checkboxes[1];

  fireEvent.click(participantCheckbox);

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      enabledRoles: expect.objectContaining({ participant: false }),
      participantCapacity: 0,
    })
  );
});

test('toggling Participant on shows capacity input', () => {
  const onChange = jest.fn();
  const { rerender } = render(
    <RoleConfig
      value={makeValue({ enabledRoles: { driver: true, participant: false, rider: true } })}
      onChange={onChange}
      driverEnabled={true}
      onDriverToggle={jest.fn()}
    />
  );

  // Capacity input should not be visible when disabled
  expect(screen.queryByPlaceholderText(/capacity/i)).not.toBeInTheDocument();

  // Enable participant
  rerender(
    <RoleConfig
      value={makeValue({ enabledRoles: { driver: true, participant: true, rider: true } })}
      onChange={onChange}
      driverEnabled={true}
      onDriverToggle={jest.fn()}
    />
  );

  // Capacity labels should be visible now
  expect(screen.getAllByText('Capacity').length).toBeGreaterThan(0);
});

test('changing Participant capacity calls onChange with updated value', () => {
  const onChange = jest.fn();
  render(
    <RoleConfig
      value={makeValue()}
      onChange={onChange}
      driverEnabled={true}
      onDriverToggle={jest.fn()}
    />
  );

  const capacityInputs = screen.getAllByRole('spinbutton');
  // First capacity input is Participant
  fireEvent.change(capacityInputs[0], { target: { value: '50' } });

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ participantCapacity: 50 })
  );
});

test('toggling Rider off sets riderCapacity to 0 in onChange call', () => {
  const onChange = jest.fn();
  render(
    <RoleConfig
      value={makeValue({ riderCapacity: 30 })}
      onChange={onChange}
      driverEnabled={true}
      onDriverToggle={jest.fn()}
    />
  );

  const checkboxes = screen.getAllByRole('checkbox');
  // Rider checkbox is third (after Driver and Participant)
  const riderCheckbox = checkboxes[2];

  fireEvent.click(riderCheckbox);

  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      enabledRoles: expect.objectContaining({ rider: false }),
      riderCapacity: 0,
    })
  );
});
