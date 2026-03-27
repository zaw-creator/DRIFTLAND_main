const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function request(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Request failed: ${res.status}`);
  return json;
}

export async function getAdminEvents() {
  return request("GET", "/api/admin/events");
}

export async function getAdminEventById(id) {
  return request("GET", `/api/admin/events/${id}`);
}
// Add to your existing adminEventService.js
export async function patchEvent(id, data) {
  const token = localStorage.getItem("adminToken");
  const res = await fetch(`${API_URL}/api/admin/events/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function createEvent(data) {
  return request("POST", "/api/admin/events", data);
}

export async function updateEvent(id, data) {
  return request("PUT", `/api/admin/events/${id}`, data);
}

export async function deleteEvent(id) {
  return request("DELETE", `/api/admin/events/${id}`);
}

export async function uploadEventImage(id, file) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_URL}/api/admin/events/${id}/image`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Upload failed: ${res.status}`);
  return json;
}
