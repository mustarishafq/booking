import { Router } from 'express';
import { randomUUID, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { verifyNexusJwt } from '../nexusJwt.js';
import { sanitizeSsoRedirect } from '../ssoRedirect.js';
import { rateLimit } from '../rateLimit.js';
import { getEffectivePermissions } from '../permissions.js';
import { writeAuditLog, slimRow, entitySummary } from '../audit.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const safeUser = ({ password_hash, ...u }) => u;

const makeToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

const DEFAULT_SSO_CONFIG = {
  enabled: false,
  secret: '',
  issuer: '',
  default_role: 'user',
  default_role_id: null,
};

async function getNexusSsoConfig() {
  const [rows] = await pool.query('SELECT `value` FROM settings WHERE `key` = ?', ['nexus_sso']);
  if (!rows[0]?.value) return { ...DEFAULT_SSO_CONFIG };
  try {
    return { ...DEFAULT_SSO_CONFIG, ...JSON.parse(rows[0].value) };
  } catch {
    return { ...DEFAULT_SSO_CONFIG };
  }
}

async function resolveDefaultRole(config) {
  if (config.default_role_id) {
    const [rows] = await pool.query('SELECT id FROM roles WHERE id = ?', [config.default_role_id]);
    if (rows[0]) return { role_id: rows[0].id, role: 'user' };
  }
  if (config.default_role) {
    const slug = String(config.default_role).toLowerCase();
    if (slug === 'admin') return { role_id: null, role: 'admin' };
    const [byName] = await pool.query(
      'SELECT id FROM roles WHERE LOWER(name) = ? LIMIT 1',
      [slug],
    );
    if (byName[0]) return { role_id: byName[0].id, role: 'user' };
  }
  return { role_id: null, role: 'user' };
}

async function enrichUser(user) {
  const [rows] = await pool.query(`
    SELECT u.*, r.permissions AS role_permissions, r.name AS role_name, r.color AS role_color
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `, [user.id]);
  if (!rows[0]) return safeUser(user);
  const enriched = safeUser(rows[0]);
  const rp = enriched.role_permissions;
  const rolePermissions = !rp ? {} : typeof rp === 'string' ? JSON.parse(rp) : rp;
  enriched.permissions = getEffectivePermissions(enriched, rolePermissions);
  delete enriched.role_permissions;
  return enriched;
}

// POST /api/sso/nexus/verify — validate Nexus JWT and issue local session token
router.post('/nexus/verify', async (req, res) => {
  try {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!rateLimit(`sso:${ip}`, { max: 10, windowMs: 60_000 })) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });

    const config = await getNexusSsoConfig();
    if (!config.enabled || !config.secret || config.secret.length < 32) {
      return res.status(422).json({ message: 'SSO is not configured.' });
    }

    let payload;
    try {
      payload = verifyNexusJwt(token, config.secret, config.issuer || null);
    } catch (e) {
      return res.status(e.status || 401).json({ message: e.message });
    }

    const nexusId = String(payload.sub);
    const email = payload.email.toLowerCase();
    const name = payload.name || payload.email;

    let user = null;

    const [bySso] = await pool.query('SELECT * FROM users WHERE nexus_sso_id = ?', [nexusId]);
    if (bySso[0]) {
      user = bySso[0];
    } else {
      const [byEmail] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (byEmail[0]) user = byEmail[0];
    }

    if (user) {
      if (!user.approved) {
        return res.status(403).json({ message: 'User account is not active.' });
      }
      await pool.query(
        'UPDATE users SET nexus_sso_id = ?, full_name = ?, email = ? WHERE id = ?',
        [nexusId, name, email, user.id],
      );
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
      user = rows[0];

      writeAuditLog({
        req,
        actorId: user.id,
        actorEmail: user.email,
        action: 'sso_login',
        entityType: 'users',
        entityId: user.id,
        summary: `SSO sign-in: ${entitySummary('users', user)}`,
        metadata: { nexus_sso_id: nexusId },
      }).catch(() => {});
    } else {
      const { role_id, role } = await resolveDefaultRole(config);
      const id = randomUUID();
      const hash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
      await pool.query(
        `INSERT INTO users (id, email, full_name, role, role_id, credit_balance_cents, password_hash, approved, nexus_sso_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, email, name, role, role_id, 0, hash, 1, nexusId],
      );
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      user = rows[0];

      writeAuditLog({
        req,
        actorId: user.id,
        actorEmail: user.email,
        action: 'sso_register',
        entityType: 'users',
        entityId: user.id,
        summary: `SSO user created: ${entitySummary('users', user)}`,
        metadata: { after: slimRow('users', user), nexus_sso_id: nexusId },
      }).catch(() => {});
    }

    const redirectTo = sanitizeSsoRedirect(
      req.body.redirect_to ?? payload.redirect_to,
      FRONTEND_URL,
    );

    const returnTo = String(req.body.return_to || payload.return_to || '').trim() || null;

    const enriched = await enrichUser(user);
    res.json({
      token: makeToken(user),
      user: enriched,
      redirect_to: redirectTo,
      return_to: returnTo,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
