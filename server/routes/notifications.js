import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const [userRows] = await pool.query('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!userRows[0]) return res.status(404).json({ message: 'User not found' });

    const [rows] = await pool.query(
      `SELECT id, type, title, body, link, read_at, created_at
       FROM notifications
       WHERE user_email = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userRows[0].email.toLowerCase()],
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const [userRows] = await pool.query('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!userRows[0]) return res.status(404).json({ message: 'User not found' });

    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_email = ? AND read_at IS NULL',
      [userRows[0].email.toLowerCase()],
    );
    res.json({ count: rows[0].count });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  try {
    const [userRows] = await pool.query('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!userRows[0]) return res.status(404).json({ message: 'User not found' });

    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE user_email = ? AND read_at IS NULL',
      [userRows[0].email.toLowerCase()],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const [userRows] = await pool.query('SELECT email FROM users WHERE id = ?', [req.userId]);
    if (!userRows[0]) return res.status(404).json({ message: 'User not found' });

    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_email = ?',
      [req.params.id, userRows[0].email.toLowerCase()],
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
