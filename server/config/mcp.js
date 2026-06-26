/**
 * MCP API Layer configuration (EMZI Nexus Brain integration).
 * Keys may come from environment variables and/or admin Settings UI (database).
 */

import pool from '../db.js';

const DEFAULT_RATE_LIMIT = 60;
const CACHE_TTL_MS = 30_000;

let cachedConfig = null;
let cacheExpiresAt = 0;

export function invalidateMcpConfigCache() {
  cachedConfig = null;
  cacheExpiresAt = 0;
}

/** Environment-only config (sync). Used in tests and as fallback layer. */
export function getEnvMcpConfig() {
  const primaryKey = (process.env.MCP_API_KEY || '').trim();
  const rotated = (process.env.MCP_API_KEYS || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const apiKeys = [...new Set([primaryKey, ...rotated].filter(Boolean))];

  return {
    apiKeys,
    rateLimit: Math.max(
      1,
      parseInt(process.env.MCP_RATE_LIMIT || String(DEFAULT_RATE_LIMIT), 10) || DEFAULT_RATE_LIMIT,
    ),
    rateLimitWindowMs: 60_000,
    envKeyConfigured: apiKeys.some((k) => k.length >= 32),
  };
}

function parseMcpApiSettings(raw) {
  if (!raw) return { api_key: '', rate_limit: DEFAULT_RATE_LIMIT };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      api_key: (parsed.api_key || '').trim(),
      rate_limit: Math.max(
        1,
        parseInt(parsed.rate_limit, 10) || DEFAULT_RATE_LIMIT,
      ),
    };
  } catch {
    return { api_key: '', rate_limit: DEFAULT_RATE_LIMIT };
  }
}

async function loadDbMcpSettings() {
  try {
    const [rows] = await pool.query('SELECT `value` FROM settings WHERE `key` = ?', ['mcp_api']);
    return parseMcpApiSettings(rows[0]?.value);
  } catch {
    return { api_key: '', rate_limit: DEFAULT_RATE_LIMIT };
  }
}

function mergeMcpConfig(envConfig, dbSettings) {
  const apiKeys = [...new Set([
    ...envConfig.apiKeys,
    ...(dbSettings.api_key ? [dbSettings.api_key] : []),
  ].filter((k) => k.length >= 32))];

  const dbRate = dbSettings.rate_limit;
  const useDbRate = dbSettings.api_key || !envConfig.envKeyConfigured;

  return {
    apiKeys,
    rateLimit: useDbRate ? dbRate : envConfig.rateLimit,
    rateLimitWindowMs: envConfig.rateLimitWindowMs,
    envKeyConfigured: envConfig.envKeyConfigured,
    dbKeyConfigured: dbSettings.api_key.length >= 32,
  };
}

/** Resolved MCP config (env + database settings). */
export async function getMcpConfig() {
  if (cachedConfig && Date.now() < cacheExpiresAt) {
    return cachedConfig;
  }

  const envConfig = getEnvMcpConfig();
  const dbSettings = await loadDbMcpSettings();
  cachedConfig = mergeMcpConfig(envConfig, dbSettings);
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedConfig;
}

export function isMcpConfigured(config) {
  return config.apiKeys.some((k) => k.length >= 32);
}

export { parseMcpApiSettings, DEFAULT_RATE_LIMIT };
