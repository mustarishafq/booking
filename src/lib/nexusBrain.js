const DEFAULT_URL = 'https://emzinexus.com';

export const NEXUS_BRAIN_URL = (import.meta.env.VITE_NEXUS_BRAIN_URL || DEFAULT_URL).replace(/\/$/, '');

export function getNexusBrainUrl() {
  return NEXUS_BRAIN_URL;
}
