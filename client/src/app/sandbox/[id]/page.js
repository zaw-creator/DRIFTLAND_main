import Link from "next/link";
import EventDetailsClient from "../../EventDetailsClient";
import { dummyEvents } from "../../data";
import styles from "../../sandbox.module.css";

// This runs on the server
export default async function StandaloneEventPage({ params }) {
  const { id } = await params;
  const event = dummyEvents.find((e) => e.id === id);

  return (
    <main className={styles.sandboxContainer}>
      {/* ── BACK BUTTON ── */}
      <Link
        href="/sandbox"
        style={{
          color: "#fbc638",
          textDecoration: "none",
          fontWeight: "bold",
          display: "inline-block",
          marginBottom: "40px",
          letterSpacing: "2px",
        }}
      >
        ← BACK TO FEED
      </Link>

      {/* ── THE INTERACTIVE COMPONENT ── */}
      <EventDetailsClient event={event} />
    </main>
  );
}
