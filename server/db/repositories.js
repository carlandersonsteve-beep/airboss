import { query, withTransaction } from './client.js';
import { requireField } from '../lib/errors.js';

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
  await query(`delete from alerts where id = $1`, [alertId]);
  return true;
}

export async function listOrderMessages(orderId = null) {
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
