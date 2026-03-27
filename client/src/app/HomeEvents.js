"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const STATUS_LABEL = {
  upcoming: "Upcoming",
  active:   "Live Now",
  nearby:   "This Week",
};

const STATUS_CLASS = {
  upcoming: "eventBadgeUpcoming",
  active:   "eventBadgeLive",
  nearby:   "eventBadgeNearby",
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

export default function HomeEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/events`)
      .then((r) => r.json())
      .then((json) => {
        const raw = json.data;
        const list = Array.isArray(raw) ? raw : (raw?.events || []);
        const priority = list.filter((e) => ["active", "nearby", "upcoming"].includes(e.status));
        setEvents(priority.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  if (events.length === 0) return null;

  return (
    <section className={styles.eventsPreviewSection}>
      <div className={styles.eventsPreviewInner}>
        <div className={styles.eventsPreviewHeader}>
          <div>
            <p className={styles.sectionEyebrow}>What&apos;s Coming</p>
            <h2 className={styles.sectionTitle}>Upcoming Events</h2>
          </div>
          <Link href="/events" className={styles.seeAllLink}>
            See All Events →
          </Link>
        </div>

        <div className={styles.eventCards}>
          {events.map((ev) => (
            <Link key={ev._id} href="/events" className={styles.eventCard}>
              <div
                className={styles.eventCardImg}
                style={{
                  backgroundImage: ev.image ? `url('${ev.image}')` : "none",
                }}
              >
                {!ev.image && <span className={styles.eventCardNoImg}>154</span>}
                {STATUS_LABEL[ev.status] && (
                  <span className={`${styles.eventBadge} ${styles[STATUS_CLASS[ev.status]]}`}>
                    {ev.status === "active" && <span className={styles.liveDot} />}
                    {STATUS_LABEL[ev.status]}
                  </span>
                )}
              </div>
              <div className={styles.eventCardBody}>
                <p className={styles.eventCardDate}>{formatDate(ev.eventDate)}</p>
                <h3 className={styles.eventCardName}>{ev.name}</h3>
                <p className={styles.eventCardLocation}>{ev.location}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
