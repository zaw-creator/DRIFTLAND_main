"use client";

import { useState, useEffect, useRef } from "react";
import { getEventsPaginated } from "@/services/eventService";

/**
 * useInfiniteSection
 *
 * Manages per-section bi-directional infinite scroll using IntersectionObserver.
 *
 * - bottomRef sentinel: when it enters the viewport, the next page is fetched
 *   and appended to the list (downward load).
 * - The hook is intentionally simple: no SSE, no polling. The feed is static
 *   after SSR — drift events rarely update between navigations.
 *
 * @param {Object[]} initialEvents  - The first page of events from SSR.
 * @param {string}   status         - The section's status key (e.g. "upcoming").
 * @param {number}   [limit=10]     - Events per page.
 */
export function useInfiniteSection({ initialEvents, status, limit = 10 }) {
  const [events, setEvents] = useState(initialEvents);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialEvents.length >= limit);
  const [isLoading, setIsLoading] = useState(false);

  const bottomRef = useRef(null);
  // Use a ref for loading state inside the observer callback to avoid stale closure
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Reset when the section's status changes (e.g. filter tab switch)
    setEvents(initialEvents);
    setPage(1);
    setHasMore(initialEvents.length >= limit);
    isLoadingRef.current = false;
    setIsLoading(false);
  }, [status]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingRef.current) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  // Re-attach observer when hasMore changes (after loading, el may have been removed/re-added)
  }, [hasMore]);

  async function loadMore() {
    if (isLoadingRef.current || !hasMore) return;
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const nextPage = page + 1;
      const result = await getEventsPaginated({ status, page: nextPage, limit });
      // result.events may be empty if hasNextPage was stale
      if (result.events && result.events.length > 0) {
        setEvents((prev) => [...prev, ...result.events]);
        setPage(nextPage);
      }
      setHasMore(result.hasNextPage ?? false);
    } catch (err) {
      console.error("useInfiniteSection: failed to load more events", err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }

  return { events, bottomRef, isLoading, hasMore };
}
