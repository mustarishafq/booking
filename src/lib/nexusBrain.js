const DEFAULT_URL = 'https://emzinexus.com';

export const NEXUS_BRAIN_URL = (import.meta.env.VITE_NEXUS_BRAIN_URL || DEFAULT_URL).replace(/\/$/, '');

export const AUTH_VIA_NEXUS_KEY = 'booking_auth_via_nexus';

export function getNexusBrainUrl() {
  return NEXUS_BRAIN_URL;
}

/** Where users return after signing out of this app. */
export function getPostLogoutUrl() {
  return NEXUS_BRAIN_URL;
}

export function markAuthViaNexus() {
  localStorage.setItem(AUTH_VIA_NEXUS_KEY, '1');
}

export function clearAuthViaNexus() {
  localStorage.removeItem(AUTH_VIA_NEXUS_KEY);
}
