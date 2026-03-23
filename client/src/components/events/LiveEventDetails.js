"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import StatusBadge from "@/components/events/StatusBadge";
import DriveTypeBadge from "@/components/events/DriveTypeBadge";
import RoleSelector from "@/components/events/RoleSelector";
import styles from "@/app/events/page.module.css"; // Adjust path as needed

// Helper functions (kept outside the component so they don't recreate on render)
function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return (
    date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }) +
    " · " +
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
}

function formatDeadline(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function isDeadlinePassed(deadline) {
  return deadline && new Date(deadline) < new Date();
}

export default function LiveEventDetails({ initialEvent }) {
  const router = useRouter();

  // 1. Hydrate state with server data
  const [event, setEvent] = useState(initialEvent);
  const [selectedRole, setSelectedRole] = useState(null);

  // 2. SSE — Live Capacity Updates (With Auto-Reconnect)
  useEffect(() => {
    if (!event?._id) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    let es;
    let reconnectTimeout;

    const connectSSE = () => {
      es = new EventSource(`${API_URL}/api/events/${event._id}/stream`);
      es.addEventListener("event-updated", (e) => {
        const patch = JSON.parse(e.data);
        setEvent((prev) => ({ ...prev, ...patch }));
      });

      // 🔄 THE AUTO-RECONNECT LOOP
      es.onerror = () => {
        console.warn(
          "Live connection dropped. Attempting to reconnect in 3 seconds...",
        );
        es.close(); // Close the dead connection
        // Try again in 3 seconds (Exponential backoff can be added here for massive scale)
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE(); // Start the engine

    return () => {
      if (es) es.close();
      clearTimeout(reconnectTimeout);
    };
  }, [event._id]);

  // 3. 🚀 Premium Optimization: Memoize heavy calculations
  const classGroups = useMemo(() => {
    if (!event.classes) return {};
    return event.classes.reduce((acc, cls) => {
      if (!acc[cls.driveType]) acc[cls.driveType] = [];
      acc[cls.driveType].push(cls);
      return acc;
    }, {});
  }, [event.classes]);

  const deadlinePassed = useMemo(
    () => isDeadlinePassed(event.registrationDeadline),
    [event.registrationDeadline],
  );

  const { disabled: registerDisabled, label: registerLabel } = useMemo(() => {
    if (!selectedRole) return { disabled: true, label: "Register" };
    if (deadlinePassed) return { disabled: true, label: "Registration Closed" };
    if (selectedRole === "Driver" && event.isDriverFull)
      return { disabled: true, label: "FULL" };
    if (selectedRole === "Participant" && event.isParticipantFull)
      return { disabled: true, label: "FULL" };
    if (selectedRole === "Rider" && event.isRiderFull)
      return { disabled: true, label: "FULL" };
    return { disabled: false, label: "Register" };
  }, [
    selectedRole,
    deadlinePassed,
    event.isDriverFull,
    event.isParticipantFull,
    event.isRiderFull,
  ]);

  function handleRegister() {
    if (registerDisabled || !selectedRole) return;
    router.push(`/register?event=${event._id}&role=${selectedRole}`);
  }

  const isPrevious = event.status === "previous";

  return (
    <main className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.push("/events")}>
        ← Back to Events
      </button>

      {/* ── Banner image ── */}
      <div className={styles.banner}>
        {event.image ? (
          <Image
            src={event.image}
            alt={event.name}
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

      {/* ── Event info ── */}
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{event.name}</h1>
          <StatusBadge status={event.status} />
        </div>

        <div className={styles.badges}>
          {event.driveTypes?.map((t) => (
            <DriveTypeBadge key={t} type={t} />
          ))}
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📅 Date & Time</span>
            <span className={styles.metaValue}>
              {formatDateTime(event.eventDate)}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>📍 Location</span>
            <span className={styles.metaValue}>{event.location}</span>
          </div>
          {event.registrationDeadline && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>⏰ Registration Deadline</span>
              <span
                className={`${styles.metaValue} ${deadlinePassed ? styles.deadlinePassed : ""}`}
              >
                {formatDeadline(event.registrationDeadline)}{" "}
                {deadlinePassed && " (Closed)"}
              </span>
            </div>
          )}
        </div>

        {event.description && (
          <div className={styles.description}>
            <h2 className={styles.sectionHeading}>About this event</h2>
            <p>{event.description}</p>
          </div>
        )}

        {/* ── Capacity breakdown ── */}
        <div className={styles.capacitySection}>
          <h2 className={styles.sectionHeading}>Capacity</h2>

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
                        <td>
                          {classFull && (
                            <span className={styles.fullBadge}>FULL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className={styles.totalRow}>
                    <td>Total</td>
                    <td>
                      {event.driverTotalRegisteredCount} /{" "}
                      {event.driverTotalCapacity}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {/* Participant & Rider Rows (Kept standard logic) */}
          <table className={styles.classTable}>
            <tbody>
              <tr className={styles.classRow}>
                <td className={styles.className}>Participant</td>
                <td className={styles.classCount}>
                  {event.participantCapacity > 0
                    ? `${event.participantRegisteredCount} / ${event.participantCapacity}`
                    : "N/A"}
                </td>
                <td>
                  {event.isParticipantFull && (
                    <span className={styles.fullBadge}>FULL</span>
                  )}
                </td>
              </tr>
              <tr className={styles.classRow}>
                <td className={styles.className}>Rider</td>
                <td className={styles.classCount}>
                  {event.riderCapacity > 0
                    ? `${event.riderRegisteredCount} / ${event.riderCapacity}`
                    : "N/A"}
                </td>
                <td>
                  {event.isRiderFull && (
                    <span className={styles.fullBadge}>FULL</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── CTA section ── */}
        {!isPrevious ? (
          <div className={styles.ctaSection}>
            <RoleSelector
              value={selectedRole}
              onChange={setSelectedRole}
              enabledRoles={event.enabledRoles}
            />
            <div className={styles.registerRow}>
              {deadlinePassed && (
                <p className={styles.closedNotice}>
                  ⛔ Registration deadline has passed.
                </p>
              )}
              <button
                className={`${styles.registerBtn} ${registerDisabled ? styles.registerDisabled : ""}`}
                disabled={registerDisabled}
                onClick={handleRegister}
              >
                {registerLabel}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.previousNotice}>
            <p>This event has ended. Registration is no longer available.</p>
          </div>
        )}
      </div>
    </main>
  );
}
