import { Router } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { writeAuditLog, slimRow, entitySummary } from '../audit.js';

const router = Router();

const safeUser = ({ password_hash, ...u }) => u;

async function createUserRecord({
  email,
  full_name = '',
  password,
  role = 'user',
  user_type = 'external',
  role_id = null,
  credit_balance_cents = 0,
  approved = 1,
  generatePassword = false,
}) {
  if (!email) {
    const err = new Error('Email required');
    err.status = 400;
    throw err;
  }
  if (!['user', 'admin'].includes(role)) {
    const err = new Error('Invalid role');
    err.status = 400;
    throw err;
  }
  if (!['internal', 'external'].includes(user_type)) {
    const err = new Error('Invalid user type');
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing.length) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  let plainPassword = password;
  let tempPassword = null;
  if (generatePassword || !plainPassword) {
    plainPassword = randomUUID().slice(0, 12);
    tempPassword = plainPassword;
  } else if (plainPassword.length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.status = 400;
    throw err;
  }

  if (role_id) {
    const [roleRows] = await pool.query('SELECT id FROM roles WHERE id = ?', [role_id]);
    if (!roleRows.length) {
      const err = new Error('Invalid custom role');
      err.status = 400;
      throw err;
    }
  }

  const credits = user_type === 'internal'
    ? 0
    : Math.max(0, Number.parseInt(credit_balance_cents, 10) || 0);

  const hash = await bcrypt.hash(plainPassword, 12);
  const id = randomUUID();

  await pool.query(
    `INSERT INTO users (id, email, full_name, role, role_id, user_type, credit_balance_cents, password_hash, approved)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      normalizedEmail,
      (full_name || '').trim(),
      role,
      role_id || null,
      user_type,
      credits,
      hash,
      approved ? 1 : 0,
    ],
  );

  if (credits > 0) {
    await pool.query(
      `INSERT INTO transactions (id, user_email, type, amount_cents, balance_after_cents, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        normalizedEmail,
        'admin_adjustment',
        credits,
        credits,
        'Initial credit balance on account creation',
      ],
    );
  }

  const [rows] = await pool.query(`
    SELECT u.*, r.name AS role_name, r.color AS role_color
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `, [id]);

  return { user: rows[0], tempPassword };
}

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

// POST /api/users — create a user (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      email,
      full_name,
      password,
      role,
      user_type,
      role_id,
      credit_balance_cents,
      approved,
      generate_password,
    } = req.body;

    const { user, tempPassword } = await createUserRecord({
      email,
      full_name,
      password,
      role,
      user_type,
      role_id,
      credit_balance_cents,
      approved: approved === undefined ? 1 : (approved ? 1 : 0),
      generatePassword: !!generate_password,
    });

    writeAuditLog({
      req,
      action: 'create',
      entityType: 'users',
      entityId: user.id,
      summary: `Created user: ${entitySummary('users', user)}`,
      metadata: {
        after: slimRow('users', user),
        email: user.email,
        role: user.role,
        user_type: user.user_type,
        approved: !!user.approved,
      },
    }).catch(() => {});

    res.status(201).json({
      user: safeUser(user),
      ...(tempPassword ? { tempPassword } : {}),
      message: tempPassword
        ? 'User created. Share the temporary password with the user.'
        : !user.approved
          ? 'User created and pending admin approval.'
          : 'User created successfully.',
    });
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
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
    const { user, tempPassword } = await createUserRecord({
      email,
      role,
      approved: 1,
      generatePassword: true,
    });

    writeAuditLog({
      req,
      action: 'invite',
      entityType: 'users',
      entityId: user.id,
      summary: `Invited user: ${user.email}`,
      metadata: { email: user.email, role: user.role },
    }).catch(() => {});

    res.status(201).json({
      email: user.email,
      tempPassword,
      user: safeUser(user),
      message: 'User created. Share the temporary password with the user.',
    });
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
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
