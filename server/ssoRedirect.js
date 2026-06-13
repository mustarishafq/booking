/**
 * Sanitize post-login redirect paths from SSO query params or JWT claims.
 */
export function sanitizeSsoRedirect(path, frontendUrl) {
  if (!path || typeof path !== 'string') return '/';

  const trimmed = path.trim();
  if (!trimmed) return '/';

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (trimmed.includes('://')) return '/';
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const allowed = (frontendUrl || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);

    for (const origin of allowed) {
      try {
        if (new URL(origin).origin === url.origin) {
          return url.pathname + url.search + url.hash;
        }
      } catch { /* skip invalid origin */ }
    }
  } catch { /* not a valid absolute URL */ }

  return '/';
}
