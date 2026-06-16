import { getToken } from '@/api/base44Client';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function careFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}/resource-care${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let message;
    try { message = (await res.json()).message; } catch { message = res.statusText; }
    throw new Error(message || 'Request failed');
  }
  return res.json();
}

export const resourceCareApi = {
  summary: () => careFetch('/summary'),
  listSchedules: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '' && v !== 'all') qs.set(k, v);
    });
    const q = qs.toString();
    return careFetch(`/schedules${q ? `?${q}` : ''}`);
  },
  listItems: (resourceId) => careFetch(`/items?resource_id=${encodeURIComponent(resourceId)}`),
  createItem: (data) => careFetch('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => careFetch(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (id) => careFetch(`/items/${id}`, { method: 'DELETE' }),
  completeItem: (id, data) => careFetch(`/items/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),
  listCompletions: (id) => careFetch(`/items/${id}/completions`),
  listHistory: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '' && v !== 'all') qs.set(k, v);
    });
    const q = qs.toString();
    return careFetch(`/history${q ? `?${q}` : ''}`);
  },
  applyTemplate: (resourceId, skipExisting = true) =>
    careFetch('/apply-template', {
      method: 'POST',
      body: JSON.stringify({ resource_id: resourceId, skip_existing: skipExisting }),
    }),
  listTemplates: () => careFetch('/templates'),
  createTemplate: (data) => careFetch('/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id, data) => careFetch(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTemplate: (id) => careFetch(`/templates/${id}`, { method: 'DELETE' }),
  createTemplateItem: (templateId, data) =>
    careFetch(`/templates/${templateId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateTemplateItem: (id, data) =>
    careFetch(`/template-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTemplateItem: (id) => careFetch(`/template-items/${id}`, { method: 'DELETE' }),
};
