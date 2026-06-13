/** In-app path after SSO login. */
export function resolveAppRedirect(searchParams) {
  const redirectTo = searchParams.get('redirect_to');
  if (redirectTo?.startsWith('/') && !redirectTo.startsWith('//')) return redirectTo;
  return '/';
}
