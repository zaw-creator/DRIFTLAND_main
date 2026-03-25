import Image from "next/image";
import Link from "next/link";
import styles from "./EventCard.module.css";
import defaultEvent from "@/asset/events/DefaultEventPage.png";

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return (
    date
      .toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase() +
    " · " +
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
}

export default function EventCard({ event }) {
  const {
    _id,
    name,
    eventDate,
    location,
    status,
    image,
    driverTotalRegisteredCount,
    driverTotalCapacity,
    isDriverFull,
  } = event;

  // 🧮 Dynamic Scarcity Math based on your MongoDB data
  const capacity = driverTotalCapacity || 0;
  const registered = driverTotalRegisteredCount || 0;
  const fillPercentage = capacity > 0 ? (registered / capacity) * 100 : 0;

  // Turn red if 85% full or officially marked full by the backend
  const isAlmostFull = fillPercentage >= 85 || isDriverFull;
  const scarcityColor = isAlmostFull ? "#e10600" : "#fbc638";

  // 🎨 Dynamic Status Badge Logic
  let badgeClass = styles.badgeUpcoming;
  let badgeText = "UPCOMING";
  if (status === "active") {
    badgeClass = styles.badgeOngoing;
    badgeText = "● LIVE NOW";
  } else if (status === "nearby") {
    badgeClass = styles.badgeNearby;
    badgeText = "STARTING SOON";
  } else if (status === "previous") {
    badgeClass = styles.badgePrevious;
    badgeText = "ENDED";
  }

  return (
    // 🚀 Premium SEO: <Link> triggers background prefetching for 0ms load times!
    <Link href={`/events/${_id}`} className={styles.premiumCard}>
      {/* 📸 The Image Layer */}
      <div className={styles.mediaWrap}>
        <Image
          src={image || defaultEvent}
          alt={name}
          fill
          sizes="(max-width: 1023px) 100vw, 65vw" // ⚡ Core Web Vitals optimization
          className={styles.heroImage}
        />
        <div className={styles.fadeOverlay}></div>
      </div>

      {/* 📊 The Data & Frosted Glass Layer */}
      <div className={styles.contentWrap}>
        <div className={`${styles.liveBadge} ${badgeClass}`}>{badgeText}</div>

        <h2 className={styles.title}>{name}</h2>

        <div className={styles.meta}>
          <span>📍 {location}</span>
          <span>📅 {formatDateTime(eventDate)}</span>
        </div>

        <div className={styles.scarcityContainer}>
          <div className={styles.scarcityLabels}>
            <span>DRIVER REGISTRATION</span>
            <span style={{ color: scarcityColor }}>
              {isDriverFull ? "SOLD OUT" : `${registered} / ${capacity}`}
            </span>
          </div>
          <div className={styles.scarcityTrack}>
            <div
              className={styles.scarcityFill}
              style={{
                width: `${fillPercentage}%`,
                backgroundColor: scarcityColor,
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
