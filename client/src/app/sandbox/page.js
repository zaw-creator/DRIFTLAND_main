"use client";
import styles from "./sandbox.module.css";

import driftImage from "./driftPic.jpg";

// const driftImage = "/652623892_122105907980190710_1318177232604659671_n.jpg";

export default function SandboxPage() {
  // Mock Real-Time Data
  const capacity = 32;
  const registered = 24;
  const fillPercentage = (registered / capacity) * 100;
  const isAlmostFull = fillPercentage >= 85;

  return (
    <main className={styles.sandboxContainer}>
      {/* This single HTML structure magically transforms based on screen size!
        Desktop = Cinematic Row | Mobile = Glassmorphism Card 
      */}
      <article className={styles.premiumCard}>
        {/* 📸 The Image Layer */}
        <div className={styles.mediaWrap}>
          <img
            src={driftImage.src}
            alt="Nyoki 2 Drift"
            className={styles.heroImage}
          />
          {/* This overlay creates the smooth fade on desktop, and slight dim on mobile */}
          <div className={styles.fadeOverlay}></div>
        </div>

        {/* 📊 The Data & Frosted Glass Layer */}
        <div className={styles.contentWrap}>
          <div className={styles.liveBadge}>● UPCOMING</div>

          <h2 className={styles.title}>Nyoki 2 Drift</h2>

          <div className={styles.meta}>
            <span>📍 DriftLand 154</span>
            <span>📅 MARCH 27, 28, 29</span>
          </div>

          <div className={styles.scarcityContainer}>
            <div className={styles.scarcityLabels}>
              <span>AWT REGISTRATION</span>
              <span style={{ color: isAlmostFull ? "#e10600" : "#fbc638" }}>
                {registered} / {capacity}
              </span>
            </div>
            <div className={styles.scarcityTrack}>
              <div
                className={styles.scarcityFill}
                style={{
                  width: `${fillPercentage}%`,
                  backgroundColor: isAlmostFull ? "#e10600" : "#fbc638",
                }}
              />
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
