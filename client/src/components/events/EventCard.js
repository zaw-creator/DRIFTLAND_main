'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import StatusBadge from './StatusBadge';
import DriveTypeBadge from './DriveTypeBadge';
import styles from './EventCard.module.css';

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function EventCard({ event }) {
  const router = useRouter();
  const { _id, name, eventDate, location, driveTypes, status, image,
          driverTotalRegisteredCount, driverTotalCapacity, isDriverFull } = event;

  return (
    <article className={styles.card} onClick={() => router.push(`/events/${_id}`)}>
      {/* ── Image (30%) ─────────────────────────────────────────── */}
      <div className={styles.imageWrap}>
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 30vw"
            className={styles.image}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>🏁</span>
          </div>
        )}
      </div>

      {/* ── Details (70%) ───────────────────────────────────────── */}
      <div className={styles.details}>
        <div className={styles.badges}>
          <StatusBadge status={status} />
          {driveTypes?.map((t) => <DriveTypeBadge key={t} type={t} />)}
        </div>

        <h3 className={styles.name}>{name}</h3>

        <p className={styles.meta}>
          <span className={styles.metaIcon}>📅</span>
          {formatDateTime(eventDate)}
        </p>
        <p className={styles.meta}>
          <span className={styles.metaIcon}>📍</span>
          {location}
        </p>

        <div className={styles.footer}>
          <span className={isDriverFull ? styles.capacityFull : styles.capacity}>
            {isDriverFull
              ? 'FULL'
              : `${driverTotalRegisteredCount ?? 0} / ${driverTotalCapacity ?? 0} drivers`}
          </span>

          <button
            className={styles.viewBtn}
            onClick={(e) => { e.stopPropagation(); router.push(`/events/${_id}`); }}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}
