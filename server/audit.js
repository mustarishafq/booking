import { randomUUID } from 'crypto';
import pool from './db.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'new_password',
  'smtp_password',
  'wa_token',
  'secret',
  'token',
  'tempPassword',
  'temp_password',
  'reset_token',
  'reset_token_expires',
]);

export function redactSensitive(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactSensitive);

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) {
      out[key] = '[REDACTED]';
    } else if (val && typeof val === 'object') {
      out[key] = redactSensitive(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

export function slimRow(table, row) {
  if (!row) return null;
  const base = { id: row.id };
  if (row.name) base.name = row.name;
  if (row.title) base.title = row.title;
  if (row.email) base.email = row.email;
  if (row.full_name) base.full_name = row.full_name;
  if (row.status) base.status = row.status;
  if (row.user_email) base.user_email = row.user_email;
  if (row.type) base.type = row.type;
  if (row.resource_name) base.resource_name = row.resource_name;
  if (row.amount_cents != null) base.amount_cents = row.amount_cents;
  if (table === 'users' && row.role) base.role = row.role;
  return base;
}

export function entitySummary(table, row) {
  if (!row) return table;
  switch (table) {
    case 'bookings':
      return row.title || row.resource_name || row.id;
    case 'resources':
    case 'rooms':
    case 'roles':
      return row.name || row.id;
    case 'transactions':
      return `${row.type || 'transaction'} for ${row.user_email || 'unknown'}`;
    case 'users':
      return row.email || row.full_name || row.id;
    case 'settings':
      return row.key || 'settings';
    default:
      return row.id || table;
  }
}

function getClientMeta(req = {}) {
  return {
    ip_address: req.ip || req.socket?.remoteAddress || null,
    user_agent: (req.headers?.['user-agent'] || '').slice(0, 500) || null,
  };
}

export async function writeAuditLog({
  conn,
  req,
  actorId,
  actorEmail,
  action,
  entityType,
  entityId = null,
  summary = null,
  metadata = null,
}) {
  const id = randomUUID();
  const actor_id = actorId ?? req?.userId ?? null;
  const actor_email = actorEmail ?? req?.userEmail ?? null;
  const client = getClientMeta(req);
  const meta = metadata ? JSON.stringify(redactSensitive(metadata)) : null;

  const sql = `
    INSERT INTO audit_logs
      (id, actor_id, actor_email, action, entity_type, entity_id, summary, metadata, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    id,
    actor_id,
    actor_email,
    action,
    entityType,
    entityId,
    summary ? String(summary).slice(0, 500) : null,
    meta,
    client.ip_address,
    client.user_agent,
  ];

  if (conn) {
    await conn.query(sql, params);
  } else {
    await pool.query(sql, params);
  }

  return id;
}
