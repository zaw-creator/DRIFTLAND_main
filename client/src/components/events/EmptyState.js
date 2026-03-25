import styles from "./EmptyState.module.css";

export default function EmptyState({
  badge = "SECTOR CLEAR",
  title = "NO EVENTS DETECTED",
  message = "There is no active telemetry for this sector. Please select another filter or check back later.",
}) {
  return (
    <div className={styles.emptyContainer}>
      {/* Decorative background grid */}
      <div className={styles.telemetryBg} />

      <div className={styles.content}>
        <div className={styles.badgeWrapper}>
          <span className={styles.blinker}></span>
          <span className={styles.warningBadge}>{badge}</span>
        </div>
        <h3 className={styles.message}>{title}</h3>
        <p className={styles.subMessage}>{message}</p>
      </div>
    </div>
  );
}
