import { Router } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { writeAuditLog, slimRow, entitySummary } from '../audit.js';

const router = Router();

const parsePermissions = (p) => {
  if (!p) return {};
  if (typeof p === 'string') return JSON.parse(p);
  return p;
};
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles ORDER BY name ASC');
    res.json(rows.map(r => ({ ...r, permissions: parsePermissions(r.permissions) })));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/roles — create a role
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description = '', color = 'slate', permissions = {} } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Role name is required' });

    const id = randomUUID();
    await pool.query(
      'INSERT INTO roles (id, name, description, color, permissions) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), description, color, JSON.stringify(permissions)],
    );
    const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    const role = rows[0];

    writeAuditLog({
      req,
      action: 'create',
      entityType: 'roles',
      entityId: id,
      summary: `Created role: ${entitySummary('roles', role)}`,
      metadata: { after: { id, name: name.trim(), color, description } },
    }).catch(() => {});

    res.status(201).json({ ...role, permissions: parsePermissions(role.permissions) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A role with this name already exists' });
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/roles/:id — update a role
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description, color, permissions } = req.body;
    const sets = [];
    const values = [];
    if (name !== undefined) { sets.push('`name` = ?'); values.push(name.trim()); }
    if (description !== undefined) { sets.push('`description` = ?'); values.push(description); }
    if (color !== undefined) { sets.push('`color` = ?'); values.push(color); }
    if (permissions !== undefined) { sets.push('`permissions` = ?'); values.push(JSON.stringify(permissions)); }
    if (!sets.length) return res.status(400).json({ message: 'Nothing to update' });
    const [beforeRows] = await pool.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    const before = beforeRows[0];
    if (!before) return res.status(404).json({ message: 'Role not found' });
    values.push(req.params.id);
    await pool.query(`UPDATE roles SET ${sets.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    const role = rows[0];

    writeAuditLog({
      req,
      action: 'update',
      entityType: 'roles',
      entityId: req.params.id,
      summary: `Updated role: ${entitySummary('roles', role)}`,
      metadata: {
        before: { id: before.id, name: before.name },
        after: { id: role.id, name: role.name },
        changes: Object.keys(req.body).filter(k => req.body[k] !== undefined),
      },
    }).catch(() => {});

    res.json({ ...role, permissions: parsePermissions(role.permissions) });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A role with this name already exists' });
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/roles/:id — delete a role (unsets role_id on users first)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    const before = rows[0];
    await pool.query('UPDATE users SET role_id = NULL WHERE role_id = ?', [req.params.id]);
    await pool.query('DELETE FROM roles WHERE id = ?', [req.params.id]);

    writeAuditLog({
      req,
      action: 'delete',
      entityType: 'roles',
      entityId: req.params.id,
      summary: `Deleted role: ${entitySummary('roles', before)}`,
      metadata: { before: before ? { id: before.id, name: before.name } : null },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
