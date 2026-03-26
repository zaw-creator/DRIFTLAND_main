const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// async function request(path) {
//   const res = await fetch(`${API_URL}${path}`);
//   if (!res.ok) {
//     const body = await res.json().catch(() => ({}));
//     throw new Error(body.message || `Request failed: ${res.status}`);
//   }
//   const { data } = await res.json();
//   return data;
// }
async function request(path, tags = [], revalidateInterval = 30) {
  // 🚀 Premium Caching: This tells Next.js to cache the result and
  // only hit your Express backend at most once every 'revalidateInterval' seconds.
  const res = await fetch(`${API_URL}${path}`, {
    next: {
      revalidate: revalidateInterval,
      tags: tags, // Useful for on-demand cache clearing later
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  const { data } = await res.json();
  return data;
}

/**
 * Fetches events from the server, optionally pre-filtered by status.
 *
 * @param {string|null} status - The active TelemetryControl tab id, or null.
 *   "active"   → only live events right now
 *   "nearby"   → starting within 7 days
 *   "upcoming" → more than 7 days away
 *   "previous" → server returns both "ended" AND "archived" events
 *   null/"all" → default public feed (excludes ended/archived)
 *
 * HOW IT CONNECTS TO THE PAGE:
 *   EventsPage (server component) reads searchParams.status from the URL and
 *   passes it here. TelemetryControl writes to the URL when a tab is clicked,
 *   which triggers Next.js to re-render EventsPage with the new status param,
 *   calling this function again — achieving true server-side filtering per tab.
 *
 * CACHING NOTE:
 *   Next.js caches fetch() by full URL. /api/events?status=active and
 *   /api/events?status=nearby are independent cache entries automatically.
 */
export async function getEvents(status = null) {
  let path = "/api/events";
  // "all" and null both mean default feed — no query param needed.
  if (status && status !== "all") {
    path += `?status=${encodeURIComponent(status)}`;
  }
  return request(path, ["events-feed"], 30);
}

/** Fetches a single event by id (includes previous events) */
export async function getEventById(id) {
  // Caches specific event details for 30 seconds.
  return request(`/api/events/${id}`, [`event-${id}`], 30);
}

/**
 * Client-side paginated fetch for the infinite scroll feed.
 * Unlike getEvents(), this does NOT use Next.js server caching —
 * it's called from client components inside useInfiniteSection.
 *
 * Returns: { events, page, hasNextPage, hasPrevPage, total }
 */
export async function getEventsPaginated({ status, page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status && status !== "all") params.set("status", status);
  const res = await fetch(`${API_URL}/api/events?${params}`);
  if (!res.ok) throw new Error(`Paginated fetch failed: ${res.status}`);
  const json = await res.json();
  return json.data; // { events, page, hasNextPage, hasPrevPage, total }
}

export async function getLeaderboard(id) {
  return request(`/api/events/${id}/leaderboard`);
}

export async function getBracket(id) {
  return request(`/api/events/${id}/bracket`);
}
