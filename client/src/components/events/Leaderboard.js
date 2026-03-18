import React, { useState, useEffect } from "react";
import styles from "./Leaderboard.module.css";

const MOCK_DATA = [
  {
    id: 1,
    rank: 1,
    driver: "Ken Block",
    car: "Hoonicorn Mustang",
    line: 58,
    angle: 19,
    style: 20,
    total: 97,
    status: "Qualified",
  },
  {
    id: 2,
    rank: 2,
    driver: "James Deane",
    car: "Nissan S15",
    line: 55,
    angle: 20,
    style: 18,
    total: 93,
    status: "Qualified",
  },
  {
    id: 3,
    rank: 3,
    driver: "Fredric Aasbo",
    car: "Toyota GR Supra",
    line: 50,
    angle: 18,
    style: 19,
    total: 87,
    status: "Qualified",
  },
  {
    id: 4,
    rank: 4,
    driver: "Chelsea DeNofa",
    car: "Ford Mustang RTR",
    line: 48,
    angle: 17,
    style: 18,
    total: 83,
    status: "Qualified",
  },
  // ... more drivers
];

const Leaderboard = () => {
  const [session, setSession] = useState("Q1");
  const [updatedRowId, setUpdatedRowId] = useState(null);

  // Simulate a live data feed coming from the track timing system
  useEffect(() => {
    const simulateLiveTiming = setInterval(() => {
      // Pick a random driver ID to "update" (between 1 and 5)
      const randomId = Math.floor(Math.random() * 5) + 1;
      setUpdatedRowId(randomId);

      // Remove the highlight class after 1.5 seconds so it can flash again later
      setTimeout(() => {
        setUpdatedRowId(null);
      }, 1500);
    }, 4000); // Triggers an update every 4 seconds

    return () => clearInterval(simulateLiveTiming);
  }, []);

  return (
    <div className={styles.trackContainer}>
      <header className={styles.raceHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.redBar}></div>
          <h1>
            {/* Added the blinking live dot here */}
            <span className={styles.liveIndicator}></span>
            LIVE TIMING & SCORING
          </h1>
        </div>

        <div className={styles.sessionControls}>
          <button
            className={`${styles.sessionBtn} ${session === "Q1" ? styles.activeSession : ""}`}
            onClick={() => setSession("Q1")}
          >
            QUALIFYING
          </button>
          <button
            className={`${styles.sessionBtn} ${session === "T32" ? styles.activeSession : ""}`}
            onClick={() => setSession("T32")}
          >
            TOP 32 BATTLES
          </button>
        </div>
      </header>

      <div className={styles.telemetryWrapper}>
        <table className={styles.timingTable}>
          <thead>
            {/* ... Keep your existing standard table header here ... */}
            <tr>
              <th>POS</th>
              <th>DRIVER</th>
              <th className={styles.hideMobile}>TEAM / CAR</th>
              <th className={styles.scoreCol}>LINE</th>
              <th className={styles.scoreCol}>ANGLE</th>
              <th className={styles.scoreCol}>STYLE</th>
              <th className={styles.totalCol}>TOTAL</th>
              <th className={styles.gapCol}>GAP</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_DATA.map((item) => {
              // Check if this row is the one that just got updated
              const isUpdated = updatedRowId === item.id;

              return (
                <tr
                  key={item.id}
                  // Apply the recentlyUpdated class if it matches
                  className={`${styles.driverRow} ${isUpdated ? styles.recentlyUpdated : ""}`}
                >
                  <td className={styles.posCell}>
                    <div
                      className={`${styles.posBadge} ${item.pos === 1 ? styles.pos1 : ""}`}
                    >
                      {item.pos}
                    </div>
                  </td>
                  <td className={styles.driverCell}>
                    <span className={styles.lastName}>
                      {item.driver.split(" ").pop()}
                    </span>
                    <span className={styles.firstName}>
                      {item.driver.split(" ").slice(0, -1).join(" ")}
                    </span>
                  </td>
                  <td className={`${styles.teamCell} ${styles.hideMobile}`}>
                    <span className={styles.teamName}>{item.team}</span>
                    <span className={styles.carDetail}>{item.car}</span>
                  </td>
                  <td className={styles.scoreCol}>{item.line}</td>
                  <td className={styles.scoreCol}>{item.angle}</td>
                  <td className={styles.scoreCol}>{item.style}</td>
                  <td className={styles.totalCol}>{item.total}</td>
                  <td className={styles.gapCol}>
                    <span
                      className={
                        item.gap === "LEADER"
                          ? styles.leaderText
                          : styles.gapText
                      }
                    >
                      {item.gap}
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
};

export default Leaderboard;
