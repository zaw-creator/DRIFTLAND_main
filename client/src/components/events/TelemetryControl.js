"use client";

/**
 * TelemetryControl.js
 *
 * A generic, reusable sticky filter bar component.
 *
 * HOW IT WORKS:
 *  • Receives `options` as a prop from its parent (LiveEventFeed). This makes
 *    the component purely presentational — it does not define what tabs exist.
 *  • Reads the currently active filter from the URL (?status=...) via
 *    useSearchParams, staying in sync with LiveEventFeed which reads the same
 *    URL param.
 *  • Writes to the URL when a tab is clicked, which triggers a Next.js
 *    navigation. Both this component and LiveEventFeed re-render with the new
 *    URL param, keeping them in sync without shared state or context.
 *  • Becomes position:fixed when the user scrolls past the threshold, then
 *    hides/shows based on scroll direction (smart physics engine).
 *
 * HOW TO CONNECT TO A NEW PAGE:
 *  1. Define your options array: [{ id, label }, ...]
 *  2. Render <TelemetryControl options={yourOptions} />
 *  3. Read the active tab from URL: useSearchParams().get("status") || "all"
 */

import { useTransition, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./TelemetryControl.module.css";

// ── PROP: options ─────────────────────────────────────────────────────────────
// Array of { id: string, label: string } objects.
// `id`    → the ?status= URL value that gets written on click
// `label` → the button text displayed in the bar
// Defined in LiveEventFeed.js (STATUS_OPTIONS) so the tabs and page header
// stay in one place.

export default function TelemetryControl({ options }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ── SMART FIXED ENGINE ────────────────────────────────────────────────────
  // Three states work together:
  //   isFixed   → true when scrolled past threshold → applies position:fixed
  //   isVisible → false when scrolling DOWN → slides bar up behind navbar
  //   lastScrollY → tracks previous scroll position to detect direction
  //
  // The bar starts in normal document flow. After scrolling ~150px it becomes
  // fixed at top:80px (just below the Navbar02 which is 80px tall).
  // When scrolling down it hides (transform: translateY(-100%)) sliding it
  // behind the navbar (z-index 1000 > bar's z-index 100).
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Only hide the bar if we've scrolled past the hero section (~200px)
      if (currentScrollY > 200) {
        if (currentScrollY > lastScrollY) {
          setIsVisible(false); // Scrolling DOWN -> Hide the bar
          setIsDropdownOpen(false); // Auto-close mobile dropdown
        } else {
          setIsVisible(true); // Scrolling UP -> Show the bar
        }
      } else {
        setIsVisible(true); // Always show at the top of the page
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // ── READ ACTIVE TAB FROM URL ──────────────────────────────────────────────
  // Reads the same ?status= param that this component writes on click.
  // LiveEventFeed reads it too — no shared state needed.
  const currentStatus = searchParams.get("status") || "all";
  const activeLabel = options.find((opt) => opt.id === currentStatus)?.label;

  // ── WRITE ACTIVE TAB TO URL ───────────────────────────────────────────────
  // Wrapped in startTransition for optimistic UI — the button highlights
  // instantly while the navigation + data re-render happens in the background.
  const handleFilterChange = (statusId) => {
    if (statusId === currentStatus) {
      setIsDropdownOpen(false);
      return;
    }
    setIsDropdownOpen(false);

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (statusId === "all") {
        params.delete("status"); // "all" → clean URL (no ?status=)
      } else {
        params.set("status", statusId);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <>
      {/* ── FILTER BAR ─────────────────────────────────────────────────────
          CSS classes:
            isFixed  → position:fixed; top:80px (below Navbar02)
            isHidden → transform:translateY(-100%) (slides behind navbar)
          Both classes are defined in TelemetryControl.module.css.
      ── */}
      <nav
        className={`
          ${styles.controlCenter}
          ${!isVisible ? styles.isHidden : ""}
        `}
      >
        {/* ── DESKTOP: F1 Tab Track ──────────────────────────────────────── */}
        <div className={styles.desktopTrack}>
          {options.map((status) => {
            const isActive = currentStatus === status.id;
            return (
              <button
                key={status.id}
                onClick={() => handleFilterChange(status.id)}
                className={`${styles.tabButton} ${isActive ? styles.active : ""}`}
              >
                {/* Framer Motion shared layout animation — the yellow chevron
                    slides between tabs using layoutId="attackingChevron".
                    All buttons share the same layoutId so Motion tracks which
                    one is active and animates the transition. */}
                {isActive && (
                  <motion.div
                    layoutId="attackingChevron"
                    className={styles.activePillBg}
                    transition={{ type: "spring", stiffness: 600, damping: 40 }}
                  />
                )}
                {status.label}
              </button>
            );
          })}
        </div>

        {/* ── MOBILE: Minimalist Dropdown (visible ≤ 900px) ─────────────── */}
        <div className={styles.mobileDropdownContainer}>
          <button
            className={styles.dropdownTrigger}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>SECTOR: {activeLabel}</span>
            <span
              className={`${styles.chevron} ${isDropdownOpen ? styles.open : ""}`}
            >
              ▼
            </span>
          </button>

          {/* AnimatePresence enables the exit animation when dropdown closes */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={styles.dropdownMenu}
              >
                {options.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => handleFilterChange(status.id)}
                    className={`${styles.dropdownItem} ${currentStatus === status.id ? styles.active : ""}`}
                  >
                    {status.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  );
}
