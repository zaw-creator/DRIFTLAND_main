import styles from './StatusBadge.module.css';

const LABELS = {
  // new values
  active:   'Live',
  ended:    'Ended',
  archived: 'Archived',
  nearby:   'Nearby',
  upcoming: 'Upcoming',
  // legacy fallbacks
  ongoing:  'Live',
  previous: 'Ended',
};

export default function StatusBadge({ status }) {
  // map legacy values to new ones for styling
  const normalized = status === 'ongoing' ? 'active'
    : status === 'previous' ? 'ended'
    : status;

  return (
    <span className={`${styles.badge} ${styles[normalized] || ''}`}>
      {LABELS[status] ?? status}
    </span>
  );
}