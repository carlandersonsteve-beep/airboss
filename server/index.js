import http from 'node:http';
import { URL } from 'node:url';
import { bootstrapPayload } from './lib/bootstrap.js';
import { createRouter } from './lib/router.js';
import { env } from './lib/env.js';
import { schemaSql } from './db/schema.js';
import { tryServeStatic } from './lib/static.js';
import { createSessionToken, verifySessionToken } from './lib/auth.js';
import {
  authenticateUser,
  changeUserPassword,
  createAlert,
  createCustomer,
  createOrder,
  createOrderMessage,
  deleteAlert,
  findReturningCheckInMatch,
  listAlerts,
  listOrderMessages,
  listOrders,
  normalizeTailNumber,
  resolveAlert,
  updateOrder,
  upsertThreadRead,
} from './db/repositories.js';
import { AppError, requireField } from './lib/errors.js';

const router = createRouter();

router.get('/health', async () => ({
  ok: true,
  service: 'groundcore-backend',
  mode: env.databaseUrl ? 'postgres-configured' : 'local-file-store',
  databaseUrlConfigured: Boolean(env.databaseUrl),
}));

router.get('/bootstrap', async ({ req }) => {
  if (env.databaseUrl) {
    requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return bootstrapPayload();
});

router.get('/schema.sql', async ({ req }) => {
  if (env.databaseUrl) {
    requireSession(req, ['ADMIN']);
  }
  return { sql: schemaSql };
});

router.get('/orders', async ({ req }) => {
  if (env.databaseUrl) {
    requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return {
    ok: true,
    items: await listOrders(),
  };
});

router.get('/checkin/lookup', async ({ requestUrl }) => {
  const tail = requestUrl.searchParams.get('tail') || '';
  const normalizedTail = normalizeTailNumber(tail);
  const match = await findReturningCheckInMatch(normalizedTail);

  return {
    ok: true,
    tail,
    normalizedTail,
    matched: Boolean(match),
    match,
  };
});

router.get('/alerts', async ({ req }) => {
  if (env.databaseUrl) {
    requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return {
    ok: true,
    items: await listAlerts(),
  };
});

router.get(/^\/orders\/([^/]+)\/messages$/, async ({ params, req }) => {
  if (env.databaseUrl) {
    requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return {
    ok: true,
    orderId: params[0],
    items: await listOrderMessages(params[0]),
  };
});

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
    user: {
      ...user,
      token: createSessionToken({ username: user.username, role: user.role }, env.sessionSecret),
    },
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
    user: {
      ...user,
      token: createSessionToken({ username: user.username, role: user.role }, env.sessionSecret),
    },
  };
});

router.post('/customers', async ({ body, req }) => {
  const payload = body || {};
  if (env.databaseUrl && payload.source !== 'kiosk') {
    requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return {
    ok: true,
    item: await createCustomer(payload),
  };
});

router.post('/orders', async ({ body, req }) => {
  const payload = body || {};
  if (env.databaseUrl && payload.source !== 'kiosk-checkin') {
    requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return {
    ok: true,
    item: await createOrder(payload),
  };
});

router.post('/messages', async ({ body, req }) => {
  // Try session auth but allow fallback for local mode
  let session = null;
  try { session = requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']); } catch (_) {}
  if (!session && env.databaseUrl) throw new AppError('Authentication required', 401);
  return {
    ok: true,
    item: await createOrderMessage({
      ...(body || {}),
      id: body?.id || crypto.randomUUID(),
      orderId: null,
    }),
  };
});

router.post(/^\/orders\/([^/]+)\/messages$/, async ({ params, body, req }) => {
  requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  return {
    ok: true,
    item: await createOrderMessage({
      ...(body || {}),
      id: body?.id || crypto.randomUUID(),
      orderId: params[0],
    }),
  };
});

router.post('/alerts', async ({ body, req }) => {
  requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  return {
    ok: true,
    item: await createAlert({
      ...(body || {}),
      id: body?.id || crypto.randomUUID(),
    }),
  };
});

router.post(/^\/alerts\/([^/]+)\/resolve$/, async ({ params, req }) => {
  requireSession(req, ['ADMIN', 'OFFICE']);
  return {
    ok: true,
    item: await resolveAlert(params[0]),
  };
});

router.delete(/^\/alerts\/([^/]+)$/, async ({ params, req }) => {
  requireSession(req, ['ADMIN', 'OFFICE']);
  return {
    ok: true,
    removed: await deleteAlert(params[0]),
  };
});

router.patch(/^\/orders\/([^/]+)$/, async ({ params, body, req }) => {
  requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  return {
    ok: true,
    item: await updateOrder(params[0], body || {}),
  };
});

router.post(/^\/orders\/([^/]+)\/read$/, async ({ params, body, req }) => {
  requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
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

server.listen(env.port, env.host, () => {
  const displayHost = env.host === '0.0.0.0' ? 'localhost' : env.host;
  console.log(`GroundCore backend listening on http://${displayHost}:${env.port}`);
});

function requireSession(req, allowedRoles = []) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  const session = verifySessionToken(token, env.sessionSecret);

  if (!session) {
    throw new AppError('Authentication required', 401);
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    throw new AppError('Forbidden', 403, { requiredRoles: allowedRoles, actualRole: session.role });
  }

  return session;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(payload, null, 2));
}
