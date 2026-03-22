'use client';

import { useState, useEffect } from 'react';
import styles from './AdminBracketManager.module.css';

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

export default function AdminBracketManager({ eventId, leaderboard = [] }) {
  const [bracket, setBracket]         = useState([]);
  const [generated, setGenerated]     = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [pickingMatch, setPickingMatch] = useState(null); // matchId being saved
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    authRequest(`/api/events/${eventId}/bracket`)
      .then((res) => {
        setBracket(res?.bracket ?? []);
        setGenerated(res?.generated ?? false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  function getDriverName(driverId) {
    if (!driverId) return 'TBD';
    const d = leaderboard.find((d) => d.driverId === driverId);
    return d ? d.driverName : driverId;
  }

  async function handleGenerate() {
    if (!confirm('Generate bracket from current qualifying ranks?')) return;
    setGenerating(true);
    try {
      const newBracket = await authRequest(
        `/api/admin/events/${eventId}/bracket/generate`,
        { method: 'POST' }
      );
      setBracket(newBracket);
      setGenerated(true);
    } catch (err) {
      alert(`Failed to generate bracket: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePickWinner(match, winnerId) {
    if (match.status === 'completed') return;
    const winnerName = getDriverName(winnerId);
    if (!confirm(`Set ${winnerName} as winner of ${match.matchId}?`)) return;

    setPickingMatch(match.matchId);
    try {
      const res = await authRequest(
        `/api/admin/events/${eventId}/bracket/${match.matchId}/winner`,
        { method: 'PUT', body: JSON.stringify({ winnerId }) }
      );
      setBracket(res.bracket);
    } catch (err) {
      alert(`Failed to set winner: ${err.message}`);
    } finally {
      setPickingMatch(null);
    }
  }

// Group by class first, then by round within each class
const classGroups = bracket.reduce((acc, match) => {
  const cls = match.class || 'Unassigned';
  if (!acc[cls]) acc[cls] = {};
  if (!acc[cls][match.roundNum]) acc[cls][match.roundNum] = [];
  acc[cls][match.roundNum].push(match);
  return acc;
}, {});

const CLASS_ORDER = ['Class A', 'Class B', 'Class C'];

// All classes in bracket — known ones first, then any extras
const knownClasses   = CLASS_ORDER.filter(cls => classGroups[cls]);
const unknownClasses = Object.keys(classGroups).filter(cls => !CLASS_ORDER.includes(cls));
const allClasses     = [...knownClasses, ...unknownClasses];

  function getRoundLabel(roundNum, matches) {
    const first = matches[0];
    if (first.round === 'final')     return 'Final';
    if (first.round === 'semifinal') return 'Semi-finals';
    return `Round ${roundNum}`;
  }

  if (loading) return <div className={styles.panel}><p className={styles.state}>Loading bracket...</p></div>;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.redBar} />
        <h2>Bracket manager</h2>

        {!generated && (
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate bracket'}
          </button>
        )}
      </div>

      {!generated && (
        <div className={styles.pendingState}>
          <p>Enter all qualifying scores first, then generate the bracket.</p>
        </div>
      )}

      {generated && (
  <div>
    {allClasses.map((cls) => {
      const rounds    = classGroups[cls];
      const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b);

      return (
        <div key={cls} className={styles.classSection}>
          <div className={styles.classHeading}>{cls}</div>

          <div className={styles.bracketScroll}>
            <div className={styles.bracketGrid}>
              {roundNums.map((roundNum) => {
                const matches = rounds[roundNum];
                return (
                  <div key={roundNum} className={styles.roundCol}>
                    <div className={styles.roundLabel}>
                      {getRoundLabel(roundNum, matches)}
                    </div>

                    {matches.map((match) => {
                      const isPicking  = pickingMatch === match.matchId;
                      const isComplete = match.status === 'completed';

                      return (
                        <div
                          key={match.matchId}
                          className={`${styles.matchCard} ${isComplete ? styles.completed : ''}`}
                        >
                          <div className={styles.matchId}>{match.matchId}</div>

                          {/* Driver 1 */}
                          <button
                            className={`${styles.driverBtn}
                              ${match.winnerId === match.driver1Id ? styles.winner : ''}
                              ${isComplete && match.winnerId !== match.driver1Id ? styles.loser : ''}
                              ${!isComplete && match.driver1Id ? styles.clickable : ''}
                            `}
                            disabled={isComplete || isPicking || !match.driver1Id}
                            onClick={() => match.driver1Id && handlePickWinner(match, match.driver1Id)}
                          >
                            <span className={styles.driverName}>
                              {getDriverName(match.driver1Id)}
                            </span>
                            {match.winnerId === match.driver1Id && (
                              <span className={styles.winTag}>WIN</span>
                            )}
                          </button>

                          <div className={styles.vsDivider}>
                            {isComplete ? '—' : 'VS'}
                          </div>

                          {/* Driver 2 */}
                          <button
                            className={`${styles.driverBtn}
                              ${match.winnerId === match.driver2Id ? styles.winner : ''}
                              ${isComplete && match.winnerId !== match.driver2Id ? styles.loser : ''}
                              ${!isComplete && match.driver2Id ? styles.clickable : ''}
                            `}
                            disabled={isComplete || isPicking || !match.driver2Id}
                            onClick={() => match.driver2Id && handlePickWinner(match, match.driver2Id)}
                          >
                            <span className={styles.driverName}>
                              {match.driver2Id ? getDriverName(match.driver2Id) : 'BYE'}
                            </span>
                            {match.winnerId === match.driver2Id && (
                              <span className={styles.winTag}>WIN</span>
                            )}
                          </button>

                          {isPicking && (
                            <div className={styles.savingOverlay}>Saving...</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}
    </div>
  );
}