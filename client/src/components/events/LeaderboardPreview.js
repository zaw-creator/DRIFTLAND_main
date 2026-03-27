"use client";

/**
 * LeaderboardPreview.js
 *
 * A compact teaser widget shown on the event detail page (LiveEventDetails).
 * Displays the top 3 qualifiers per class with the same telemetry aesthetic
 * as the sandbox, then links to the full `/events/[id]/results` page.
 *
 * Props:
 *   leaderboard  {Object[]}  Full leaderboard array from the event document.
 *                            Shape: [{ driverId, driverName, class, driveType,
 *                                      qualifyScore, qualifyRank, eliminated }]
 *   eventId      {string}    Event _id — used to build the "View Full Results" link.
 *   topN         {number}    How many drivers to show per class (default: 3).
 */

import Link from "next/link";
import styles from "./LeaderboardPreview.module.css";

function groupTopN(leaderboard, topN) {
  const sorted = [...leaderboard].sort(
    (a, b) => (a.qualifyRank ?? 999) - (b.qualifyRank ?? 999),
  );
  const groups = {};
  sorted.forEach((driver) => {
    const cls = driver.class || "Open";
    if (!groups[cls]) groups[cls] = [];
    if (groups[cls].length < topN) groups[cls].push(driver);
  });
  return groups;
}

export default function LeaderboardPreview({
  leaderboard = [],
  eventId,
  topN = 3,
}) {
  const hasData = leaderboard.length > 0;
  const classGroups = hasData ? groupTopN(leaderboard, topN) : {};
  const classNames = Object.keys(classGroups).sort();

  return (
    <div className={styles.wrapper}>

      {/* ── Section header ── */}
      <div className={styles.headerWrapper}>
        <h2 className={styles.headerTitle}>
          <span className={styles.blinker} />
          QUALIFYING TELEMETRY
        </h2>
        <div className={styles.telemetryLine} />
      </div>

      {hasData ? (
        /* ── Per-class top-N grids ── */
        <div className={styles.classGrid}>
          {classNames.map((cls) => (
            <div key={cls} className={styles.classBlock}>
              <div className={styles.classLabel}>{cls.toUpperCase()}</div>
              {classGroups[cls].map((driver) => {
                const isP1 = driver.qualifyRank === 1;
                return (
                  <div
                    key={driver.driverId}
                    className={`${styles.row} ${isP1 ? styles.rowP1 : ""}`}
                  >
                    <span className={styles.pos}>P{driver.qualifyRank}</span>
                    <span className={styles.driverName}>{driver.driverName}</span>
                    <span className={styles.score}>
                      {driver.qualifyScore != null
                        ? driver.qualifyScore.toFixed(1)
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* ── Empty state — no qualifying results yet ── */
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⏱</div>
          <p className={styles.emptyTitle}>RESULTS PENDING</p>
          <p className={styles.emptySubtitle}>
            Qualifying telemetry will appear here once the session begins.
          </p>
        </div>
      )}

      {/* ── CTA: link to the full standalone results page ── */}
      <Link href={`/events/${eventId}/results`} className={styles.viewAllLink}>
        VIEW FULL RESULTS →
      </Link>
    </div>
  );
}
