import { Router } from 'express';
import { mcpSuccess, mcpPaginated, mcpError, parsePagination } from '../../mcp/mcpResponse.js';
import { validate } from '../../mcp/validation/validate.js';
import {
  requireMcpAdmin,
  requireMcpPermission,
} from '../../middleware/authenticateMcpClient.js';
import {
  resourceListSchema,
  bookingListSchema,
  transactionListSchema,
  roomListSchema,
  careScheduleListSchema,
  idParamSchema,
  createBookingSchema,
  updateBookingSchema,
  createResourceSchema,
  updateResourceSchema,
  createRoomSchema,
  updateRoomSchema,
} from '../../mcp/validation/schemas.js';
import * as mcp from '../../services/mcp/index.js';
import { getMcpV1Endpoints } from '../../mcp/documentation/mcpV1Endpoints.js';

const router = Router();

router.get('/catalog', (_req, res) => {
  return mcpSuccess(res, getMcpV1Endpoints());
});

router.get('/metadata', async (_req, res, next) => {
  try {
    const data = await mcp.getMetadata();
    return mcpSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

router.get(
  '/resources',
  requireMcpPermission('view_resources'),
  validate(resourceListSchema, 'query'),
  async (req, res, next) => {
    try {
      const pagination = parsePagination(req.validated.query);
      const result = await mcp.listResources({ ...req.validated.query, ...pagination });
      return mcpPaginated(res, result.data, result.meta);
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/resources/:id',
  requireMcpPermission('view_resources'),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const resource = await mcp.getResource(req.validated.params.id);
      if (!resource) return mcpError(res, 'Resource not found.', { status: 404 });
      return mcpSuccess(res, resource);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/resources',
  requireMcpAdmin,
  validate(createResourceSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await mcp.createResource(req.validated.body, req);
      return mcpSuccess(res, created, { status: 201 });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/resources/:id',
  requireMcpAdmin,
  validate(idParamSchema, 'params'),
  validate(updateResourceSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await mcp.updateResource(req.validated.params.id, req.validated.body, req);
      if (!updated) return mcpError(res, 'Resource not found.', { status: 404 });
      return mcpSuccess(res, updated);
    } catch (e) {
      next(e);
    }
  },
);

router.delete(
  '/resources/:id',
  requireMcpAdmin,
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const deleted = await mcp.deleteResource(req.validated.params.id, req);
      if (!deleted) return mcpError(res, 'Resource not found.', { status: 404 });
      return mcpSuccess(res, { deleted: true });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/bookings',
  requireMcpPermission('view_calendar'),
  validate(bookingListSchema, 'query'),
  async (req, res, next) => {
    try {
      const pagination = parsePagination(req.validated.query);
      const ctx = mcp.authContext(req);
      const result = await mcp.listBookings({ ...req.validated.query, ...pagination }, ctx);
      return mcpPaginated(res, result.data, result.meta);
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/bookings/:id',
  requireMcpPermission('view_calendar'),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const ctx = mcp.authContext(req);
      const booking = await mcp.getBooking(req.validated.params.id, ctx);
      if (booking === 'forbidden') return mcpError(res, 'Insufficient permissions.', { status: 403 });
      if (!booking) return mcpError(res, 'Booking not found.', { status: 404 });
      return mcpSuccess(res, booking);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/bookings',
  requireMcpPermission('book_resources'),
  validate(createBookingSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await mcp.createBooking(req.validated.body, req);
      return mcpSuccess(res, created, { status: 201 });
    } catch (e) {
      if (e.message?.includes('cannot be booked') || e.message?.includes('Booking blocked')) {
        return mcpError(res, e.message, { status: 400 });
      }
      next(e);
    }
  },
);

router.patch(
  '/bookings/:id',
  requireMcpPermission('book_resources'),
  validate(idParamSchema, 'params'),
  validate(updateBookingSchema, 'body'),
  async (req, res, next) => {
    try {
      const ctx = mcp.authContext(req);
      const updated = await mcp.updateBooking(req.validated.params.id, req.validated.body, req, ctx);
      if (updated === 'forbidden') return mcpError(res, 'Insufficient permissions.', { status: 403 });
      if (!updated) return mcpError(res, 'Booking not found.', { status: 404 });
      return mcpSuccess(res, updated);
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/rooms',
  requireMcpPermission('view_resources'),
  validate(roomListSchema, 'query'),
  async (req, res, next) => {
    try {
      const pagination = parsePagination(req.validated.query);
      const result = await mcp.listRooms({ ...req.validated.query, ...pagination });
      return mcpPaginated(res, result.data, result.meta);
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/rooms/:id',
  requireMcpPermission('view_resources'),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const room = await mcp.getRoom(req.validated.params.id);
      if (!room) return mcpError(res, 'Room not found.', { status: 404 });
      return mcpSuccess(res, room);
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  '/rooms',
  requireMcpAdmin,
  validate(createRoomSchema, 'body'),
  async (req, res, next) => {
    try {
      const created = await mcp.createRoom(req.validated.body, req);
      return mcpSuccess(res, created, { status: 201 });
    } catch (e) {
      next(e);
    }
  },
);

router.patch(
  '/rooms/:id',
  requireMcpAdmin,
  validate(idParamSchema, 'params'),
  validate(updateRoomSchema, 'body'),
  async (req, res, next) => {
    try {
      const updated = await mcp.updateRoom(req.validated.params.id, req.validated.body, req);
      if (!updated) return mcpError(res, 'Room not found.', { status: 404 });
      return mcpSuccess(res, updated);
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/transactions',
  requireMcpPermission('view_own_transactions'),
  validate(transactionListSchema, 'query'),
  async (req, res, next) => {
    try {
      const pagination = parsePagination(req.validated.query);
      const ctx = mcp.authContext(req);
      const result = await mcp.listTransactions({ ...req.validated.query, ...pagination }, ctx);
      return mcpPaginated(res, result.data, result.meta);
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/care/schedules',
  requireMcpAdmin,
  validate(careScheduleListSchema, 'query'),
  async (req, res, next) => {
    try {
      const pagination = parsePagination(req.validated.query);
      const result = await mcp.listCareSchedules({ ...req.validated.query, ...pagination });
      return mcpPaginated(res, result.data, result.meta);
    } catch (e) {
      next(e);
    }
  },
);

router.get('/care/summary', requireMcpAdmin, async (_req, res, next) => {
  try {
    const data = await mcp.getCareSummary();
    return mcpSuccess(res, data);
  } catch (e) {
    next(e);
  }
});

export default router;
