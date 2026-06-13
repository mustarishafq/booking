import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendBookingRejected, sendBookingCancelled, sendBookingSubmitted } from '../emailer.js';
import { waBookingSubmitted, waBookingRejected, waBookingCancelled } from '../whatsapp.js';
import { notifyBookingSubmitted, notifyBookingStatusChange } from '../notifications.js';
import {
  sendBookingWebhook,
} from '../webhooks.js';
import { writeAuditLog, slimRow, entitySummary } from '../audit.js';

// Fields that are stored as JSON strings in MySQL
const JSON_FIELDS = {
  resources: ['amenities'],
  rooms:     ['amenities'],
};

// Fields stored as TINYINT(1) that should be exposed as booleans
const BOOLEAN_FIELDS = {
  bookings:  ['is_recurring'],
  resources: ['requires_approval'],
};

const COLUMN_ALIASES = { created_date: 'created_at' };

const parseRow = (table, row) => {
  if (!row) return row;
  const result = { ...row };

  for (const f of JSON_FIELDS[table] || []) {
    if (result[f] && typeof result[f] === 'string') {
      try { result[f] = JSON.parse(result[f]); } catch { result[f] = []; }
    }
  }

  for (const f of BOOLEAN_FIELDS[table] || []) {
    if (f in result) result[f] = !!result[f];
  }

  return result;
};

// Convert ISO 8601 datetime string to MySQL DATETIME format
const toMySQLDatetime = (val) => {
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

const DATETIME_FIELDS = {
  bookings: ['start_time', 'end_time'],
};

const serializeInput = (table, data) => {
  const result = { ...data };

  for (const f of JSON_FIELDS[table] || []) {
    if (f in result && typeof result[f] !== 'string') {
      result[f] = JSON.stringify(result[f]);
    }
  }

  for (const f of DATETIME_FIELDS[table] || []) {
    if (result[f] && typeof result[f] === 'string') {
      result[f] = toMySQLDatetime(result[f]);
    }
  }

  return result;
};

const mapCol = (col) => COLUMN_ALIASES[col] || col;

const enrichResourceRows = async (rows) => {
  const parsed = rows.map(r => parseRow('resources', r));
  const userIds = [...new Set(parsed.map(r => r.pic_user_id).filter(Boolean))];

  let userById = {};
  if (userIds.length) {
    const placeholders = userIds.map(() => '?').join(', ');
    const [users] = await pool.query(
      `SELECT id, email, full_name FROM users WHERE id IN (${placeholders})`,
      userIds,
    );
    userById = Object.fromEntries(users.map(u => [u.id, u]));
  }

  return parsed.map(r => {
    const pic = r.pic_user_id ? userById[r.pic_user_id] : null;
    const pic_name = (pic?.full_name || '').trim() || null;
    return {
      ...r,
      pic_email: pic?.email || null,
      pic_name,
    };
  });
};

export const createEntityRouter = (table) => {
  const router = Router();
  router.use(requireAuth);

  // GET / — list
  router.get('/', async (req, res) => {
    try {
      const { orderBy, limit } = req.query;
      let sql = `SELECT * FROM \`${table}\``;
      const params = [];

      if (orderBy) {
        const ascending = !orderBy.startsWith('-');
        const col = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy;
        sql += ` ORDER BY \`${mapCol(col)}\` ${ascending ? 'ASC' : 'DESC'}`;
      }

      if (limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(limit));
      }

      const [rows] = await pool.query(sql, params);
      if (table === 'resources') {
        return res.json(await enrichResourceRows(rows));
      }
      res.json(rows.map(r => parseRow(table, r)));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // POST /bulk — bulk insert (must be above /:id)
  router.post('/bulk', async (req, res) => {
    try {
      const records = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: 'Expected a non-empty array' });
      }

      // Determine columns from first record + mandatory columns
      const baseKeys  = Object.keys(records[0]);
      const extraKeys = ['id', 'created_at'];
      const uniqueKeys = [...new Set([...extraKeys, ...baseKeys])];

      const rowValues = records.map(r => {
        const data = serializeInput(table, { ...r, id: randomUUID(), created_at: new Date() });
        return uniqueKeys.map(k => (k in data ? data[k] : null));
      });

      const cols  = uniqueKeys.map(k => `\`${k}\``).join(', ');
      const ph    = rowValues.map(() => `(${uniqueKeys.map(() => '?').join(', ')})`).join(', ');
      await pool.query(`INSERT INTO \`${table}\` (${cols}) VALUES ${ph}`, rowValues.flat());

      if (table === 'bookings' && records[0]?.booked_by_email) {
        const booking = records[0];
        sendBookingSubmitted(booking).catch(() => {});
        waBookingSubmitted(booking).catch(() => {});
        notifyBookingSubmitted(booking).catch(() => {});
        sendBookingWebhook('notify_webhook_submitted', 'booking.submitted', booking).catch(() => {});
        if (booking.status === 'confirmed') {
          sendBookingWebhook('notify_webhook_confirmed', 'booking.confirmed', booking).catch(() => {});
        }
      }

      writeAuditLog({
        req,
        action: 'bulk_create',
        entityType: table,
        summary: `Bulk created ${records.length} ${table}`,
        metadata: {
          count: records.length,
          sample: records.slice(0, 3).map(r => slimRow(table, r)),
        },
      }).catch(() => {});

      res.status(201).json({ count: records.length });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // POST / — create single
  router.post('/', async (req, res) => {
    try {
      const raw  = serializeInput(table, { ...req.body, id: randomUUID(), created_at: new Date() });
      const cols = Object.keys(raw).map(k => `\`${k}\``).join(', ');
      const ph   = Object.keys(raw).map(() => '?').join(', ');
      await pool.query(`INSERT INTO \`${table}\` (${cols}) VALUES (${ph})`, Object.values(raw));
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [raw.id]);
      const created = parseRow(table, rows[0]);

      writeAuditLog({
        req,
        action: 'create',
        entityType: table,
        entityId: raw.id,
        summary: `Created ${table.slice(0, -1)}: ${entitySummary(table, created)}`,
        metadata: { after: slimRow(table, created) },
      }).catch(() => {});

      if (table === 'resources') {
        const [enriched] = await enrichResourceRows(rows);
        return res.status(201).json(enriched);
      }
      res.status(201).json(created);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // GET /:id
  router.get('/:id', async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ message: 'Not found' });
      if (table === 'resources') {
        const [enriched] = await enrichResourceRows(rows);
        return res.json(enriched);
      }
      res.json(parseRow(table, rows[0]));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // PATCH /:id
  router.patch('/:id', async (req, res) => {
    try {
      // Fetch old row before update (for email triggers)
      const [before] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      const oldRow = before[0];

      const data   = serializeInput(table, req.body);
      const sets   = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
      const values = [...Object.values(data), req.params.id];
      await pool.query(`UPDATE \`${table}\` SET ${sets} WHERE id = ?`, values);
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      let updated = parseRow(table, rows[0]);

      if (table === 'resources') {
        [updated] = await enrichResourceRows(rows);
      }

      // Fire notifications on booking status changes
      if (table === 'bookings' && oldRow && data.status && data.status !== oldRow.status) {
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

      writeAuditLog({
        req,
        action: 'update',
        entityType: table,
        entityId: req.params.id,
        summary: `Updated ${table.slice(0, -1)}: ${entitySummary(table, updated)}`,
        metadata: {
          before: slimRow(table, parseRow(table, oldRow)),
          after: slimRow(table, updated),
          changes: Object.keys(data),
        },
      }).catch(() => {});

      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  // DELETE /:id
  router.delete('/:id', async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ message: 'Not found' });
      const before = parseRow(table, rows[0]);

      await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);

      writeAuditLog({
        req,
        action: 'delete',
        entityType: table,
        entityId: req.params.id,
        summary: `Deleted ${table.slice(0, -1)}: ${entitySummary(table, before)}`,
        metadata: { before: slimRow(table, before) },
      }).catch(() => {});

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });

  return router;
};
