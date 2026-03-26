"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import styles from "../../sandbox.module.css";

export default function ModalUI({ children }) {
  const router = useRouter();

  // Close modal if user hits the ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div className={styles.modalBackdrop} onClick={() => router.back()}>
      <motion.div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing it
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <button className={styles.closeButton} onClick={() => router.back()}>
          ✕
        </button>
        {children}
      </motion.div>
    </div>
  );
}
