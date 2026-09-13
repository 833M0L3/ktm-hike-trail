/**
 * Centralized API client for Kathmandu Valley Hikes backend (Cloudflare Workers + D1 + R2)
 */

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  window.location.port !== '8787'
    ? 'http://127.0.0.1:8787'
    : '');

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...(options.headers || {}),
  };

  // If body is not FormData, default to JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends cookies across requests
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

// ── Authentication Endpoints ──

export async function getAuthConfig() {
  try {
    return await request('/api/auth/config');
  } catch {
    return { googleClientId: '' };
  }
}

export async function loginWithGoogle(credential) {
  return request('/api/auth/google', {
    method: 'POST',
    body: { credential },
  });
}

export async function loginWithMock(role = 'user', email, name) {
  return request('/api/auth/mock', {
    method: 'POST',
    body: { role, email, name },
  });
}

export async function getCurrentUser() {
  try {
    const data = await request('/api/auth/me');
    return data.user || null;
  } catch {
    return null;
  }
}

export async function logoutUser() {
  return request('/api/auth/logout', { method: 'POST' });
}

// ── Public Trails Endpoints ──

export async function fetchPublicRoutes({ search = '', difficulty = 'All', district = 'All', sort = 'name' } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (difficulty && difficulty !== 'All') params.set('difficulty', difficulty);
  if (district && district !== 'All') params.set('district', district);
  if (sort) params.set('sort', sort);

  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/routes${query}`);
}

export async function fetchRouteDetail(id) {
  return request(`/api/routes/${encodeURIComponent(id)}`);
}

export function getRouteDownloadUrl(id) {
  return `${API_BASE}/api/routes/${encodeURIComponent(id)}/download`;
}

// ── User Trails Endpoints ──

export async function uploadTrailSubmission(formData) {
  return request('/api/user/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function fetchMySubmittedRoutes() {
  const data = await request('/api/user/my-routes');
  return data.routes || [];
}

// ── Admin Moderation Endpoints ──

export async function fetchPendingSubmissions() {
  const data = await request('/api/admin/routes/pending');
  return data.routes || [];
}

export async function reviewSubmission(routeId, { action, adminNote, name, difficulty }) {
  return request(`/api/admin/routes/${encodeURIComponent(routeId)}/review`, {
    method: 'POST',
    body: { action, adminNote, name, difficulty },
  });
}

export async function deleteRoutePermanently(routeId) {
  return request(`/api/admin/routes/${encodeURIComponent(routeId)}`, {
    method: 'DELETE',
  });
}

export async function adminUpdateRoute(routeId, updates) {
  return request(`/api/admin/routes/${encodeURIComponent(routeId)}`, {
    method: 'PUT',
    body: updates,
  });
}

export async function adminFetchAllRoutes({ status = 'all', search = '' } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  if (search) params.set('search', search);
  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await request(`/api/admin/routes${query}`);
  return data.routes || [];
}
