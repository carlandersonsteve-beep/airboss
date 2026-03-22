import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, withTransaction } from './client.js';
import { AppError, requireField } from '../lib/errors.js';
import { env } from '../lib/env.js';
import { hashPassword, verifyPassword } from '../lib/auth.js';
import { canTransitionOrder, normalizeOrderStatus } from '../../src/core/workflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_STORE_PATH = path.join(__dirname, '../data/local-store.json');

export async function getBootstrapData() {
  const [customers, orders, alerts, messages, threadReads] = await Promise.all([
    listCustomers(),
    listOrders(),
    listAlerts(),
    listOrderMessages(),
    listThreadReads(),
  ]);

  return {
    customers,
    orders,
    alerts,
    messages,
    threadReads,
  };
}

export async function listCustomers() {
  if (!env.databaseUrl) {
    return getLocalStore().customers
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  const result = await query(`
    select id, created_at, tail_number, aircraft_type, owner_name, pilot_name, phone, email, company, home_base, notes, source
    from customers
    order by created_at desc
  `);
  return result.rows.map(mapCustomerRow);
}

export async function createCustomer(payload) {
  requireField(payload.id, 'id');
  requireField(payload.tailNumber, 'tailNumber');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    const item = {
      id: payload.id,
      createdAt: payload.createdAt || new Date().toISOString(),
      tailNumber: payload.tailNumber,
      aircraftType: payload.aircraftType || null,
      ownerName: payload.ownerName || null,
      pilotName: payload.pilotName || null,
      phone: payload.phone || null,
      email: payload.email || null,
      company: payload.company || null,
      homeBase: payload.homeBase || null,
      notes: payload.notes || null,
      source: payload.source || null,
    };

    upsertById(store.customers, item);
    saveLocalStore(store);
    return item;
  }

  const result = await query(`
    insert into customers (
      id, created_at, tail_number, aircraft_type, owner_name, pilot_name, phone, email, company, home_base, notes, source
    ) values (
      $1, coalesce($2, now()), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    )
    returning *
  `, [
    payload.id,
    payload.createdAt || null,
    payload.tailNumber,
    payload.aircraftType || null,
    payload.ownerName || null,
    payload.pilotName || null,
    payload.phone || null,
    payload.email || null,
    payload.company || null,
    payload.homeBase || null,
    payload.notes || null,
    payload.source || null,
  ]);

  return mapCustomerRow(result.rows[0]);
}

export async function listOrders() {
  if (!env.databaseUrl) {
    return getLocalStore().orders
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  const result = await query(`
    select *
    from orders
    order by created_at desc
  `);
  return result.rows.map(mapOrderRow);
}

export async function createOrder(payload) {
  requireField(payload.id, 'id');
  requireField(payload.customerId, 'customerId');
  requireField(payload.status, 'status');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    const item = {
      id: payload.id,
      customerId: payload.customerId,
      createdAt: payload.createdAt || new Date().toISOString(),
      status: payload.status,
      statusUpdatedAt: payload.statusUpdatedAt || null,
      fuelType: payload.fuelType || null,
      fuelRequestedGallons: payload.fuelRequestedGallons ?? payload.fuelQuantity ?? null,
      fuelActualGallons: payload.fuelActualGallons ?? null,
      hangarOvernight: payload.hangarOvernight || null,
      services: payload.services || [],
      notes: payload.notes || null,
      completionNotes: payload.completionNotes || null,
      completedAt: payload.completedAt || null,
      arrivalAt: payload.arrivalAt || payload.arrivalTime || null,
      departureDate: payload.departureDate || null,
      departureTime: payload.departureTime || null,
      purpose: payload.purpose || null,
      source: payload.source || null,
      preDepartureSent: payload.preDepartureSent ?? false,
      preDepartureSentAt: payload.preDepartureSentAt || null,
    };

    upsertById(store.orders, item);
    saveLocalStore(store);
    return item;
  }

  const result = await query(`
    insert into orders (
      id, customer_id, created_at, status, status_updated_at, fuel_type,
      fuel_requested_gallons, fuel_actual_gallons, hangar_overnight, services,
      notes, completion_notes, completed_at, arrival_at, departure_date,
      departure_time, purpose, source, pre_departure_sent, pre_departure_sent_at
    ) values (
      $1, $2, coalesce($3, now()), $4, $5, $6,
      $7, $8, $9, $10::jsonb,
      $11, $12, $13, $14, $15,
      $16, $17, $18, coalesce($19, false), $20
    )
    returning *
  `, [
    payload.id,
    payload.customerId,
    payload.createdAt || null,
    payload.status,
    payload.statusUpdatedAt || null,
    payload.fuelType || null,
    payload.fuelRequestedGallons ?? payload.fuelQuantity ?? null,
    payload.fuelActualGallons ?? null,
    payload.hangarOvernight || null,
    JSON.stringify(payload.services || []),
    payload.notes || null,
    payload.completionNotes || null,
    payload.completedAt || null,
    payload.arrivalAt || payload.arrivalTime || null,
    payload.departureDate || null,
    payload.departureTime || null,
    payload.purpose || null,
    payload.source || null,
    payload.preDepartureSent ?? false,
    payload.preDepartureSentAt || null,
  ]);

  return mapOrderRow(result.rows[0]);
}

export async function updateOrder(orderId, patch = {}) {
  requireField(orderId, 'orderId');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    const index = store.orders.findIndex((item) => item.id === orderId);
    if (index === -1) return null;

    const current = store.orders[index];
    validateOrderPatch(current, patch);
    const updated = {
      ...current,
      ...patch,
      fuelActualGallons: patch.fuelActualGallons ?? patch.fuelQuantity ?? current.fuelActualGallons,
      services: patch.services !== undefined ? (patch.services || []) : current.services,
    };

    store.orders[index] = updated;
    saveLocalStore(store);
    return updated;
  }

  const existing = await query(`select * from orders where id = $1`, [orderId]);
  if (!existing.rows[0]) return null;

  const current = mapOrderRow(existing.rows[0]);
  validateOrderPatch(current, patch);

  const fields = [];
  const values = [];
  let index = 1;

  const mappings = {
    status: 'status',
    statusUpdatedAt: 'status_updated_at',
    fuelType: 'fuel_type',
    fuelRequestedGallons: 'fuel_requested_gallons',
    fuelActualGallons: 'fuel_actual_gallons',
    fuelQuantity: 'fuel_actual_gallons',
    hangarOvernight: 'hangar_overnight',
    notes: 'notes',
    completionNotes: 'completion_notes',
    completedAt: 'completed_at',
    arrivalAt: 'arrival_at',
    departureDate: 'departure_date',
    departureTime: 'departure_time',
    purpose: 'purpose',
    source: 'source',
    preDepartureSent: 'pre_departure_sent',
    preDepartureSentAt: 'pre_departure_sent_at',
  };

  for (const [key, column] of Object.entries(mappings)) {
    if (patch[key] !== undefined) {
      fields.push(`${column} = $${index++}`);
      values.push(patch[key]);
    }
  }

  if (patch.services !== undefined) {
    fields.push(`services = $${index++}::jsonb`);
    values.push(JSON.stringify(patch.services || []));
  }

  if (fields.length === 0) {
    const existing = await query(`select * from orders where id = $1`, [orderId]);
    return existing.rows[0] ? mapOrderRow(existing.rows[0]) : null;
  }

  values.push(orderId);
  const result = await query(`
    update orders
    set ${fields.join(', ')}
    where id = $${index}
    returning *
  `, values);

  return result.rows[0] ? mapOrderRow(result.rows[0]) : null;
}

export async function listAlerts() {
  if (!env.databaseUrl) {
    return getLocalStore().alerts
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  const result = await query(`
    select *
    from alerts
    order by created_at desc
  `);
  return result.rows.map(mapAlertRow);
}

export async function createAlert(payload) {
  requireField(payload.id, 'id');
  requireField(payload.orderId, 'orderId');
  requireField(payload.type, 'type');
  requireField(payload.message, 'message');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    const item = {
      id: payload.id,
      orderId: payload.orderId,
      type: payload.type,
      message: payload.message,
      status: payload.status || 'pending',
      createdAt: payload.createdAt || new Date().toISOString(),
      resolvedAt: payload.resolvedAt || null,
      submittedBy: payload.submittedBy || null,
    };

    upsertById(store.alerts, item);
    saveLocalStore(store);
    return item;
  }

  const result = await query(`
    insert into alerts (
      id, order_id, type, message, status, created_at, resolved_at, submitted_by
    ) values (
      $1, $2, $3, $4, coalesce($5, 'pending'), coalesce($6, now()), $7, $8
    )
    returning *
  `, [
    payload.id,
    payload.orderId,
    payload.type,
    payload.message,
    payload.status || 'pending',
    payload.createdAt || null,
    payload.resolvedAt || null,
    payload.submittedBy || null,
  ]);

  return mapAlertRow(result.rows[0]);
}

export async function resolveAlert(alertId) {
  requireField(alertId, 'alertId');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    const alert = store.alerts.find((item) => item.id === alertId);
    if (!alert) return null;
    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    saveLocalStore(store);
    return alert;
  }

  const result = await query(`
    update alerts
    set status = 'resolved',
        resolved_at = now()
    where id = $1
    returning *
  `, [alertId]);
  return result.rows[0] ? mapAlertRow(result.rows[0]) : null;
}

export async function deleteAlert(alertId) {
  requireField(alertId, 'alertId');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    store.alerts = store.alerts.filter((item) => item.id !== alertId);
    saveLocalStore(store);
    return true;
  }

  await query(`delete from alerts where id = $1`, [alertId]);
  return true;
}

export async function listOrderMessages(orderId = null) {
  if (!env.databaseUrl) {
    const messages = getLocalStore().messages
      .filter((item) => !orderId || item.orderId === orderId)
      .slice()
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return messages;
  }

  if (orderId) {
    const result = await query(`
      select *
      from order_messages
      where order_id = $1
      order by created_at asc
    `, [orderId]);
    return result.rows.map(mapMessageRow);
  }

  const result = await query(`
    select *
    from order_messages
    order by created_at asc
  `);
  return result.rows.map(mapMessageRow);
}

export async function createOrderMessage(payload) {
  requireField(payload.id, 'id');
  requireField(payload.orderId, 'orderId');
  requireField(payload.text, 'text');
  requireField(payload.senderRole, 'senderRole');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    const item = {
      id: payload.id,
      orderId: payload.orderId,
      text: payload.text,
      sender: payload.senderRole,
      senderRole: payload.senderRole,
      createdAt: payload.createdAt || new Date().toISOString(),
    };

    upsertById(store.messages, item);
    saveLocalStore(store);
    return item;
  }

  const result = await query(`
    insert into order_messages (
      id, order_id, text, sender_role, created_at
    ) values (
      $1, $2, $3, $4, coalesce($5, now())
    )
    returning *
  `, [
    payload.id,
    payload.orderId,
    payload.text,
    payload.senderRole,
    payload.createdAt || null,
  ]);

  return mapMessageRow(result.rows[0]);
}

export async function listThreadReads() {
  if (!env.databaseUrl) {
    return getLocalStore().threadReads;
  }

  const result = await query(`
    select order_id, role, last_read_at
    from thread_reads
    order by role asc, order_id asc
  `);

  const state = { RAMP: {}, OFFICE: {} };
  for (const row of result.rows) {
    if (!state[row.role]) state[row.role] = {};
    state[row.role][row.order_id] = new Date(row.last_read_at).getTime();
  }
  return state;
}

export async function upsertThreadRead({ orderId, role, lastReadAt }) {
  requireField(orderId, 'orderId');
  requireField(role, 'role');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    if (!store.threadReads[role]) store.threadReads[role] = {};
    store.threadReads[role][orderId] = lastReadAt ? new Date(lastReadAt).getTime() : Date.now();
    saveLocalStore(store);
    return {
      orderId,
      role,
      lastReadAt: store.threadReads[role][orderId],
    };
  }

  return withTransaction(async (client) => {
    await client.query(`
      insert into thread_reads (id, order_id, role, last_read_at)
      values ($1, $2, $3, coalesce($4, now()))
      on conflict (order_id, role)
      do update set last_read_at = excluded.last_read_at
    `, [
      `thr-${orderId}-${role}`,
      orderId,
      role,
      lastReadAt || null,
    ]);

    const result = await client.query(`
      select order_id, role, last_read_at
      from thread_reads
      where order_id = $1 and role = $2
    `, [orderId, role]);

    const row = result.rows[0];
    return {
      orderId: row.order_id,
      role: row.role,
      lastReadAt: new Date(row.last_read_at).getTime(),
    };
  });
}

export async function authenticateUser({ username, password }) {
  requireField(username, 'username');
  requireField(password, 'password');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    const user = store.users.find((item) => item.username === username && item.active);
    if (!user) return null;

    const hashMatches = user.passwordHash ? verifyPassword(password, user.passwordHash) : false;
    const plainMatches = user.password === password;
    const matches = hashMatches || plainMatches;
    if (!matches) return null;

    if (!hashMatches) {
      user.passwordHash = hashPassword(password);
    }

    user.lastLoginAt = new Date().toISOString();
    saveLocalStore(store);
    return mapLocalUser(user);
  }

  const result = await query(`
    select id, username, password, password_hash, role, display_name, active, must_change_password
    from app_users
    where username = $1 and active = true
    limit 1
  `, [username]);

  const row = result.rows[0];
  if (!row) return null;

  const matches = row.password_hash
    ? verifyPassword(password, row.password_hash)
    : row.password === password;
  if (!matches) return null;

  const nextPasswordHash = row.password_hash || hashPassword(password);
  await query(`
    update app_users
    set password_hash = $2,
        last_login_at = now()
    where id = $1
  `, [row.id, nextPasswordHash]);

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    active: row.active,
    mustChangePassword: row.must_change_password,
  };
}

export async function changeUserPassword({ username, currentPassword, newPassword }) {
  requireField(username, 'username');
  requireField(currentPassword, 'currentPassword');
  requireField(newPassword, 'newPassword');

  if (!env.databaseUrl) {
    const store = getLocalStore();
    const user = store.users.find((item) => item.username === username && item.password === currentPassword && item.active);
    if (!user) return null;
    user.password = newPassword;
    user.mustChangePassword = false;
    saveLocalStore(store);
    return mapLocalUser(user);
  }

  const result = await query(`
    update app_users
    set password = $3,
        must_change_password = false
    where username = $1 and password = $2 and active = true
    returning id, username, role, display_name, active, must_change_password
  `, [username, currentPassword, newPassword]);

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    active: row.active,
    mustChangePassword: row.must_change_password,
  };
}

function validateOrderPatch(currentOrder, patch) {
  if (!currentOrder || patch.status === undefined || patch.status === null) return;

  const currentStatus = normalizeOrderStatus(currentOrder.status);
  const nextStatus = normalizeOrderStatus(patch.status);

  if (currentStatus === nextStatus) return;

  if (!canTransitionOrder(currentStatus, nextStatus)) {
    throw new AppError(
      `Invalid order status transition: ${currentOrder.status} -> ${patch.status}`,
      400,
      { currentStatus: currentOrder.status, nextStatus: patch.status }
    );
  }
}

function mapCustomerRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    tailNumber: row.tail_number,
    aircraftType: row.aircraft_type,
    ownerName: row.owner_name,
    pilotName: row.pilot_name,
    phone: row.phone,
    email: row.email,
    company: row.company,
    homeBase: row.home_base,
    notes: row.notes,
    source: row.source,
  };
}

function mapOrderRow(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    createdAt: row.created_at,
    status: row.status,
    statusUpdatedAt: row.status_updated_at,
    fuelType: row.fuel_type,
    fuelRequestedGallons: row.fuel_requested_gallons,
    fuelActualGallons: row.fuel_actual_gallons,
    hangarOvernight: row.hangar_overnight,
    services: row.services || [],
    notes: row.notes,
    completionNotes: row.completion_notes,
    completedAt: row.completed_at,
    arrivalAt: row.arrival_at,
    departureDate: row.departure_date,
    departureTime: row.departure_time,
    purpose: row.purpose,
    source: row.source,
    preDepartureSent: row.pre_departure_sent,
    preDepartureSentAt: row.pre_departure_sent_at,
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    text: row.text,
    sender: row.sender_role,
    senderRole: row.sender_role,
    createdAt: row.created_at,
  };
}

function mapAlertRow(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    type: row.type,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    submittedBy: row.submitted_by,
  };
}

function getLocalStore() {
  ensureLocalStore();
  return JSON.parse(readFileSync(LOCAL_STORE_PATH, 'utf8'));
}

function saveLocalStore(store) {
  mkdirSync(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  writeFileSync(LOCAL_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function ensureLocalStore() {
  if (existsSync(LOCAL_STORE_PATH)) return;
  saveLocalStore(createDefaultLocalStore());
}

function createDefaultLocalStore() {
  return {
    customers: [],
    orders: [],
    alerts: [],
    messages: [],
    threadReads: { RAMP: {}, OFFICE: {} },
    users: defaultLocalUsers(),
  };
}

function defaultLocalUsers() {
  return [
    seedUser('steve', 'ADMIN', 'Steve', 'airboss-steve'),
    seedUser('tacie', 'OFFICE', 'Tacie', 'airboss-tacie'),
    seedUser('lindsey', 'OFFICE', 'Lindsey', 'airboss-office'),
    seedUser('lizbeth', 'OFFICE', 'Lizbeth', 'airboss-office'),
    seedUser('amanda', 'OFFICE', 'Amanda', 'airboss-office'),
    seedUser('ramp', 'RAMP', 'Ramp', 'airboss-ramp'),
    seedUser('neil', 'RAMP', 'Neil', 'airboss-ramp'),
    seedUser('john', 'RAMP', 'John', 'airboss-ramp'),
    seedUser('wade', 'RAMP', 'Wade', 'airboss-ramp'),
    seedUser('todd', 'RAMP', 'Todd', 'airboss-ramp'),
    seedUser('clark', 'RAMP', 'Clark', 'airboss-ramp'),
    seedUser('mark', 'RAMP', 'Mark', 'airboss-ramp'),
    seedUser('kiosk', 'KIOSK', 'Kiosk', 'airboss-kiosk'),
  ];
}

function seedUser(username, role, displayName, password) {
  return {
    id: `user-${username}`,
    username,
    password,
    role,
    displayName,
    active: true,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
}

function mapLocalUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
  };
}

function upsertById(items, item) {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index === -1) {
    items.push(item);
    return;
  }
  items[index] = item;
}
