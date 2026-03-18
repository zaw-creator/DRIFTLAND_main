"use client";

/**
 * Navbar02
 *
 * A scroll-aware navigation bar that "folds" (collapses its links into a
 * hamburger dropdown) once a target element scrolls into view beneath it.
 *
 * Props
 * -----
 * @prop {string} targetId - The `id` of the DOM element that controls folding.
 *   While that element is visible in the viewport the navbar is folded.
 *   Typically a sentinel <div> placed at the bottom of the hero section.
 *
 * Usage
 * -----
 *   <Navbar02 targetId="hero-end" />
 *   ...
 *   <div id="hero-end" />   ← place this at the bottom of your hero section
 */

import { useState, useEffect, useCallback } from "react";
// CHANGE: reordered imports — Next.js imports before local ones (convention)
import Link from "next/link";
import styles from "./Navbar02.module.css";

/**
 * Navigation link definitions — single source of truth.
 *
 * CHANGE: extracted hard-coded <li> repetitions into a data array.
 * Both the expanded bar and the dropdown now render from this list,
 * so adding/removing a link only requires editing one place.
 *
 * CHANGE: fixed the dropdown links — the original had mismatched
 * labels/hrefs (e.g. href="/events" labelled "About", href="/services"
 * which doesn't exist). Replaced with the same routes as the top bar.
 */
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/drivers", label: "Drivers" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar02({ targetId }) {
  /**
   * isFolded — true while the sentinel element is intersecting the viewport.
   * In the folded state the link list is hidden and the hamburger appears.
   */
  const [isFolded, setIsFolded] = useState(false);

  /** isMenuOpen — controls the hamburger dropdown visibility. */
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ── Scroll / intersection observer ─────────────────────────────────────────
  useEffect(() => {
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    // ── Immediate check ───────────────────────────────────────────────────
    // IntersectionObserver fires asynchronously, so without this there is a
    // visible flash where the full (unfolded) nav renders on the hero page
    // before the observer's first callback corrects it.
    // getBoundingClientRect() is synchronous — we read the sentinel's position
    // right now and fold immediately if it is currently inside the viewport.
    const { top, bottom } = target.getBoundingClientRect();
    setIsFolded(top < window.innerHeight && bottom >= 0);

    // ── Observer handles all subsequent scroll events ──────────────────────
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Fold when the sentinel is visible (user is in the hero section).
        // Unfold when it scrolls out of view (user has passed the hero).
        setIsFolded(entry.isIntersecting);

        // Close the dropdown when the navbar unfolds — an open menu while
        // folded is intentional, but leaving it open after unfold is not.
        if (!entry.isIntersecting) setIsMenuOpen(false);
      },
      {
        root: null,                      // observe against the browser viewport
        threshold: 0,                    // fire as soon as any pixel enters/exits
        rootMargin: "-80px 0px 0px 0px", // offset by navbar height
      },
    );

    observer.observe(target);

    // Clean up when the component unmounts or targetId changes.
    return () => observer.disconnect();
  }, [targetId]);

  // Stable toggle handler — won't cause child button to re-render on every paint.
  const toggleMenu = useCallback(() => setIsMenuOpen((prev) => !prev), []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    // The `.folded` class is toggled via CSS — no inline style overrides needed.
    <nav className={`${styles.navbar} ${isFolded ? styles.folded : ""}`}>
      {/* Brand — CHANGE: changed <div> to <Link> so clicking the logo
          navigates home, which is standard navbar behaviour. */}
      <Link href="/" className={styles.logo}>
        DRIFTLAND
      </Link>

      {/* Full link list — hidden in CSS when .folded is active */}
      <ul className={styles.navLinks}>
        {/* CHANGE: replaced five identical <li> blocks with a .map() */}
        {NAV_LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className={styles.navLink}>
              {label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Hamburger area — button + dropdown */}
      <div className={styles.moreMenu}>
        <button
          className={styles.menuButton}
          // CHANGE: added aria-label and aria-expanded for accessibility.
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          onClick={toggleMenu}
        >
          {/* CHANGE: replaced static ☰ (hamburger) with a toggle that shows
              × when the menu is open — standard UX pattern. */}
          {isMenuOpen ? "\u2715" : "\u2630"}
        </button>

        {/* Dropdown — rendered whenever menu is open.
            The button is only visible via CSS when .folded is active, so
            isMenuOpen can only be true when the user clicked the visible button. */}
        {isMenuOpen && (
          // CHANGE: changed <div> wrapper to <ul> — semantically correct
          // since the contents are a list of navigation links.
          <ul className={styles.dropdown}>
            {/* CHANGE: map from NAV_LINKS (same fix as the top bar) so
                dropdown always matches the main nav — no drift in content. */}
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={styles.dropdownLink}
                  onClick={() => setIsMenuOpen(false)} // close after navigation
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
