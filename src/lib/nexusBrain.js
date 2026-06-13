const DEFAULT_URL = 'https://emzinexus.com';

export const NEXUS_BRAIN_URL = (import.meta.env.VITE_NEXUS_BRAIN_URL || DEFAULT_URL).replace(/\/$/, '');

const RETURN_TO_KEY = 'booking_sso_return_to';
const LOGIN_SOURCE_KEY = 'booking_login_source';

export function getNexusBrainUrl() {
  return NEXUS_BRAIN_URL;
}

export function setReturnTo(url) {
  if (url) localStorage.setItem(RETURN_TO_KEY, url);
}

export function getReturnTo() {
  return localStorage.getItem(RETURN_TO_KEY);
}

export function clearReturnTo() {
  localStorage.removeItem(RETURN_TO_KEY);
}

export function markSsoLogin() {
  localStorage.setItem(LOGIN_SOURCE_KEY, 'sso');
}

export function markDirectLogin() {
  localStorage.setItem(LOGIN_SOURCE_KEY, 'direct');
  clearReturnTo();
}

export function clearLoginSession() {
  localStorage.removeItem(LOGIN_SOURCE_KEY);
  clearReturnTo();
}

export function getPostLogoutUrl() {
  const source = localStorage.getItem(LOGIN_SOURCE_KEY);
  if (source === 'sso') {
    return getReturnTo() || NEXUS_BRAIN_URL;
  }
  return '/login';
}
