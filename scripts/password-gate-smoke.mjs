#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8792';
const origin = process.env.SMOKE_ORIGIN || baseUrl;
const username = process.env.SMOKE_USERNAME || 'smoke-password';
const currentPassword = process.env.SMOKE_PASSWORD || 'groundcore-smoke-password';
const nextPassword = process.env.SMOKE_NEW_PASSWORD || `GroundCore!${crypto.randomUUID().slice(0, 12)}`;

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

const login = await request('/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password: currentPassword }),
});
assert.equal(login.response.status, 200, `login failed: ${login.response.status} ${login.text}`);
assert.equal(login.json?.ok, true, `login payload not ok: ${login.text}`);
assert.equal(login.json?.user?.mustChangePassword, true, 'expected temporary user to require password change');
const sessionCookieValue = extractCookie(login.response.headers.get('set-cookie'), 'groundcore_session');
assert.ok(sessionCookieValue, 'missing groundcore_session cookie after login');
const cookieHeader = `groundcore_session=${sessionCookieValue}`;

const blockedBootstrap = await request('/bootstrap', {
  headers: { Cookie: cookieHeader },
});
assert.equal(blockedBootstrap.response.status, 403, `bootstrap should be blocked pending password change: ${blockedBootstrap.response.status} ${blockedBootstrap.text}`);
assert.equal(blockedBootstrap.json?.ok, false, 'blocked bootstrap should fail');
assert.match(blockedBootstrap.json?.error || '', /Password change required/, 'unexpected bootstrap block reason');

const blockedCustomers = await request('/customers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
  },
  body: JSON.stringify({ id: 'cust-password-gate', tailNumber: 'NPWDGATE' }),
});
assert.equal(blockedCustomers.response.status, 403, `customer create should be blocked pending password change: ${blockedCustomers.response.status} ${blockedCustomers.text}`);
assert.match(blockedCustomers.json?.error || '', /Password change required/, 'unexpected protected-route block reason');

const changed = await request('/change-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
  },
  body: JSON.stringify({
    username: 'someone-else-should-be-ignored',
    currentPassword,
    newPassword: nextPassword,
  }),
});
assert.equal(changed.response.status, 200, `change-password failed: ${changed.response.status} ${changed.text}`);
assert.equal(changed.json?.ok, true, `change-password payload not ok: ${changed.text}`);
assert.equal(changed.json?.user?.username, username, 'password change should stay bound to current session user');
assert.equal(changed.json?.user?.mustChangePassword, false, 'password gate should clear after change');
const changedCookieValue = extractCookie(changed.response.headers.get('set-cookie'), 'groundcore_session');
assert.ok(changedCookieValue, 'missing replacement session cookie after password change');
const changedCookie = `groundcore_session=${changedCookieValue}`;

const bootstrap = await request('/bootstrap', {
  headers: { Cookie: changedCookie },
});
assert.equal(bootstrap.response.status, 200, `bootstrap after password change failed: ${bootstrap.response.status} ${bootstrap.text}`);
assert.equal(bootstrap.json?.ok, true, `bootstrap payload not ok after password change: ${bootstrap.text}`);

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  username,
  checks: {
    temporaryLoginIssued: true,
    prechangeBootstrapBlocked: true,
    protectedWriteBlocked: true,
    passwordChangeBoundToSessionUser: true,
    postchangeBootstrapAllowed: true,
  },
}, null, 2));
