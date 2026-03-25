"use client";

/**
 * LiveEventFeed.js
 *
 * This is the central client-side hub for the Events page. It:
 *  1. Owns STATUS_OPTIONS — the single source of truth for filter tabs, header
 *     text, and subtitles. Pass these down to TelemetryControl so the filter bar
 *     is data-driven and not hardcoded inside the bar component.
 *  2. Reads the active filter from the URL (?status=...) via useSearchParams,
 *     keeping it in sync with TelemetryControl which also reads/writes the URL.
 *  3. Renders a dynamic page header (title + subtitle) that reacts to the
 *     active tab — the static header in app/events/page.js can be removed once
 *     this is confirmed working.
 *  4. Filters and groups events by status before rendering them.
 *  5. Maintains a live SSE connection for real-time capacity updates.
 */

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import EventCard from "@/components/events/EventCard";
import EmptyState from "@/components/events/EmptyState";
import TelemetryControl from "@/components/events/TelemetryControl";
import styles from "./LiveEventFeed.module.css";

// ── SINGLE SOURCE OF TRUTH FOR FILTER TABS ───────────────────────────────────
// Each entry drives three things simultaneously:
//   • `id`       — the URL ?status= value written by TelemetryControl on click
//                  AND passed to getEvents() in EventsPage for server filtering.
//                  Must match server status values EXCEPT "previous" which is a
//                  client UI concept grouping both "ended" + "archived" events.
//   • `label`    — the tab button text shown in TelemetryControl
//   • `header`   — the <h1> shown on the Events page when that tab is active
//   • `subtitle` — the <p> shown beneath the header
//
// SERVER STATUS VALUES (from computeStatus.js):
//   active   → event is happening right now
//   nearby   → starting within 7 days
//   upcoming → more than 7 days away
//   ended    → date has passed (auto-computed)
//   archived → manually archived via admin PATCH
//
// To add a new filter tab: add one object here. Nothing else needs to change.
const STATUS_OPTIONS = [
  {
    id: "all",
    label: "All Events",
    header: "Events",
    subtitle: "Find and register for upcoming DriftLand events",
  },
  {
    // FIXED: was "ongoing" — server uses "active" (computeStatus.js returns "active")
    id: "active",
    label: "● Live Now",
    header: "Live Now",
    subtitle: "Events happening right now",
  },
  {
    id: "nearby",
    label: "Starting Soon",
    header: "Starting Soon",
    subtitle: "Events kicking off in the next few hours",
  },
  {
    id: "upcoming",
    label: "Upcoming",
    header: "Upcoming Events",
    subtitle: "Events on the horizon",
  },
  {
    // "previous" is a UI-only concept — it maps to BOTH "ended" and "archived"
    // server statuses. See SECTIONS and the filter logic below for how this works.
    id: "previous",
    label: "Archived",
    header: "Past Events",
    subtitle: "Previously held DriftLand events",
  },
];

// ── SECTION DEFINITIONS ───────────────────────────────────────────────────────
// Each `key` must match the exact `status` value returned by computeStatus.js
// on the server. These drive which sections are shown in the feed.
//
// FIXED: "ongoing" → "active" and "previous" → split into "ended" + "archived"
// to match what the server actually sends. Previously these mismatched values
// meant "Live Now" and "Archived" sections were always empty.
const SECTIONS = [
  { key: "active", label: "Live Now" },
  { key: "nearby", label: "Starting Soon" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ended", label: "Past Events" }, // auto-computed when date passes
  { key: "archived", label: "Archived" }, // manually set by admin
];

export default function LiveEventFeed({ initialEvents }) {
  const [events, setEvents] = useState(initialEvents);

  // ── READ ACTIVE FILTER FROM URL ───────────────────────────────────────────
  // TelemetryControl writes to the URL (?status=active, ?status=nearby, etc.)
  // when a tab is clicked. EventsPage (server) also reads this param and passes
  // pre-filtered events. We read it here too so the header and section display
  // stay in sync — no shared state or context needed.
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") || "all";

  // Derive the active option object so we can access header/subtitle
  const activeOption =
    STATUS_OPTIONS.find((o) => o.id === currentStatus) ?? STATUS_OPTIONS[0];

  // ── SSE — LIVE CAPACITY UPDATES (AUTO-RECONNECT) ──────────────────────────
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

      es.onerror = () => {
        console.warn(
          "Live feed connection dropped. Attempting to reconnect in 3 seconds...",
        );
        es.close();
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      if (es) es.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  // ── GROUP EVENTS BY STATUS ────────────────────────────────────────────────
  // Runs only when `events` changes (SSE update), not on every filter change,
  // because filtering is done below via SECTIONS.filter().
  const grouped = useMemo(() => {
    return SECTIONS.reduce((acc, { key }) => {
      acc[key] = events.filter((e) => e.status === key);
      return acc;
    }, {});
  }, [events]);

  // ── SINGLE RETURN PATH ───────────────────────────────────────────────────
  // Both TelemetryControl and header always render.
  // The sections area handles all three cases:
  //   1. Events exist for the current filter → render event cards
  //   2. Events exist globally but not for this filter → show EmptyState
  //   3. No events at all → show EmptyState
  // This replaces the old separate `!hasAnyEvents` early-return which only
  // caught case 3, leaving cases 2 silently rendering nothing.
  return (
    <>
      {/* ── TELEMETRY CONTROL (FILTER BAR) ─────────────────────────────────
          Receives STATUS_OPTIONS as `options` so it is purely presentational —
          it does not own the tab definitions, only renders and routes them.
          It reads and writes the URL (?status=...) which this component also
          reads above via useSearchParams.
      ── */}
      <TelemetryControl options={STATUS_OPTIONS} />

      {/* ── DYNAMIC HEADER ─────────────────────────────────────────────────
          Changes based on the active filter tab, defined in STATUS_OPTIONS.
      ── */}
      <header className={styles.header}>
        <h1 className={styles.title}>{activeOption.header}</h1>
      </header>

      {/* ── EVENT SECTIONS ─────────────────────────────────────────────────
          Step 1: determine which sections are in scope for the current filter.
          Step 2: from those, keep only the ones that have at least one event.
          Step 3: if none have events → show EmptyState.
                  if some have events → render their cards.

          "all"      → scope is all sections
          "previous" → scope is "ended" + "archived" (UI groups both past states)
          anything else → scope is the single section matching the URL status
      ── */}
      <div className={styles.sections}>
        {(() => {
          // Step 1: sections in scope for the active tab
          const scopedSections = SECTIONS.filter(({ key }) => {
            if (currentStatus === "all") return true;
            if (currentStatus === "previous") return key === "ended" || key === "archived";
            return key === currentStatus;
          });

          // Step 2: keep only sections that actually have events
          const sectionsWithEvents = scopedSections.filter(
            ({ key }) => grouped[key] && grouped[key].length > 0,
          );

          // Step 3: empty state — shown for any empty result (filter or global)
          if (sectionsWithEvents.length === 0) {
            return (
              <EmptyState
                badge={`${activeOption.label} — 0 RESULTS`}
                title="NO EVENTS DETECTED"
                message={`We couldn't locate any events for the '${activeOption.label}' sector. Stand by for future updates.`}
              />
            );
          }

          // Render the sections that have events
          return sectionsWithEvents.map(({ key }) => (
            <section key={key} className={styles.section}>
              <div className={styles.eventList}>
                {grouped[key].map((event) => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
            </section>
          ));
        })()}
      </div>
    </>
  );
}
