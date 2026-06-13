const DEFAULT_URL = 'https://emzinexus.com';

export const NEXUS_BRAIN_URL = (import.meta.env.VITE_NEXUS_BRAIN_URL || DEFAULT_URL).replace(/\/$/, '');

const RETURN_TO_KEY = 'booking_sso_return_to';

export function getNexusBrainUrl() {
  return NEXUS_BRAIN_URL;
}

export function setReturnTo(url) {
  if (url) localStorage.setItem(RETURN_TO_KEY, url);
}

export function getReturnTo() {
  return localStorage.getItem(RETURN_TO_KEY);
}

export function getPostLogoutUrl() {
  return getReturnTo() || NEXUS_BRAIN_URL;
}
