import styles from './EventSkeleton.module.css';

export default function EventSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.imageWrap} />
      <div className={styles.details}>
        <div className={`${styles.line} ${styles.badges}`} />
        <div className={`${styles.line} ${styles.title}`} />
        <div className={`${styles.line} ${styles.meta}`} />
        <div className={`${styles.line} ${styles.meta}`} />
        <div className={styles.footer}>
          <div className={`${styles.line} ${styles.capacity}`} />
          <div className={`${styles.line} ${styles.btn}`} />
        </div>
      </div>
    </div>
  );
}
