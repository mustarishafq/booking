import { Router } from 'express';
import { randomUUID, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../emailer.js';
import { getEffectivePermissions } from '../permissions.js';
import { writeAuditLog, slimRow, entitySummary } from '../audit.js';

const router = Router();
const JWT_SECRET   = process.env.JWT_SECRET;
const JWT_EXPIRES  = process.env.JWT_EXPIRES_IN || '7d';

const makeToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

const safeUser = ({ password_hash, ...u }) => u;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.approved) return res.status(403).json({ message: 'Your account is pending admin approval.', code: 'pending_approval' });

    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const id = randomUUID();
    await pool.query(
      'INSERT INTO users (id, email, full_name, role, credit_balance_cents, password_hash, approved) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, email.toLowerCase(), full_name || '', 'user', 0, hash, 0],
    );

    writeAuditLog({
      req,
      actorId: id,
      actorEmail: email.toLowerCase(),
      action: 'register',
      entityType: 'users',
      entityId: id,
      summary: `Registered user: ${email.toLowerCase()}`,
      metadata: { email: email.toLowerCase(), full_name: full_name || '' },
    }).catch(() => {});

    res.status(201).json({ pending: true, message: 'Account created. Please wait for an admin to approve your account before signing in.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.*, r.permissions AS role_permissions, r.name AS role_name, r.color AS role_color
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [req.userId]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    const user = safeUser(rows[0]);
    const rp = user.role_permissions;
    const rolePermissions = !rp ? {} : typeof rp === 'string' ? JSON.parse(rp) : rp;
    user.permissions = getEffectivePermissions(user, rolePermissions);
    delete user.role_permissions;
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req, res) => {
  try {
    // Strip fields that must not be changed via this endpoint
    const { password_hash, id, email, role, new_password, ...updates } = req.body;

    // Handle password change
    if (new_password) {
      if (new_password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
      updates.password_hash = await bcrypt.hash(new_password, 12);
    }

    if (!Object.keys(updates).length) {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
      return res.json(safeUser(rows[0]));
    }
    const [beforeRows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    const before = beforeRows[0];
    const sets   = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(updates), req.userId];
    await pool.query(`UPDATE users SET ${sets} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    const after = rows[0];

    writeAuditLog({
      req,
      action: new_password ? 'password_change' : 'update',
      entityType: 'users',
      entityId: req.userId,
      summary: new_password
        ? `Changed password for ${entitySummary('users', after)}`
        : `Updated profile: ${entitySummary('users', after)}`,
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    // Always return success to prevent email enumeration
    if (!rows[0]) return res.json({ ok: true });

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, rows[0].id]);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(rows[0].email, rows[0].full_name, resetLink);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token],
    );
    if (!rows[0]) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hash, rows[0].id],
    );

    writeAuditLog({
      req,
      actorId: rows[0].id,
      actorEmail: rows[0].email,
      action: 'password_reset',
      entityType: 'users',
      entityId: rows[0].id,
      summary: `Password reset for ${rows[0].email}`,
    }).catch(() => {});

    res.json({ ok: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
