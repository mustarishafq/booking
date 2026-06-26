/**
 * Standard MCP v1 response envelope helpers.
 */

export function mcpSuccess(res, data, { status = 200, meta = {}, message = null } = {}) {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta,
  });
}

export function mcpPaginated(res, data, pagination) {
  const { current_page, last_page, per_page, total } = pagination;
  return mcpSuccess(res, data, {
    meta: { current_page, last_page, per_page, total },
  });
}

export function mcpError(res, message, { status = 400, errors = [] } = {}) {
  return res.status(status).json({
    success: false,
    message,
    errors,
  });
}

export function buildPaginationMeta({ page, perPage, total }) {
  const current_page = Math.max(1, page);
  const per_page = Math.max(1, perPage);
  const last_page = Math.max(1, Math.ceil(total / per_page) || 1);
  return { current_page, last_page, per_page, total };
}

export function parsePagination(query, { defaultPerPage = 50, maxPerPage = 200 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const per_page = Math.min(
    maxPerPage,
    Math.max(1, parseInt(query.per_page, 10) || defaultPerPage),
  );
  return { page, per_page, offset: (page - 1) * per_page };
}
