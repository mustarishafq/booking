/**
 * Default permissions for built-in users without a custom role.
 * Server /api/auth/me merges these in; client uses the same as fallback.
 */
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
 * Check whether a user has a specific permission.
 *
 * Admins always return true (full access).
 * Regular users use permissions from /me, with defaults when none assigned.
 */
export function hasPermission(user, key) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  if (user.permissions?.[key]) return true;

  // Fallback for sessions loaded before server-side defaults
  if (!user.role_id && DEFAULT_USER_PERMISSIONS[key]) return true;

  return false;
}

export function hasAnyPermission(user, keys) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return keys.some(k => hasPermission(user, k));
}

export function isInternalUser(user) {
  return user?.user_type === 'internal';
}

/** Revenue / billing stats — hidden for internal staff (including internal admins). */
export function showDashboardRevenue(user) {
  if (!user || isInternalUser(user)) return false;
  if (user.role === 'admin') return true;
  return !!user.permissions?.view_dashboard_stats;
}

/** Personal credit balance — hidden for internal staff (including internal admins). */
export function showUserCredits(user) {
  if (!user || isInternalUser(user)) return false;
  if (user.role === 'admin') return true;
  return hasPermission(user, 'top_up_credits');
}
