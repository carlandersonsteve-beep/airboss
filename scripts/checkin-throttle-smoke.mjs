#!/usr/bin/env node
import assert from 'node:assert/strict';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8792';
const origin = process.env.SMOKE_ORIGIN || baseUrl;
const maximumAttempts = Number(process.env.SMOKE_CHECKIN_MAX_ATTEMPTS || 40);

const sessionResponse = await fetch(`${baseUrl}/checkin/session`, {
  headers: { Origin: origin },
});
assert.equal(sessionResponse.status, 200, `unable to obtain kiosk session: ${sessionResponse.status} ${await sessionResponse.text()}`);
const cookie = String(sessionResponse.headers.get('set-cookie') || '').split(';')[0];
assert.ok(cookie.startsWith('groundcore_checkin='), 'missing kiosk session cookie');

let blockedAt = null;
for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
  const response = await fetch(`${baseUrl}/checkin/lookup?tail=NTHROTTLE`, {
    headers: { Origin: origin, Cookie: cookie },
  });
  if (response.status === 429) {
    blockedAt = attempt;
    break;
  }
  assert.equal(response.status, 200, `unexpected lookup response at attempt ${attempt}: ${response.status} ${await response.text()}`);
}

assert.ok(blockedAt !== null, `kiosk lookup was not throttled within ${maximumAttempts} attempts`);
console.log(JSON.stringify({
  ok: true,
  baseUrl,
  checks: {
    kioskLookupThrottleTriggered: true,
    blockedAtAttempt: blockedAt,
  },
}, null, 2));
