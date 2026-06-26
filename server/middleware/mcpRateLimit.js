import { getMcpConfig } from '../config/mcp.js';
import { rateLimit } from '../rateLimit.js';
import { mcpError } from '../mcp/mcpResponse.js';

/**
 * Rate-limit MCP v1 routes per client IP + auth type.
 */
export async function mcpRateLimit(req, res, next) {
  const { rateLimit: max, rateLimitWindowMs } = await getMcpConfig();
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const authHint = req.headers['x-api-key'] ? 'key' : 'bearer';
  const key = `mcp:${ip}:${authHint}`;

  if (!rateLimit(key, { max, windowMs: rateLimitWindowMs })) {
    return mcpError(res, 'Too many requests. Please try again later.', { status: 429 });
  }

  next();
}
