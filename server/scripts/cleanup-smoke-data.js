import { env } from '../lib/env.js';
import { withTransaction } from '../db/client.js';

if (!env.databaseUrl) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: 'DATABASE_URL is not configured' }, null, 2));
  process.exit(0);
}

const result = await withTransaction(async (client) => {
  const customerResult = await client.query(`
    select id
    from customers
    where lower(coalesce(email, '')) like '%@example.com'
  `);
  const customerIds = customerResult.rows.map((row) => row.id);

  let deletedOrders = 0;
  let deletedCustomers = 0;
  if (customerIds.length > 0) {
    const orders = await client.query(`
      delete from orders
      where customer_id = any($1::text[])
      returning id
    `, [customerIds]);

    const customers = await client.query(`
      delete from customers
      where id = any($1::text[])
      returning id
    `, [customerIds]);
    deletedOrders = orders.rowCount;
    deletedCustomers = customers.rowCount;
  }

  const sessions = await client.query(`
    delete from app_sessions
    where username like 'smoke-%'
    returning id
  `);

  return {
    deletedOrders,
    deletedCustomers,
    deletedSessions: sessions.rowCount,
  };
});

console.log(JSON.stringify({ ok: true, ...result }, null, 2));
