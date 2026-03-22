import http from 'node:http';
import { URL } from 'node:url';
import { bootstrapPayload } from './lib/bootstrap.js';
import { createRouter } from './lib/router.js';
import { env } from './lib/env.js';
import { schemaSql } from './db/schema.js';
import { tryServeStatic } from './lib/static.js';
import {
  authenticateUser,
  changeUserPassword,
  createAlert,
  createCustomer,
  createOrder,
  createOrderMessage,
  deleteAlert,
  listAlerts,
  listOrderMessages,
  listOrders,
  resolveAlert,
  updateOrder,
  upsertThreadRead,
} from './db/repositories.js';
import { AppError, requireField } from './lib/errors.js';

const router = createRouter();

router.get('/health', async () => ({
  ok: true,
  service: 'airboss-backend',
  mode: env.databaseUrl ? 'postgres-configured' : 'postgres-missing-config',
  databaseUrlConfigured: Boolean(env.databaseUrl),
}));

router.get('/bootstrap', async () => bootstrapPayload());

router.get('/schema.sql', async () => ({ sql: schemaSql }));

router.get('/orders', async () => ({
  ok: true,
  items: await listOrders(),
}));

router.get('/alerts', async () => ({
  ok: true,
  items: await listAlerts(),
}));

router.get(/^\/orders\/([^/]+)\/messages$/, async ({ params }) => ({
  ok: true,
  orderId: params[0],
  items: await listOrderMessages(params[0]),
}));

router.post('/login', async ({ body }) => {
  const user = await authenticateUser({
    username: body?.username,
    password: body?.password,
  });

  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }

  return {
    ok: true,
    user,
  };
});

router.post('/change-password', async ({ body }) => {
  const user = await changeUserPassword({
    username: body?.username,
    currentPassword: body?.currentPassword,
    newPassword: body?.newPassword,
  });

  if (!user) {
    throw new AppError('Current password is incorrect', 401);
  }

  return {
    ok: true,
    user,
  };
});

router.post('/customers', async ({ body }) => ({
  ok: true,
  item: await createCustomer(body || {}),
}));

router.post('/orders', async ({ body }) => ({
  ok: true,
  item: await createOrder(body || {}),
}));

router.post(/^\/orders\/([^/]+)\/messages$/, async ({ params, body }) => ({
  ok: true,
  item: await createOrderMessage({
    ...(body || {}),
    id: body?.id || crypto.randomUUID(),
    orderId: params[0],
  }),
}));

router.post('/alerts', async ({ body }) => ({
  ok: true,
  item: await createAlert({
    ...(body || {}),
    id: body?.id || crypto.randomUUID(),
  }),
}));

router.post(/^\/alerts\/([^/]+)\/resolve$/, async ({ params }) => ({
  ok: true,
  item: await resolveAlert(params[0]),
}));

router.delete(/^\/alerts\/([^/]+)$/, async ({ params }) => ({
  ok: true,
  removed: await deleteAlert(params[0]),
}));

router.patch(/^\/orders\/([^/]+)$/, async ({ params, body }) => ({
  ok: true,
  item: await updateOrder(params[0], body || {}),
}));

router.post(/^\/orders\/([^/]+)\/read$/, async ({ params, body }) => {
  requireField(body?.role, 'role');
  const item = await upsertThreadRead({
    orderId: params[0],
    role: body.role,
    lastReadAt: body.lastReadAt ? new Date(body.lastReadAt).toISOString() : null,
  });

  return {
    ok: true,
    item,
  };
});

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && tryServeStatic(requestUrl, res)) {
      return;
    }

    const result = await router.handle(req, requestUrl);

    if (!result) {
      sendJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    sendJson(res, result.statusCode || 200, result.body);
  } catch (error) {
    if (error instanceof AppError) {
      sendJson(res, error.statusCode || 400, {
        ok: false,
        error: error.message,
        details: error.details || null,
      });
      return;
    }

    sendJson(res, 500, {
      ok: false,
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(env.port, () => {
  console.log(`AirBoss backend listening on http://localhost:${env.port}`);
});

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload, null, 2));
}
