#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const rotatedPasswords = new Map();

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8792';
const origin = process.env.SMOKE_ORIGIN || baseUrl;

const rampCandidates = process.env.SMOKE_RAMP_USERNAME
  ? [{ username: process.env.SMOKE_RAMP_USERNAME, password: process.env.SMOKE_RAMP_PASSWORD || 'groundcore-ramp' }]
  : [
      { username: 'smoke-ramp-a', password: 'groundcore-smoke-ramp' },
      { username: 'smoke-ramp-b', password: 'groundcore-smoke-ramp' },
      { username: 'ramp', password: 'groundcore-ramp' },
      { username: 'neil', password: 'groundcore-ramp' },
      { username: 'john', password: 'groundcore-ramp' },
      { username: 'wade', password: 'groundcore-ramp' },
    ];

const officeCandidates = process.env.SMOKE_OFFICE_USERNAME
  ? [{ username: process.env.SMOKE_OFFICE_USERNAME, password: process.env.SMOKE_OFFICE_PASSWORD || 'groundcore-office' }]
  : [
      { username: 'smoke-office-a', password: 'groundcore-smoke-office' },
      { username: 'smoke-office-b', password: 'groundcore-smoke-office' },
      { username: 'tacie', password: 'groundcore-tacie' },
      { username: 'lindsey', password: 'groundcore-office' },
      { username: 'lizbeth', password: 'groundcore-office' },
      { username: 'amanda', password: 'groundcore-office' },
    ];

function makeJar() {
  return new Map();
}

function applySetCookie(jar, response) {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return;
  const firstPart = String(setCookie).split(';')[0] || '';
  const idx = firstPart.indexOf('=');
  if (idx === -1) return;
  jar.set(firstPart.slice(0, idx), firstPart.slice(idx + 1));
}

function cookieHeader(jar) {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function request(path, { jar = null, headers = {}, ...options } = {}) {
  const finalHeaders = { Origin: origin, ...headers };
  if (jar && jar.size > 0) finalHeaders.Cookie = cookieHeader(jar);

  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...options,
    headers: finalHeaders,
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

async function expectOk(path, options = {}) {
  const result = await request(path, options);
  assert.ok(result.response.status >= 200 && result.response.status < 300, `${path} failed: ${result.response.status} ${result.text}`);
  if (result.json && typeof result.json === 'object' && 'ok' in result.json) {
    assert.equal(result.json.ok, true, `${path} returned ok=false: ${result.text}`);
  }
  return result;
}

async function login(username, password) {
  const jar = makeJar();
  const loginResult = await expectOk('/login', {
    jar,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert.ok(jar.get('groundcore_session'), `missing groundcore_session cookie for ${username}`);

  let activePassword = password;
  if (loginResult.json?.user?.mustChangePassword) {
    activePassword = rotatedPasswords.get(username) || `GroundCore!${crypto.randomUUID().slice(0, 12)}`;
    const changed = await expectOk('/change-password', {
      jar,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: password, newPassword: activePassword }),
    });
    assert.equal(changed.json?.user?.mustChangePassword, false, `password gate did not clear for ${username}`);
    rotatedPasswords.set(username, activePassword);
  }

  return { jar, user: loginResult.json.user, username, password: activePassword };
}

async function loginWithFallback(label, candidates, usedUsernames = new Set()) {
  for (const candidate of candidates) {
    if (usedUsernames.has(candidate.username)) continue;
    try {
      const session = await login(candidate.username, candidate.password);
      usedUsernames.add(candidate.username);
      return session;
    } catch {}
  }
  throw new Error(`${label} login failed for all candidates`);
}

const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
const tailNumber = `NCR${suffix}`;
const customerId = `cust-concurrency-${suffix.toLowerCase()}`;
const orderId = `ord-concurrency-${suffix.toLowerCase()}`;
const departureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const result = {
  ok: true,
  baseUrl,
  tailNumber,
  orderId,
  checks: {},
};

const kioskJar = makeJar();
await expectOk('/checkin/session', { jar: kioskJar });
await expectOk('/checkin/customers', {
  jar: kioskJar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: customerId,
    tailNumber,
    aircraftType: 'Pilatus PC-12',
    pilotName: 'Concurrency Smoke Pilot',
    email: `concurrency+${suffix.toLowerCase()}@example.com`,
    phone: '605-555-0111',
    company: 'GroundCore Concurrency Smoke',
    source: 'kiosk',
  }),
});
await expectOk('/checkin/orders', {
  jar: kioskJar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: orderId,
    customerId,
    tailNumber,
    aircraftType: 'Pilatus PC-12',
    fuelType: 'JET-A',
    fuelRequestedGallons: 90,
    services: ['crew_car'],
    notes: 'Concurrency/read-state smoke order',
    arrivalTime: new Date().toISOString(),
    departureDate,
    departureTime: '09:30',
    source: 'kiosk-checkin',
    status: 'pending',
  }),
});
result.checks.kioskOrderCreated = true;

const usedRampUsers = new Set();
const usedOfficeUsers = new Set();
const rampA = await loginWithFallback('rampA', rampCandidates, usedRampUsers);
const rampB = await loginWithFallback('rampB', rampCandidates, usedRampUsers);
const officeA = await loginWithFallback('officeA', officeCandidates, usedOfficeUsers);
const officeB = await loginWithFallback('officeB', officeCandidates, usedOfficeUsers);
result.rampUsers = [rampA.username, rampB.username];
result.officeUsers = [officeA.username, officeB.username];

const rampBootstrapA1 = await expectOk('/bootstrap', { jar: rampA.jar });
const rampOrderA1 = rampBootstrapA1.json.orders.find((order) => order.id === orderId);
assert.ok(rampOrderA1, 'ramp A missing kiosk order');
assert.equal(rampOrderA1.status, 'pending');
result.checks.rampASeesPendingOrder = true;

const rampBootstrapB1 = await expectOk('/bootstrap', { jar: rampB.jar });
const rampOrderB1 = rampBootstrapB1.json.orders.find((order) => order.id === orderId);
assert.ok(rampOrderB1, 'ramp B missing kiosk order');
result.checks.rampBSeesPendingOrder = true;

await expectOk(`/orders/${orderId}/messages`, {
  jar: rampA.jar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: `Ramp A pickup ${suffix}`,
    tailNumber,
    senderName: rampA.username,
  }),
});
const rampBMessages1 = await expectOk(`/orders/${orderId}/messages`, { jar: rampB.jar });
assert.ok(rampBMessages1.json.items.some((item) => item.text.includes(`Ramp A pickup ${suffix}`)), 'ramp B missing ramp A message');
result.checks.sameRoleMessageVisibility = true;

const rampReadAt = new Date().toISOString();
await expectOk(`/orders/${orderId}/read`, {
  jar: rampA.jar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lastReadAt: rampReadAt }),
});
const rampBootstrapB2 = await expectOk('/bootstrap', { jar: rampB.jar });
assert.ok(Number(rampBootstrapB2.json.threadReads?.RAMP?.[orderId]) > 0, 'shared ramp read-state missing');
result.checks.sameRoleReadStateShared = true;

const officeBootstrapA1 = await expectOk('/bootstrap', { jar: officeA.jar });
assert.equal(officeBootstrapA1.json.threadReads?.OFFICE?.[orderId], undefined, 'office read-state should start empty for new order');
assert.ok(Number(officeBootstrapA1.json.threadReads?.RAMP?.[orderId]) > 0, 'office bootstrap should still see ramp read-state');
result.checks.crossRoleReadStateIndependent = true;

await expectOk(`/orders/${orderId}`, {
  jar: rampA.jar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'in_progress',
    statusUpdatedAt: new Date().toISOString(),
  }),
});
await expectOk(`/orders/${orderId}`, {
  jar: rampB.jar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'ready_for_front_desk',
    statusUpdatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    fuelActualGallons: 90,
    fuelMeterStart: 6000.0,
    fuelMeterEnd: 6090.0,
    completionNotes: 'Concurrency smoke complete.',
  }),
});
const officeBootstrapA2 = await expectOk('/bootstrap', { jar: officeA.jar });
const officeOrderA2 = officeBootstrapA2.json.orders.find((order) => order.id === orderId);
assert.ok(officeOrderA2, 'office A missing handed-off order');
assert.equal(officeOrderA2.status, 'ready_for_front_desk');
result.checks.multiActorStatusProgression = true;

const officeReadAt = new Date().toISOString();
await expectOk(`/orders/${orderId}/read`, {
  jar: officeA.jar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lastReadAt: officeReadAt }),
});
const officeBootstrapB2 = await expectOk('/bootstrap', { jar: officeB.jar });
assert.ok(Number(officeBootstrapB2.json.threadReads?.OFFICE?.[orderId]) > 0, 'shared office read-state missing');
result.checks.officeReadStateShared = true;

await expectOk(`/orders/${orderId}/messages`, {
  jar: officeB.jar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: `Office reply ${suffix}`,
    tailNumber,
    senderName: officeB.username,
  }),
});
const rampMessages2 = await expectOk(`/orders/${orderId}/messages`, { jar: rampA.jar });
assert.ok(rampMessages2.json.items.some((item) => item.text.includes(`Office reply ${suffix}`)), 'ramp A missing office reply');
result.checks.crossRoleMessageVisibility = true;

await expectOk(`/orders/${orderId}`, {
  jar: officeA.jar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'closed',
    statusUpdatedAt: new Date().toISOString(),
  }),
});
const rampBootstrapA3 = await expectOk('/bootstrap', { jar: rampA.jar });
const closedOrder = rampBootstrapA3.json.orders.find((order) => order.id === orderId);
assert.ok(closedOrder, 'closed order missing after refresh');
assert.equal(closedOrder.status, 'closed');
result.checks.closedStateVisibleAcrossSessions = true;

console.log(JSON.stringify(result, null, 2));
