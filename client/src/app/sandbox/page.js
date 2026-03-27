"use client";

import { useState } from "react";

// ─── 1. DUMMY DATA ──────────────────────────────────────────────────────────
const dummyQualifyingData = [
  { id: "d1", name: "James Deane", car: "RTR Mustang S650", score: 98.5 },
  { id: "d2", name: "Piotr Wiecek", car: "Nissan Silvia S15", score: 96.0 },
  { id: "d3", name: "Fredric Aasbo", car: "Toyota GR Supra", score: 95.5 },
  { id: "d4", name: "Chelsea DeNofa", car: "Ford Mustang RTR", score: 94.0 },
  { id: "d5", name: "Matt Field", car: "C6 Corvette", score: 92.5 },
];

const dummyBracketData = [
  {
    id: "r1",
    name: "FINAL 4",
    matches: [
      {
        id: "m1",
        driver1: { id: "d1", name: "James Deane", seed: 1 },
        driver2: { id: "d4", name: "Chelsea DeNofa", seed: 4 },
        winnerId: "d1",
      },
      {
        id: "m2",
        driver1: { id: "d2", name: "Piotr Wiecek", seed: 2 },
        driver2: { id: "d3", name: "Fredric Aasbo", seed: 3 },
        winnerId: "d2",
      },
    ],
  },
  {
    id: "r2",
    name: "FINALS",
    matches: [
      {
        id: "m3",
        driver1: { id: "d1", name: "James Deane", seed: 1 },
        driver2: { id: "d2", name: "Piotr Wiecek", seed: 2 },
        winnerId: null, // Match hasn't happened yet
      },
    ],
  },
];

// ─── 2. LEADERBOARD COMPONENT ───────────────────────────────────────────────
function Leaderboard() {
  return (
    <div className="leaderboardContainer">
      <div className="headerWrapper">
        <h2 className="headerTitle">
          <span className="blinker"></span>QUALIFYING TELEMETRY
        </h2>
        <div className="telemetryLine"></div>
      </div>
      <div className="tableHeader">
        <span className="colPos">POS</span>
        <span className="colDriver">DRIVER</span>
        <span className="colCar">CHASSIS</span>
        <span className="colScore">SCORE</span>
      </div>
      <div className="resultsList">
        {dummyQualifyingData.map((driver, index) => {
          const isP1 = index === 0;
          return (
            <div key={driver.id} className={`row ${isP1 ? "rowP1" : ""}`}>
              <span className="colPos">{isP1 ? "P1" : `P${index + 1}`}</span>
              <span className="colDriver">{driver.name}</span>
              <span className="colCar">{driver.car}</span>
              <span className="colScore">{driver.score.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. TOURNAMENT BRACKET COMPONENT ────────────────────────────────────────
function TournamentBracket() {
  return (
    <div className="bracketWrapper">
      <div className="scrollTrack">
        {dummyBracketData.map((round) => (
          <div key={round.id} className="roundColumn">
            <div className="roundHeader">{round.name}</div>
            <div className="matchList">
              {round.matches.map((match) => (
                <div key={match.id} className="matchCard">
                  <div
                    className={`driverRow ${match.winnerId === match.driver1.id ? "winner" : ""}`}
                  >
                    <span className="seed">P{match.driver1.seed}</span>
                    <span className="name">{match.driver1.name}</span>
                    {match.winnerId === match.driver1.id && (
                      <span className="advanceIcon">▶</span>
                    )}
                  </div>
                  <div className="vsDivider">VS</div>
                  <div
                    className={`driverRow ${match.winnerId === match.driver2.id ? "winner" : ""}`}
                  >
                    <span className="seed">P{match.driver2.seed}</span>
                    <span className="name">{match.driver2.name}</span>
                    {match.winnerId === match.driver2.id && (
                      <span className="advanceIcon">▶</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 4. MAIN PAGE & TOGGLE ──────────────────────────────────────────────────
export default function SingleFileSandbox() {
  const [activeView, setActiveView] = useState("qualifying");

  return (
    <div className="sandboxPage">
      <style dangerouslySetInnerHTML={{ __html: cssStyles }} />

      <div className="sandboxContent">
        <h1 className="mainTitle">TELEMETRY UI TEST</h1>

        {/* Toggle Buttons */}
        <div className="toggleContainer">
          <button
            onClick={() => setActiveView("qualifying")}
            className={`toggleBtn ${activeView === "qualifying" ? "activeBtn" : ""}`}
          >
            QUALIFYING
          </button>
          <button
            onClick={() => setActiveView("bracket")}
            className={`toggleBtn ${activeView === "bracket" ? "activeBtn" : ""}`}
          >
            ELIMINATION BRACKET
          </button>
        </div>

        {/* Render Component */}
        {activeView === "qualifying" ? <Leaderboard /> : <TournamentBracket />}
      </div>
    </div>
  );
}

// ─── 5. ALL CSS INJECTED DIRECTLY ───────────────────────────────────────────
const cssStyles = `
  .sandboxPage {
    min-height: 100vh;
    background-color: #050505;
    color: #fff;
    font-family: 'Inter', sans-serif;
    padding: 60px 20px;
  }
  .sandboxContent {
    max-width: 900px;
    margin: 0 auto;
  }
  .mainTitle {
    color: #fff;
    font-size: 2rem;
    font-weight: 900;
    font-style: italic;
    letter-spacing: 4px;
    margin-bottom: 40px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 20px;
  }
  .toggleContainer {
    display: flex;
    gap: 16px;
    margin-bottom: 40px;
  }
  .toggleBtn {
    background: transparent;
    color: #888;
    border: 1px solid #fbc638;
    padding: 12px 24px;
    font-weight: 900;
    font-style: italic;
    letter-spacing: 2px;
    cursor: pointer;
    clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
    transition: all 0.2s ease;
  }
  .toggleBtn:hover {
    color: #ccc;
  }
  .activeBtn {
    background: #fbc638;
    color: #000 !important;
  }

  /* LEADERBOARD STYLES */
  .leaderboardContainer {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .headerWrapper {
    display: flex;
    align-items: stretch;
    border-bottom: 2px solid rgba(251, 198, 56, 0.2);
  }
  .headerTitle {
    font-size: 1.2rem;
    font-weight: 900;
    text-transform: uppercase;
    font-style: italic;
    letter-spacing: 3px;
    color: #000;
    background-color: #fbc638;
    margin: 0;
    padding: 8px 30px 8px 16px;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    clip-path: polygon(0 0, 100% 0, calc(100% - 15px) 100%, 0 100%);
  }
  .blinker {
    width: 8px;
    height: 8px;
    background-color: #000;
    animation: sharpBlink 1s infinite steps(2, start);
  }
  @keyframes sharpBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .telemetryLine {
    flex-grow: 1;
    background: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255, 255, 255, 0.05) 4px, rgba(255, 255, 255, 0.05) 8px);
    margin-left: -10px;
    z-index: -1;
  }
  .tableHeader {
    display: flex;
    padding: 0 16px 8px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: #666;
    font-size: 0.75rem;
    font-weight: 900;
    letter-spacing: 2px;
  }
  .resultsList {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 4px;
    transition: transform 0.2s ease, background 0.2s ease;
  }
  .row:hover {
    background: #111;
    transform: translateX(4px);
  }
  .rowP1 {
    background: linear-gradient(90deg, rgba(251, 198, 56, 0.1) 0%, #0a0a0a 100%);
    border-left: 4px solid #fbc638;
    border-top-color: rgba(251, 198, 56, 0.3);
    border-bottom-color: rgba(251, 198, 56, 0.3);
  }
  .rowP1 .colPos {
    color: #fbc638;
    font-size: 1.5rem;
    font-style: italic;
  }
  .rowP1 .colDriver { color: #fff; }
  .colPos { flex: 0 0 60px; font-weight: 900; color: #888; }
  .colDriver { flex: 1; font-weight: 900; font-size: 1.1rem; text-transform: uppercase; color: #ccc; }
  .colCar { flex: 0 0 160px; color: #666; font-size: 0.85rem; font-family: monospace; }
  .colScore { flex: 0 0 80px; text-align: right; font-weight: 900; color: #fbc638; font-family: monospace; font-size: 1.2rem; }
  @media (max-width: 600px) {
    .colCar { display: none; }
    .colPos { flex: 0 0 40px; }
  }

  /* BRACKET STYLES */
  .bracketWrapper {
    width: 100vw;
    margin-left: calc(-50vw + 50%);
    background: #050505;
    padding: 40px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .scrollTrack {
    display: flex;
    gap: 40px;
    padding: 0 5vw;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: #fbc638 #111;
    scroll-snap-type: x mandatory;
  }
  .roundColumn {
    flex: 0 0 300px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    scroll-snap-align: center;
  }
  .roundHeader {
    color: #fbc638;
    font-size: 1rem;
    font-weight: 900;
    font-style: italic;
    letter-spacing: 4px;
    text-transform: uppercase;
    text-align: center;
    border-bottom: 2px solid rgba(251, 198, 56, 0.2);
    padding-bottom: 8px;
  }
  .matchList {
    display: flex;
    flex-direction: column;
    gap: 24px;
    justify-content: center;
    height: 100%;
  }
  .matchCard {
    background: #0a0a0a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .vsDivider {
    background: #111;
    color: #555;
    font-size: 0.7rem;
    font-weight: 900;
    text-align: center;
    padding: 4px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    letter-spacing: 2px;
  }
  .driverRow {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
    color: #888;
  }
  .seed {
    font-family: monospace;
    font-size: 0.75rem;
    background: #1a1a1a;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .name {
    font-weight: 700;
    text-transform: uppercase;
    flex-grow: 1;
  }
  .driverRow.winner {
    background: rgba(251, 198, 56, 0.1);
    color: #fff;
  }
  .driverRow.winner .name {
    font-weight: 900;
    color: #fbc638;
  }
  .driverRow.winner .seed {
    background: #fbc638;
    color: #000;
    font-weight: 900;
  }
  .advanceIcon {
    color: #fbc638;
    font-size: 0.8rem;
  }
`;
