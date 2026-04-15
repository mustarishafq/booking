import pool from './db.js';

/** Load all settings from DB into a flat map */
async function loadSettings() {
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

/** Look up a user's phone by email */
async function getPhoneByEmail(email) {
  if (!email) return null;
  const [rows] = await pool.query('SELECT phone FROM users WHERE email = ?', [email]);
  return rows[0]?.phone || null;
}

/**
 * Resolve WhatsApp recipient phone numbers for a trigger.
 * notifyConfig = JSON string: { enabled, recipients: 'booker'|'admin'|'both'|'custom', custom_phone }
 */
async function resolvePhoneRecipients(notifyConfig, booking, adminPhones) {
  let cfg;
  try { cfg = JSON.parse(notifyConfig || 'null'); } catch { cfg = null; }
  if (!cfg || cfg.enabled === false || cfg.enabled === 'false') return null;

  const recipients = cfg.recipients || 'booker';
  const phones = [];

  if (recipients === 'booker' || recipients === 'both') {
    const phone = await getPhoneByEmail(booking.booked_by_email);
    if (phone) phones.push(phone);
  }
  if (recipients === 'admin' || recipients === 'both') {
    if (adminPhones) phones.push(...adminPhones.split(',').map(p => p.trim()).filter(Boolean));
  }
  if (recipients === 'custom') {
    if (cfg.custom_phone) phones.push(...cfg.custom_phone.split(',').map(p => p.trim()).filter(Boolean));
  }

  return phones.length ? phones : null;
}

/**
 * Send a WhatsApp text message via Meta Cloud API.
 * phone must be in international format without + (e.g. 60123456789)
 */
async function sendSingleWA(phone, message, cfg) {
  const url = `https://graph.facebook.com/${cfg.wa_api_version || 'v19.0'}/${cfg.wa_phone_id}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.wa_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone.replace(/^\+/, ''),
      type: 'text',
      text: { body: message },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `WA API error ${res.status}`);
  }
  return res.json();
}

/**
 * Fire a WhatsApp notification using the per-trigger settings.
 * triggerKey: 'notify_wa_submitted' | 'notify_wa_rejected' | 'notify_wa_cancelled'
 */
async function sendWANotification(triggerKey, message, booking) {
  try {
    const cfg = await loadSettings();
    if (cfg.wa_enabled !== 'true') return { ok: false, error: 'WhatsApp disabled' };
    if (!cfg.wa_phone_id || !cfg.wa_token) return { ok: false, error: 'WhatsApp not configured' };

    const phones = await resolvePhoneRecipients(cfg[triggerKey], booking, cfg.wa_admin_phone);
    if (!phones) return { ok: false, error: 'Trigger disabled or no recipients' };

    const results = await Promise.allSettled(phones.map(p => sendSingleWA(p, message, cfg)));
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) failed.forEach(f => console.error('[whatsapp] send error:', f.reason?.message));

    return { ok: failed.length === 0 };
  } catch (e) {
    console.error(`[whatsapp] ${triggerKey} error:`, e.message);
    return { ok: false, error: e.message };
  }
}

/** Send a test WA message */
export async function sendTestWA(phone) {
  const cfg = await loadSettings();
  if (!cfg.wa_phone_id || !cfg.wa_token) return { ok: false, error: 'WhatsApp not configured' };
  try {
    await sendSingleWA(phone, 'BookHub test message — WhatsApp is configured correctly.', cfg);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Notification helpers ──────────────────────────────────────────────────────

export async function waBookingSubmitted(booking) {
  const status = booking.status === 'pending' ? 'pending approval' : 'confirmed';
  return sendWANotification(
    'notify_wa_submitted',
    `📋 *Booking Submitted*\n*${booking.title}* for *${booking.resource_name}*\nBy: ${booking.booked_by_name || booking.booked_by_email}\nStatus: ${status}`,
    booking,
  );
}

export async function waBookingRejected(booking) {
  return sendWANotification(
    'notify_wa_rejected',
    `❌ *Booking Rejected*\n*${booking.title}* for *${booking.resource_name}*\nBooked by: ${booking.booked_by_name || booking.booked_by_email}\nPlease contact support for more info.`,
    booking,
  );
}

export async function waBookingCancelled(booking) {
  return sendWANotification(
    'notify_wa_cancelled',
    `🚫 *Booking Cancelled*\n*${booking.title}* for *${booking.resource_name}*\nBooked by: ${booking.booked_by_name || booking.booked_by_email}`,
    booking,
  );
}
