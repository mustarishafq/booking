import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { writeAuditLog, slimRow, entitySummary } from '../audit.js';

const router = Router();

const safeUser = ({ password_hash, ...u }) => u;

// GET /api/users — list all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.*, r.name AS role_name, r.color AS role_color
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    res.json(rows.map(safeUser));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/users/:id — update a user (admin only)
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { password_hash, ...updates } = req.body;
    if (!Object.keys(updates).length) {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
      return res.json(safeUser(rows[0] || {}));
    }
    const [beforeRows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const before = beforeRows[0];
    const sets   = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(updates), req.params.id];
    await pool.query(`UPDATE users SET ${sets} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const after = rows[0];

    writeAuditLog({
      req,
      action: 'update',
      entityType: 'users',
      entityId: req.params.id,
      summary: `Updated user: ${entitySummary('users', after)}`,
      metadata: {
        before: slimRow('users', before),
        after: slimRow('users', after),
        changes: Object.keys(updates),
      },
    }).catch(() => {});

    res.json(safeUser(after));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/users/invite — create a user with a temporary password (admin only)
router.post('/invite', requireAdmin, async (req, res) => {
  try {
    const { email, role = 'user' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length) return res.status(409).json({ message: 'Email already registered' });

    const tempPassword = randomUUID().slice(0, 12);
    const hash         = await bcrypt.hash(tempPassword, 12);
    const id           = randomUUID();

    await pool.query(
      'INSERT INTO users (id, email, role, credit_balance_cents, password_hash, approved) VALUES (?, ?, ?, ?, ?, ?)',
      [id, email.toLowerCase(), role, 0, hash, 1],
    );

    writeAuditLog({
      req,
      action: 'invite',
      entityType: 'users',
      entityId: id,
      summary: `Invited user: ${email.toLowerCase()}`,
      metadata: { email: email.toLowerCase(), role },
    }).catch(() => {});

    res.status(201).json({
      email,
      tempPassword,
      message: 'User created. Share the temporary password with the user.',
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/users/:id/approve — approve a pending user (admin only)
router.post('/:id/approve', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE users SET approved = 1 WHERE id = ?', [req.params.id]);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);

    writeAuditLog({
      req,
      action: 'approve',
      entityType: 'users',
      entityId: req.params.id,
      summary: `Approved user: ${entitySummary('users', rows[0])}`,
      metadata: { after: slimRow('users', rows[0]) },
    }).catch(() => {});

    res.json(safeUser(rows[0]));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/users/:id/reject — reject (delete) a pending user (admin only)
router.post('/:id/reject', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? AND approved = 0', [req.params.id]);
    const before = rows[0];
    await pool.query('DELETE FROM users WHERE id = ? AND approved = 0', [req.params.id]);

    writeAuditLog({
      req,
      action: 'reject',
      entityType: 'users',
      entityId: req.params.id,
      summary: `Rejected pending user: ${entitySummary('users', before)}`,
      metadata: { before: slimRow('users', before) },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
