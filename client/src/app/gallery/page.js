"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

const CATEGORIES = ["All", "Events", "Cars", "Track", "Other"];
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/gallery`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setItems(data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeFilter === "All"
    ? items
    : items.filter((img) => img.category === activeFilter);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + filtered.length) % filtered.length);
  }, [filtered.length]);

  const next = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % filtered.length);
  }, [filtered.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape")     closeLightbox();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, prev, next]);

  const current = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  return (
    <>
      {/* ── Page header ── */}
      <section className={styles.header}>
        <div className={styles.headerOverlay} />
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Driftland 154</p>
          <h1 className={styles.title}>GALLERY</h1>
          <p className={styles.subtitle}>Behind the smoke, the rubber, and the roar.</p>
        </div>
      </section>

      {/* ── Filter tabs ── */}
      <div className={styles.filterBar}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.filterBtn} ${activeFilter === cat ? styles.filterActive : ""}`}
            onClick={() => { setActiveFilter(cat); setLightboxIndex(null); }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className={styles.emptyState}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>No photos in this category yet.</div>
      ) : (
        <main className={styles.grid}>
          {filtered.map((img, i) => (
            <button
              key={img._id}
              className={styles.card}
              style={{ backgroundImage: `url('${img.src}')` }}
              onClick={() => openLightbox(i)}
              aria-label={`Open ${img.title}`}
            >
              <div className={styles.cardOverlay}>
                <span className={styles.cardCategory}>{img.category}</span>
                <span className={styles.cardTitle}>{img.title}</span>
              </div>
            </button>
          ))}
        </main>
      )}

      {/* ── Lightbox ── */}
      {current && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <button className={styles.lbClose} onClick={closeLightbox} aria-label="Close">✕</button>

          <button
            className={`${styles.lbNav} ${styles.lbPrev}`}
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
          >
            ‹
          </button>

          <div className={styles.lbContent} onClick={(e) => e.stopPropagation()}>
            <img src={current.src} alt={current.title} className={styles.lbImage} />
            <div className={styles.lbCaption}>
              <span className={styles.lbCategory}>{current.category}</span>
              <span className={styles.lbTitle}>{current.title}</span>
              <span className={styles.lbCounter}>{lightboxIndex + 1} / {filtered.length}</span>
            </div>
          </div>

          <button
            className={`${styles.lbNav} ${styles.lbNext}`}
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
