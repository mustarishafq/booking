import crypto from 'crypto';

function base64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  return Buffer.from(s, 'base64');
}

function base64UrlEncode(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Verify a Nexus Brain HS256 JWT and return the decoded payload.
 */
export function verifyNexusJwt(token, secret, issuer) {
  const parts = token.split('.');
  if (parts.length !== 3) throw Object.assign(new Error('Invalid token format'), { status: 401 });

  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', secret).update(signingInput).digest(),
  );

  const sigBuf = Buffer.from(signatureB64);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw Object.assign(new Error('Invalid token signature'), { status: 401 });
  }

  let header;
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid token header'), { status: 401 });
  }
  if (header.alg !== 'HS256') {
    throw Object.assign(new Error('Unsupported token algorithm'), { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid token payload'), { status: 401 });
  }

  if (!payload.sub) {
    throw Object.assign(new Error('Token missing sub claim'), { status: 401 });
  }
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw Object.assign(new Error('Token missing valid email claim'), { status: 401 });
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw Object.assign(new Error('Token has expired'), { status: 401 });
  }
  if (issuer && payload.iss && payload.iss !== issuer) {
    throw Object.assign(new Error('Invalid token issuer'), { status: 401 });
  }

  return payload;
}
