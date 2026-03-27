import styles from "./RoleSelector.module.css";

const ROLES = [
  {
    id: "Driver",
    label: "Driver",
    // icon: '🚗',
    description: "You are driving a vehicle in the event",
  },
  {
    id: "Participant",
    label: "Participant",
    // icon: '🏁',
    description: "You are taking part in activities (non-driving)",
  },
  {
    id: "Rider",
    label: "Rider",
    // icon: '🪑',
    description: "You are a passenger in a vehicle",
  },
];

/**
 * @param {string|null} value - Currently selected role id
 * @param {(role: string) => void} onChange
 * @param {{ driver?: bool, participant?: bool, rider?: bool }} enabledRoles - per-event role config
 */
export default function RoleSelector({ value, onChange, enabledRoles }) {
  const visibleRoles = ROLES.filter(
    (role) => !enabledRoles || enabledRoles[role.id.toLowerCase()] !== false,
  );

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>Select Your Role</h3>
      <div className={styles.grid}>
        {visibleRoles.map((role) => (
          <button
            key={role.id}
            type="button"
            className={`${styles.card} ${value === role.id ? styles.selected : ""}`}
            onClick={() => onChange(role.id)}
          >
            {/* <span className={styles.icon}>{role.icon}</span> */}
            <span className={styles.label}>{role.label}</span>
            <span className={styles.description}>{role.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
