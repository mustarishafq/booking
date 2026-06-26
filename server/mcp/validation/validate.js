import { mcpError } from '../mcpResponse.js';

/**
 * Express middleware factory for Zod schema validation.
 * Validates req.query, req.body, or req.params based on `source`.
 */
export function validate(schema, source = 'query') {
  return (req, res, next) => {
    const input = req[source];
    const result = schema.safeParse(input);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.') || source,
        message: e.message,
      }));
      return mcpError(res, 'The given data was invalid.', { status: 422, errors });
    }
    req.validated = req.validated || {};
    req.validated[source] = result.data;
    next();
  };
}
