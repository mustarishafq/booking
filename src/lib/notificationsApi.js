import { getToken } from '@/api/base44Client';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function notificationsFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

export const notificationsApi = {
  list: () => notificationsFetch('/notifications'),
  unreadCount: () => notificationsFetch('/notifications/unread-count'),
  markRead: (id) => notificationsFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => notificationsFetch('/notifications/read-all', { method: 'PATCH' }),
};
