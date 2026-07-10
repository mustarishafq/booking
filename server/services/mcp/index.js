import { randomUUID } from 'crypto';
import pool from '../../db.js';
import {
  applyTemplateToResource,
  assertResourceBookable,
  getAllCareSchedules,
  getCareSummariesForResources,
  getGlobalCareSummary,
} from '../../resourceCare.js';
import {
  sendBookingRejected,
  sendBookingCancelled,
  sendBookingSubmitted,
} from '../../emailer.js';
import {
  waBookingSubmitted,
  waBookingRejected,
  waBookingCancelled,
} from '../../whatsapp.js';
import {
  notifyBookingSubmitted,
  notifyBookingStatusChange,
} from '../../notifications.js';
import { sendBookingWebhook } from '../../webhooks.js';
import { writeAuditLog, slimRow, entitySummary } from '../../audit.js';
import {
  parseEntityRow,
  serializeResource,
  serializeBooking,
  serializeRoom,
  serializeTransaction,
  serializeCareSchedule,
  serializeMetadata,
} from '../../mcp/serializers/index.js';
import { buildPaginationMeta } from '../../mcp/mcpResponse.js';

const JSON_FIELDS = {
  resources: ['amenities', 'pair_with_types'],
  rooms: ['amenities'],
};

const BOOLEAN_FIELDS = {
  bookings: ['is_recurring'],
  resources: ['requires_approval'],
};

const DATETIME_FIELDS = {
  bookings: ['start_time', 'end_time'],
};

const COLUMN_ALIASES = { created_date: 'created_at' };
const mapCol = (col) => COLUMN_ALIASES[col] || col;

const toMySQLDatetime = (val) => {
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

function serializeInput(table, data) {
  const result = { ...data };

  for (const f of JSON_FIELDS[table] || []) {
    if (f in result && typeof result[f] !== 'string') {
      result[f] = JSON.stringify(result[f]);
    }
  }

  for (const f of BOOLEAN_FIELDS[table] || []) {
    if (f in result) result[f] = result[f] ? 1 : 0;
  }

  for (const f of DATETIME_FIELDS[table] || []) {
    if (result[f] && typeof result[f] === 'string') {
      result[f] = toMySQLDatetime(result[f]);
    }
  }

  return result;
}

async function enrichResourceRows(rows) {
  const parsed = rows.map((r) => parseEntityRow('resources', r));
  const userIds = [...new Set(parsed.map((r) => r.pic_user_id).filter(Boolean))];

  let userById = {};
  if (userIds.length) {
    const placeholders = userIds.map(() => '?').join(', ');
    const [users] = await pool.query(
      `SELECT id, email, full_name FROM users WHERE id IN (${placeholders})`,
      userIds,
    );
    userById = Object.fromEntries(users.map((u) => [u.id, u]));
  }

  return parsed.map((r) => {
    const pic = r.pic_user_id ? userById[r.pic_user_id] : null;
    const pic_name = (pic?.full_name || '').trim() || null;
    return {
      ...r,
      pic_email: pic?.email || null,
      pic_name,
    };
  });
}

async function enrichResourceRowsWithCare(rows) {
  const enriched = await enrichResourceRows(rows);
  const ids = enriched.map((r) => r.id);
  const summaries = await getCareSummariesForResources(ids);
  return enriched.map((r) => ({
    ...r,
    care_summary: summaries[r.id] || {
      overdue: 0,
      due: 0,
      upcoming: 0,
      next_due_at: null,
      next_label: null,
    },
  }));
}

function buildSortClause(sortBy, sortOrder, allowedColumns, defaultCol = 'created_at') {
  const col = allowedColumns.includes(sortBy) ? mapCol(sortBy) : defaultCol;
  const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return ` ORDER BY \`${col}\` ${dir}`;
}

export async function getMetadata() {
  const tables = ['resources', 'bookings', 'rooms', 'transactions', 'users'];
  const counts = {};
  for (const table of tables) {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    counts[table] = total;
  }
  return serializeMetadata(counts);
}

export async function listResources(filters) {
  const { search, status, resource_type, sort_by, sort_order, page, per_page, offset } = filters;
  const where = [];
  const params = [];

  if (search) {
    where.push('(name LIKE ? OR resource_type LIKE ? OR location LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (resource_type) {
    where.push('resource_type = ?');
    params.push(resource_type);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM resources ${whereSql}`,
    params,
  );

  const allowed = ['name', 'resource_type', 'status', 'created_at', 'updated_at'];
  const order = buildSortClause(sort_by, sort_order, allowed);
  const [rows] = await pool.query(
    `SELECT * FROM resources ${whereSql}${order} LIMIT ? OFFSET ?`,
    [...params, per_page, offset],
  );

  const enriched = await enrichResourceRowsWithCare(rows);
  return {
    data: enriched.map(serializeResource),
    meta: buildPaginationMeta({ page, perPage: per_page, total }),
  };
}

export async function getResource(id) {
  const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [id]);
  if (!rows[0]) return null;
  const [enriched] = await enrichResourceRowsWithCare(rows);
  return serializeResource(enriched);
}

export async function createResource(data, req) {
  const raw = serializeInput('resources', { ...data, id: randomUUID(), created_at: new Date() });
  const cols = Object.keys(raw).map((k) => `\`${k}\``).join(', ');
  const ph = Object.keys(raw).map(() => '?').join(', ');
  await pool.query(`INSERT INTO resources (${cols}) VALUES (${ph})`, Object.values(raw));

  applyTemplateToResource(raw.id, raw.resource_type).catch(() => {});

  const created = await getResource(raw.id);
  writeAuditLog({
    req,
    action: 'create',
    entityType: 'resources',
    entityId: raw.id,
    summary: `Created resource: ${entitySummary('resources', created)}`,
    metadata: { after: slimRow('resources', created) },
  }).catch(() => {});

  return created;
}

export async function updateResource(id, data, req) {
  const [before] = await pool.query('SELECT * FROM resources WHERE id = ?', [id]);
  if (!before[0]) return null;

  const serialized = serializeInput('resources', data);
  if (!Object.keys(serialized).length) return getResource(id);

  const sets = Object.keys(serialized).map((k) => `\`${k}\` = ?`).join(', ');
  await pool.query(
    `UPDATE resources SET ${sets} WHERE id = ?`,
    [...Object.values(serialized), id],
  );

  const updated = await getResource(id);
  writeAuditLog({
    req,
    action: 'update',
    entityType: 'resources',
    entityId: id,
    summary: `Updated resource: ${entitySummary('resources', updated)}`,
    metadata: {
      before: slimRow('resources', parseEntityRow('resources', before[0])),
      after: slimRow('resources', updated),
      changes: Object.keys(serialized),
    },
  }).catch(() => {});

  return updated;
}

export async function deleteResource(id, req) {
  const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [id]);
  if (!rows[0]) return false;

  const before = parseEntityRow('resources', rows[0]);
  await pool.query('DELETE FROM resources WHERE id = ?', [id]);

  writeAuditLog({
    req,
    action: 'delete',
    entityType: 'resources',
    entityId: id,
    summary: `Deleted resource: ${entitySummary('resources', before)}`,
    metadata: { before: slimRow('resources', before) },
  }).catch(() => {});

  return true;
}

export async function listBookings(filters, { userEmail, isAdmin, isApiKey }) {
  const {
    search, status, resource_id, booked_by_email,
    from, to, sort_by, sort_order, page, per_page, offset,
  } = filters;

  const where = [];
  const params = [];

  if (!isAdmin && !isApiKey && userEmail) {
    where.push('booked_by_email = ?');
    params.push(userEmail);
  }
  if (search) {
    where.push('(title LIKE ? OR resource_name LIKE ? OR booked_by_email LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (resource_id) {
    where.push('resource_id = ?');
    params.push(resource_id);
  }
  if (booked_by_email) {
    where.push('booked_by_email = ?');
    params.push(booked_by_email);
  }
  if (from) {
    where.push('start_time >= ?');
    params.push(toMySQLDatetime(from));
  }
  if (to) {
    where.push('end_time <= ?');
    params.push(toMySQLDatetime(to));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM bookings ${whereSql}`,
    params,
  );

  const allowed = ['start_time', 'end_time', 'status', 'created_at', 'title'];
  const order = buildSortClause(sort_by, sort_order, allowed, 'start_time');
  const [rows] = await pool.query(
    `SELECT * FROM bookings ${whereSql}${order} LIMIT ? OFFSET ?`,
    [...params, per_page, offset],
  );

  return {
    data: rows.map((r) => serializeBooking(parseEntityRow('bookings', r))),
    meta: buildPaginationMeta({ page, perPage: per_page, total }),
  };
}

export async function getBooking(id, { userEmail, isAdmin, isApiKey }) {
  const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
  if (!rows[0]) return null;
  const booking = parseEntityRow('bookings', rows[0]);
  if (!isAdmin && !isApiKey && userEmail && booking.booked_by_email !== userEmail) {
    return 'forbidden';
  }
  return serializeBooking(booking);
}

async function fireBookingSideEffects(oldRow, updated, data) {
  if (!oldRow || !data.status || data.status === oldRow.status) return;

  const booking = { ...oldRow, ...updated };
  notifyBookingStatusChange(booking, data.status).catch(() => {});

  if (data.status === 'rejected') {
    sendBookingRejected(booking).catch(() => {});
    waBookingRejected(booking).catch(() => {});
    sendBookingWebhook('notify_webhook_rejected', 'booking.rejected', booking).catch(() => {});
  }
  if (data.status === 'cancelled') {
    sendBookingCancelled(booking).catch(() => {});
    waBookingCancelled(booking).catch(() => {});
    sendBookingWebhook('notify_webhook_cancelled', 'booking.cancelled', booking).catch(() => {});
  }
  if (data.status === 'confirmed') {
    sendBookingWebhook('notify_webhook_confirmed', 'booking.confirmed', booking).catch(() => {});
  }
}

export async function createBooking(data, req) {
  await assertResourceBookable(data.resource_id);

  const [resourceRows] = await pool.query('SELECT * FROM resources WHERE id = ?', [data.resource_id]);
  const resource = resourceRows[0];

  const payload = {
    ...data,
    resource_name: resource?.name || data.resource_name,
    resource_type: resource?.resource_type || data.resource_type,
    pricing_model: resource?.pricing_model || data.pricing_model,
    status: data.status || 'pending',
    cost_cents: data.cost_cents ?? 0,
    id: randomUUID(),
    created_at: new Date(),
  };

  const raw = serializeInput('bookings', payload);
  const cols = Object.keys(raw).map((k) => `\`${k}\``).join(', ');
  const ph = Object.keys(raw).map(() => '?').join(', ');
  await pool.query(`INSERT INTO bookings (${cols}) VALUES (${ph})`, Object.values(raw));

  const created = serializeBooking(parseEntityRow('bookings', { ...raw, ...payload }));

  writeAuditLog({
    req,
    action: 'create',
    entityType: 'bookings',
    entityId: raw.id,
    summary: `Created booking: ${entitySummary('bookings', created)}`,
    metadata: { after: slimRow('bookings', created) },
  }).catch(() => {});

  if (created.booked_by_email) {
    sendBookingSubmitted(created).catch(() => {});
    waBookingSubmitted(created).catch(() => {});
    notifyBookingSubmitted(created).catch(() => {});
    sendBookingWebhook('notify_webhook_submitted', 'booking.submitted', created).catch(() => {});
    if (created.status === 'confirmed') {
      sendBookingWebhook('notify_webhook_confirmed', 'booking.confirmed', created).catch(() => {});
    }
  }

  return created;
}

export async function updateBooking(id, data, req, { userEmail, isAdmin, isApiKey }) {
  const [before] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
  if (!before[0]) return null;

  const oldRow = parseEntityRow('bookings', before[0]);
  if (!isAdmin && !isApiKey && userEmail && oldRow.booked_by_email !== userEmail) {
    return 'forbidden';
  }

  const serialized = serializeInput('bookings', data);
  if (!Object.keys(serialized).length) {
    return serializeBooking(oldRow);
  }

  const sets = Object.keys(serialized).map((k) => `\`${k}\` = ?`).join(', ');
  await pool.query(
    `UPDATE bookings SET ${sets} WHERE id = ?`,
    [...Object.values(serialized), id],
  );

  const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [id]);
  const updated = parseEntityRow('bookings', rows[0]);
  await fireBookingSideEffects(oldRow, updated, serialized);

  writeAuditLog({
    req,
    action: 'update',
    entityType: 'bookings',
    entityId: id,
    summary: `Updated booking: ${entitySummary('bookings', updated)}`,
    metadata: {
      before: slimRow('bookings', oldRow),
      after: slimRow('bookings', updated),
      changes: Object.keys(serialized),
    },
  }).catch(() => {});

  return serializeBooking(updated);
}

export async function listRooms(filters) {
  const { search, status, room_type, sort_by, sort_order, page, per_page, offset } = filters;
  const where = [];
  const params = [];

  if (search) {
    where.push('(name LIKE ? OR floor LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (room_type) {
    where.push('room_type = ?');
    params.push(room_type);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM rooms ${whereSql}`,
    params,
  );

  const allowed = ['name', 'status', 'room_type', 'created_at'];
  const order = buildSortClause(sort_by, sort_order, allowed);
  const [rows] = await pool.query(
    `SELECT * FROM rooms ${whereSql}${order} LIMIT ? OFFSET ?`,
    [...params, per_page, offset],
  );

  return {
    data: rows.map((r) => serializeRoom(parseEntityRow('rooms', r))),
    meta: buildPaginationMeta({ page, perPage: per_page, total }),
  };
}

export async function getRoom(id) {
  const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ?', [id]);
  if (!rows[0]) return null;
  return serializeRoom(parseEntityRow('rooms', rows[0]));
}

export async function createRoom(data, req) {
  const raw = serializeInput('rooms', { ...data, id: randomUUID(), created_at: new Date() });
  const cols = Object.keys(raw).map((k) => `\`${k}\``).join(', ');
  const ph = Object.keys(raw).map(() => '?').join(', ');
  await pool.query(`INSERT INTO rooms (${cols}) VALUES (${ph})`, Object.values(raw));

  const created = await getRoom(raw.id);
  writeAuditLog({
    req,
    action: 'create',
    entityType: 'rooms',
    entityId: raw.id,
    summary: `Created room: ${entitySummary('rooms', created)}`,
    metadata: { after: slimRow('rooms', created) },
  }).catch(() => {});

  return created;
}

export async function updateRoom(id, data, req) {
  const [before] = await pool.query('SELECT * FROM rooms WHERE id = ?', [id]);
  if (!before[0]) return null;

  const serialized = serializeInput('rooms', data);
  if (!Object.keys(serialized).length) return getRoom(id);

  const sets = Object.keys(serialized).map((k) => `\`${k}\` = ?`).join(', ');
  await pool.query(`UPDATE rooms SET ${sets} WHERE id = ?`, [...Object.values(serialized), id]);

  const updated = await getRoom(id);
  writeAuditLog({
    req,
    action: 'update',
    entityType: 'rooms',
    entityId: id,
    summary: `Updated room: ${entitySummary('rooms', updated)}`,
    metadata: {
      before: slimRow('rooms', parseEntityRow('rooms', before[0])),
      after: slimRow('rooms', updated),
      changes: Object.keys(serialized),
    },
  }).catch(() => {});

  return updated;
}

export async function listTransactions(filters, { userEmail, isAdmin, isApiKey }) {
  const { search, user_email, type, sort_by, sort_order, page, per_page, offset } = filters;
  const where = [];
  const params = [];

  if (!isAdmin && !isApiKey && userEmail) {
    where.push('user_email = ?');
    params.push(userEmail);
  }
  if (user_email) {
    where.push('user_email = ?');
    params.push(user_email);
  }
  if (type) {
    where.push('type = ?');
    params.push(type);
  }
  if (search) {
    where.push('(description LIKE ? OR user_email LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM transactions ${whereSql}`,
    params,
  );

  const allowed = ['created_at', 'amount_cents', 'type', 'user_email'];
  const order = buildSortClause(sort_by, sort_order, allowed, 'created_at');
  const [rows] = await pool.query(
    `SELECT * FROM transactions ${whereSql}${order} LIMIT ? OFFSET ?`,
    [...params, per_page, offset],
  );

  return {
    data: rows.map(serializeTransaction),
    meta: buildPaginationMeta({ page, perPage: per_page, total }),
  };
}

export async function listCareSchedules(filters) {
  const { status, resource_type, category, search, page, per_page } = filters;
  const schedules = await getAllCareSchedules({ status, resource_type, category, search });

  const total = schedules.length;
  const offset = (page - 1) * per_page;
  const slice = schedules.slice(offset, offset + per_page);

  return {
    data: slice.map(serializeCareSchedule),
    meta: buildPaginationMeta({ page, perPage: per_page, total }),
  };
}

export async function getCareSummary() {
  return getGlobalCareSummary();
}

export function authContext(req) {
  return {
    userEmail: req.userEmail,
    isAdmin: req.userRole === 'admin',
    isApiKey: req.mcpAuth?.type === 'api_key',
  };
}
