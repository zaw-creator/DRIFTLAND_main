import { getEvents } from "@/services/eventService";
import LiveEventFeed from "@/components/events/LiveEventFeed";
import styles from "./page.module.css";
export const metadata = {
  title: "Upcoming Events | DriftLand",
  description: "Find and register for premium DriftLand events.",
};

export default async function EventsPage() {
  // 1. Fetch data on the server instantly
  // Note: We don't need 'loading' state anymore, the server handles it!
  const initialEvents = await getEvents();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Events</h1>
        <p className={styles.subtitle}>
          Find and register for upcoming DriftLand events
        </p>
      </header>

      {/* 2. Pass the server-fetched data to our interactive client UI */}
      <LiveEventFeed initialEvents={initialEvents} />
    </main>
  );
}
