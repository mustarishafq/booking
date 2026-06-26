import express from 'express';
import mcpRouter from '../routes/mcp/index.js';

export function createMcpTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/mcp', mcpRouter);
  return app;
}

export function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

export async function mcpFetch(baseUrl, path, { apiKey, token, method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...headers,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, json, headers: res.headers };
}
