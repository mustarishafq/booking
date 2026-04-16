/**
 * Check whether a user has a specific permission.
 *
 * Admins always return true (full access).
 * Regular users return true only when the permission is explicitly enabled
 * on their assigned custom role.
 *
 * @param {object|null} user  - The current user object (from AuthContext / outlet context)
 * @param {string}      key   - Permission key, e.g. 'manage_resources'
 * @returns {boolean}
 */
export function hasPermission(user, key) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return !!(user.permissions?.[key]);
}

/**
 * Returns true if the user is an admin OR has at least one of the given permissions.
 *
 * @param {object|null} user
 * @param {string[]}    keys
 * @returns {boolean}
 */
export function hasAnyPermission(user, keys) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return keys.some(k => !!(user.permissions?.[k]));
}
