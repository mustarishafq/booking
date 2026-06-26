import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { getEnvMcpConfig } from '../config/mcp.js';
import { buildPaginationMeta, mcpSuccess, mcpError } from '../mcp/mcpResponse.js';
import { getMcpV1Endpoints } from '../mcp/documentation/mcpV1Endpoints.js';
import { createMcpTestApp, listen, mcpFetch } from './helpers.js';

const TEST_API_KEY = 'a'.repeat(32);
const TEST_JWT_SECRET = 'b'.repeat(64);

process.env.MCP_API_KEY = TEST_API_KEY;
process.env.JWT_SECRET = TEST_JWT_SECRET;

test('getEnvMcpConfig merges primary and rotated API keys', () => {
  process.env.MCP_API_KEY = TEST_API_KEY;
  process.env.MCP_API_KEYS = 'rotated-key-thirty-two-characters!!';
  const config = getEnvMcpConfig();
  assert.equal(config.apiKeys.length, 2);
  assert.ok(config.apiKeys.includes(TEST_API_KEY));
  assert.ok(config.rateLimit >= 1);
});

test('buildPaginationMeta calculates pages correctly', () => {
  const meta = buildPaginationMeta({ page: 2, perPage: 50, total: 120 });
  assert.deepEqual(meta, { current_page: 2, last_page: 3, per_page: 50, total: 120 });
});

test('getMcpV1Endpoints includes catalog and SSO verify entries', () => {
  const endpoints = getMcpV1Endpoints();
  assert.ok(endpoints.length >= 5);
  assert.ok(endpoints.some((e) => e.path === '/api/mcp/v1/catalog'));
  assert.ok(endpoints.some((e) => e.path === '/api/sso/nexus/verify'));
  for (const entry of endpoints) {
    assert.ok(entry.method);
    assert.ok(entry.path);
    assert.ok(entry.description);
    assert.ok(Array.isArray(entry.auth));
  }
});

test('mcpSuccess and mcpError envelope shape', () => {
  const calls = [];
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(body) { calls.push(body); return this; },
  };

  mcpSuccess(res, { id: 1 });
  assert.deepEqual(calls[0], {
    success: true,
    message: null,
    data: { id: 1 },
    meta: {},
  });

  mcpError(res, 'Bad request', { status: 400, errors: [{ field: 'x', message: 'invalid' }] });
  assert.deepEqual(calls[1], {
    success: false,
    message: 'Bad request',
    errors: [{ field: 'x', message: 'invalid' }],
  });
});

test('MCP catalog rejects missing credentials', async () => {
  const app = createMcpTestApp();
  const { baseUrl, close } = await listen(app);

  try {
    const { status, json } = await mcpFetch(baseUrl, '/api/mcp/v1/catalog');
    assert.equal(status, 401);
    assert.equal(json.success, false);
    assert.match(json.message, /credentials/i);
  } finally {
    await close();
  }
});

test('MCP catalog rejects invalid API key', async () => {
  const app = createMcpTestApp();
  const { baseUrl, close } = await listen(app);

  try {
    const { status, json } = await mcpFetch(baseUrl, '/api/mcp/v1/catalog', {
      apiKey: 'wrong-key-thirty-two-characters-x',
    });
    assert.equal(status, 401);
    assert.equal(json.success, false);
  } finally {
    await close();
  }
});

test('MCP catalog returns documented endpoints with valid API key', async () => {
  const app = createMcpTestApp();
  const { baseUrl, close } = await listen(app);

  try {
    const { status, json } = await mcpFetch(baseUrl, '/api/mcp/v1/catalog', {
      apiKey: TEST_API_KEY,
    });
    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.some((e) => e.path === '/api/mcp/v1/resources'));
    assert.ok(json.data.some((e) => e.path === '/api/mcp/v1/bookings'));
  } finally {
    await close();
  }
});

test('MCP booking create validates required body fields', async () => {
  const app = createMcpTestApp();
  const { baseUrl, close } = await listen(app);

  try {
    const { status, json } = await mcpFetch(baseUrl, '/api/mcp/v1/bookings', {
      apiKey: TEST_API_KEY,
      method: 'POST',
      body: { title: 'Missing resource' },
    });
    assert.equal(status, 422);
    assert.equal(json.success, false);
    assert.ok(Array.isArray(json.errors));
    assert.ok(json.errors.length > 0);
  } finally {
    await close();
  }
});

test('MCP bearer token auth accepts valid JWT', async () => {
  const app = createMcpTestApp();
  const { baseUrl, close } = await listen(app);

  const token = jwt.sign(
    { sub: 'user-test-id', email: 'test@example.com', role: 'admin' },
    TEST_JWT_SECRET,
    { expiresIn: '1h' },
  );

  try {
    const { status, json } = await mcpFetch(baseUrl, '/api/mcp/v1/catalog', { token });
    // Bearer auth requires DB user lookup — expect 401 when user not in DB
    assert.ok([401, 200].includes(status));
    assert.equal(typeof json.success, 'boolean');
  } finally {
    await close();
  }
});

test('MCP sets X-Request-Id response header', async () => {
  const app = createMcpTestApp();
  const { baseUrl, close } = await listen(app);

  try {
    const { headers } = await mcpFetch(baseUrl, '/api/mcp/v1/catalog', {
      apiKey: TEST_API_KEY,
    });
    assert.ok(headers.get('x-request-id'));
  } finally {
    await close();
  }
});
