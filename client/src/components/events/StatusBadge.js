import styles from './StatusBadge.module.css';

const LABELS = {
  ongoing: 'Ongoing',
  nearby: 'Nearby',
  upcoming: 'Upcoming',
  previous: 'Previous',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`${styles.badge} ${styles[status] || ''}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
