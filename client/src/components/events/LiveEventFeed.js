"use client";

/**
 * LiveEventFeed.js
 *
 * Client-side hub for the Events page. Responsibilities:
 *  1. Owns STATUS_OPTIONS — single source of truth for filter tabs and headers.
 *  2. Reads the active filter from the URL (?status=...) via useSearchParams.
 *  3. Renders a dynamic page header that reacts to the active tab.
 *  4. Groups SSR-provided events by status and renders a SectionFeed per section.
 *  5. Holds a single top sentinel that checks for newly published events when
 *     the user scrolls back to the very top of the feed.
 *
 * NOTE: SSE has been removed from this component. Drift events are rarely
 * updated between navigations, so a static SSR snapshot is sufficient for
 * the feed. SSE remains active on the individual event detail page.
 */

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import EventCard from "@/components/events/EventCard";
import EventSkeleton from "@/components/events/EventSkeleton";
import EmptyState from "@/components/events/EmptyState";
import TelemetryControl from "@/components/events/TelemetryControl";
import { useInfiniteSection } from "@/hooks/useInfiniteSection";
import { getEventsPaginated } from "@/services/eventService";
import styles from "./LiveEventFeed.module.css";

// ── SINGLE SOURCE OF TRUTH FOR FILTER TABS ───────────────────────────────────
const STATUS_OPTIONS = [
  {
    id: "all",
    label: "All Events",
    header: "Events",
    subtitle: "Find and register for upcoming DriftLand events",
  },
  {
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
    id: "previous",
    label: "Archived",
    header: "Past Events",
    subtitle: "Previously held DriftLand events",
  },
];

// ── SECTION DEFINITIONS ───────────────────────────────────────────────────────
// Each `key` matches the exact `status` value returned by computeStatus.js.
const SECTIONS = [
  { key: "active", label: "Live Now" },
  { key: "nearby", label: "Starting Soon" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ended", label: "Past Events" },
  { key: "archived", label: "Archived" },
];

// ── SECTION FEED ─────────────────────────────────────────────────────────────
// Each section manages its own paginated list independently.
function SectionFeed({ sectionKey, initialEvents }) {
  const { events, bottomRef, isLoading, hasMore } = useInfiniteSection({
    initialEvents,
    status: sectionKey,
    limit: 10,
  });

  return (
    <section className={styles.section}>
      <div className={styles.eventList}>
        {events.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>
      {/* Bottom sentinel — triggers next page load when it enters the viewport */}
      {hasMore && <div ref={bottomRef} className={styles.sentinel} />}
      {isLoading && <EventSkeleton />}
    </section>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function LiveEventFeed({ initialEvents }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") || "all";

  const activeOption =
    STATUS_OPTIONS.find((o) => o.id === currentStatus) ?? STATUS_OPTIONS[0];

  // ── GROUP EVENTS BY STATUS ─────────────────────────────────────────────────
  const grouped = useMemo(() => {
    return SECTIONS.reduce((acc, { key }) => {
      acc[key] = initialEvents.filter((e) => e.status === key);
      return acc;
    }, {});
  }, [initialEvents]);

  // ── TOP SENTINEL — CHECK FOR NEW EVENTS ───────────────────────────────────
  // Fires when the user scrolls back to the very top of the feed.
  // Fetches page 1 and shows a banner if events were published since page load.
  const topSentinelRef = useRef(null);
  const knownIdsRef = useRef(new Set(initialEvents.map((e) => e._id)));
  const hasScrolledRef = useRef(false); // avoid firing on initial mount
  const [newEventCount, setNewEventCount] = useState(0);

  const checkForNewEvents = useCallback(async () => {
    try {
      const result = await getEventsPaginated({
        status: currentStatus === "all" ? undefined : currentStatus,
        page: 1,
        limit: 10,
      });
      const fresh = result?.events ?? [];
      const brandNew = fresh.filter((e) => !knownIdsRef.current.has(e._id));
      if (brandNew.length > 0) {
        brandNew.forEach((e) => knownIdsRef.current.add(e._id));
        setNewEventCount((n) => n + brandNew.length);
      }
    } catch {
      // Silently ignore — top sentinel is a best-effort freshness check
    }
  }, [currentStatus]);

  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          // Sentinel left the viewport — user has scrolled down
          hasScrolledRef.current = true;
        } else if (hasScrolledRef.current) {
          // Sentinel re-entered — user scrolled back to top
          checkForNewEvents();
        }
      },
      { threshold: 1.0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [checkForNewEvents]);

  // Reset new-event count and known IDs when filter tab changes
  useEffect(() => {
    knownIdsRef.current = new Set(initialEvents.map((e) => e._id));
    setNewEventCount(0);
    hasScrolledRef.current = false;
  }, [currentStatus, initialEvents]);

  // ── SCOPED SECTIONS ────────────────────────────────────────────────────────
  const scopedSections = SECTIONS.filter(({ key }) => {
    if (currentStatus === "all") return true;
    if (currentStatus === "previous")
      return key === "ended" || key === "archived";
    return key === currentStatus;
  });

  const sectionsWithEvents = scopedSections.filter(
    ({ key }) => grouped[key] && grouped[key].length > 0,
  );

  return (
    <>
      <TelemetryControl options={STATUS_OPTIONS} />
      {/* Top sentinel — invisible 1px div above sections */}
      <div ref={topSentinelRef} className={styles.topSentinel} />

      {/* New-events banner — appears when top sentinel detects additions */}
      {newEventCount > 0 && (
        <button
          className={styles.newEventsBanner}
          onClick={() => {
            setNewEventCount(0);
            router.refresh();
          }}
        >
          ↑ {newEventCount} new event{newEventCount > 1 ? "s" : ""} — tap to
          refresh
        </button>
      )}

      <div className={styles.sections}>
        {sectionsWithEvents.length === 0 ? (
          <EmptyState
            badge={`${activeOption.label} — 0 RESULTS`}
            title="NO EVENTS DETECTED"
            message={`We couldn't locate any events for the '${activeOption.label}' sector. Stand by for future updates.`}
          />
        ) : (
          sectionsWithEvents.map(({ key }) => (
            <SectionFeed
              key={key}
              sectionKey={key}
              initialEvents={grouped[key]}
            />
          ))
        )}
      </div>
    </>
  );
}
