import nodemailer from 'nodemailer';
import pool from './db.js';

/** Load all settings from DB into a flat map */
async function loadSettings() {
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
  const map = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

/** Build a transporter from DB settings, or return null if disabled/unconfigured */
async function getTransporter(cfg) {
  if (cfg.email_enabled !== 'true') return null;
  if (!cfg.smtp_host || !cfg.smtp_user) return null;
  const auth = cfg.smtp_password
    ? { user: cfg.smtp_user, pass: cfg.smtp_password }
    : undefined;
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: parseInt(cfg.smtp_port || '587'),
    secure: cfg.smtp_secure === 'true',
    ...(auth ? { auth } : {}),
  });
}

/**
 * Resolve recipient addresses for a notification trigger.
 * notifyConfig = JSON string: { enabled, recipients: 'booker'|'admin'|'both'|'custom', custom_email }
 * Returns array of email addresses, or null if disabled.
 */
function resolveRecipients(notifyConfig, booking, adminEmail) {
  let cfg;
  try { cfg = JSON.parse(notifyConfig || 'null'); } catch { cfg = null; }
  if (!cfg || cfg.enabled === false || cfg.enabled === 'false') return null;

  const recipients = cfg.recipients || 'booker';
  const addresses = [];

  if (recipients === 'booker' || recipients === 'both') {
    if (booking.booked_by_email) addresses.push(booking.booked_by_email);
  }
  if (recipients === 'admin' || recipients === 'both') {
    if (adminEmail) addresses.push(...adminEmail.split(',').map(e => e.trim()).filter(Boolean));
  }
  if (recipients === 'custom') {
    if (cfg.custom_email) addresses.push(...cfg.custom_email.split(',').map(e => e.trim()).filter(Boolean));
  }

  return addresses.length ? addresses : null;
}

/**
 * Send an email to one or more addresses.
 * Silently skips if email is disabled or not configured.
 */
export async function sendMail({ to, subject, html, text }) {
  try {
    const cfg = await loadSettings();
    const transporter = await getTransporter(cfg);
    if (!transporter) return { ok: false, error: 'Email not configured or disabled' };
    const from = cfg.email_from || cfg.smtp_user;
    const toList = Array.isArray(to) ? to.join(', ') : to;
    await transporter.sendMail({ from, to: toList, subject, html, text });
    return { ok: true };
  } catch (e) {
    console.error('[emailer] send error:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Fire a booking notification using the per-trigger settings.
 * triggerKey: 'notify_submitted' | 'notify_rejected' | 'notify_cancelled'
 */
async function sendBookingNotification(triggerKey, subject, html, text, booking) {
  try {
    const cfg = await loadSettings();
    const addresses = resolveRecipients(cfg[triggerKey], booking, cfg.admin_email);
    if (!addresses) return { ok: false, error: 'Trigger disabled or no recipients' };
    return sendMail({ to: addresses, subject, html, text });
  } catch (e) {
    console.error(`[emailer] ${triggerKey} error:`, e.message);
    return { ok: false, error: e.message };
  }
}

/** Send a test email to the given address */
export async function sendTestMail(to) {
  return sendMail({
    to,
    subject: 'BookHub — Test Email',
    html: '<p>This is a test email from <strong>BookHub</strong>. SMTP is configured correctly.</p>',
    text: 'This is a test email from BookHub. SMTP is configured correctly.',
  });
}

// ── Booking notification helpers ─────────────────────────────────────────────

export async function sendBookingSubmitted(booking) {
  return sendBookingNotification(
    'notify_submitted',
    `BookHub — Booking Submitted: ${booking.title}`,
    `<h2>New Booking Submitted</h2>
     <p><strong>${booking.title}</strong> for <strong>${booking.resource_name}</strong></p>
     <p>Booked by: ${booking.booked_by_name || ''} &lt;${booking.booked_by_email}&gt;</p>
     <p>Start: ${booking.start_time}<br/>End: ${booking.end_time}</p>
     <p>Status: <strong>${booking.status === 'pending' ? 'Pending Approval' : 'Confirmed'}</strong></p>`,
    `Booking submitted: "${booking.title}" by ${booking.booked_by_email}. Status: ${booking.status}.`,
    booking,
  );
}

export async function sendBookingRejected(booking) {
  return sendBookingNotification(
    'notify_rejected',
    `BookHub — Booking Rejected: ${booking.title}`,
    `<h2>Booking Rejected</h2>
     <p><strong>${booking.title}</strong> for <strong>${booking.resource_name}</strong> has been rejected.</p>
     <p>Booked by: ${booking.booked_by_name || ''} &lt;${booking.booked_by_email}&gt;</p>
     <p>Please contact support if you have questions.</p>`,
    `Booking "${booking.title}" by ${booking.booked_by_email} was rejected.`,
    booking,
  );
}

export async function sendBookingCancelled(booking) {
  return sendBookingNotification(
    'notify_cancelled',
    `BookHub — Booking Cancelled: ${booking.title}`,
    `<h2>Booking Cancelled</h2>
     <p><strong>${booking.title}</strong> for <strong>${booking.resource_name}</strong> has been cancelled.</p>
     <p>Booked by: ${booking.booked_by_name || ''} &lt;${booking.booked_by_email}&gt;</p>`,
    `Booking "${booking.title}" by ${booking.booked_by_email} was cancelled.`,
    booking,
  );
}

/** Send a password reset email */
export async function sendPasswordResetEmail(to, name, resetLink) {
  return sendMail({
    to,
    subject: 'BookHub — Reset Your Password',
    html: `<h2>Password Reset Request</h2>
           <p>Hi ${name || 'there'},</p>
           <p>We received a request to reset your BookHub password. Click the link below to set a new password. This link expires in <strong>1 hour</strong>.</p>
           <p><a href="${resetLink}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Reset Password</a></p>
           <p>Or copy this URL: ${resetLink}</p>
           <p>If you didn't request this, you can safely ignore this email.</p>`,
    text: `Reset your BookHub password: ${resetLink} (expires in 1 hour). If you didn't request this, ignore this email.`,
  });
}

