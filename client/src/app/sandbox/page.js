"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import styles from "./sandbox.module.css";

const STATUS_OPTIONS = [
  { id: "all", label: "All Events" },
  { id: "ongoing", label: "● Live Now" },
  { id: "nearby", label: "Starting Soon" },
  { id: "upcoming", label: "Upcoming" },
  { id: "previous", label: "Archived" },
];

export default function SandboxPage() {
  const [activeTab, setActiveTab] = useState("ongoing");

  return (
    <main className={styles.sandboxContainer}>
      {/* 1. Hero Spacer */}
      <div className={styles.headerSpacer}>DRIFTLAND HQ</div>

      {/* 2. 🎛️ THE AGGRESSIVE TELEMETRY CONTROL CENTER */}
      <nav className={styles.controlCenter}>
        <div className={styles.pillTrack}>
          {STATUS_OPTIONS.map((status) => {
            const isActive = activeTab === status.id;

            return (
              <button
                key={status.id}
                onClick={() => setActiveTab(status.id)}
                className={`${styles.tabButton} ${isActive ? styles.active : ""}`}
              >
                {/* Framer Motion Engine: 
                  We use a stiffer spring to make the slide feel "mechanical" and fast.
                */}
                {isActive && (
                  <motion.div
                    layoutId="attackingBlock"
                    className={styles.activePillBg}
                    transition={{ type: "spring", stiffness: 600, damping: 40 }}
                  />
                )}
                {status.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. The Dummy Feed to test scrolling */}
      <div className={styles.feed}>
        <div className={styles.dummySection}>
          <div className={styles.dummyHeader}>Sector 1: {activeTab}</div>
          <div className={styles.dummyCard}>EVENT ALPHA</div>
          <div className={styles.dummyCard}>EVENT BETA</div>
        </div>
      </div>
    </main>
  );
}
