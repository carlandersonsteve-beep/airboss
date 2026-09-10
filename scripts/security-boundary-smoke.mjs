#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8792';
const origin = process.env.SMOKE_ORIGIN || baseUrl;
const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
const tailNumber = `NSEC${suffix.slice(0, 5)}`;

function makeJar() {
  return new Map();
}

function applySetCookie(jar, response) {
  const setCookie = response.headers.get('set-cookie');
  const firstPart = String(setCookie || '').split(';')[0];
  const separator = firstPart.indexOf('=');
  if (separator > 0) jar.set(firstPart.slice(0, separator), firstPart.slice(separator + 1));
}

function cookieHeader(jar) {
  return Array.from(jar.entries()).map(([key, value]) => `${key}=${value}`).join('; ');
}

async function request(path, { jar = null, headers = {}, ...options } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...options,
    headers: {
      Origin: origin,
      ...(jar?.size ? { Cookie: cookieHeader(jar) } : {}),
      ...headers,
    },
  });
  if (jar) applySetCookie(jar, response);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, text, json };
}

async function expectStatus(path, status, options = {}) {
  const result = await request(path, options);
  assert.equal(result.response.status, status, `${path}: expected ${status}, got ${result.response.status}: ${result.text}`);
  return result;
}

async function login(username, password) {
  const jar = makeJar();
  await expectStatus('/login', 200, {
    jar,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert.ok(jar.get('groundcore_session'), `missing session cookie for ${username}`);
  return jar;
}

const result = { ok: true, baseUrl, tailNumber, checks: {} };
const kioskJar = makeJar();
await expectStatus('/checkin/session', 200, { jar: kioskJar });

const customerCreate = await expectStatus('/checkin/customers', 200, {
  jar: kioskJar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'attacker-controlled-customer-id',
    tailNumber,
    aircraftType: 'Pilatus PC-12',
    pilotName: 'Private Pilot',
    email: `private+${suffix.toLowerCase()}@example.com`,
    phone: '605-555-0199',
    company: 'Private Operator',
    ownerName: 'must-not-be-accepted',
    notes: 'must-not-be-accepted',
    source: 'kiosk',
  }),
});
const customerId = customerCreate.json.item.id;
assert.notEqual(customerId, 'attacker-controlled-customer-id');
for (const sensitiveField of ['pilotName', 'email', 'phone', 'company', 'ownerName', 'notes']) {
  assert.equal(customerCreate.json.item[sensitiveField], undefined, `kiosk response leaked ${sensitiveField}`);
}
result.checks.kioskMutationResponseRedacted = true;

const lookup = await expectStatus(`/checkin/lookup?tail=${encodeURIComponent(tailNumber)}`, 200, { jar: kioskJar });
assert.equal(lookup.json.matched, true);
assert.equal(lookup.json.privacyMode, 'verified-returning-contact');
assert.equal(lookup.json.match.customer.maskedPhone, '•••-•••-0199');
assert.equal(JSON.stringify(lookup.json).includes('605-555-0199'), false);
assert.equal(JSON.stringify(lookup.json).includes(`private+${suffix.toLowerCase()}@example.com`), false);
await expectStatus('/checkin/verify-returning', 403, {
  jar: kioskJar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ challengeToken: lookup.json.match.challengeToken, phoneLastFour: '0000' }),
});
const verifiedReturning = await expectStatus('/checkin/verify-returning', 200, {
  jar: kioskJar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ challengeToken: lookup.json.match.challengeToken, phoneLastFour: '0199' }),
});
assert.ok(verifiedReturning.json.returningToken);
const reusedOrder = await expectStatus('/checkin/orders', 200, {
  jar: kioskJar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'attacker-controlled-customer-id',
    returningToken: verifiedReturning.json.returningToken,
    tailNumber,
    aircraftType: 'Pilatus PC-12',
    hangarOvernight: 'no',
    services: [],
    source: 'kiosk-checkin',
  }),
});
assert.equal(reusedOrder.json.item.customerId, customerId);
result.checks.returningLookupMasksPiiAndRequiresPhoneVerification = true;

const orderCreate = await expectStatus('/checkin/orders', 200, {
  jar: kioskJar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'attacker-controlled-order-id',
    customerId,
    tailNumber,
    aircraftType: 'Pilatus PC-12',
    status: 'closed',
    fuelType: 'JET-A',
    fuelRequestedGallons: 90,
    hangarOvernight: 'no',
    services: ['crew_car'],
    notes: 'Security boundary smoke',
    source: 'kiosk-checkin',
    preDepartureSent: true,
  }),
});
const orderId = orderCreate.json.item.id;
assert.notEqual(orderId, 'attacker-controlled-order-id');
assert.equal(orderCreate.json.item.status, 'pending');
assert.equal(orderCreate.json.item.preDepartureSent, false);
result.checks.kioskCannotControlIdsStatusOrInternalFields = true;

const rampJar = await login('smoke-ramp-a', 'groundcore-smoke-ramp');
const officeJar = await login('smoke-office-a', 'groundcore-smoke-office');

await expectStatus(`/orders/${orderId}`, 200, {
  jar: rampJar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'in_progress', statusUpdatedAt: new Date().toISOString() }),
});

await expectStatus(`/orders/${orderId}`, 400, {
  jar: rampJar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'ready_for_front_desk', statusUpdatedAt: new Date().toISOString() }),
});
result.checks.serverRequiresActualFuelBeforeHandoff = true;

await expectStatus(`/orders/${orderId}`, 400, {
  jar: rampJar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'ready_for_front_desk',
    statusUpdatedAt: new Date().toISOString(),
    fuelActualGallons: 85,
  }),
});
result.checks.serverRequiresFuelVarianceNote = true;

await expectStatus(`/orders/${orderId}`, 200, {
  jar: rampJar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'ready_for_front_desk',
    statusUpdatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    fuelActualGallons: 90,
    fuelMeterStart: 1000,
    fuelMeterEnd: 1090,
    completionNotes: 'Verified security smoke handoff.',
  }),
});

await expectStatus(`/orders/${orderId}`, 403, {
  jar: rampJar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'closed', statusUpdatedAt: new Date().toISOString() }),
});
result.checks.rampCannotCloseBillingOrder = true;

await expectStatus(`/orders/${orderId}`, 403, {
  jar: officeJar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fuelActualGallons: 999 }),
});
result.checks.officeCannotRewriteFuel = true;

await expectStatus(`/orders/${orderId}`, 200, {
  jar: officeJar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'closed', statusUpdatedAt: new Date().toISOString() }),
});
result.checks.officeCanCloseReadyOrder = true;

await expectStatus('/login', 413, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'oversized', password: 'x'.repeat(70 * 1024) }),
});
result.checks.oversizedJsonBodyRejected = true;

console.log(JSON.stringify(result, null, 2));
