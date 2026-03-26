import Link from "next/link";
import styles from "./sandbox.module.css";

// Dummy Database
export const dummyEvents = [
  { id: "1", name: "Tokyo Drift Masters", status: "LIVE NOW" },
  { id: "2", name: "Formula D: Long Beach", status: "UPCOMING" },
  { id: "3", name: "Ebisu Circuit Open Pit", status: "STARTING SOON" },
];

export default function SandboxFeed() {
  return (
    <main className={styles.sandboxContainer}>
      <h1 className={styles.header}>TELEMETRY FEED</h1>
      <p style={{ color: "#888", marginBottom: "40px" }}>
        Scroll down and click a card. Notice how the URL changes, but the
        background stays perfectly in place!
      </p>

      <div className={styles.grid}>
        {/* Render 12 fake cards to test scrolling */}
        {[...dummyEvents, ...dummyEvents, ...dummyEvents, ...dummyEvents].map(
          (event, i) => (
            <Link
              key={i}
              href={`/sandbox/${event.id}`}
              className={styles.card}
              scroll={false} // Prevents jumping to the top of the feed
            >
              <span className={styles.cardStatus}>{event.status}</span>
              <h2 className={styles.cardTitle}>{event.name}</h2>
            </Link>
          ),
        )}
      </div>
    </main>
  );
}
