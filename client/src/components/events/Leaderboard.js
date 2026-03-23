'use client';

import { useState, useEffect } from 'react';
import { getLeaderboard } from '@/services/eventService';
import styles from './Leaderboard.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function Leaderboard({ eventId, limit = null, leaderboardUpdate = null }) {
  const [drivers, setDrivers]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [session, setSession]     = useState('qualifying');
  const [updatedId, setUpdatedId] = useState(null);

  // Initial fetch
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    getLeaderboard(eventId)
      .then((res) => setDrivers(res?.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  // Receive live updates from parent SSE
  useEffect(() => {
    if (!leaderboardUpdate) return;
    setDrivers(leaderboardUpdate);
  }, [leaderboardUpdate]);

  const filtered = drivers
    .filter((d) => session === 'qualifying' || !d.eliminated)
    .sort((a, b) => a.qualifyRank - b.qualifyRank);

  const displayed = limit ? filtered.slice(0, limit) : filtered;

  const leaderScore = displayed[0]?.qualifyScore ?? 0;

  if (loading) {
    return (
      <div className={styles.trackContainer}>
        <div className={styles.loadingRow}>Loading leaderboard...</div>
      </div>
    );
  }

  if (!displayed.length) {
    return (
      <div className={styles.trackContainer}>
        <div className={styles.emptyRow}>No results yet.</div>
      </div>
    );
  }

  return (
    <div className={styles.trackContainer}>
      <header className={styles.raceHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.redBar}></div>
          <h1>
            <span className={styles.liveIndicator}></span>
            {limit ? `TOP ${limit}` : 'LIVE TIMING & SCORING'}
          </h1>
        </div>

        {!limit && (
          <div className={styles.sessionControls}>
            <button
              className={`${styles.sessionBtn} ${session === 'qualifying' ? styles.activeSession : ''}`}
              onClick={() => setSession('qualifying')}
            >
              QUALIFYING
            </button>
            <button
              className={`${styles.sessionBtn} ${session === 'bracket' ? styles.activeSession : ''}`}
              onClick={() => setSession('bracket')}
            >
              TOP 32 BATTLES
            </button>
          </div>
        )}
      </header>

      <div className={styles.telemetryWrapper}>
        <table className={styles.timingTable}>
          <thead>
            <tr>
              <th>POS</th>
              <th>DRIVER</th>
              <th className={styles.hideMobile}>DRIVE TYPE</th>
              <th className={styles.scoreCol}>SCORE</th>
              <th className={styles.scoreCol}>W</th>
              <th className={styles.scoreCol}>L</th>
              <th className={styles.gapCol}>GAP</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((item, index) => {
              const isUpdated = updatedId === item.driverId;
              const gap = index === 0
                ? 'LEADER'
                : `+${(leaderScore - item.qualifyScore).toFixed(1)}`;

              return (
                <tr
                  key={item.driverId}
                  className={`
                    ${styles.driverRow}
                    ${isUpdated ? styles.recentlyUpdated : ''}
                    ${item.eliminated ? styles.eliminated : ''}
                  `}
                >
                  <td className={styles.posCell}>
                    <div className={`${styles.posBadge} ${item.qualifyRank === 1 ? styles.pos1 : ''}`}>
                      {item.qualifyRank}
                    </div>
                  </td>
                  <td className={styles.driverCell}>
                    <span className={styles.lastName}>
                      {item.driverName?.split(' ').pop()}
                    </span>
                    <span className={styles.firstName}>
                      {item.driverName?.split(' ').slice(0, -1).join(' ')}
                    </span>
                  </td>
                  <td className={`${styles.teamCell} ${styles.hideMobile}`}>
                    <span className={styles.carDetail}>{item.driveType}</span>
                  </td>
                  <td className={styles.scoreCol}>{item.qualifyScore}</td>
                  <td className={styles.scoreCol}>{item.wins}</td>
                  <td className={styles.scoreCol}>{item.losses}</td>
                  <td className={styles.gapCol}>
                    <span className={gap === 'LEADER' ? styles.leaderText : styles.gapText}>
                      {gap}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}