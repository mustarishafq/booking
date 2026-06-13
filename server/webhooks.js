import crypto from 'crypto';
import pool from './db.js';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

const EVENT_META = {
  'booking.submitted': {
    type: 'info',
    category: 'approval',
    recipientKeys: ['pic'],
  },
  'booking.confirmed': {
    type: 'success',
    category: 'approval',
    recipientKeys: ['booker'],
  },
  'booking.rejected': {
    type: 'error',
    category: 'approval',
    recipientKeys: ['booker'],
  },
  'booking.cancelled': {
    type: 'warning',
    category: 'task',
    recipientKeys: ['booker', 'pic'],
  },
  'webhook.test': {
    type: 'info',
    category: 'system',
    recipientKeys: ['booker'],
  },
};

const TRIGGER_TO_EVENT = {
  notify_webhook_submitted: 'submitted',
  notify_webhook_confirmed: 'confirmed',
  notify_webhook_rejected: 'rejected',
  notify_webhook_cancelled: 'cancelled',
};

export function generateWebhookSecret() {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

async function loadSettingsMap() {
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

function parseWebhooksJson(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function isTriggerEnabled(raw) {
  if (!raw) return true;
  try {
    const cfg = JSON.parse(raw);
    return cfg.enabled !== false && cfg.enabled !== 'false';
  } catch {
    return true;
  }
}

function normalizeWebhook(wh) {
  return {
    id: wh.id || crypto.randomUUID(),
    name: wh.name || '',
    url: wh.url || '',
    secret: wh.secret || generateWebhookSecret(),
    enabled: wh.enabled !== false && wh.enabled !== 'false',
    events: {
      submitted: wh.events?.submitted !== false,
      confirmed: wh.events?.confirmed !== false,
      rejected: wh.events?.rejected !== false,
      cancelled: wh.events?.cancelled !== false,
    },
  };
}

function migrateLegacyWebhook(cfg) {
  if (!cfg.webhook_url) return [];
  return [normalizeWebhook({
    name: 'Default webhook',
    url: cfg.webhook_url,
    secret: cfg.webhook_secret || generateWebhookSecret(),
    enabled: cfg.webhook_enabled === 'true',
    events: {
      submitted: isTriggerEnabled(cfg.notify_webhook_submitted),
      confirmed: isTriggerEnabled(cfg.notify_webhook_confirmed),
      rejected: isTriggerEnabled(cfg.notify_webhook_rejected),
      cancelled: isTriggerEnabled(cfg.notify_webhook_cancelled),
    },
  })];
}

export async function loadWebhooks() {
  const cfg = await loadSettingsMap();
  let webhooks = parseWebhooksJson(cfg.webhooks).map(normalizeWebhook);
  if (!webhooks.length) webhooks = migrateLegacyWebhook(cfg);
  return webhooks;
}

export function parseWebhooksForApi(raw, cfg = {}) {
  let webhooks = parseWebhooksJson(raw).map(normalizeWebhook);
  if (!webhooks.length) webhooks = migrateLegacyWebhook(cfg);
  return webhooks;
}

export function serializeWebhooks(webhooks) {
  return JSON.stringify(
    (Array.isArray(webhooks) ? webhooks : []).map(normalizeWebhook),
  );
}

async function getNexusSsoIdByEmail(email) {
  if (!email) return null;
  const [rows] = await pool.query(
    'SELECT nexus_sso_id FROM users WHERE LOWER(email) = ? LIMIT 1',
    [email.toLowerCase()],
  );
  return rows[0]?.nexus_sso_id || null;
}

async function getResourcePicNexusSsoId(resourceId) {
  if (!resourceId) return null;
  const [rows] = await pool.query(
    `SELECT u.nexus_sso_id
     FROM resources r
     INNER JOIN users u ON u.id = r.pic_user_id
     WHERE r.id = ?
     LIMIT 1`,
    [resourceId],
  );
  return rows[0]?.nexus_sso_id || null;
}

async function resolveBookingContext(booking) {
  const [bookerSsoId, picSsoId] = await Promise.all([
    getNexusSsoIdByEmail(booking.booked_by_email),
    getResourcePicNexusSsoId(booking.resource_id),
  ]);
  return { bookerSsoId, picSsoId };
}

function buildActionUrl(booking) {
  const path = booking?.id ? `/bookings?booking=${encodeURIComponent(booking.id)}` : '/bookings';
  return `${FRONTEND_URL}${path}`;
}

function resolveRecipientSsoIds(meta, context) {
  const { bookerSsoId, picSsoId } = context;
  const byKey = { booker: bookerSsoId, pic: picSsoId };
  const seen = new Set();
  const ids = [];

  for (const key of meta.recipientKeys || []) {
    const id = byKey[key];
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  return ids.length ? ids : [null];
}

function buildWebhookPayload(event, wh, booking, meta, nexusSsoId) {
  return {
    event,
    timestamp: new Date().toISOString(),
    webhook_id: wh.id,
    type: meta.type,
    category: meta.category,
    action_url: buildActionUrl(booking),
    nexus_sso_id: nexusSsoId,
    booking: {
      id: booking.id,
      title: booking.title,
      resource_id: booking.resource_id,
      resource_name: booking.resource_name,
      resource_type: booking.resource_type,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status,
      cost_cents: booking.cost_cents,
      booked_by_email: booking.booked_by_email,
      booked_by_name: booking.booked_by_name,
    },
  };
}

async function deliverWebhook(wh, event, booking, meta, nexusSsoId) {
  const payload = buildWebhookPayload(event, wh, booking, meta, nexusSsoId);

  const secret = wh.secret || generateWebhookSecret();
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'BookHub-Webhooks/1.0',
    'X-Webhook-Secret': secret,
  };

  const res = await fetch(wh.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[webhooks] ${event} → ${wh.url} failed: HTTP ${res.status}`, text.slice(0, 200));
    return { ok: false, error: `HTTP ${res.status}`, webhookId: wh.id };
  }

  return { ok: true, webhookId: wh.id };
}

/**
 * POST booking event to all matching webhook endpoints.
 * triggerKey: notify_webhook_submitted | notify_webhook_confirmed | etc.
 */
export async function sendBookingWebhook(triggerKey, event, booking) {
  try {
    const eventKey = TRIGGER_TO_EVENT[triggerKey];
    if (!eventKey) return { ok: false, error: 'Unknown trigger' };

    const meta = EVENT_META[event] || { type: 'info', category: 'other', recipientKeys: ['booker'] };
    const context = await resolveBookingContext(booking);
    const recipientIds = resolveRecipientSsoIds(meta, context);

    const webhooks = await loadWebhooks();
    const active = webhooks.filter(w => w.enabled && w.url && w.events[eventKey]);
    if (!active.length) return { ok: false, error: 'No matching webhooks' };

    const deliveries = active.flatMap(w =>
      recipientIds.map(nexusSsoId => ({ w, nexusSsoId })),
    );

    const results = await Promise.all(
      deliveries.map(({ w, nexusSsoId }) =>
        deliverWebhook(w, event, booking, meta, nexusSsoId).catch(e => ({ ok: false, error: e.message, webhookId: w.id })),
      ),
    );

    const failed = results.filter(r => !r.ok);
    if (failed.length === results.length) {
      return { ok: false, error: failed[0]?.error || 'All webhooks failed' };
    }

    return { ok: true, delivered: results.filter(r => r.ok).length, failed: failed.length };
  } catch (e) {
    console.error(`[webhooks] ${event} error:`, e.message);
    return { ok: false, error: e.message };
  }
}

export async function sendTestWebhook(webhookId, webhookOverride) {
  try {
    let wh = null;
    if (webhookOverride?.url) {
      wh = normalizeWebhook(webhookOverride);
    } else {
      const webhooks = await loadWebhooks();
      wh = webhooks.find(w => w.id === webhookId);
    }
    if (!wh) return { ok: false, error: 'Webhook not found — save your webhooks first, or check the URL is filled in.' };
    if (!wh.url) return { ok: false, error: 'Webhook URL not configured' };

    const testBooking = {
      id: 'test-booking-id',
      title: 'Test Booking',
      resource_id: 'test-resource',
      resource_name: 'Test Room',
      resource_type: 'Meeting Room',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      cost_cents: 0,
      booked_by_email: 'test@example.com',
      booked_by_name: 'Test User',
    };
    const meta = EVENT_META['webhook.test'];
    return deliverWebhook(wh, 'webhook.test', testBooking, meta, 'test-nexus-sso-id');
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
