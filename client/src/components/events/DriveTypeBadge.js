import styles from './DriveTypeBadge.module.css';

export default function DriveTypeBadge({ type }) {
  return <span className={styles.badge}>{type}</span>;
}
