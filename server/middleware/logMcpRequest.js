import { randomUUID } from 'crypto';

/**
 * Log every MCP v1 request with endpoint, client, request ID, duration, and status.
 */
export function logMcpRequest(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.mcpRequestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const started = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    const client = req.mcpAuth?.client || 'unknown';
    console.log(
      `[mcp] ${requestId} ${req.method} ${req.originalUrl} client=${client} status=${res.statusCode} duration=${durationMs.toFixed(1)}ms`,
    );
  });

  next();
}
