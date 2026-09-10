#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8792';
const origin = process.env.SMOKE_ORIGIN || baseUrl;

const rampCandidates = process.env.SMOKE_RAMP_USERNAME
  ? [{ username: process.env.SMOKE_RAMP_USERNAME, password: process.env.SMOKE_RAMP_PASSWORD || 'groundcore-ramp' }]
  : [
      { username: 'smoke-ramp-pilot', password: 'groundcore-smoke-ramp-pilot' },
      { username: 'ramp', password: 'groundcore-ramp' },
      { username: 'neil', password: 'groundcore-ramp' },
      { username: 'john', password: 'groundcore-ramp' },
      { username: 'wade', password: 'groundcore-ramp' },
      { username: 'todd', password: 'groundcore-ramp' },
      { username: 'clark', password: 'groundcore-ramp' },
      { username: 'mark', password: 'groundcore-ramp' },
    ];

const officeCandidates = process.env.SMOKE_OFFICE_USERNAME
  ? [{ username: process.env.SMOKE_OFFICE_USERNAME, password: process.env.SMOKE_OFFICE_PASSWORD || 'groundcore-office' }]
  : [
      { username: 'smoke-office-pilot', password: 'groundcore-smoke-office-pilot' },
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
  const name = firstPart.slice(0, idx);
  const value = firstPart.slice(idx + 1);
  jar.set(name, value);
}

function cookieHeader(jar) {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function request(path, { jar = null, headers = {}, ...options } = {}) {
  const finalHeaders = {
    Origin: origin,
    ...headers,
  };

  if (jar && jar.size > 0) {
    finalHeaders.Cookie = cookieHeader(jar);
  }

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
    activePassword = `GroundCore!${crypto.randomUUID().slice(0, 12)}`;
    const changed = await expectOk('/change-password', {
      jar,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: password, newPassword: activePassword }),
    });
    assert.equal(changed.json?.user?.mustChangePassword, false, `password gate did not clear for ${username}`);
  }

  return { jar, user: loginResult.json.user, username, password: activePassword };
}

async function loginWithFallback(label, candidates) {
  const failures = [];
  for (const candidate of candidates) {
    try {
      return await login(candidate.username, candidate.password);
    } catch (error) {
      failures.push({
        username: candidate.username,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const attempted = failures.map((item) => item.username).join(', ');
  throw new Error(`${label} login failed for all candidates: ${attempted}`);
}

const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
const tailNumber = `N${suffix}`;
const departureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const requestedCustomerId = `cust-smoke-${suffix.toLowerCase()}`;
const requestedOrderId = `ord-smoke-${suffix.toLowerCase()}`;
let customerId = requestedCustomerId;
let orderId = requestedOrderId;
const pilotEmail = `smoke+${suffix.toLowerCase()}@example.com`;

const result = {
  ok: true,
  baseUrl,
  origin,
  tailNumber,
  customerId: null,
  orderId: null,
  checks: {},
};

const kioskJar = makeJar();
await expectOk('/checkin/session', { jar: kioskJar });
assert.ok(kioskJar.get('groundcore_checkin'), 'missing groundcore_checkin cookie');
result.checks.kioskSessionIssued = true;

const preLookup = await expectOk(`/checkin/lookup?tail=${encodeURIComponent(tailNumber)}`, { jar: kioskJar });
assert.equal(preLookup.json.matched, false, `expected no returning-customer match before create: ${preLookup.text}`);
result.checks.preLookupClean = true;

const customerPayload = {
  id: requestedCustomerId,
  tailNumber,
  aircraftType: 'Pilatus PC-12',
  pilotName: 'Smoke Test Pilot',
  email: pilotEmail,
  phone: '605-555-0101',
  company: 'GroundCore Smoke Test',
  source: 'kiosk',
};
const customerCreate = await expectOk('/checkin/customers', {
  jar: kioskJar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(customerPayload),
});
customerId = customerCreate.json.item.id;
result.customerId = customerId;
assert.notEqual(customerId, requestedCustomerId, 'public kiosk must not control persisted customer IDs');
assert.equal(customerCreate.json.item.email, undefined, 'kiosk mutation response must not echo contact data');
result.checks.kioskCustomerCreated = true;

const orderPayload = {
  id: requestedOrderId,
  customerId,
  tailNumber,
  aircraftType: 'Pilatus PC-12',
  fuelType: 'JET-A',
  fuelRequestedGallons: 120,
  hangarOvernight: 'no',
  services: ['crew_car', 'ice'],
  notes: 'Smoke test arrival via kiosk',
  arrivalTime: new Date().toISOString(),
  departureDate,
  departureTime: '08:15',
  source: 'kiosk-checkin',
  status: 'pending',
};
const orderCreate = await expectOk('/checkin/orders', {
  jar: kioskJar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderPayload),
});
orderId = orderCreate.json.item.id;
result.orderId = orderId;
assert.notEqual(orderId, requestedOrderId, 'public kiosk must not control persisted order IDs');
assert.equal(orderCreate.json.item.status, 'pending');
result.checks.kioskOrderCreated = true;

const postLookup = await expectOk(`/checkin/lookup?tail=${encodeURIComponent(tailNumber)}`, { jar: kioskJar });
assert.equal(postLookup.json.matched, true);
assert.equal(postLookup.json.privacyMode, 'verified-returning-contact');
assert.equal(postLookup.json.match.customer.maskedPhone, '•••-•••-0101');
assert.equal(JSON.stringify(postLookup.json).includes('605-555-0101'), false);
assert.equal(JSON.stringify(postLookup.json).includes('smoke-pilot@example.com'), false);
result.checks.publicTailLookupMasksContactData = true;

const ramp = await loginWithFallback('ramp', rampCandidates);
result.checks.rampLogin = true;
result.rampUser = ramp.username;

const rampBootstrap1 = await expectOk('/bootstrap', { jar: ramp.jar });
const rampOrder1 = rampBootstrap1.json.orders.find((order) => order.id === orderId);
assert.ok(rampOrder1, 'ramp bootstrap missing kiosk-created order');
assert.equal(rampOrder1.status, 'pending');
result.checks.rampSeesPendingOrder = true;

await expectOk(`/orders/${orderId}/messages`, {
  jar: ramp.jar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Ramp picked up the turn. Starting fuel now.',
    tailNumber,
    senderName: 'Ramp Operations',
  }),
});
result.checks.rampThreadMessageCreated = true;

await expectOk(`/orders/${orderId}/read`, {
  jar: ramp.jar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lastReadAt: new Date().toISOString() }),
});
result.checks.rampReadStateSaved = true;

await expectOk(`/orders/${orderId}`, {
  jar: ramp.jar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'in_progress',
    statusUpdatedAt: new Date().toISOString(),
  }),
});
result.checks.rampMovedToInProgress = true;

await expectOk(`/orders/${orderId}`, {
  jar: ramp.jar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'ready_for_front_desk',
    statusUpdatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    fuelActualGallons: 120,
    fuelMeterStart: 5020.1,
    fuelMeterEnd: 5140.1,
    completionNotes: 'Fuel complete, crew car staged, ice delivered.',
  }),
});
result.checks.rampMovedToReadyForFrontDesk = true;

const office = await loginWithFallback('office', officeCandidates);
result.checks.officeLogin = true;
result.officeUser = office.username;

const officeBootstrap = await expectOk('/bootstrap', { jar: office.jar });
const officeOrder = officeBootstrap.json.orders.find((order) => order.id === orderId);
assert.ok(officeOrder, 'office bootstrap missing order after ramp handoff');
assert.equal(officeOrder.status, 'ready_for_front_desk');
assert.equal(Number(officeOrder.fuelActualGallons), 120);
assert.equal(Number(officeOrder.fuelMeterEnd) - Number(officeOrder.fuelMeterStart), 120);
result.checks.officeSeesReadyForFrontDeskOrder = true;

const orderMessages = await expectOk(`/orders/${orderId}/messages`, { jar: office.jar });
assert.ok(orderMessages.json.items.some((item) => item.text.includes('Starting fuel now.')), 'office did not receive ramp thread message');
result.checks.officeSeesRampThreadMessage = true;

await expectOk(`/orders/${orderId}/messages`, {
  jar: office.jar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Front desk sees the handoff. Billing next.',
    tailNumber,
    senderName: 'Tacie',
  }),
});
result.checks.officeReplyMessageCreated = true;

await expectOk(`/orders/${orderId}/read`, {
  jar: office.jar,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lastReadAt: new Date().toISOString() }),
});
result.checks.officeReadStateSaved = true;

await expectOk(`/orders/${orderId}`, {
  jar: office.jar,
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'closed',
    statusUpdatedAt: new Date().toISOString(),
  }),
});
result.checks.officeClosedOrder = true;

const officeBootstrapAfterClose = await expectOk('/bootstrap', { jar: office.jar });
const closedOrder = officeBootstrapAfterClose.json.orders.find((order) => order.id === orderId);
assert.ok(closedOrder, 'closed order missing after refresh');
assert.equal(closedOrder.status, 'closed');
assert.equal(closedOrder.completionNotes, 'Fuel complete, crew car staged, ice delivered.');
assert.equal(closedOrder.departureDate, departureDate);
result.checks.closedOrderPersistsAfterRefresh = true;

const rampBootstrapAfterClose = await expectOk('/bootstrap', { jar: ramp.jar });
const rampClosedOrder = rampBootstrapAfterClose.json.orders.find((order) => order.id === orderId);
assert.ok(rampClosedOrder, 'ramp refresh missing closed order');
assert.equal(rampClosedOrder.status, 'closed');
result.checks.rampRefreshSeesClosedOrder = true;

const finalMessages = await expectOk(`/orders/${orderId}/messages`, { jar: ramp.jar });
assert.ok(finalMessages.json.items.some((item) => item.text.includes('Billing next.')), 'ramp did not receive office reply message');
result.checks.crossRoleThreadPersistence = true;

result.notes = {
  completionEmailDraftReady: Boolean(pilotEmail && closedOrder.completionNotes && closedOrder.departureDate),
  completionEmailDeliveryTested: false,
  limitation: 'Customer email remains a client-side mailto draft flow, so this smoke test validates the required data but does not verify actual outbound delivery.',
};

console.log(JSON.stringify(result, null, 2));
