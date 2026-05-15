#!/usr/bin/env node
import assert from 'node:assert/strict';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8792';
const origin = process.env.SMOKE_ORIGIN || baseUrl;
const username = process.env.SMOKE_USERNAME || 'steve';
const password = process.env.SMOKE_PASSWORD || 'groundcore-steve';

function extractCookie(setCookieHeader, name) {
  const values = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const value of values.filter(Boolean)) {
    const firstPart = String(value).split(';')[0] || '';
    const [cookieName, ...rest] = firstPart.split('=');
    if (cookieName === name) return rest.join('=');
  }
  return null;
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...options,
    headers: {
      Origin: origin,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { response, text, json };
}

function expectHeader(response, key, expected) {
  const actual = response.headers.get(key);
  assert.equal(actual, expected, `${key} mismatch: expected ${expected}, got ${actual}`);
}

const login = await request('/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});
assert.equal(login.response.status, 200, `login failed: ${login.response.status} ${login.text}`);
assert.equal(login.json?.ok, true, `login payload not ok: ${login.text}`);
expectHeader(login.response, 'access-control-allow-origin', origin);
expectHeader(login.response, 'access-control-allow-credentials', 'true');
const loginSetCookie = login.response.headers.get('set-cookie');
assert.ok(loginSetCookie, 'missing Set-Cookie on login');
assert.match(loginSetCookie, /groundcore_session=/, 'session cookie not issued');
assert.match(loginSetCookie, /HttpOnly/i, 'session cookie missing HttpOnly');
assert.match(loginSetCookie, /SameSite=Lax/i, 'session cookie missing SameSite=Lax');
const sessionCookieValue = extractCookie(loginSetCookie, 'groundcore_session');
assert.ok(sessionCookieValue, 'unable to parse groundcore_session cookie');
const cookieHeader = `groundcore_session=${sessionCookieValue}`;

const bootstrap = await request('/bootstrap', {
  headers: { Cookie: cookieHeader },
});
assert.equal(bootstrap.response.status, 200, `bootstrap failed: ${bootstrap.response.status} ${bootstrap.text}`);
assert.equal(bootstrap.json?.ok, true, `bootstrap payload not ok: ${bootstrap.text}`);
assert.equal(bootstrap.json?.mode, 'postgres', `expected shared/postgres mode, got ${bootstrap.json?.mode}`);
expectHeader(bootstrap.response, 'access-control-allow-origin', origin);
expectHeader(bootstrap.response, 'access-control-allow-credentials', 'true');

const logout = await request('/logout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
  },
  body: '{}',
});
assert.equal(logout.response.status, 200, `logout failed: ${logout.response.status} ${logout.text}`);
assert.equal(logout.json?.ok, true, `logout payload not ok: ${logout.text}`);
const logoutSetCookie = logout.response.headers.get('set-cookie');
assert.ok(logoutSetCookie, 'missing Set-Cookie on logout');
assert.match(logoutSetCookie, /groundcore_session=;/, 'logout did not clear session cookie');
assert.match(logoutSetCookie, /Max-Age=0/i, 'logout cookie missing Max-Age=0');

const revokedBootstrap = await request('/bootstrap', {
  headers: { Cookie: cookieHeader },
});
assert.equal(revokedBootstrap.response.status, 401, `revoked bootstrap expected 401, got ${revokedBootstrap.response.status} ${revokedBootstrap.text}`);
assert.equal(revokedBootstrap.json?.ok, false, 'revoked bootstrap should fail');
assert.match(revokedBootstrap.json?.error || '', /Authentication required|Session expired or revoked|Session invalid/, 'unexpected revoked bootstrap error');

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  origin,
  username,
  checks: {
    loginCookieIssued: true,
    bootstrapAuthenticated: true,
    logoutClearedCookie: true,
    revokedSessionRejected: true,
  },
}, null, 2));
