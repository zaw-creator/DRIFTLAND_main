// 'use client';

// import { useState, useEffect } from 'react';
// import { getBracket } from '@/services/eventService';
// import styles from './TournamentBracket.module.css';

// export default function TournamentBracket({ eventId, leaderboard = [] }) {

//     useEffect(() => {
//     if (!bracketUpdate) return;
//     setBracket(bracketUpdate.bracket ?? []);
//     setGenerated(true);
//   }, [bracketUpdate]);

//   const [bracket, setBracket]       = useState([]);
//   const [generated, setGenerated]   = useState(false);
//   const [loading, setLoading]       = useState(true);

//   // Initial fetch
//   useEffect(() => {
//     if (!eventId) return;
//     setLoading(true);
//     getBracket(eventId)
//       .then((res) => {
//         setBracket(res?.bracket ?? []);
//         setGenerated(res?.generated ?? false);
//       })
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, [eventId]);

//   // // SSE — live bracket updates
//   // useEffect(() => {
//   //   if (!eventId) return;
//   //   const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
//   //   const es = new EventSource(`${API_URL}/api/events/${eventId}/stream`);

//   //   es.addEventListener('event-updated', (e) => {
//   //     const patch = JSON.parse(e.data);
//   //     if (patch.type === 'BRACKET_UPDATE' || patch.type === 'BRACKET_GENERATED') {
//   //       setBracket(patch.bracket ?? []);
//   //       setGenerated(true);
//   //     }
//   //   });

//   //   return () => es.close();
//   // }, [eventId]);

//   // Helper — get driver name from leaderboard by id
//   function getDriverName(driverId) {
//     if (!driverId) return 'TBD';
//     const d = leaderboard.find((d) => d.driverId === driverId);
//     return d ? d.driverName : driverId;
//   }

//   // Replace the existing rounds grouping in TournamentBracket.js
// const classGroups = bracket.reduce((acc, match) => {
//   const cls = match.class || 'Unassigned';
//   if (!acc[cls]) acc[cls] = {};
//   if (!acc[cls][match.roundNum]) acc[cls][match.roundNum] = [];
//   acc[cls][match.roundNum].push(match);
//   return acc;
// }, {});

// const CLASS_ORDER = ['Class A', 'Class B', 'Class C'];
//   const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b);

//   function getRoundLabel(roundNum, matches) {
//     const first = matches[0];
//     if (first.round === 'final')      return 'Final';
//     if (first.round === 'semifinal')  return 'Semi-finals';
//     return `Round ${roundNum}`;
//   }

//   if (loading) {
//     return (
//       <div className={styles.bracketContainer}>
//         <div className={styles.loadingRow}>Loading bracket...</div>
//       </div>
//     );
//   }

//   if (!generated || !bracket.length) {
//     return (
//       <div className={styles.bracketContainer}>
//         <div className={styles.pendingState}>
//           <div className={styles.pendingIcon}>⏳</div>
//           <p>Bracket will appear here once qualifying is complete.</p>
//         </div>
//       </div>
//     );
//   }

//  return (
//   <div className={styles.bracketContainer}>
//     <div className={styles.bracketHeader}>
//       <div className={styles.redBar} />
//       <h2>Tournament bracket</h2>
//     </div>

//     {CLASS_ORDER.map((cls) => {
//       const rounds = classGroups[cls];
//       if (!rounds) return null;
//       const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b);

//       return (
//         <div key={cls} className={styles.classSection}>
//           <div className={styles.classHeading}>{cls}</div>

//           <div className={styles.bracketScroll}>
//             <div className={styles.bracketGrid}>
//               {roundNums.map((roundNum) => {
//                 const matches = rounds[roundNum];
//                 return (
//                   <div key={roundNum} className={styles.roundCol}>
//                     <div className={styles.roundLabel}>
//                       {getRoundLabel(roundNum, matches)}
//                     </div>

//                     <div className={styles.matchList}>
//                       {matches.map((match) => {
//                         const d1Name    = getDriverName(match.driver1Id);
//                         const d2Name    = getDriverName(match.driver2Id);
//                         const d1Wins    = match.winnerId === match.driver1Id;
//                         const d2Wins    = match.winnerId === match.driver2Id;
//                         const isPending = match.status === 'pending';

//                         return (
//                           <div
//                             key={match.matchId}
//                             className={`${styles.matchCard} ${match.status === 'completed' ? styles.completed : ''}`}
//                           >
//                             <div className={styles.matchId}>{match.matchId}</div>

//                             {/* Driver 1 */}
//                             <div className={`${styles.driverSlot} ${d1Wins ? styles.winner : ''} ${match.status === 'completed' && !d1Wins ? styles.loser : ''}`}>
//                               <span className={styles.slotName}>{d1Name}</span>
//                               {d1Wins && <span className={styles.winBadge}>W</span>}
//                             </div>

//                             <div className={styles.vsDivider}>
//                               {isPending ? 'VS' : '—'}
//                             </div>

//                             {/* Driver 2 */}
//                             <div className={`${styles.driverSlot} ${d2Wins ? styles.winner : ''} ${match.status === 'completed' && !d2Wins ? styles.loser : ''}`}>
//                               <span className={styles.slotName}>
//                                 {match.driver2Id ? d2Name : 'BYE'}
//                               </span>
//                               {d2Wins && <span className={styles.winBadge}>W</span>}
//                             </div>

//                           </div>
//                         );
//                       })}
//                     </div>

//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//         </div>
//       );
//     })}

//   </div>
// );}
