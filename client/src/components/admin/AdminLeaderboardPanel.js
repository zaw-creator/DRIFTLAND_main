'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './AdminLeaderboardPanel.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Move these OUTSIDE the component so they never change reference
const normalizeClass = (cls) => cls?.trim().toLowerCase() || '';
const scoreKey = (driverId, cls) => `${driverId}__${cls || 'none'}`;
const cutoffKey = (driveType, cls) => `${driveType}__${cls}`;

const DRIVE_TYPE_ORDER = ['Drift', 'Time Attack'];
const CLASS_ORDER = {
  'Drift':       ['Class A', 'Class B', 'Class C'],
  'Time Attack': ['Class AWD', 'Class RWD', 'Class FWD'],
};

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

async function authRequest(path, options = {}) {
  const token = getCookie('adminToken');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Request failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export default function AdminLeaderboardPanel({ eventId, disabled = false }) {
  const [drivers, setDrivers]           = useState([]);
  const [scores, setScores]             = useState({});
  const [cutoffs, setCutoffs]           = useState({});
  const [savingAll, setSavingAll]       = useState(false);
  const [saved, setSaved]               = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [savingCutoff, setSavingCutoff] = useState({});

  // Stable fetch function — won't change on re-render
const fetchData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);

    try {
      const [driversData, scoresData, eventData] = await Promise.all([
        authRequest(`/api/admin/events/${eventId}/drivers`),
        authRequest(`/api/admin/events/${eventId}/scores`).catch(() => ({ data: [], cutoffs: {} })),
        authRequest(`/api/admin/events/${eventId}`).catch(() => null),
      ]);

      const driverList = Array.isArray(driversData)      ? driversData     : [];
      const lbEntries  = Array.isArray(scoresData?.data) ? scoresData.data
                       : Array.isArray(scoresData)        ? scoresData      : [];

      // Load cutoffs — try event data first, fall back to scores response
      const savedCutoffs = eventData?.qualifyingCutoffs || scoresData?.cutoffs || {};
      if (Object.keys(savedCutoffs).length > 0) {
        const cutoffState = {};
        Object.entries(savedCutoffs).forEach(([key, val]) => {
          cutoffState[key] = String(val);
        });
        setCutoffs(cutoffState);
      }

      // Merge eliminated + rank from main DB scores into driver list
      const mergedDrivers = driverList.map(d => {
        const entry = lbEntries.find(
          (e) => String(e.driverId) === String(d.driverId) &&
                 normalizeClass(e.class) === normalizeClass(d.class)
        );
        return {
          ...d,
          qualifyRank: entry?.qualifyRank  ?? d.qualifyRank  ?? 0,
          eliminated:  entry?.eliminated   ?? d.eliminated   ?? false,
        };
      });

      setDrivers(mergedDrivers);

      const initial = {};
      mergedDrivers.forEach((d) => {
        const entry = lbEntries.find(
          (e) => String(e.driverId) === String(d.driverId) &&
                 normalizeClass(e.class) === normalizeClass(d.class)
        );
        initial[scoreKey(d.driverId, d.class)] = entry?.qualifyScore
          ? String(entry.qualifyScore)
          : '';
      });
      setScores(initial);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Run once on mount / eventId change only
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSaveAll() {
    setSavingAll(true);
    try {
      const scoresToSave = drivers
        .filter((d) => {
          const val = scores[scoreKey(d.driverId, d.class)];
          return val !== '' && val !== undefined && !isNaN(parseFloat(val));
        })
        .map((d) => ({
          driverId:   d.driverId,
          driverName: d.driverName,
          driveType:  d.driveType,
          class:      d.class,
          score:      parseFloat(scores[scoreKey(d.driverId, d.class)]),
        }));

      if (!scoresToSave.length) {
        alert('No scores entered yet.');
        return;
      }

      await authRequest(
        `/api/admin/events/${eventId}/leaderboard/bulk`,
        { method: 'POST', body: JSON.stringify({ scores: scoresToSave }) }
      );

      // Refresh scores after save — but don't trigger useEffect loop
      const scoresData = await authRequest(
        `/api/admin/events/${eventId}/scores`
      ).catch(() => []);

      const lbEntries = Array.isArray(scoresData) ? scoresData : [];

      // Update ranks without re-fetching drivers
      setDrivers(prev => prev.map(d => {
        const updated = lbEntries.find(
          e => String(e.driverId) === String(d.driverId) &&
               normalizeClass(e.class) === normalizeClass(d.class)
        );
        return updated ? { ...d, qualifyRank: updated.qualifyRank, eliminated: updated.eliminated } : d;
      }));

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(`Failed to save scores: ${err.message}`);
    } finally {
      setSavingAll(false);
    }
  }

  async function handleSetCutoff(driveType, cls) {
    const key    = cutoffKey(driveType, cls);
    const cutoff = parseInt(cutoffs[key]);

    if (!cutoff || cutoff < 2) {
      alert('Enter a cutoff number (minimum 2)');
      return;
    }
    if (cutoff % 2 !== 0) {
      alert('Cutoff must be an even number (2, 4, 6, 8...)');
      return;
    }

    setSavingCutoff(prev => ({ ...prev, [key]: true }));
    try {
      await authRequest(`/api/admin/events/${eventId}/cutoff`, {
        method: 'POST',
        body:   JSON.stringify({ driveType, class: cls, cutoff }),
      });

      const scoresData = await authRequest(
        `/api/admin/events/${eventId}/scores`
      ).catch(() => []);
      const lbEntries = Array.isArray(scoresData) ? scoresData : [];

      setDrivers(prev => prev.map(d => {
        const updated = lbEntries.find(
          e => String(e.driverId) === String(d.driverId) &&
               normalizeClass(e.class) === normalizeClass(d.class)
        );
        return updated ? { ...d, eliminated: updated.eliminated } : d;
      }));

      alert(`Cutoff set — top ${cutoff} drivers advance to bracket.`);
    } catch (err) {
      alert(`Failed to set cutoff: ${err.message}`);
    } finally {
      setSavingCutoff(prev => ({ ...prev, [key]: false }));
    }
  }

  // Group by driveType then class
  const groups = drivers.reduce((acc, d) => {
    const driveType = d.driveType || 'Unknown';
    const cls       = d.class && d.class !== 'pending' ? d.class : 'Unassigned';

    if (!acc[driveType])      acc[driveType] = {};
    if (!acc[driveType][cls]) acc[driveType][cls] = [];

    const already = acc[driveType][cls].find(
      x => x.driverId === d.driverId && x.class === cls
    );
    if (!already) acc[driveType][cls].push({ ...d, class: cls });

    return acc;
  }, {});

  if (loading) return <div className={styles.panel}><p className={styles.state}>Loading drivers...</p></div>;
  if (error)   return <div className={styles.panel}><p className={styles.error}>{error}</p></div>;
  if (!drivers.length) return (
    <div className={styles.panel}>
      <p className={styles.state}>No approved drivers found. Link a register event first.</p>
    </div>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.redBar} />
        <h2>Qualifying scores</h2>
        <button
          className={`${styles.saveAllBtn} ${saved ? styles.savedBtn : ''}`}
          disabled={savingAll || disabled}
          onClick={handleSaveAll}
        >
          {savingAll ? 'Saving...' : saved ? 'Saved!' : 'Save all scores'}
        </button>
      </div>

      {DRIVE_TYPE_ORDER.map((driveType) => {
        const classGroups = groups[driveType];
        if (!classGroups) return null;

        const knownClasses   = CLASS_ORDER[driveType] || [];
        const unknownClasses = Object.keys(classGroups).filter(c => !knownClasses.includes(c));
        const allClasses     = [...knownClasses, ...unknownClasses];

        return (
          <div key={driveType} className={styles.driveTypeSection}>
            <div className={styles.driveTypeHeading}>
              <span>{driveType}</span>
              {driveType === 'Time Attack' && (
                <span className={styles.taNote}>leaderboard only — no bracket</span>
              )}
            </div>

            {allClasses.map((cls) => {
              const list = classGroups[cls];
              if (!list?.length) return null;

              const sorted = [...list].sort((a, b) => {
                if (!a.qualifyRank && !b.qualifyRank) return 0;
                if (!a.qualifyRank) return 1;
                if (!b.qualifyRank) return -1;
                return a.qualifyRank - b.qualifyRank;
              });

              const key         = cutoffKey(driveType, cls);
              const cutoffVal   = cutoffs[key] || '';
              const isSaving    = savingCutoff[key];
              const driverCount = list.length;

              return (
                <div key={cls} className={styles.group}>
                  <div className={styles.groupHeader}>
                    <h3 className={styles.groupHeading}>
                      {cls === 'Unassigned' ? 'Unassigned — awaiting class' : cls}
                      <span className={styles.driverCount}>{driverCount} drivers</span>
                    </h3>

                    {driveType === 'Drift' && (
                      <div className={styles.cutoffRow}>
                        <span className={styles.cutoffLabel}>Advance to bracket</span>
                        <input
                          type="number"
                          min="2"
                          step="2"
                          className={styles.cutoffInput}
                          placeholder="e.g. 8"
                          value={cutoffVal}
                          onChange={(e) =>
                            setCutoffs(prev => ({ ...prev, [key]: e.target.value }))
                          }
                        />
                        <span className={styles.cutoffNote}>must be even</span>
                        <button
                          className={styles.cutoffBtn}
                          disabled={isSaving || disabled}
                          onClick={() => handleSetCutoff(driveType, cls)}
                        >
                          {isSaving ? 'Saving...' : 'Set cutoff'}
                        </button>
                      </div>
                    )}
                  </div>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Driver</th>
                        <th>Sticker</th>
                        <th className={styles.hideMobile}>Car</th>
                        <th>Score</th>
                        {driveType === 'Drift' && <th>Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((driver) => (
                        <tr
                          key={`${driver.driverId}-${cls}`}
                          className={`${styles.row} ${driver.eliminated ? styles.eliminatedRow : ''}`}
                        >
                          <td className={styles.rank}>{driver.qualifyRank || '—'}</td>
                          <td className={styles.name}>{driver.driverName}</td>
                          <td className={styles.cls}>{driver.stickerNumber || '—'}</td>
                          <td className={`${styles.cls} ${styles.hideMobile}`}>{driver.car || '—'}</td>
                          <td className={styles.scoreCell}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              className={styles.scoreInput}
                              disabled={disabled}
                              value={scores[scoreKey(driver.driverId, cls)] ?? ''}
                              onChange={(e) =>
                                setScores((prev) => ({
                                  ...prev,
                                  [scoreKey(driver.driverId, cls)]: e.target.value,
                                }))
                              }
                            />
                          </td>
                          {driveType === 'Drift' && (
                            <td className={styles.statusCell}>
                              {driver.eliminated
                                ? <span className={styles.eliminatedBadge}>Eliminated</span>
                                : driver.qualifyRank
                                ? <span className={styles.advancesBadge}>Advances</span>
                                : null}
                            </td>
                          )}
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