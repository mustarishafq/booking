import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const safeUser = ({ password_hash, ...u }) => u;

// GET /api/users — list all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
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
    const sets   = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(updates), req.params.id];
    await pool.query(`UPDATE users SET ${sets} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(safeUser(rows[0]));
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
    res.json(safeUser(rows[0]));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/users/:id/reject — reject (delete) a pending user (admin only)
router.post('/:id/reject', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ? AND approved = 0', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
