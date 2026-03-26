import Link from "next/link";
import { dummyEvents } from "../page";
import styles from "../sandbox.module.css";

export default async function StandaloneEventPage({ params }) {
  const { id } = await params;
  const event = dummyEvents.find((e) => e.id === id);

  return (
    <main className={styles.sandboxContainer}>
      <Link
        href="/sandbox"
        style={{ color: "#fbc638", textDecoration: "none", fontWeight: "bold" }}
      >
        ← BACK TO FEED
      </Link>

      <div style={{ marginTop: "40px" }}>
        <span className={styles.cardStatus}>{event?.status || "UNKNOWN"}</span>
        <h1 className={styles.header}>{event?.name || "Event Not Found"}</h1>

        <p style={{ color: "#fff", fontSize: "1.2rem" }}>
          [ FULL STANDALONE PAGE ]<br />
          <br />
          You are seeing this because you refreshed the page, or accessed the
          URL directly.
        </p>
      </div>
    </main>
  );
}
