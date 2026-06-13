import { Router } from 'express';
import pool from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);
    const { action, entity_type: entityType, actor_email: actorEmail } = req.query;

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }
    if (entityType) {
      sql += ' AND entity_type = ?';
      params.push(entityType);
    }
    if (actorEmail) {
      sql += ' AND actor_email = ?';
      params.push(String(actorEmail).toLowerCase());
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);

    let countSql = 'SELECT COUNT(*) AS total FROM audit_logs WHERE 1=1';
    const countParams = [];
    if (action) {
      countSql += ' AND action = ?';
      countParams.push(action);
    }
    if (entityType) {
      countSql += ' AND entity_type = ?';
      countParams.push(entityType);
    }
    if (actorEmail) {
      countSql += ' AND actor_email = ?';
      countParams.push(String(actorEmail).toLowerCase());
    }

    const [[{ total }]] = await pool.query(countSql, countParams);

    res.json({
      logs: rows.map(row => ({
        ...row,
        metadata: row.metadata
          ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
          : null,
      })),
      total: Number(total),
      limit,
      offset,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
