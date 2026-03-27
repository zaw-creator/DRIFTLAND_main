"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export default function HomeGallery() {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/gallery`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setPhotos(data.items.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  if (photos.length === 0) return null;

  return (
    <section className={styles.galleryPreviewSection}>
      <div className={styles.galleryPreviewInner}>
        <div className={styles.galleryPreviewHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Behind the Scenes</p>
            <h2 className={styles.sectionTitle}>From the Track</h2>
          </div>
          <Link href="/gallery" className={styles.seeAllLink}>
            View Gallery →
          </Link>
        </div>

        <div className={styles.galleryGrid}>
          {photos.map((photo, i) => (
            <Link
              key={photo._id}
              href="/gallery"
              className={`${styles.galleryThumb} ${i === 0 ? styles.galleryThumbLarge : ""}`}
              style={{ backgroundImage: `url('${photo.src}')` }}
            >
              <div className={styles.galleryThumbOverlay}>
                <span className={styles.galleryThumbCategory}>{photo.category}</span>
                <span className={styles.galleryThumbTitle}>{photo.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
