"use client";

/**
 * EventTelemetry.js
 *
 * Full-page telemetry UI for an event's qualifying results and elimination
 * bracket. Rendered on the standalone `/events/[id]/results` page.
 *
 * Props:
 *   event  {Object}  Full event document. Required fields:
 *                      name        {string}
 *                      leaderboard {Object[]}  qualifying results
 *                      bracket     {Object[]}  flat match array (may be empty)
 *                      bracketGenerated {boolean}
 */

import { useState, useMemo } from "react";
import Leaderboard from "@/components/events/Leaderboard";
import TournamentBracket from "@/components/events/TournamentBracket";
import styles from "./EventTelemetry.module.css";

const VIEWS = {
  QUALIFYING: "qualifying",
  BRACKET:    "bracket",
};

function getClasses(leaderboard) {
  const set = new Set(leaderboard.map((d) => d.class || "Open"));
  return Array.from(set).sort();
}

export default function EventTelemetry({ event }) {
  const leaderboard  = event?.leaderboard ?? [];
  const bracket      = event?.bracket ?? [];
  const hasData      = leaderboard.length > 0;

  const [activeView, setActiveView] = useState(VIEWS.QUALIFYING);

  const classes = useMemo(() => getClasses(leaderboard), [leaderboard]);
  const [activeClass, setActiveClass] = useState(classes[0] ?? null);

  const classLeaderboard = useMemo(
    () =>
      leaderboard
        .filter((d) => (d.class || "Open") === activeClass)
        .sort((a, b) => (a.qualifyRank ?? 999) - (b.qualifyRank ?? 999)),
    [leaderboard, activeClass],
  );

  const classBracket = useMemo(
    () => bracket.filter((m) => (m.class || "Open") === activeClass),
    [bracket, activeClass],
  );

  return (
    <div className={styles.page}>

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <p className={styles.eventLabel}>{event.name?.toUpperCase()}</p>
        <h1 className={styles.pageTitle}>TELEMETRY</h1>
      </div>

      {!hasData ? (
        /* ── Empty state — no qualifying results yet ── */
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⏱</div>
          <p className={styles.emptyTitle}>RESULTS PENDING</p>
          <p className={styles.emptySubtitle}>
            Qualifying telemetry will appear here once the session begins.
          </p>
        </div>
      ) : (
        <>
          {/* ── Main view toggle ── */}
          <div className={styles.mainToggle}>
            <button
              className={`${styles.toggleBtn} ${activeView === VIEWS.QUALIFYING ? styles.activeBtn : ""}`}
              onClick={() => setActiveView(VIEWS.QUALIFYING)}
            >
              QUALIFYING
            </button>

            {event.bracketGenerated && (
              <button
                className={`${styles.toggleBtn} ${activeView === VIEWS.BRACKET ? styles.activeBtn : ""}`}
                onClick={() => setActiveView(VIEWS.BRACKET)}
              >
                ELIMINATION BRACKET
              </button>
            )}
          </div>

          {/* ── Class sub-tabs ── */}
          {classes.length > 1 && (
            <div className={styles.classTabs}>
              {classes.map((cls) => (
                <button
                  key={cls}
                  className={`${styles.classTab} ${activeClass === cls ? styles.activeClassTab : ""}`}
                  onClick={() => setActiveClass(cls)}
                >
                  {cls.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* ── Content pane ── */}
          <div className={styles.content}>
            {activeView === VIEWS.QUALIFYING && (
              classLeaderboard.length > 0 ? (
                <Leaderboard
                  title={`QUALIFYING — ${activeClass?.toUpperCase()}`}
                  results={classLeaderboard}
                />
              ) : (
                <div className={styles.emptyState}>
                  <p>No qualifying results for {activeClass} yet.</p>
                </div>
              )
            )}

            {activeView === VIEWS.BRACKET && (
              classBracket.length > 0 ? (
                <TournamentBracket
                  initialBracket={classBracket}
                  initialLeaderboard={leaderboard}
                  isAdmin={false}
                />
              ) : (
                <div className={styles.emptyState}>
                  <p>Bracket not available for {activeClass}.</p>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
