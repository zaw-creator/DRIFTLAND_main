import styles from "./loading.module.css";

export default function ResultsLoading() {
  return (
    <div className={styles.page}>
      {/* Header skeleton */}
      <div className={styles.header}>
        <div className={styles.skLabel} />
        <div className={styles.skTitle} />
      </div>

      {/* Tab bar skeleton */}
      <div className={styles.tabs}>
        <div className={styles.skTab} />
        <div className={styles.skTab} />
      </div>

      {/* Row skeletons */}
      <div className={styles.rows}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={styles.skRow}>
            <div className={styles.skPos} />
            <div className={styles.skName} style={{ width: `${55 + (i % 4) * 8}%` }} />
            <div className={styles.skScore} />
          </div>
        ))}
      </div>
    </div>
  );
}
