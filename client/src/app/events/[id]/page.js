'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import StatusBadge from '@/components/events/StatusBadge';
import DriveTypeBadge from '@/components/events/DriveTypeBadge';
import RoleSelector from '@/components/events/RoleSelector';
import { getEventById } from '@/services/eventService';
import styles from './page.module.css';

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ' · ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDeadline(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function isDeadlinePassed(deadline) {
  return deadline && new Date(deadline) < new Date();
}

function groupClassesByDriveType(classes) {
  return classes.reduce((acc, cls) => {
    if (!acc[cls.driveType]) acc[cls.driveType] = [];
    acc[cls.driveType].push(cls);
    return acc;
  }, {});
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getEventById(id)
      .then(setEvent)
      .catch((err) => setError(err.message || 'Failed to load event'))
      .finally(() => setLoading(false));
  }, [id]);

  // Reset role selection when navigating to a different event
  useEffect(() => {
    setSelectedRole(null);
  }, [id]);

  // SSE — live capacity + role updates for this event
  useEffect(() => {
    if (!event?._id) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const es = new EventSource(`${API_URL}/api/events/${event._id}/stream`);
    es.addEventListener('event-updated', (e) => {
      const patch = JSON.parse(e.data);
      setEvent((prev) => ({ ...prev, ...patch }));
    });
    return () => es.close();
  }, [event?._id]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingState} aria-label="Loading event...">
          <div className={styles.skeletonBanner} />
          <div className={styles.skeletonContent}>
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonMeta}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonMeta}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonText}`} />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.errorState}>
          <p className={styles.errorMsg}>⚠️ {error}</p>
          <button className={styles.backBtn} onClick={() => router.push('/events')}>
            ← Back to Events
          </button>
        </div>
      </main>
    );
  }

  if (!event) return null;

  const {
    name, description, eventDate, location, driveTypes, status, image,
    registrationDeadline, classes = [], waitlistCount,
    participantCapacity, participantRegisteredCount,
    riderCapacity, riderRegisteredCount,
    isDriverFull, isParticipantFull, isRiderFull,
    driverTotalCapacity, driverTotalRegisteredCount,
    enabledRoles,
  } = event;

  const isPrevious = status === 'previous';
  const deadlinePassed = isDeadlinePassed(registrationDeadline);
  const classGroups = groupClassesByDriveType(classes);

  // Determine register button disabled reason
  function getRegisterState() {
    if (!selectedRole) return { disabled: true, label: 'Register' };
    if (deadlinePassed) return { disabled: true, label: 'Registration Closed' };
    if (selectedRole === 'Driver' && isDriverFull) return { disabled: true, label: 'FULL' };
    if (selectedRole === 'Participant' && isParticipantFull) return { disabled: true, label: 'FULL' };
    if (selectedRole === 'Rider' && isRiderFull) return { disabled: true, label: 'FULL' };
    return { disabled: false, label: 'Register' };
  }

  const { disabled: registerDisabled, label: registerLabel } = getRegisterState();

  function handleRegister() {
    if (registerDisabled || !selectedRole) return;
    router.push(`/register?event=${id}&role=${selectedRole}`);
  }

  return (
    <main className={styles.page}>
      {/* ── Back link ─────────────────────────────────────────── */}
      <button className={styles.backBtn} onClick={() => router.push('/events')}>
        ← Back to Events
      </button>

      {/* ── Banner image ──────────────────────────────────────── */}
      <div className={styles.banner}>
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="100vw"
            className={styles.bannerImage}
            priority
          />
        ) : (
          <div className={styles.bannerPlaceholder}>
            <span className={styles.bannerIcon}>🏁</span>
          </div>
        )}
      </div>

      {/* ── Event info ────────────────────────────────────────── */}
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{name}</h1>
          <StatusBadge status={status} />
        </div>

        <div className={styles.badges}>
          {driveTypes?.map((t) => <DriveTypeBadge key={t} type={t} />)}
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📅 Date & Time</span>
            <span className={styles.metaValue}>{formatDateTime(eventDate)}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📍 Location</span>
            <span className={styles.metaValue}>{location}</span>
          </div>
          {registrationDeadline && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>⏰ Registration Deadline</span>
              <span className={`${styles.metaValue} ${deadlinePassed ? styles.deadlinePassed : ''}`}>
                {formatDeadline(registrationDeadline)}
                {deadlinePassed && ' (Closed)'}
              </span>
            </div>
          )}
        </div>

        {description && (
          <div className={styles.description}>
            <h2 className={styles.sectionHeading}>About this event</h2>
            <p>{description}</p>
          </div>
        )}

        {/* ── Capacity breakdown ────────────────────────────── */}
        <div className={styles.capacitySection}>
          <h2 className={styles.sectionHeading}>Capacity</h2>

          {/* Driver classes grouped by drive type */}
          {Object.entries(classGroups).map(([driveType, classList]) => (
            <div key={driveType} className={styles.driveTypeGroup}>
              <h3 className={styles.driveTypeHeading}>{driveType}</h3>
              <table className={styles.classTable}>
                <tbody>
                  {classList.map((cls) => {
                    const classFull = cls.registeredCount >= cls.capacity;
                    return (
                      <tr key={cls.name} className={styles.classRow}>
                        <td className={styles.className}>{cls.name}</td>
                        <td className={styles.classCount}>
                          {cls.registeredCount} / {cls.capacity}
                        </td>
                        {classFull && (
                          <td>
                            <span className={styles.fullBadge}>FULL</span>
                          </td>
                        )}
                        {!classFull && <td />}
                      </tr>
                    );
                  })}
                  <tr className={styles.totalRow}>
                    <td>Total</td>
                    <td>{driverTotalRegisteredCount} / {driverTotalCapacity}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {/* Participant & Rider rows */}
          <table className={styles.classTable}>
            <tbody>
              <tr className={styles.classRow}>
                <td className={styles.className}>Participant</td>
                <td className={styles.classCount}>
                  {participantCapacity > 0
                    ? `${participantRegisteredCount} / ${participantCapacity}`
                    : 'N/A'}
                </td>
                <td>
                  {isParticipantFull && <span className={styles.fullBadge}>FULL</span>}
                </td>
              </tr>
              <tr className={styles.classRow}>
                <td className={styles.className}>Rider</td>
                <td className={styles.classCount}>
                  {riderCapacity > 0
                    ? `${riderRegisteredCount} / ${riderCapacity}`
                    : 'N/A'}
                </td>
                <td>
                  {isRiderFull && <span className={styles.fullBadge}>FULL</span>}
                </td>
              </tr>
              {waitlistCount > 0 && (
                <tr className={styles.classRow}>
                  <td className={styles.className}>Waitlist</td>
                  <td className={styles.classCount}>{waitlistCount}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── CTA section ───────────────────────────────────── */}
        {!isPrevious && (
          <div className={styles.ctaSection}>
            <RoleSelector value={selectedRole} onChange={setSelectedRole} enabledRoles={enabledRoles} />

            <div className={styles.registerRow}>
              {deadlinePassed && (
                <p className={styles.closedNotice}>⛔ Registration deadline has passed.</p>
              )}

              <button
                className={`${styles.registerBtn} ${registerDisabled ? styles.registerDisabled : ''}`}
                disabled={registerDisabled}
                onClick={handleRegister}
              >
                {registerLabel}
              </button>
            </div>
          </div>
        )}

        {isPrevious && (
          <div className={styles.previousNotice}>
            <p>This event has ended. Registration is no longer available.</p>
          </div>
        )}
      </div>
    </main>
  );
}
