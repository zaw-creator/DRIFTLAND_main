'use client';

import { useState, useEffect } from 'react';
import styles from './AdminLeaderboardPanel.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

async function authRequest(path, options = {}) {
  const token = getCookie('adminToken');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',           // send cookies with every request
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Request failed: ${res.status}`);
  }
  const json = await res.json();
  // handle both { data: ... } and { success, data: ... } shapes
  return json.data ?? json;
}

export default function AdminLeaderboardPanel({ eventId }) {
  const [drivers, setDrivers]   = useState([]);
  const [scores, setScores]     = useState({});   // { driverId: scoreValue }
  const [saving, setSaving]     = useState({});   // { driverId: bool }
  const [saved, setSaved]       = useState({});   // { driverId: bool } flash
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // Pull approved drivers from register DB via main backend
useEffect(() => {
  if (!eventId) return;
  setLoading(true);

  // Fetch both drivers and current leaderboard scores in parallel
  Promise.all([
    authRequest(`/api/admin/events/${eventId}/drivers`),
    authRequest(`/api/events/${eventId}/leaderboard`).catch(() => ({ data: [] })),
  ])
    .then(([driversData, lbData]) => {
      const drivers   = Array.isArray(driversData) ? driversData : [];
      const lbEntries = lbData?.data ?? [];

      // Pre-fill scores from main DB leaderboard
      const merged = drivers.map((d) => {
        const entry = lbEntries.find((e) => e.driverId === d.driverId);
        return {
          ...d,
          qualifyScore: entry?.qualifyScore ?? 0,
          qualifyRank:  entry?.qualifyRank  ?? 0,
        };
      });

      setDrivers(merged);

      // Pre-fill score inputs
      const initial = {};
      merged.forEach((d) => {
        initial[d.driverId] = d.qualifyScore || '';
      });
      setScores(initial);
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, [eventId]);

  async function saveScore(driver) {
    const score = parseFloat(scores[driver.driverId]);
    if (isNaN(score)) return;

    setSaving((prev) => ({ ...prev, [driver.driverId]: true }));
    try {
      await authRequest(`/api/admin/events/${eventId}/leaderboard/${driver.driverId}`, {
        method: 'PUT',
        body: JSON.stringify({
          score,
          driverName: driver.driverName,
          driveType:  driver.driveType,
        }),
      });
      setSaved((prev) => ({ ...prev, [driver.driverId]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [driver.driverId]: false })), 2000);
    } catch (err) {
      alert(`Failed to save score: ${err.message}`);
    } finally {
      setSaving((prev) => ({ ...prev, [driver.driverId]: false }));
    }
  }

  // Group drivers by driveType
// Replace the existing groups logic in AdminLeaderboardPanel.js

// First group by driveType, then by class within each driveType
const groups = drivers.reduce((acc, d) => {
  const driveType = d.driveType || 'Unknown';

  // Handle comma-separated classes e.g. "Class A, Class B"
  const classes = d.class
    ? d.class.split(',').map(c => c.trim())
    : ['Unassigned'];

  classes.forEach(cls => {
    if (!acc[driveType])      acc[driveType] = {};
    if (!acc[driveType][cls]) acc[driveType][cls] = [];

    // Avoid duplicating driver if they appear in multiple classes
    const already = acc[driveType][cls].find(x => x.driverId === d.driverId);
    if (!already) acc[driveType][cls].push(d);
  });

  return acc;
}, {});

// Defined display order
const DRIVE_TYPE_ORDER = ['Drift', 'Time Attack'];
const CLASS_ORDER = {
  'Drift':       ['Class A', 'Class B', 'Class C'],
  'Time Attack': ['Class AWD', 'Class RWD', 'Class FWD'],  
};

  if (loading) return <div className={styles.panel}><p className={styles.state}>Loading drivers...</p></div>;
  if (error)   return <div className={styles.panel}><p className={styles.error}>{error}</p></div>;
  if (!drivers.length) return (
    <div className={styles.panel}>
      <p className={styles.state}>No approved drivers found for this event.</p>
    </div>
  );

  return (
  <div className={styles.panel}>
    <div className={styles.panelHeader}>
      <div className={styles.redBar} />
      <h2>Qualifying scores</h2>
    </div>

    {DRIVE_TYPE_ORDER.map((driveType) => {
      const classGroups = groups[driveType];
      if (!classGroups) return null;

      return (
        <div key={driveType} className={styles.driveTypeSection}>

          {/* Drive type heading */}
          <div className={styles.driveTypeHeading}>
            <span>{driveType}</span>
          </div>

          {/* Classes within this drive type */}
          {(CLASS_ORDER[driveType] || Object.keys(classGroups)).map((cls) => {
            const list = classGroups[cls];
            if (!list?.length) return null;

            return (
              <div key={cls} className={styles.group}>
                <h3 className={styles.groupHeading}>{cls}</h3>

                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Driver</th>
                      <th>Sticker</th>
                      <th className={styles.hideMobile}>Car</th>
                      <th>Score</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list
                      .sort((a, b) => (a.qualifyRank || 999) - (b.qualifyRank || 999))
                      .map((driver) => (
                        <tr key={driver.driverId} className={styles.row}>
                          <td className={styles.rank}>
                            {driver.qualifyRank || '—'}
                          </td>
                          <td className={styles.name}>{driver.driverName}</td>
                          <td className={styles.cls}>{driver.stickerNumber || '—'}</td>
                          <td className={`${styles.cls} ${styles.hideMobile}`}>
                            {driver.car || '—'}
                          </td>
                          <td className={styles.scoreCell}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              className={styles.scoreInput}
                              value={scores[driver.driverId] ?? ''}
                              onChange={(e) =>
                                setScores((prev) => ({
                                  ...prev,
                                  [driver.driverId]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => e.key === 'Enter' && saveScore(driver)}
                            />
                          </td>
                          <td>
                            <button
                              className={`${styles.saveBtn} ${saved[driver.driverId] ? styles.savedBtn : ''}`}
                              disabled={saving[driver.driverId]}
                              onClick={() => saveScore(driver)}
                            >
                              {saving[driver.driverId]
                                ? 'Saving...'
                                : saved[driver.driverId]
                                ? 'Saved!'
                                : 'Save'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
);
}