/**
 * app/events/page.js — Events Page (Server Component)
 *
 * WHY THIS IS A SERVER COMPONENT:
 *   Server components run on the server before the page is sent to the browser.
 *   This means the initial HTML already contains the correct filtered events —
 *   no loading spinner, no client-side fetch waterfall.
 *
 * HOW SERVER-SIDE FILTERING WORKS:
 *   1. TelemetryControl (client) clicks a tab → writes ?status=active to URL
 *   2. Next.js detects the URL change and re-renders this server component
 *   3. This component reads searchParams.status ("active", "nearby", etc.)
 *   4. Passes it to getEvents(status) → GET /api/events?status=active
 *   5. Server returns only matching events
 *   6. LiveEventFeed renders the pre-filtered list
 *
 * NOTE: The static <header> block was removed — LiveEventFeed now renders
 *   a dynamic header that updates when the active tab changes.
 */
import LiveEventFeed from "@/components/events/LiveEventFeed";
import { getEvents } from "@/services/eventService";
import styles from "./page.module.css";

export const metadata = {
  title: "Upcoming Events | DriftLand",
  description: "Find and register for premium DriftLand events.",
};

export default async function EventsPage({ searchParams }) {
  // Read the active filter from the URL (?status=active, ?status=nearby, etc.)
  // TelemetryControl writes this param when a tab is clicked.
  // Falls back to null → getEvents returns default public feed.
  const status = searchParams?.status || null;

  // Fetch server-side with the active filter applied.
  // Next.js caches this by full URL, so each tab has its own cache entry.
  const initialEvents = await getEvents(status);

  return (
    <main className={styles.page}>
      {/* LiveEventFeed is a client component — handles SSE live updates,
          TelemetryControl rendering, and dynamic header display.
          initialEvents is the server-pre-filtered starting data. */}
      <LiveEventFeed initialEvents={initialEvents} />
    </main>
  );
}
