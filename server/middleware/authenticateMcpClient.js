import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { getMcpConfig } from '../config/mcp.js';
import { getEffectivePermissions } from '../permissions.js';
import { mcpError } from '../mcp/mcpResponse.js';

const JWT_SECRET = process.env.JWT_SECRET;

async function loadUserWithPermissions(userId) {
  const [rows] = await pool.query(`
    SELECT u.*, r.permissions AS role_permissions
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `, [userId]);

  if (!rows[0]) return null;

  const user = rows[0];
  const rp = user.role_permissions;
  const rolePermissions = !rp ? {} : typeof rp === 'string' ? JSON.parse(rp) : rp;
  user.permissions = getEffectivePermissions(user, rolePermissions);
  delete user.password_hash;
  delete user.role_permissions;
  return user;
}

/**
 * Authenticate MCP v1 requests via X-API-Key (server-to-server) or Bearer JWT (user context).
 */
export async function authenticateMcpClient(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  if (apiKey) {
    const { apiKeys } = await getMcpConfig();
    if (!apiKeys.length) {
      return mcpError(res, 'MCP API key authentication is not configured.', { status: 503 });
    }
    if (!apiKeys.includes(String(apiKey).trim())) {
      return mcpError(res, 'Invalid or missing credentials.', { status: 401 });
    }
    req.mcpAuth = { type: 'api_key', client: 'nexus-brain' };
    return next();
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await loadUserWithPermissions(payload.sub);
      if (!user) {
        return mcpError(res, 'Invalid or missing credentials.', { status: 401 });
      }
      if (!user.approved) {
        return mcpError(res, 'User account is not active.', { status: 403 });
      }
      req.mcpAuth = { type: 'bearer', client: user.email, user };
      req.userId = user.id;
      req.userEmail = user.email;
      req.userRole = user.role;
      req.userPermissions = user.permissions;
      return next();
    } catch {
      return mcpError(res, 'Invalid or missing credentials.', { status: 401 });
    }
  }

  return mcpError(res, 'Invalid or missing credentials.', { status: 401 });
}

/** Require admin role or API key (full server access). */
export function requireMcpAdmin(req, res, next) {
  if (req.mcpAuth?.type === 'api_key') return next();
  if (req.userRole === 'admin') return next();
  return mcpError(res, 'Admin access required.', { status: 403 });
}

/** Require a specific permission when using Bearer auth; API key bypasses checks. */
export function requireMcpPermission(permission) {
  return (req, res, next) => {
    if (req.mcpAuth?.type === 'api_key') return next();
    if (req.userRole === 'admin') return next();
    if (req.userPermissions?.[permission]) return next();
    return mcpError(res, 'Insufficient permissions.', { status: 403 });
  };
}
