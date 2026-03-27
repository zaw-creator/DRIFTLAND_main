"use client";

/**
 * Leaderboard.js
 *
 * Reusable qualifying results table styled like the telemetry sandbox.
 * Renders a ranked list of drivers with their qualifying score and class.
 *
 * Props:
 *   title    {string}    Section heading text (default: "QUALIFYING TELEMETRY")
 *   results  {Object[]}  Leaderboard entries from the event schema.
 *                        Shape: [{ driverId, driverName, class, qualifyScore, qualifyRank, eliminated }]
 *   limit    {number}    Cap the number of rows shown (omit = show all)
 */

import styles from "./Leaderboard.module.css";

export default function Leaderboard({
  title = "QUALIFYING TELEMETRY",
  results = [],
  limit,
}) {
  // Return nothing if there are no results to display
  if (!results || results.length === 0) return null;

  // If a limit is provided (e.g. top-3 preview), slice the sorted array
  const rows = limit ? results.slice(0, limit) : results;

  return (
    <div className={styles.leaderboardContainer}>

      {/* ── Telemetry-style header with blinking dot ── */}
      <div className={styles.headerWrapper}>
        <h2 className={styles.headerTitle}>
          {/* Blinking indicator dot — pure CSS animation defined in module */}
          <span className={styles.blinker}></span>
          {title}
        </h2>
        {/* Hatched line that fills the remaining header width */}
        <div className={styles.telemetryLine}></div>
      </div>

      {/* ── Column labels row ── */}
      <div className={styles.tableHeader}>
        <span className={styles.colPos}>POS</span>
        <span className={styles.colDriver}>DRIVER</span>
        {/* "CLASS" column — hidden on narrow mobile via CSS */}
        <span className={styles.colCar}>CLASS</span>
        <span className={styles.colScore}>SCORE</span>
      </div>

      {/* ── Driver rows ── */}
      <div className={styles.resultsList}>
        {rows.map((driver) => {
          // P1 (rank 1) gets the gold gradient highlight treatment
          const isP1 = driver.qualifyRank === 1;

          return (
            <div
              // driverId is the stable unique key from the leaderboard schema
              key={driver.driverId}
              className={`${styles.row} ${isP1 ? styles.rowP1 : ""} ${driver.eliminated ? styles.rowEliminated : ""}`}
            >
              {/* Position: show "P1" for pole, "P2" etc. for the rest */}
              <span className={styles.colPos}>
                P{driver.qualifyRank}
              </span>

              {/* Driver name — stored as driverName in the leaderboard schema */}
              <span className={styles.colDriver}>{driver.driverName}</span>

              {/* Class — e.g. "Class A". Hidden on very small screens via CSS */}
              <span className={styles.colCar}>{driver.class}</span>

              {/* Qualifying score — toFixed(1) guards against missing decimals */}
              <span className={styles.colScore}>
                {driver.qualifyScore != null
                  ? driver.qualifyScore.toFixed(1)
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
