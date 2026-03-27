"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

const IMAGES = ["/hero.jpg", "/hero2.jpg", "/hero3.jpg", "/hero4.jpg", "/hero5.jpg", "/hero6.jpg"];
const INTERVAL_MS = 4500;

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % IMAGES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.slideshowContainer}>
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className={`${styles.slide} ${i === current ? styles.slideActive : ""}`}
          style={{ backgroundImage: `url('${src}')` }}
        />
      ))}
    </div>
  );
}
