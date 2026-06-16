import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { writeAuditLog } from '../audit.js';
import {
  applyTemplateToResource,
  completeCareItem,
  evaluateCareItem,
  getCareItemsForResource,
  getCompletions,
  getGlobalCareSummary,
  getAllCareSchedules,
  getResourceCareHistory,
  getCareHistory,
  listTemplates,
  parseRow,
  computeNextDueAt,
  toDateStr,
} from '../resourceCare.js';

const router = Router();
router.use(requireAuth);

const BOOLEAN_FIELDS = new Set(['block_when_overdue', 'is_active']);

function serializeBody(body) {
  const result = { ...body };
  for (const f of BOOLEAN_FIELDS) {
    if (f in result) result[f] = result[f] ? 1 : 0;
  }
  if (result.next_due_at) result.next_due_at = toDateStr(result.next_due_at);
  return result;
}

async function getResourceOr404(id, res) {
  const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [id]);
  if (!rows[0]) {
    res.status(404).json({ message: 'Resource not found' });
    return null;
  }
  return rows[0];
}

// GET /history — all completions or filtered by resource
router.get('/history', async (req, res) => {
  try {
    const {
      resource_id: resourceId,
      resource_type: resourceType,
      category,
      search,
      limit,
    } = req.query;

    if (resourceId && resourceId !== 'all') {
      const resource = await getResourceOr404(resourceId, res);
      if (!resource) return;
    }

    const history = await getCareHistory({
      resource_id: resourceId,
      resource_type: resourceType,
      category,
      search,
      limit,
    });
    res.json(history);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /schedules — all care items across resources
router.get('/schedules', async (req, res) => {
  try {
    const { status, resource_type, category, search } = req.query;
    const schedules = await getAllCareSchedules({ status, resource_type, category, search });
    res.json(schedules);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /summary — dashboard counts
router.get('/summary', async (req, res) => {
  try {
    const summary = await getGlobalCareSummary();
    res.json(summary);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /items?resource_id=
router.get('/items', async (req, res) => {
  try {
    const { resource_id: resourceId } = req.query;
    if (!resourceId) return res.status(400).json({ message: 'resource_id is required' });

    const resource = await getResourceOr404(resourceId, res);
    if (!resource) return;

    const items = await getCareItemsForResource(resourceId);
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /items
router.post('/items', requireAdmin, async (req, res) => {
  try {
    const { resource_id: resourceId, ...rest } = req.body;
    if (!resourceId || !rest.label) {
      return res.status(400).json({ message: 'resource_id and label are required' });
    }

    const resource = await getResourceOr404(resourceId, res);
    if (!resource) return;

    const id = randomUUID();
    const data = serializeBody(rest);
    const nextDue = data.next_due_at || computeNextDueAt({ ...data, last_done_at: data.last_done_at || null });

    await pool.query(
      `INSERT INTO resource_care_items
        (id, resource_id, template_item_id, label, category, interval_type, interval_value,
         last_done_at, next_due_at, usage_at_last_done, remind_days_before, block_when_overdue, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, resourceId, data.template_item_id || null, data.label,
        data.category || 'preventive', data.interval_type || 'manual', data.interval_value || null,
        data.last_done_at || null, nextDue, data.usage_at_last_done ?? null,
        data.remind_days_before ?? 7, data.block_when_overdue ? 1 : 0,
        data.notes || null, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      ],
    );

    const [rows] = await pool.query('SELECT * FROM resource_care_items WHERE id = ?', [id]);
    const item = await evaluateCareItem(rows[0], resource);

    writeAuditLog({
      req,
      action: 'create',
      entityType: 'resource_care_items',
      entityId: id,
      summary: `Added care item "${data.label}" to ${resource.name}`,
    }).catch(() => {});

    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /items/:id
router.patch('/items/:id', requireAdmin, async (req, res) => {
  try {
    const [before] = await pool.query('SELECT * FROM resource_care_items WHERE id = ?', [req.params.id]);
    if (!before[0]) return res.status(404).json({ message: 'Care item not found' });

    const data = serializeBody(req.body);
    const allowed = [
      'label', 'category', 'interval_type', 'interval_value', 'last_done_at',
      'next_due_at', 'usage_at_last_done', 'remind_days_before', 'block_when_overdue', 'notes', 'is_active',
    ];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (key in data) {
        sets.push(`\`${key}\` = ?`);
        values.push(data[key]);
      }
    }
    if (!sets.length) return res.status(400).json({ message: 'No fields to update' });

    values.push(req.params.id);
    await pool.query(`UPDATE resource_care_items SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

    const [rows] = await pool.query('SELECT * FROM resource_care_items WHERE id = ?', [req.params.id]);
    const [resources] = await pool.query('SELECT * FROM resources WHERE id = ?', [rows[0].resource_id]);
    const item = await evaluateCareItem(rows[0], resources[0]);

    writeAuditLog({
      req,
      action: 'update',
      entityType: 'resource_care_items',
      entityId: req.params.id,
      summary: `Updated care item "${item.label}"`,
    }).catch(() => {});

    res.json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /items/:id
router.delete('/items/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM resource_care_items WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Care item not found' });

    await pool.query('DELETE FROM resource_care_items WHERE id = ?', [req.params.id]);

    writeAuditLog({
      req,
      action: 'delete',
      entityType: 'resource_care_items',
      entityId: req.params.id,
      summary: `Deleted care item "${rows[0].label}"`,
    }).catch(() => {});

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /items/:id/complete
router.post('/items/:id/complete', requireAdmin, async (req, res) => {
  try {
    if (!req.body?.proof_image_url?.trim()) {
      return res.status(400).json({ message: 'Proof image is required to complete care' });
    }
    const item = await completeCareItem(req.params.id, req.userId, req.body || {});
    res.json(item);
  } catch (e) {
    const status = e.message.includes('not found') ? 404
      : e.message.includes('Proof image') ? 400 : 500;
    res.status(status).json({ message: e.message });
  }
});

// GET /items/:id/completions
router.get('/items/:id/completions', async (req, res) => {
  try {
    const rows = await getCompletions(req.params.id);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /apply-template
router.post('/apply-template', requireAdmin, async (req, res) => {
  try {
    const { resource_id: resourceId, skip_existing: skipExisting = true } = req.body;
    if (!resourceId) return res.status(400).json({ message: 'resource_id is required' });

    const resource = await getResourceOr404(resourceId, res);
    if (!resource) return;

    const result = await applyTemplateToResource(resourceId, resource.resource_type, {
      skipExisting: skipExisting !== false,
    });

    writeAuditLog({
      req,
      action: 'update',
      entityType: 'resources',
      entityId: resourceId,
      summary: `Applied care template to ${resource.name} (${result.applied} items)`,
    }).catch(() => {});

    const items = await getCareItemsForResource(resourceId);
    res.json({ ...result, items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// --- Templates (admin) ---

router.get('/templates', async (req, res) => {
  try {
    res.json(await listTemplates());
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/templates', requireAdmin, async (req, res) => {
  try {
    const { resource_type: resourceType, description = '' } = req.body;
    if (!resourceType?.trim()) return res.status(400).json({ message: 'resource_type is required' });

    const id = randomUUID();
    await pool.query(
      'INSERT INTO resource_type_care_templates (id, resource_type, description) VALUES (?, ?, ?)',
      [id, resourceType.trim(), description],
    );
    const [rows] = await pool.query('SELECT * FROM resource_type_care_templates WHERE id = ?', [id]);
    res.status(201).json({ ...rows[0], items: [] });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A template for this resource type already exists' });
    }
    res.status(500).json({ message: e.message });
  }
});

router.patch('/templates/:id', requireAdmin, async (req, res) => {
  try {
    const { resource_type: resourceType, description } = req.body;
    const sets = [];
    const values = [];
    if (resourceType !== undefined) { sets.push('resource_type = ?'); values.push(resourceType.trim()); }
    if (description !== undefined) { sets.push('description = ?'); values.push(description); }
    if (!sets.length) return res.status(400).json({ message: 'No fields to update' });

    values.push(req.params.id);
    await pool.query(`UPDATE resource_type_care_templates SET ${sets.join(', ')} WHERE id = ?`, values);
    const templates = await listTemplates();
    const template = templates.find(t => t.id === req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/templates/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM resource_type_care_templates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/templates/:id/items', requireAdmin, async (req, res) => {
  try {
    const data = serializeBody(req.body);
    if (!data.label) return res.status(400).json({ message: 'label is required' });

    const id = randomUUID();
    await pool.query(
      `INSERT INTO resource_type_care_template_items
        (id, template_id, label, category, interval_type, interval_value, remind_days_before, block_when_overdue, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, req.params.id, data.label, data.category || 'preventive',
        data.interval_type || 'manual', data.interval_value || null,
        data.remind_days_before ?? 7, data.block_when_overdue ? 1 : 0,
        data.sort_order ?? 0,
      ],
    );
    const [rows] = await pool.query('SELECT * FROM resource_type_care_template_items WHERE id = ?', [id]);
    res.status(201).json(parseRow(rows[0]));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.patch('/template-items/:id', requireAdmin, async (req, res) => {
  try {
    const data = serializeBody(req.body);
    const allowed = [
      'label', 'category', 'interval_type', 'interval_value',
      'remind_days_before', 'block_when_overdue', 'sort_order',
    ];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (key in data) { sets.push(`\`${key}\` = ?`); values.push(data[key]); }
    }
    if (!sets.length) return res.status(400).json({ message: 'No fields to update' });

    values.push(req.params.id);
    await pool.query(`UPDATE resource_type_care_template_items SET ${sets.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM resource_type_care_template_items WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Template item not found' });
    res.json(parseRow(rows[0]));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/template-items/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM resource_type_care_template_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
