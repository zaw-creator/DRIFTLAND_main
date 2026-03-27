/**
 * app/events/[id]/results/page.js
 *
 * Standalone SSR page that shows the full qualifying telemetry and elimination
 * bracket for a single event. Accessed via the "VIEW FULL RESULTS →" link in
 * LeaderboardPreview on the event detail page.
 *
 * URL: /events/:id/results
 *
 * Rendering strategy:
 *   - Server Component — data is fetched at request time on the server.
 *   - getEventById uses a 30-second Next.js cache tag (event-:id), so this
 *     page benefits from the same caching as the event detail page.
 *   - EventTelemetry is a Client Component (needs useState for tabs/toggle).
 *
 * Data used from the event document:
 *   name             — displayed in the page header
 *   leaderboard      — qualifying results array
 *   bracket          — flat match array for the bracket view
 *   bracketGenerated — shows/hides the BRACKET tab in EventTelemetry
 */

import { notFound }          from "next/navigation";
import { getEventById }      from "@/services/eventService";
import EventTelemetry        from "@/components/events/EventTelemetry";

// ── Dynamic metadata ──────────────────────────────────────────────────────────
// Generates the <title> tag for this page from the event name.
export async function generateMetadata({ params }) {
  try {
    // params is a Promise in Next.js 15+ — always await it
    const { id } = await params;
    const event   = await getEventById(id);
    return {
      title: `${event.name} — Results | DriftLand`,
      description: `Qualifying telemetry and elimination bracket results for ${event.name}.`,
    };
  } catch {
    // Silently fall back to a generic title if the event fetch fails
    return { title: "Event Results | DriftLand" };
  }
}

// ── Page component ────────────────────────────────────────────────────────────
export default async function EventResultsPage({ params }) {
  // Unwrap the params Promise before using the id
  const { id } = await params;

  let event;
  try {
    // Fetch the full event document — includes leaderboard + bracket fields
    event = await getEventById(id);
  } catch {
    // If the id is invalid or the API is down, show the 404 page
    notFound();
  }

  // Pass the full event object to the interactive Client Component.
  // EventTelemetry handles the empty-data case with a preview state.
  return <EventTelemetry event={event} />;
}
