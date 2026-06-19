/** Default permissions for built-in users without a custom role_id. */
export const DEFAULT_USER_PERMISSIONS = {
  view_resources: true,
  book_resources: true,
  cancel_own_booking: true,
  view_calendar: true,
  view_all_calendar_entries: true,
  top_up_credits: true,
  view_own_transactions: true,
};

/**
 * Resolve effective permissions for a user row from /me query.
 * Admins bypass permission checks on the client; return empty object.
 */
export function getEffectivePermissions(user, rolePermissions) {
  if (user.role === 'admin') return {};

  let perms;
  if (user.role_id) {
    perms = { ...(rolePermissions || {}) };
  } else {
    perms = { ...DEFAULT_USER_PERMISSIONS };
  }

  if (user.user_type === 'internal') {
    delete perms.top_up_credits;
    delete perms.view_own_transactions;
  }

  return perms;
}
