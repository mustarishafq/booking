/**
 * Pick a safe post-login redirect from SSO query params.
 */
export function resolveSsoRedirect(searchParams) {
  const redirectTo = searchParams.get('redirect_to') || searchParams.get('return_to');
  if (!redirectTo) return '/';
  if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) return redirectTo;
  return '/';
}
