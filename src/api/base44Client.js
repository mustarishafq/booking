import { getPostLogoutUrl, clearLoginSession } from '@/lib/nexusBrain';

const API_BASE  = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'booking_auth_token';

export const getToken   = () => localStorage.getItem(TOKEN_KEY);
export const setToken   = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const COLUMN_ALIASES = { created_date: 'created_at' };

const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let message;
    try { message = (await res.json()).message; } catch { message = res.statusText; }
    const err = new Error(message || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
};

const createEntityClient = (entityPath) => ({
  async list(orderBy, limit) {
    const params = new URLSearchParams();
    if (orderBy) {
      const asc = !orderBy.startsWith('-');
      const col = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy;
      params.set('orderBy', `${asc ? '' : '-'}${COLUMN_ALIASES[col] || col}`);
    }
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return apiFetch(`${entityPath}${qs ? `?${qs}` : ''}`);
  },
  async get(id)            { return apiFetch(`${entityPath}/${id}`); },
  async create(data)       { return apiFetch(entityPath, { method: 'POST', body: JSON.stringify(data) }); },
  async update(id, data)   { return apiFetch(`${entityPath}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async delete(id)         { return apiFetch(`${entityPath}/${id}`, { method: 'DELETE' }); },
  async bulkCreate(records){ return apiFetch(`${entityPath}/bulk`, { method: 'POST', body: JSON.stringify(records) }); },
  async filter(field, op, value) {
    const params = new URLSearchParams({ filterField: field, filterOp: op, filterValue: String(value) });
    return apiFetch(`${entityPath}?${params}`);
  },
});

const auth = {
  async me()                 { return apiFetch('/auth/me'); },
  async isAuthenticated()    { return !!getToken(); },
  async logout(redirectUrl) {
    const dest = redirectUrl || getPostLogoutUrl();
    clearToken();
    clearLoginSession();
    window.location.href = dest;
  },
  async redirectToLogin(url) {
    const dest = url ? `/login?redirect=${encodeURIComponent(url)}` : '/login';
    window.location.href = dest;
  },
  async updateMe(updates) {
    return apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(updates) });
  },
};

const users = {
  async createUser(data) {
    return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
  },
  async inviteUser(email, role) {
    return apiFetch('/users/invite', { method: 'POST', body: JSON.stringify({ email, role }) });
  },
};

export const db = {
  auth,
  users,
  entities: {
    Resource:    createEntityClient('/resources'),
    Booking:     createEntityClient('/bookings'),
    Transaction: createEntityClient('/transactions'),
    Room:        createEntityClient('/rooms'),
    User:        createEntityClient('/users'),
  },
  integrations: {
    Core: {
      async UploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
        if (!res.ok) {
          let message = 'Upload failed';
          try { message = (await res.json()).message || message; } catch { /* ignore */ }
          throw new Error(message);
        }
        return res.json();
      },
    },
  },
};

export const base44 = db;
export default db;
