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

/** Fetches all non-previous events, sorted: ongoing → nearby → upcoming */
export async function getEvents() {
  // Caches the main feed for 30 seconds.
  // 10,000 users hitting the page = only 1 request to your database every 30s.
  return request("/api/events", ["events-feed"], 30);
}

/** Fetches a single event by id (includes previous events) */
export async function getEventById(id) {
  // Caches specific event details for 30 seconds.
  return request(`/api/events/${id}`, [`event-${id}`], 30);
}

export async function getLeaderboard(id) {
  return request(`/api/events/${id}/leaderboard`);
}

export async function getBracket(id) {
  return request(`/api/events/${id}/bracket`);
}
