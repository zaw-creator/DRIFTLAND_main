"use client";

/**
 *
 * This is a scroll-aware navigation bar that "folds" (collapses its links into a
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
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Navbar02.module.css";

/**
 * Navigation link definitions — single source of truth.
 * All the links in the navbar are stored in Array of Objects, ADD/REMOVE/EDIT links here to update Navbar and Dropdown Together.
 */

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/drivers", label: "Drivers" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];
// ── Framer Motion Animation Variants ───────────────────────────────────────
// The background overlay fade
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
  exit: { opacity: 0, transition: { duration: 0.3, delay: 0.2 } },
};

// The container that staggers the children (links)
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, // Time delay between each link animating in
      delayChildren: 0.1, // Wait slightly before starting the cascade
    },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 }, // Cascade out backwards
  },
};

// The individual links (The "Bouncy" Spring effect)
const itemVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 250, // Higher = faster snap
      damping: 20, // Lower = more bounce/wobble
    },
  },
  exit: { y: 20, opacity: 0, transition: { duration: 0.2 } },
};
export default function Navbar02({ targetId }) {
  /**
   * isFolded — true while the sentinel element is intersecting the viewport.
   * In the folded state the link list is hidden and the hamburger appears.
   */
  const [isFolded, setIsFolded] = useState(false);

  /** isMenuOpen — State Control the Dropdown menu*/
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

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
        root: null, // observe against the browser viewport
        threshold: 0, // fire as soon as any pixel enters/exits
        rootMargin: "-80px 0px 0px 0px", // offset by navbar height
      },
    );

    observer.observe(target);

    // Clean up when the component unmounts or targetId changes.
    return () => observer.disconnect();
  }, [targetId]);
  // ── Body Scroll Lock ─────────────────────────────────────────────────────
  // Prevents the website from scrolling behind the full-screen menu
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isMenuOpen]);
  // Stable toggle handler — won't cause child button to re-render on every paint.
  const toggleMenu = useCallback(() => setIsMenuOpen((prev) => !prev), []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <nav className={`${styles.navbar} ${isFolded ? styles.folded : ""}`}>
        <Link href="/" className={styles.logo}>
          DRIFTLAND
        </Link>

        {/* Main navigation links: Desktop Nav Bar */}
        <ul className={styles.navLinks}>
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`${styles.navLink} ${pathname === href ? styles.active : ""}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Hamburger area */}
        <div className={styles.moreMenu}>
          <button className={styles.menuButton} onClick={toggleMenu}>
            {isMenuOpen ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </nav>
      {/* Dropdown — Mobile Nav Bar*/}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className={styles.fullscreenOverlay}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.ul
              className={styles.fullscreenLinks}
              variants={listVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {NAV_LINKS.map(({ href, label }) => (
                <motion.li key={href} variants={itemVariants}>
                  <Link
                    href={href}
                    className={`${styles.giantLink} ${pathname === href ? styles.activeGiant : ""}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {label}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
