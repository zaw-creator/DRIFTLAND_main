"use client";

/**
 * Scroll-aware navigation bar that "folds" (collapses its links into a
 * hamburger dropdown) while any matched element is visible in the viewport.
 *
 * Props
 * -----
 * @prop {string} [foldSelector="[data-nav-fold]"]
 *   A CSS selector that targets one or more DOM elements.
 *   The navbar folds whenever ANY matched element is intersecting the viewport.
 *   Because this uses a selector (not an id), you can mark as many elements
 *   as you like with the same data attribute — no duplicate-id issues.
 *
 * Usage
 * -----
 *   // layout.js — pass the selector (or omit to use the default)
 *   <Navbar02 foldSelector="[data-nav-fold]" />
 *
 *   // any page — add the attribute to every section that should fold the nav
 *   <section data-nav-fold>…hero content…</section>
 *   <section data-nav-fold>…another full-screen section…</section>
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
  { href: "/shop", label: "Shop" },
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
/**
 * DEFAULT_SELECTOR — the data attribute that marks any element as a fold zone.
 * Any element with data-nav-fold will cause the navbar to fold while visible.
 */
const DEFAULT_SELECTOR = "[data-nav-fold]";

export default function Navbar02({ foldSelector = DEFAULT_SELECTOR }) {
  /**
   * isFolded — true while at least one matched element is intersecting the
   * viewport. In the folded state the link list is hidden and the hamburger
   * button appears instead.
   */
  const [isFolded, setIsFolded] = useState(false);

  /** isMenuOpen — controls the fullscreen dropdown menu */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // ── Scroll / intersection observer ─────────────────────────────────────────
  useEffect(() => {
    // Find ALL elements that should trigger the fold behaviour.
    // querySelectorAll works with any CSS selector, so you can use a data
    // attribute on as many elements as you like without duplicate-id issues.
    const targets = Array.from(document.querySelectorAll(foldSelector));
    if (targets.length === 0) return;

    // ── Immediate sync check ──────────────────────────────────────────────
    // IntersectionObserver fires asynchronously — without this the full
    // (unfolded) nav flashes for a frame before the first observer callback.
    // getBoundingClientRect() is synchronous so we can fold right away.
    //
    // FIX: call getBoundingClientRect() directly on the element (el.getBoundingClientRect()).
    // Destructuring it as ({ getBoundingClientRect: getRect }) detaches the method
    // from its DOM node, losing the required `this` binding and throwing
    // "TypeError: Illegal invocation" at runtime.
    const anyVisible = targets.some((el) => {
      const { top, bottom } = el.getBoundingClientRect();
      return top < window.innerHeight && bottom >= 0;
    });
    setIsFolded(anyVisible);

    // ── Track how many targets are currently intersecting ─────────────────
    // We keep a Set of intersecting entries instead of a simple boolean so
    // that the navbar stays folded if one element exits but another is still
    // visible (e.g. two back-to-back full-screen sections).
    const intersecting = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersecting.add(entry.target);
          } else {
            intersecting.delete(entry.target);
          }
        });

        const shouldFold = intersecting.size > 0;
        setIsFolded(shouldFold);

        // Close the dropdown when the navbar unfolds — leaving a full-screen
        // menu open while the nav bar is visible would look broken.
        if (!shouldFold) setIsMenuOpen(false);
      },
      {
        root: null, // observe against the browser viewport
        threshold: 0, // fire as soon as any pixel enters/exits
        rootMargin: "-80px 0px 0px 0px", // compensate for the navbar height
      },
    );

    targets.forEach((el) => observer.observe(el));

    // Clean up on unmount or when foldSelector/pathname changes.
    return () => observer.disconnect();
    // FIX: pathname is included so this effect re-runs on every client-side
    // page navigation. Without it, querySelectorAll() only fires once on
    // mount — data-nav-fold elements on subsequent pages are never observed.
  }, [foldSelector, pathname]);
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
