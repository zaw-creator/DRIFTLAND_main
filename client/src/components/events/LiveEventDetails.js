"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import defaultEvent from "@/asset/events/DefaultEventPage.png";
import StatusBadge from "@/components/events/StatusBadge";
import DriveTypeBadge from "@/components/events/DriveTypeBadge";
import RoleSelector from "@/components/events/RoleSelector";
import LeaderboardPreview from "@/components/events/LeaderboardPreview";
import styles from "@/app/events/[id]/page.module.css"; // Adjust path as needed

// Helper functions (kept outside the component so they don't recreate on render)
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function pad(n) { return String(n).padStart(2, "0"); }

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDeadline(dateStr) {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isDeadlinePassed(deadline) {
  return deadline && new Date(deadline) < new Date();
}

export default function LiveEventDetails({ initialEvent }) {
  const router = useRouter();

  // 1. Hydrate state with server data
  const [event, setEvent] = useState(initialEvent);
  const [selectedRole, setSelectedRole] = useState(null);

  // 2. SSE — Live Capacity Updates
  useEffect(() => {
    if (!event?._id) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const es = new EventSource(`${API_URL}/api/events/${event._id}/stream`);

    es.addEventListener("event-updated", (e) => {
      const patch = JSON.parse(e.data);
      setEvent((prev) => ({ ...prev, ...patch }));
    });

    es.onerror = () => {
      console.warn("SSE connection lost. Waiting for automatic reconnect...");
    };

    return () => es.close();
  }, [event._id]);

  // 3. Memoize register button state
  const deadlinePassed = useMemo(
    () => isDeadlinePassed(event.registrationDeadline),
    [event.registrationDeadline],
  );

  const registrationClosed = event.registrationOpen === false;

  const { disabled: registerDisabled, label: registerLabel } = useMemo(() => {
    if (!selectedRole) return { disabled: true, label: "Register" };
    if (registrationClosed) return { disabled: true, label: "Registration Closed" };
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
    registrationClosed,
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
      {/* ── Back to events ── */}
      <button className={styles.backBtn} onClick={() => router.push("/events")}>
        ← Events
      </button>

      {/* ── Banner image ── */}
      <div className={styles.banner}>
        <Image
          src={event.image || defaultEvent}
          alt={event.name}
          fill
          sizes="100vw"
          className={styles.bannerImage}
          priority
        />
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

        {/* ── Leaderboard preview — shows dummy data until qualifying scores exist ── */}
        {/* Links to /events/:id/results for the full telemetry page */}
        <LeaderboardPreview
          leaderboard={event.leaderboard ?? []}
          eventId={event._id}
        />

        {/* ── CTA section ── */}
        {!isPrevious ? (
          <div className={styles.ctaSection}>
            <RoleSelector
              value={selectedRole}
              onChange={setSelectedRole}
              enabledRoles={event.enabledRoles}
            />
            <div className={styles.registerRow}>
              {registrationClosed && (
                <p className={styles.closedNotice}>
                  ⛔ Registration is currently closed.
                </p>
              )}
              {!registrationClosed && deadlinePassed && (
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
