"use client";

import { useState, useEffect, useCallback } from "react";
import EventCard from "@/components/events/EventCard";
import EventSkeleton from "@/components/events/EventSkeleton";
import EventSegmentedBar from "@/components/events/EventSegmentedBar";
import Leaderboard from "@/components/events/Leaderboard";
import { getEvents } from "@/services/eventService";
import styles from "./page.module.css";

const SECTIONS = [
  { key: "ongoing", label: "Ongoing" },
  { key: "nearby", label: "Nearby" },
  { key: "upcoming", label: "Upcoming" },
];
const navItems = ["All", "Ongoing", "Nearby", "Upcoming"];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // SSE — live capacity + status updates for all event cards
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const es = new EventSource(`${API_URL}/api/events/stream`);
    es.addEventListener("event-updated", (e) => {
      const patch = JSON.parse(e.data);
      setEvents((prev) =>
        prev.map((ev) => (ev._id === patch._id ? { ...ev, ...patch } : ev)),
      );
    });
    return () => es.close();
  }, []);

  // Group events by status
  const grouped = SECTIONS.reduce((acc, { key }) => {
    acc[key] = events.filter((e) => e.status === key);
    return acc;
  }, {});

  const hasAnyEvents = events.length > 0;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <p className={styles.subtitle}>
          Find and register for upcoming DriftLand events
        </p>
      </header>

      {/* ── Loading ─────────────────────────────────────────────── */}
      {loading && (
        <div className={styles.skeletons}>
          <EventSkeleton />
          <EventSkeleton />
          <EventSkeleton />
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────── */}
      {!loading && error && (
        <div className={styles.errorState}>
          <p className={styles.errorMsg}>⚠️ {error}</p>
          <button className={styles.retryBtn} onClick={fetchEvents}>
            Retry
          </button>
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────── */}
      {!loading && !error && !hasAnyEvents && (
        <div className={styles.emptyState}>
          <p className={styles.emptyIcon}>🏁</p>
          <p className={styles.emptyMsg}>No upcoming events at the moment.</p>
          <p className={styles.emptyHint}>Check back soon for new events!</p>
        </div>
      )}

      {/* ── Sections ────────────────────────────────────────────── */}
      {!loading && !error && hasAnyEvents && (
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
          <Leaderboard />
        </>
      )}
    </main>
  );
}
