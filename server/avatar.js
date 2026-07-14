import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = join(__dirname, 'uploads', 'profile-pictures');
const FETCH_TIMEOUT_MS = 10_000;
const MIN_BYTES = 100;

const CLAIM_KEYS = ['profile_picture', 'profilePicture', 'avatar_url', 'picture', 'avatar'];

const CONTENT_TYPE_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

/**
 * Accept any Nexus claim shape; first non-empty string wins.
 */
export function extractProfilePictureClaim(payload) {
  if (!payload || typeof payload !== 'object') return '';
  for (const key of CLAIM_KEYS) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function stripTrailingSlash(url) {
  return String(url || '').replace(/\/$/, '');
}

/**
 * Resolve a fetchable absolute URL for the Nexus profile picture.
 * Rewrites `/storage/...` paths onto NEXUS_BASE_URL (API/storage host).
 */
export function resolveProfilePictureSourceUrl(claim, issuer) {
  if (!claim || typeof claim !== 'string') return '';

  const nexusBase = stripTrailingSlash(process.env.NEXUS_BASE_URL);
  const issuerBase = stripTrailingSlash(issuer);

  if (/^https?:\/\//i.test(claim)) {
    try {
      const url = new URL(claim);
      if (url.pathname.startsWith('/storage/') && nexusBase) {
        return `${nexusBase}${url.pathname}${url.search}`;
      }
      return claim;
    } catch {
      return '';
    }
  }

  const path = claim.startsWith('/') ? claim : `/${claim}`;
  if (path.startsWith('/storage/') && nexusBase) {
    return `${nexusBase}${path}`;
  }

  const base = issuerBase || nexusBase;
  if (!base) return '';
  return `${base}${path}`;
}

function sniffImageExt(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif';
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
    && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return '.webp';
  }
  return null;
}

/**
 * Download and cache a profile picture locally.
 * Returns a relative `/api/uploads/profile-pictures/...` path on success,
 * the resolved remote URL on download/validation failure, or '' if unusable.
 */
export async function syncProfilePicture(claim, issuer) {
  const sourceUrl = resolveProfilePictureSourceUrl(claim, issuer);
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return '';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(sourceUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { Accept: 'image/*,*/*' },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return sourceUrl;

    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length < MIN_BYTES) return sourceUrl;

    let ext = sniffImageExt(buf);
    if (!ext) {
      const contentType = (response.headers.get('content-type') || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      ext = CONTENT_TYPE_EXT[contentType] || null;
    }
    if (!ext) return sourceUrl;

    if (!existsSync(PROFILE_DIR)) {
      mkdirSync(PROFILE_DIR, { recursive: true });
    }

    const filename = `${randomBytes(20).toString('hex')}${ext}`;
    await writeFile(join(PROFILE_DIR, filename), buf);
    return `/api/uploads/profile-pictures/${filename}`;
  } catch (err) {
    console.warn('[avatar] sync failed, using remote fallback:', err.message);
    return sourceUrl;
  }
}

/**
 * Turn a stored avatar path into a displayable URL for API clients.
 */
export function resolveAvatarUrl(stored) {
  if (stored == null) return null;
  const value = String(stored).trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const appUrl = stripTrailingSlash(process.env.APP_URL);
  if (value.startsWith('/') && appUrl) {
    return `${appUrl}${value}`;
  }
  return value;
}

/** Strip password_hash and resolve avatar_url for API responses. */
export function serializeUser(user) {
  if (!user) return user;
  const { password_hash, ...rest } = user;
  rest.avatar_url = resolveAvatarUrl(rest.avatar_url);
  return rest;
}
