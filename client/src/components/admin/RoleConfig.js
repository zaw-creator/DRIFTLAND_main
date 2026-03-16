'use client';

import styles from './RoleConfig.module.css';

const ROLES = [
  { key: 'participant', label: 'Participant', capacityField: 'participantCapacity' },
  { key: 'rider', label: 'Rider', capacityField: 'riderCapacity' },
];

/**
 * Props:
 *   value: {
 *     enabledRoles: { driver: bool, participant: bool, rider: bool },
 *     participantCapacity: number,
 *     riderCapacity: number,
 *   }
 *   onChange(newValue): called with updated value
 *   driverEnabled: bool (driver toggle state, managed by parent alongside classes)
 *   onDriverToggle(bool): called when driver toggle changes
 */
export default function RoleConfig({ value, onChange, driverEnabled, onDriverToggle }) {
  const { enabledRoles = {}, participantCapacity = 0, riderCapacity = 0 } = value;

  function handleDriverToggle(e) {
    onDriverToggle(e.target.checked);
  }

  function handleToggle(roleKey, enabled) {
    const updatedEnabledRoles = { ...enabledRoles, [roleKey]: enabled };
    const updates = { enabledRoles: updatedEnabledRoles };

    // Clear capacity when role is disabled
    const role = ROLES.find((r) => r.key === roleKey);
    if (!enabled && role) {
      updates[role.capacityField] = 0;
    }

    onChange({ ...value, ...updates });
  }

  function handleCapacityChange(capacityField, val) {
    onChange({ ...value, [capacityField]: Number(val) });
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>Role Configuration</h3>

      {/* Driver */}
      <div className={styles.roleRow}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={!!driverEnabled}
            onChange={handleDriverToggle}
          />
          <span className={styles.roleLabel}>Driver</span>
        </label>
        {driverEnabled && (
          <p className={styles.hint}>Capacity is managed via the driver classes below.</p>
        )}
      </div>

      {/* Participant & Rider */}
      {ROLES.map(({ key, label, capacityField }) => {
        const isEnabled = enabledRoles[key] !== false;
        const capacityValue = key === 'participant' ? participantCapacity : riderCapacity;

        return (
          <div key={key} className={styles.roleRow}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => handleToggle(key, e.target.checked)}
              />
              <span className={styles.roleLabel}>{label}</span>
            </label>
            {isEnabled && (
              <div className={styles.capacityRow}>
                <label className={styles.capacityLabel}>Capacity</label>
                <input
                  type="number"
                  className={styles.capacityInput}
                  min={0}
                  value={capacityValue}
                  onChange={(e) => handleCapacityChange(capacityField, e.target.value)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
