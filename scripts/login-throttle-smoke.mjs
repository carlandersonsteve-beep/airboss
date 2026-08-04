#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8792';
const origin = process.env.SMOKE_ORIGIN || baseUrl;
const username = process.env.SMOKE_USERNAME || `throttle-smoke-${crypto.randomUUID().slice(0, 8)}`;
const password = process.env.SMOKE_PASSWORD || 'definitely-wrong-password';
const expectedFailuresBeforeBlock = Number(process.env.SMOKE_EXPECT_FAILURES_BEFORE_BLOCK || 4);

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

for (let i = 1; i <= expectedFailuresBeforeBlock; i += 1) {
  const result = await request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(result.response.status, 401, `attempt ${i} should be 401 before throttle trips: ${result.response.status} ${result.text}`);
  assert.match(result.json?.error || '', /Invalid username or password/, `attempt ${i} unexpected error payload: ${result.text}`);
}

const blocked = await request('/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});
assert.equal(blocked.response.status, 429, `throttled attempt should be 429: ${blocked.response.status} ${blocked.text}`);
assert.match(blocked.json?.error || '', /Too many login attempts/, `unexpected throttle error payload: ${blocked.text}`);
const retryAfter = Number(blocked.response.headers.get('retry-after') || '0');
assert.ok(retryAfter >= 1, `expected Retry-After header on throttle response, got ${blocked.response.headers.get('retry-after')}`);

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  origin,
  username,
  checks: {
    invalidAttemptsRejected: true,
    throttleTriggered: true,
    retryAfterHeaderPresent: true,
  },
}, null, 2));
