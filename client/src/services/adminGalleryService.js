const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export async function getAdminGallery() {
  const res = await fetch(`${API}/api/admin/gallery`, { headers: authHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch gallery');
  return data.items;
}

export async function uploadGalleryItem(file, title, category) {
  const form = new FormData();
  form.append('image', file);
  form.append('title', title);
  form.append('category', category);
  const res = await fetch(`${API}/api/admin/gallery`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Upload failed');
  return data.item;
}

export async function deleteGalleryItem(id) {
  const res = await fetch(`${API}/api/admin/gallery/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Delete failed');
}
