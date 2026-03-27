"use client";

/**
 * TournamentBracket.js
 *
 * Public-facing bracket viewer for the event detail page.
 * Also supports an optional admin mode (isAdmin=true) where clicking a driver
 * sets them as the match winner and syncs to the backend.
 *
 * Props:
 *   initialBracket    {Object[]}  Flat array of match objects from the backend.
 *                                 Shape: [{ matchId, roundNum, round, class,
 *                                           driver1Id, driver2Id, winnerId, status }]
 *   initialLeaderboard {Object[]} Leaderboard entries used to look up driver names.
 *                                 Shape: [{ driverId, driverName, qualifyRank, ... }]
 *   isAdmin           {boolean}   When true, driver rows are clickable to set winner.
 *   eventId           {string}    Event _id — required when isAdmin is true.
 *
 * Key design decisions:
 *   - Bracket is stored flat on the backend; this component groups it into rounds.
 *   - A HashMap (activeRoster) is built from initialLeaderboard for O(1) name lookups.
 *   - Optimistic UI updates the local state instantly; the API call syncs in background.
 */

import { useState, useEffect, useMemo } from "react";
import styles from "./TournamentBracket.module.css";

// ── API helpers (used only when isAdmin=true) ─────────────────────────────────

// Base URL for the Express backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

/**
 * Reads an HTTP cookie by name.
 * Used to retrieve the adminToken for authenticated API calls.
 */
function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TournamentBracket({
  initialBracket = [],
  initialLeaderboard = [],
  isAdmin = false, // false = read-only public view; true = admin can set winners
  eventId,
}) {
  // Local bracket state — updated optimistically when admin sets a winner
  const [bracket, setBracket] = useState(initialBracket);

  // HashMap keyed by driverId for O(1) lookups when rendering each match card.
  // Rebuilt whenever initialLeaderboard changes (e.g. SSE update from parent).
  const [activeRoster, setActiveRoster] = useState({});

  // Build the roster HashMap from the leaderboard array on mount / prop change
  useEffect(() => {
    const rosterMap = {};
    initialLeaderboard.forEach((driver) => {
      // Use driverId as the key — matches the field name in the leaderboard schema
      rosterMap[driver.driverId] = { ...driver };
    });
    setActiveRoster(rosterMap);
  }, [initialLeaderboard]);

  // ── FIX 3: Group flat bracket array into rounds ───────────────────────────
  // The backend stores bracket as a flat array: [{ matchId, roundNum, ... }]
  // The render loop needs rounds grouped: [{ roundKey, roundLabel, matches[] }]
  // This useMemo re-runs only when bracket changes, not on every render.
  const groupedRounds = useMemo(() => {
    if (!bracket.length) return [];

    // Step 1: group matches by their roundNum value
    const byRound = {};
    bracket.forEach((match) => {
      // Default to round 1 if roundNum is missing (safety fallback)
      const key = match.roundNum ?? 1;
      if (!byRound[key]) byRound[key] = [];
      byRound[key].push(match);
    });

    // Step 2: sort rounds ascending (Round 1 → Semifinals → Final) and
    // map each group to a render-friendly shape with a human-readable label.
    return Object.keys(byRound)
      .map(Number)
      .sort((a, b) => a - b)
      .map((roundNum) => {
        const matches = byRound[roundNum];
        // Derive the label from the `round` string field on the first match
        const first = matches[0];
        let roundLabel;
        if (first?.round === "final")          roundLabel = "Final";
        else if (first?.round === "semifinal") roundLabel = "Semi-finals";
        else                                   roundLabel = `Round ${roundNum}`;

        return { roundKey: roundNum, roundLabel, matches };
      });
  }, [bracket]);

  // ── Admin: set match winner ───────────────────────────────────────────────
  /**
   * handleSetWinner — called when admin clicks a driver row in a pending match.
   *
   * Flow:
   *   1. Optimistic UI: update local bracket + roster state instantly (no flicker)
   *   2. Background sync: PUT to backend to persist the result
   *   3. On failure: log error (in production, revert optimistic state here)
   *
   * @param {string} matchId   The matchId string (e.g. "ClassA-R1-M1")
   * @param {string} winnerId  driverId of the driver the admin clicked
   * @param {string} loserId   driverId of the other driver (auto-derived loser)
   */
  const handleSetWinner = async (matchId, winnerId, loserId) => {
    // Guard: only fire if admin mode is on and both driver IDs are present
    if (!isAdmin || !winnerId || !loserId) return;

    // ── Optimistic UI: update roster HashMap instantly ──────────────────────
    setActiveRoster((prev) => ({
      ...prev,
      // Increment winner's win count in local state
      [winnerId]: { ...prev[winnerId], wins: (prev[winnerId]?.wins || 0) + 1 },
      // Increment loser's loss count and mark them eliminated in local state
      [loserId]: {
        ...prev[loserId],
        losses: (prev[loserId]?.losses || 0) + 1,
        eliminated: true,
      },
    }));

    // ── Optimistic UI: mark match as completed in bracket state ────────────
    setBracket((prevBracket) =>
      prevBracket.map((match) => {
        // Find the match by matchId and update it; leave all others untouched
        if (match.matchId !== matchId) return match;
        return { ...match, winnerId, status: "completed" };
      }),
    );

    // ── Background sync: persist winner to the Express backend ─────────────
    try {
      // Read the admin JWT from cookie — same pattern as AdminBracketManager
      const token = getCookie("adminToken");

      const res = await fetch(
        // Uses the admin-protected endpoint that also auto-generates next round
        `${API_URL}/api/admin/events/${eventId}/bracket/${matchId}/winner`,
        {
          method: "PUT",
          credentials: "include", // send cookies along with the request
          headers: {
            "Content-Type": "application/json",
            // Bearer token auth — required by the admin middleware
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ winnerId }),
        },
      );

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);

      // The backend returns the full updated bracket (with next-round matches).
      // Replace local state with the authoritative server version.
      const json = await res.json();
      const updatedBracket =
        json?.data?.bracket ?? json?.bracket ?? null;
      if (updatedBracket) setBracket(updatedBracket);
    } catch (error) {
      // In production: revert the optimistic state here to avoid showing wrong data.
      // For now, log the error so the developer can diagnose without silently failing.
      console.error(
        `[TournamentBracket] Failed to sync match ${matchId} to server:`,
        error.message,
      );
    }
  };

  // Nothing to render if bracket is empty
  if (bracket.length === 0) return null;

  return (
    <div className={styles.bracketWrapper}>
      <div className={styles.scrollTrack}>
        {/* ── FIX 3: iterate groupedRounds (not raw bracket) ── */}
        {groupedRounds.map((round) => (
          <div key={round.roundKey} className={styles.roundColumn}>
            {/* Round header: "Round 1", "Semi-finals", "Final" */}
            <div className={styles.roundHeader}>{round.roundLabel}</div>

            <div className={styles.matchList}>
              {round.matches.map((match) => {
                // ── O(1) HashMap lookups for both drivers ──────────────────
                // driver1Id / driver2Id come from the flat match object
                const d1 = activeRoster[match.driver1Id];
                const d2 = activeRoster[match.driver2Id];

                // Determine winner/completion state for styling
                // Compare winnerId against the driverId field (not .id)
                const isD1Winner = match.winnerId === d1?.driverId;
                const isD2Winner = match.winnerId === d2?.driverId;
                const isCompleted = match.status === "completed" || !!match.winnerId;

                // Admin rows are only clickable on pending matches with both drivers
                const isClickable = isAdmin && !isCompleted && !!d1 && !!d2;

                return (
                  <div
                    key={match.matchId}
                    className={styles.matchCard}
                  >
                    {/* ── DRIVER 1 ── */}
                    <div
                      className={`${styles.driverRow} ${isD1Winner ? styles.winner : ""} ${isClickable ? styles.adminHover : ""}`}
                      onClick={() =>
                        handleSetWinner(
                          match.matchId,
                          // ── FIX 6: use driverId directly (d1?.id was always undefined) ──
                          d1?.driverId,
                          d2?.driverId,
                        )
                      }
                      style={{ cursor: isClickable ? "pointer" : "default" }}
                    >
                      <span className={styles.seed}>
                        P{d1?.qualifyRank ?? "-"}
                      </span>
                      <span
                        className={styles.name}
                        style={{
                          // Dim eliminated drivers who did not win this match
                          color: d1?.eliminated && !isD1Winner ? "#555" : "inherit",
                        }}
                      >
                        {/* ── FIX 4: driverName (was d1.name — always blank) ── */}
                        {d1 ? d1.driverName : "TBD"}
                      </span>
                      {isD1Winner && (
                        <span className={styles.advanceIcon}>▶</span>
                      )}
                    </div>

                    <div className={styles.vsDivider}>VS</div>

                    {/* ── DRIVER 2 ── */}
                    <div
                      className={`${styles.driverRow} ${isD2Winner ? styles.winner : ""} ${isClickable ? styles.adminHover : ""}`}
                      onClick={() =>
                        handleSetWinner(
                          match.matchId,
                          // ── FIX 6: use driverId directly ──
                          d2?.driverId,
                          d1?.driverId,
                        )
                      }
                      style={{ cursor: isClickable ? "pointer" : "default" }}
                    >
                      <span className={styles.seed}>
                        P{d2?.qualifyRank ?? "-"}
                      </span>
                      <span
                        className={styles.name}
                        style={{
                          color: d2?.eliminated && !isD2Winner ? "#555" : "inherit",
                        }}
                      >
                        {/* ── FIX 4: driverName (was d2.name — always blank) ── */}
                        {d2 ? d2.driverName : "TBD"}
                      </span>
                      {isD2Winner && (
                        <span className={styles.advanceIcon}>▶</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
