/**
 * Read redirect_to from SSO query params without client-side filtering.
 * The server sanitizes the value before redirecting.
 */
export function readRedirectTo(searchParams) {
  const redirectTo = searchParams.get('redirect_to');
  if (!redirectTo) return null;
  const trimmed = redirectTo.trim();
  return trimmed || null;
}

/** Apply server-sanitized redirect target, or fall back to the default path. */
export function applySsoRedirect(redirectTo, defaultPath = '/') {
  if (!redirectTo || typeof redirectTo !== 'string') return defaultPath;
  const trimmed = redirectTo.trim();
  return trimmed || defaultPath;
}

/** @deprecated Use readRedirectTo + applySsoRedirect instead. */
export function resolveAppRedirect(searchParams) {
  return applySsoRedirect(readRedirectTo(searchParams), '/');
}
