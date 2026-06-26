import { Router } from 'express';
import { authenticateMcpClient } from '../../middleware/authenticateMcpClient.js';
import { logMcpRequest } from '../../middleware/logMcpRequest.js';
import { mcpRateLimit } from '../../middleware/mcpRateLimit.js';
import { mcpError } from '../../mcp/mcpResponse.js';
import v1Router from './v1.js';

const router = Router();

router.use(logMcpRequest);
router.use(mcpRateLimit);
router.use(authenticateMcpClient);

router.use('/v1', v1Router);

router.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  console.error(`[mcp] ${req.mcpRequestId || '-'} error: ${err.message}`);
  return mcpError(res, err.message || 'Internal server error.', {
    status,
    errors: err.errors || [],
  });
});

export default router;
