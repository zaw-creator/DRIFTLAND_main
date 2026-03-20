const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request(method, path, body) {
  const url = `${API_URL}${path}`;
  console.log('Fetching:', method, url);
  
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const json = await res.json().catch(() => ({}));
  console.log('Response:', res.status, json);
  
  if (!res.ok) throw new Error(json.error || json.message || `Request failed: ${res.status}`);
  return json;
}

export async function login(email, password) {
  const data = await request('POST', '/api/auth/login', { email, password });
  if (data.token) {
    document.cookie = `adminToken=${data.token}; path=/; max-age=${60 * 60 * 24}`; // 1 day
  return data;
}
}

export async function logout() {
  document.cookie = 'adminToken=; path=/; max-age=0';
  return request('POST', '/api/auth/logout');
}

export async function getMe() {
  return request('GET', '/api/auth/me');
}
