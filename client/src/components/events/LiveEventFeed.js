"use client";

import { useState, useEffect, useMemo } from "react";
import EventCard from "@/components/events/EventCard";
import EventSegmentedBar from "@/components/events/EventSegmentedBar";
// Assuming you keep the same CSS module for the feed layout
import styles from "@/app/events/page.module.css";

const SECTIONS = [
  { key: "ongoing", label: "Ongoing" },
  { key: "nearby", label: "Nearby" },
  { key: "upcoming", label: "Upcoming" },
];
const navItems = ["All", "Ongoing", "Nearby", "Upcoming"];

export default function LiveEventFeed({ initialEvents }) {
  // 1. Hydrate the initial state instantly with server data
  const [events, setEvents] = useState(initialEvents);
  const [activeFilter, setActiveFilter] = useState("All");

  // 2. SSE — strictly for live updates after initial load
  // 2. SSE — Live Capacity Updates (With Auto-Reconnect)
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    let es;
    let reconnectTimeout;

    const connectSSE = () => {
      es = new EventSource(`${API_URL}/api/events/stream`);

      es.addEventListener("event-updated", (e) => {
        const patch = JSON.parse(e.data);
        setEvents((prev) =>
          prev.map((ev) => (ev._id === patch._id ? { ...ev, ...patch } : ev)),
        );
      });

      // 🔄 THE AUTO-RECONNECT LOOP
      es.onerror = () => {
        console.warn(
          "Live feed connection dropped. Attempting to reconnect in 3 seconds...",
        );
        es.close(); // Close the dead connection
        // Try again in 3 seconds (Exponential backoff can be added here for massive scale)
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE(); // Start the engine

    return () => {
      if (es) es.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  // 3. Performance Optimization: Only recalculate groups when 'events' actually change
  const grouped = useMemo(() => {
    return SECTIONS.reduce((acc, { key }) => {
      acc[key] = events.filter((e) => e.status === key);
      return acc;
    }, {});
  }, [events]);

  const hasAnyEvents = events.length > 0;

  // ── Empty State ─────────────────────────────────────────────────
  if (!hasAnyEvents) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyIcon}>🏁</p>
        <p className={styles.emptyMsg}>No upcoming events at the moment.</p>
        <p className={styles.emptyHint}>Check back soon for new events!</p>
      </div>
    );
  }

  // ── Populated State ──────────────────────────────────────────────
  return (
    <>
      <EventSegmentedBar
        status={navItems}
        selected={activeFilter}
        onSelect={setActiveFilter}
      />
      <div className={styles.sections}>
        {SECTIONS.filter(
          ({ label }) => activeFilter === "All" || label === activeFilter,
        ).map(({ key, label }) => {
          const sectionEvents = grouped[key];
          if (sectionEvents.length === 0) return null;
          return (
            <section key={key} className={styles.section}>
              <h2 className={styles.sectionTitle}>{label}</h2>
              <div className={styles.eventList}>
                {sectionEvents.map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
