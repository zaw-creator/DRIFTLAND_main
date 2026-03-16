const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Request failed: ${res.status}`);
  return json;
}

export async function login(email, password) {
  return request('POST', '/api/auth/login', { email, password });
}

export async function logout() {
  return request('POST', '/api/auth/logout');
}

export async function getMe() {
  return request('GET', '/api/auth/me');
}
