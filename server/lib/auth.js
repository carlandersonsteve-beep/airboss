import crypto from 'node:crypto';

const TOKEN_TTL_SECONDS = 60 * 60 * 12;
const CHECKIN_TOKEN_TTL_SECONDS = 60 * 10;

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlJson(value) {
  return base64url(JSON.stringify(value));
}

function base64urlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, expected] = storedHash.split(':');
  if (!salt || !expected) return false;

  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const derivedBuffer = Buffer.from(derived, 'hex');
    if (expectedBuffer.length !== derivedBuffer.length || expectedBuffer.length === 0) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, derivedBuffer);
  } catch {
    return false;
  }
}

function signToken(body, secret) {
  const encodedPayload = base64urlJson(body);
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function createSessionToken(payload, secret) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    scope: 'session',
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  return signToken(body, secret);
}

export function createCheckInToken(payload, secret) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({
    ...payload,
    scope: 'checkin',
    iat: now,
    exp: now + CHECKIN_TOKEN_TTL_SECONDS,
  }, secret);
}

function verifySignedToken(token, secret, expectedScope) {
  if (!token || !token.includes('.')) return null;
  const [encodedPayload, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const payload = JSON.parse(base64urlDecode(encodedPayload));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (expectedScope && payload.scope !== expectedScope) return null;
  return payload;
}

export function verifySessionToken(token, secret) {
  return verifySignedToken(token, secret, 'session');
}

export function verifyCheckInToken(token, secret) {
  return verifySignedToken(token, secret, 'checkin');
}
