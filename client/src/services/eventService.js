const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  const { data } = await res.json();
  return data;
}

/** Fetches all non-previous events, sorted: ongoing → nearby → upcoming */
export async function getEvents() {
  return request('/api/events');
}

/** Fetches a single event by id (includes previous events) */
export async function getEventById(id) {
  return request(`/api/events/${id}`);
}
