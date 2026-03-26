"use client";

/**
 * ModalUI.js  —  app/events/@modal/(.)[id]/ModalUI.js
 *
 * Client component that wraps the intercepted event detail in an animated
 * slide-up panel. It is the SHELL only — it does not care about the event
 * data. The content (LiveEventDetails) is rendered as {children} by the
 * parent server component (page.js in this same folder).
 *
 * ── How dismissal works ──────────────────────────────────────────────────────
 *   router.back() is the correct way to close an intercepting-route modal.
 *   It reverses the navigation, which causes Next.js to un-mount this slot
 *   and restore the @modal/default.js (null) in its place — the feed behind
 *   stays mounted the entire time, preserving scroll position.
 *
 * ── Dismiss triggers ─────────────────────────────────────────────────────────
 *   1. Click the backdrop (the dark overlay outside the panel)
 *   2. Press the ESC key
 *   3. Click the ✕ close button
 *
 * ── To customize the modal appearance ───────────────────────────────────────
 *   Edit EventModal.module.css in this same folder.
 *   • Panel size / border-radius → .panel
 *   • Backdrop opacity / color   → .backdrop
 *   • Animation spring values    → the `transition` prop below
 *
 * ── To customize the event detail content ───────────────────────────────────
 *   Edit src/components/events/LiveEventDetails.js — changes there apply to
 *   BOTH this modal view AND the standalone /events/[id] full page.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./EventModal.module.css";

export default function ModalUI({ children }) {
  const router = useRouter();

  // Prevent the feed behind from scrolling while the modal is open.
  // The cleanup restores scrolling when the modal is dismissed.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Allow keyboard users to close the modal with ESC.
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [router]);

  return (
    // AnimatePresence enables the exit animation when the modal unmounts.
    <AnimatePresence>
      {/* Backdrop — clicking it calls router.back() to dismiss */}
      <motion.div
        className={styles.backdrop}
        onClick={() => router.back()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Panel — stopPropagation prevents backdrop click from firing when
            the user clicks inside the panel content */}
        <motion.div
          className={styles.panel}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        >
          {/* Close button — absolute-positioned top-right corner */}
          <button
            className={styles.closeBtn}
            onClick={() => router.back()}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Scrollable content area — LiveEventDetails renders here */}
          <div className={styles.scroll}>{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
