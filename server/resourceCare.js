import { randomUUID } from 'crypto';
import pool from './db.js';
import { createNotification } from './notifications.js';

const BOOKING_STATUSES = ['confirmed', 'completed', 'pending'];
const DATE_INTERVALS = new Set(['manual', 'days', 'months']);
const USAGE_INTERVALS = new Set(['booking_hours', 'booking_count', 'odometer']);

function parseRow(row) {
  if (!row) return row;
  return {
    ...row,
    block_when_overdue: !!row.block_when_overdue,
    is_active: row.is_active == null ? true : !!row.is_active,
  };
}

function toDateStr(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function computeNextDueAt(item, fromDate = new Date()) {
  const base = item.last_done_at ? new Date(item.last_done_at) : fromDate;
  if (item.interval_type === 'days' && item.interval_value) {
    return toDateStr(addDays(base, item.interval_value));
  }
  if (item.interval_type === 'months' && item.interval_value) {
    return toDateStr(addMonths(base, item.interval_value));
  }
  if (item.interval_type === 'manual') {
    return item.next_due_at ? toDateStr(item.next_due_at) : null;
  }
  return null;
}

export async function getResourceBookingHours(resourceId, since = null) {
  let sql = `
    SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)), 0) / 60.0 AS hours
    FROM bookings
    WHERE resource_id = ?
      AND status IN (${BOOKING_STATUSES.map(() => '?').join(', ')})
  `;
  const params = [resourceId, ...BOOKING_STATUSES];
  if (since) {
    sql += ' AND end_time >= ?';
    params.push(since);
  }
  const [rows] = await pool.query(sql, params);
  return Number(rows[0]?.hours || 0);
}

export async function getResourceBookingCount(resourceId, since = null) {
  let sql = `
    SELECT COUNT(*) AS cnt
    FROM bookings
    WHERE resource_id = ?
      AND status IN (${BOOKING_STATUSES.map(() => '?').join(', ')})
  `;
  const params = [resourceId, ...BOOKING_STATUSES];
  if (since) {
    sql += ' AND end_time >= ?';
    params.push(since);
  }
  const [rows] = await pool.query(sql, params);
  return Number(rows[0]?.cnt || 0);
}

export async function getCurrentUsage(item, resource) {
  const since = item.last_done_at || null;
  if (item.interval_type === 'booking_hours') {
    return getResourceBookingHours(resource.id, since);
  }
  if (item.interval_type === 'booking_count') {
    return getResourceBookingCount(resource.id, since);
  }
  if (item.interval_type === 'odometer') {
    const current = Number(resource.odometer_km || 0);
    const baseline = item.usage_at_last_done != null ? Number(item.usage_at_last_done) : 0;
    return Math.max(0, current - baseline);
  }
  return 0;
}

export async function evaluateCareItem(item, resource, today = new Date()) {
  const parsed = parseRow(item);
  const todayStr = toDateStr(today);

  if (!parsed.is_active) {
    return { ...parsed, status: 'inactive', due_date: null, usage_current: null, usage_threshold: null };
  }

  let status = 'ok';
  let dueDate = parsed.next_due_at ? toDateStr(parsed.next_due_at) : null;
  let usageCurrent = null;
  let usageThreshold = parsed.interval_value;

  if (DATE_INTERVALS.has(parsed.interval_type)) {
    if (!dueDate && parsed.interval_type !== 'manual') {
      dueDate = computeNextDueAt(parsed, parsed.created_at || today);
    }
    if (dueDate) {
      const remindFrom = toDateStr(addDays(new Date(`${dueDate}T00:00:00Z`), -parsed.remind_days_before));
      if (todayStr > dueDate) status = 'overdue';
      else if (todayStr === dueDate) status = 'due';
      else if (todayStr >= remindFrom) status = 'upcoming';
    }
  } else if (USAGE_INTERVALS.has(parsed.interval_type) && parsed.interval_value) {
    usageCurrent = await getCurrentUsage(parsed, resource);
    const threshold = parsed.interval_value;
    const remindUnits = parsed.remind_days_before || 0;
    if (usageCurrent >= threshold) status = 'overdue';
    else if (usageCurrent >= Math.max(0, threshold - remindUnits)) status = 'upcoming';
    dueDate = dueDate || null;
  }

  return {
    ...parsed,
    status,
    due_date: dueDate,
    usage_current: usageCurrent,
    usage_threshold: usageThreshold,
  };
}

export async function getCareItemsForResource(resourceId, { activeOnly = false } = {}) {
  const [rows] = await pool.query(
    `SELECT * FROM resource_care_items WHERE resource_id = ? ${activeOnly ? 'AND is_active = 1' : ''} ORDER BY next_due_at IS NULL, next_due_at ASC, label ASC`,
    [resourceId],
  );
  const [resources] = await pool.query('SELECT * FROM resources WHERE id = ?', [resourceId]);
  const resource = resources[0];
  if (!resource) return [];

  return Promise.all(rows.map(r => evaluateCareItem(r, resource)));
}

export async function getCareSummariesForResources(resourceIds) {
  if (!resourceIds.length) return {};
  const placeholders = resourceIds.map(() => '?').join(', ');
  const [items] = await pool.query(
    `SELECT ci.*, r.odometer_km, r.name AS resource_name, r.resource_type, r.pic_user_id
     FROM resource_care_items ci
     INNER JOIN resources r ON r.id = ci.resource_id
     WHERE ci.resource_id IN (${placeholders}) AND ci.is_active = 1`,
    resourceIds,
  );

  const byResource = {};
  for (const id of resourceIds) {
    byResource[id] = { overdue: 0, due: 0, upcoming: 0, next_due_at: null, next_label: null };
  }

  for (const row of items) {
    const resource = { id: row.resource_id, odometer_km: row.odometer_km };
    const evaluated = await evaluateCareItem(row, resource);
    const summary = byResource[row.resource_id];
    if (evaluated.status === 'overdue') summary.overdue += 1;
    else if (evaluated.status === 'due') summary.due += 1;
    else if (evaluated.status === 'upcoming') summary.upcoming += 1;

    if (evaluated.due_date && (evaluated.status === 'overdue' || evaluated.status === 'due' || evaluated.status === 'upcoming')) {
      if (!summary.next_due_at || evaluated.due_date < summary.next_due_at) {
        summary.next_due_at = evaluated.due_date;
        summary.next_label = evaluated.label;
      }
    }
  }

  return byResource;
}

const SCHEDULE_STATUS_ORDER = { overdue: 0, due: 1, upcoming: 2, ok: 3, inactive: 4 };

export async function getAllCareSchedules(filters = {}) {
  const { status, resource_type: resourceType, category, search } = filters;

  let sql = `
    SELECT ci.*, r.name AS resource_name, r.resource_type, r.status AS resource_status,
           r.location AS resource_location, r.odometer_km
    FROM resource_care_items ci
    INNER JOIN resources r ON r.id = ci.resource_id
    WHERE ci.is_active = 1 AND r.status != 'inactive'
  `;
  const params = [];

  if (category && category !== 'all') {
    sql += ' AND ci.category = ?';
    params.push(category);
  }
  if (resourceType && resourceType !== 'all') {
    sql += ' AND r.resource_type = ?';
    params.push(resourceType);
  }
  if (search?.trim()) {
    sql += ' AND (ci.label LIKE ? OR r.name LIKE ? OR r.resource_type LIKE ? OR r.location LIKE ?)';
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q);
  }

  sql += ' ORDER BY r.name ASC, ci.label ASC';

  const [rows] = await pool.query(sql, params);
  let result = await Promise.all(rows.map(async (row) => {
    const resource = { id: row.resource_id, odometer_km: row.odometer_km };
    const item = await evaluateCareItem(row, resource);
    return {
      ...item,
      resource_name: row.resource_name,
      resource_type: row.resource_type,
      resource_status: row.resource_status,
      resource_location: row.resource_location,
    };
  }));

  if (status && status !== 'all') {
    result = result.filter(i => i.status === status);
  }

  result.sort((a, b) => {
    const sa = SCHEDULE_STATUS_ORDER[a.status] ?? 99;
    const sb = SCHEDULE_STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return (a.resource_name || '').localeCompare(b.resource_name || '') || a.label.localeCompare(b.label);
  });

  return result;
}

export async function getGlobalCareSummary() {
  const [items] = await pool.query(
    `SELECT ci.*, r.odometer_km, r.id AS resource_id, r.name AS resource_name, r.status AS resource_status
     FROM resource_care_items ci
     INNER JOIN resources r ON r.id = ci.resource_id
     WHERE ci.is_active = 1 AND r.status != 'inactive'`,
  );

  let overdue = 0;
  let due = 0;
  let upcoming = 0;
  let ok = 0;
  const overdueResources = new Set();
  const blockingOverdue = new Set();

  for (const row of items) {
    const resource = { id: row.resource_id, odometer_km: row.odometer_km };
    const evaluated = await evaluateCareItem(row, resource);
    if (evaluated.status === 'overdue') {
      overdue += 1;
      overdueResources.add(row.resource_id);
      if (evaluated.block_when_overdue) blockingOverdue.add(row.resource_id);
    } else if (evaluated.status === 'due') due += 1;
    else if (evaluated.status === 'upcoming') upcoming += 1;
    else if (evaluated.status === 'ok') ok += 1;
  }

  return {
    overdue,
    due,
    upcoming,
    ok,
    total: items.length,
    overdue_resources: overdueResources.size,
    blocking_overdue_resources: blockingOverdue.size,
  };
}

async function getAdminEmails() {
  const [rows] = await pool.query(
    "SELECT email FROM users WHERE role = 'admin' AND approved = 1",
  );
  return rows.map(r => r.email.toLowerCase());
}

async function getResourcePicEmail(resourceId) {
  const [rows] = await pool.query(
    `SELECT u.email FROM resources r INNER JOIN users u ON u.id = r.pic_user_id WHERE r.id = ?`,
    [resourceId],
  );
  return rows[0]?.email?.toLowerCase() || null;
}

async function getReminderRecipients(resourceId) {
  const emails = new Set(await getAdminEmails());
  const pic = await getResourcePicEmail(resourceId);
  if (pic) emails.add(pic);
  return [...emails];
}

async function reminderAlreadySent(careItemId, kind, dueDate, userEmail) {
  const [rows] = await pool.query(
    `SELECT id FROM resource_care_reminders
     WHERE care_item_id = ? AND reminder_kind = ? AND due_date = ? AND user_email = ?`,
    [careItemId, kind, dueDate, userEmail.toLowerCase()],
  );
  return rows.length > 0;
}

async function logReminder(careItemId, kind, dueDate, userEmail) {
  await pool.query(
    `INSERT IGNORE INTO resource_care_reminders (id, care_item_id, reminder_kind, due_date, user_email)
     VALUES (?, ?, ?, ?, ?)`,
    [randomUUID(), careItemId, kind, dueDate, userEmail.toLowerCase()],
  );
}

export async function applyTemplateToResource(resourceId, resourceType, { skipExisting = true } = {}) {
  const [templates] = await pool.query(
    'SELECT id FROM resource_type_care_templates WHERE resource_type = ?',
    [resourceType],
  );
  const template = templates[0];
  if (!template) return { applied: 0 };

  const [templateItems] = await pool.query(
    'SELECT * FROM resource_type_care_template_items WHERE template_id = ? ORDER BY sort_order ASC, label ASC',
    [template.id],
  );

  let applied = 0;
  for (const ti of templateItems) {
    if (skipExisting) {
      const [existing] = await pool.query(
        'SELECT id FROM resource_care_items WHERE resource_id = ? AND template_item_id = ?',
        [resourceId, ti.id],
      );
      if (existing.length) continue;
    }

    const id = randomUUID();
    const nextDue = computeNextDueAt({ ...ti, last_done_at: null });
    await pool.query(
      `INSERT INTO resource_care_items
        (id, resource_id, template_item_id, label, category, interval_type, interval_value,
         next_due_at, usage_at_last_done, remind_days_before, block_when_overdue, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id, resourceId, ti.id, ti.label, ti.category, ti.interval_type, ti.interval_value,
        nextDue, USAGE_INTERVALS.has(ti.interval_type) ? 0 : null,
        ti.remind_days_before, ti.block_when_overdue ? 1 : 0,
      ],
    );
    applied += 1;
  }

  return { applied };
}

export async function completeCareItem(careItemId, userId, {
  notes = '',
  usage_reading = null,
  next_due_at = null,
  proof_image_url = null,
} = {}) {
  const [rows] = await pool.query('SELECT * FROM resource_care_items WHERE id = ?', [careItemId]);
  const item = rows[0];
  if (!item) throw new Error('Care item not found');

  const proofUrl = (proof_image_url || '').trim();
  if (!proofUrl) throw new Error('Proof image is required to complete care');

  const [resources] = await pool.query('SELECT * FROM resources WHERE id = ?', [item.resource_id]);
  const resource = resources[0];
  if (!resource) throw new Error('Resource not found');

  const completedAt = new Date();
  let resolvedNextDue = next_due_at || null;

  if (item.interval_type === 'manual' && next_due_at) {
    resolvedNextDue = toDateStr(next_due_at);
  } else if (DATE_INTERVALS.has(item.interval_type) && item.interval_type !== 'manual') {
    resolvedNextDue = computeNextDueAt({ ...item, last_done_at: completedAt });
  }

  let usageAtLastDone = item.usage_at_last_done;
  if (item.interval_type === 'odometer') {
    const reading = usage_reading != null ? Number(usage_reading) : Number(resource.odometer_km || 0);
    usageAtLastDone = reading;
    if (usage_reading != null) {
      await pool.query('UPDATE resources SET odometer_km = ? WHERE id = ?', [reading, resource.id]);
    }
  } else if (USAGE_INTERVALS.has(item.interval_type)) {
    usageAtLastDone = await getCurrentUsage(item, resource);
  }

  await pool.query(
    `UPDATE resource_care_items
     SET last_done_at = ?, next_due_at = ?, usage_at_last_done = ?, updated_at = NOW()
     WHERE id = ?`,
    [completedAt, resolvedNextDue, usageAtLastDone, careItemId],
  );

  await pool.query(
    `INSERT INTO resource_care_completions
      (id, care_item_id, completed_at, completed_by_user_id, usage_reading, notes, proof_image_url, next_due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), careItemId, completedAt, userId || null, usage_reading, notes || '', proofUrl, resolvedNextDue],
  );

  await pool.query('DELETE FROM resource_care_reminders WHERE care_item_id = ?', [careItemId]);
  await syncResourceMaintenanceStatus(resource.id);

  const [updated] = await pool.query('SELECT * FROM resource_care_items WHERE id = ?', [careItemId]);
  return evaluateCareItem(updated[0], resource);
}

export async function syncResourceMaintenanceStatus(resourceId) {
  const [resources] = await pool.query('SELECT * FROM resources WHERE id = ?', [resourceId]);
  const resource = resources[0];
  if (!resource) return;

  const items = await getCareItemsForResource(resourceId, { activeOnly: true });
  const shouldBlock = items.some(i => i.block_when_overdue && i.status === 'overdue');

  if (shouldBlock && resource.status === 'active') {
    await pool.query("UPDATE resources SET status = 'maintenance' WHERE id = ?", [resourceId]);
  } else if (!shouldBlock && resource.status === 'maintenance') {
    const stillBlocking = items.some(i => i.block_when_overdue && i.status === 'overdue');
    if (!stillBlocking) {
      await pool.query("UPDATE resources SET status = 'active' WHERE id = ?", [resourceId]);
    }
  }
}

export async function assertResourceBookable(resourceId) {
  const [resources] = await pool.query('SELECT * FROM resources WHERE id = ?', [resourceId]);
  const resource = resources[0];
  if (!resource) throw new Error('Resource not found');
  if (resource.status === 'inactive') {
    throw new Error('This resource is inactive and cannot be booked.');
  }
  if (resource.status === 'maintenance') {
    throw new Error('This resource is under maintenance and cannot be booked.');
  }

  const items = await getCareItemsForResource(resourceId, { activeOnly: true });
  const blocking = items.filter(i => i.block_when_overdue && i.status === 'overdue');
  if (blocking.length) {
    const labels = blocking.map(i => i.label).join(', ');
    throw new Error(`Booking blocked: overdue upkeep required (${labels}).`);
  }
}

export async function processCareReminders() {
  const [items] = await pool.query(
    `SELECT ci.*, r.name AS resource_name, r.odometer_km, r.id AS resource_id
     FROM resource_care_items ci
     INNER JOIN resources r ON r.id = ci.resource_id
     WHERE ci.is_active = 1 AND r.status != 'inactive'`,
  );

  const today = new Date();
  let sent = 0;

  for (const row of items) {
    const resource = { id: row.resource_id, odometer_km: row.odometer_km };
    const evaluated = await evaluateCareItem(row, resource);
    if (evaluated.status === 'inactive' || evaluated.status === 'ok') continue;

    const kind = evaluated.status === 'overdue' ? 'overdue'
      : evaluated.status === 'due' ? 'due' : 'upcoming';

    const dueDate = evaluated.due_date || toDateStr(today);
    const recipients = await getReminderRecipients(row.resource_id);
    const link = `/care?status=${kind === 'overdue' ? 'overdue' : kind === 'due' ? 'due' : 'upcoming'}`;

    for (const email of recipients) {
      const already = await reminderAlreadySent(row.id, kind, dueDate, email);
      if (already) continue;

      const title = kind === 'overdue'
        ? `Overdue: ${evaluated.label}`
        : kind === 'due'
          ? `Due today: ${evaluated.label}`
          : `Upcoming: ${evaluated.label}`;

      const body = kind === 'overdue'
        ? `${evaluated.label} for ${row.resource_name} is overdue.`
        : kind === 'due'
          ? `${evaluated.label} for ${row.resource_name} is due today.`
          : `${evaluated.label} for ${row.resource_name} is due on ${dueDate}.`;

      await createNotification({
        userEmail: email,
        type: `care_${kind}`,
        title,
        body,
        link,
      });
      await logReminder(row.id, kind, dueDate, email);
      sent += 1;
    }
  }

  await enforceAutoBlock();
  return { sent };
}

export async function enforceAutoBlock() {
  const [items] = await pool.query(
    `SELECT DISTINCT ci.resource_id
     FROM resource_care_items ci
     INNER JOIN resources r ON r.id = ci.resource_id
     WHERE ci.is_active = 1 AND ci.block_when_overdue = 1 AND r.status = 'active'`,
  );

  for (const { resource_id } of items) {
    await syncResourceMaintenanceStatus(resource_id);
  }
}

export async function listTemplates() {
  const [templates] = await pool.query(
    'SELECT * FROM resource_type_care_templates ORDER BY resource_type ASC',
  );
  const [items] = await pool.query(
    'SELECT * FROM resource_type_care_template_items ORDER BY sort_order ASC, label ASC',
  );
  const itemsByTemplate = {};
  for (const item of items) {
    if (!itemsByTemplate[item.template_id]) itemsByTemplate[item.template_id] = [];
    itemsByTemplate[item.template_id].push(parseRow(item));
  }
  return templates.map(t => ({
    ...t,
    items: itemsByTemplate[t.id] || [],
  }));
}

export async function getCompletions(careItemId, limit = 20) {
  const [rows] = await pool.query(
    `SELECT c.*, u.full_name AS completed_by_name, u.email AS completed_by_email
     FROM resource_care_completions c
     LEFT JOIN users u ON u.id = c.completed_by_user_id
     WHERE c.care_item_id = ?
     ORDER BY c.completed_at DESC
     LIMIT ?`,
    [careItemId, limit],
  );
  return rows;
}

export async function getCareHistory(filters = {}) {
  const {
    resource_id: resourceId,
    resource_type: resourceType,
    category,
    search,
    limit = 100,
  } = filters;

  let sql = `
    SELECT c.*,
           ci.label AS care_item_label,
           ci.category AS care_item_category,
           r.id AS resource_id,
           r.name AS resource_name,
           r.resource_type,
           r.location AS resource_location,
           u.full_name AS completed_by_name,
           u.email AS completed_by_email
    FROM resource_care_completions c
    INNER JOIN resource_care_items ci ON ci.id = c.care_item_id
    INNER JOIN resources r ON r.id = ci.resource_id
    LEFT JOIN users u ON u.id = c.completed_by_user_id
    WHERE r.status != 'inactive'
  `;
  const params = [];

  if (resourceId && resourceId !== 'all') {
    sql += ' AND r.id = ?';
    params.push(resourceId);
  }
  if (resourceType && resourceType !== 'all') {
    sql += ' AND r.resource_type = ?';
    params.push(resourceType);
  }
  if (category && category !== 'all') {
    sql += ' AND ci.category = ?';
    params.push(category);
  }
  if (search?.trim()) {
    sql += ' AND (ci.label LIKE ? OR r.name LIKE ? OR r.resource_type LIKE ? OR r.location LIKE ? OR c.notes LIKE ?)';
    const q = `%${search.trim()}%`;
    params.push(q, q, q, q, q);
  }

  sql += ' ORDER BY c.completed_at DESC LIMIT ?';
  params.push(Math.min(Math.max(Number(limit) || 100, 1), 200));

  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getResourceCareHistory(resourceId, limit = 100) {
  return getCareHistory({ resource_id: resourceId, limit });
}

export { parseRow, toDateStr };
