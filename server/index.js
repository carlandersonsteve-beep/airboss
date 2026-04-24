import http from 'node:http';
import { URL } from 'node:url';
import { bootstrapPayload } from './lib/bootstrap.js';
import { createRouter } from './lib/router.js';
import { env } from './lib/env.js';
import { schemaSql } from './db/schema.js';
import { tryServeStatic } from './lib/static.js';
import { createCheckInToken, createSessionToken, verifyCheckInToken, verifySessionToken } from './lib/auth.js';
import { query } from './db/client.js';
import {
  authenticateUser,
  changeUserPassword,
  createAlert,
  createAppSession,
  createCustomer,
  createOrder,
  createOrderMessage,
  deleteAlert,
  findReturningCheckInMatch,
  getAppSession,
  listAlerts,
  listOrderMessages,
  listOrders,
  normalizeTailNumber,
  revokeAppSession,
  resolveAlert,
  touchAppSession,
  updateOrder,
  upsertThreadRead,
} from './db/repositories.js';
import { AppError, requireField } from './lib/errors.js';

const router = createRouter();

router.get('/health', async () => {
  const readiness = await getReadiness();
  return {
    ok: readiness.ok,
    service: 'groundcore-backend',
    mode: readiness.mode,
    databaseUrlConfigured: Boolean(env.databaseUrl),
    ready: readiness.ok,
    checks: readiness.checks,
  };
});

router.get('/bootstrap', async ({ req }) => {
  if (env.databaseUrl) {
    await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return bootstrapPayload();
});

router.get('/config', async () => ({
  ok: true,
  appMode: env.databaseUrl ? 'shared' : 'local-dev',
  storageMode: env.databaseUrl ? 'postgres' : 'local-file',
  requiresSharedBackend: Boolean(env.databaseUrl),
}));

router.get('/schema.sql', async ({ req }) => {
  if (env.databaseUrl) {
    await requireSession(req, ['ADMIN']);
  }
  return { sql: schemaSql };
});

router.get('/orders', async ({ req }) => {
  if (env.databaseUrl) {
    await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return {
    ok: true,
    items: await listOrders(),
  };
});

router.get('/checkin/session', async ({ req }) => {
  validateCheckInOrigin(req);
  const token = createCheckInToken({ channel: 'public-kiosk' }, env.checkinSecret);
  return {
    ok: true,
    checkinToken: token,
    cookie: createCheckInCookie(token),
    expiresInSeconds: 60 * 10,
  };
});

router.get('/checkin/lookup', async ({ requestUrl, req }) => {
  requireCheckInSession(req);
  const tail = requestUrl.searchParams.get('tail') || '';
  const normalizedTail = normalizeTailNumber(tail);
  const match = await findReturningCheckInMatch(normalizedTail);

  return {
    ok: true,
    tail,
    normalizedTail,
    matched: Boolean(match),
    match: sanitizeCheckInMatch(match),
  };
});

router.get('/alerts', async ({ req }) => {
  if (env.databaseUrl) {
    await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return {
    ok: true,
    items: await listAlerts(),
  };
});

router.get(/^\/orders\/([^/]+)\/messages$/, async ({ params, req }) => {
  if (env.databaseUrl) {
    await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return {
    ok: true,
    orderId: params[0],
    items: await listOrderMessages(params[0]),
  };
});

router.post('/login', async ({ body, req }) => {
  const user = await authenticateUser({
    username: body?.username,
    password: body?.password,
  });

  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }

  const sessionRecord = await issueAppSession(user, req);
  return {
    ok: true,
    user: {
      ...user,
      token: createSessionToken({ username: user.username, role: user.role, sessionId: sessionRecord.id }, env.sessionSecret),
    },
  };
});

router.post('/change-password', async ({ body, req }) => {
  const user = await changeUserPassword({
    username: body?.username,
    currentPassword: body?.currentPassword,
    newPassword: body?.newPassword,
  });

  if (!user) {
    throw new AppError('Current password is incorrect', 401);
  }

  const priorSession = getSessionTokenPayload(req);
  if (priorSession?.sessionId) {
    await revokeAppSession(priorSession.sessionId);
  }

  const sessionRecord = await issueAppSession(user, req);
  return {
    ok: true,
    user: {
      ...user,
      token: createSessionToken({ username: user.username, role: user.role, sessionId: sessionRecord.id }, env.sessionSecret),
    },
  };
});

router.post('/logout', async ({ req }) => {
  const session = getSessionTokenPayload(req);
  if (session?.sessionId) {
    await revokeAppSession(session.sessionId);
  }
  return { ok: true };
});

router.post('/customers', async ({ body, req }) => {
  await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  return {
    ok: true,
    item: await createCustomer(body || {}),
  };
});

router.post('/orders', async ({ body, req }) => {
  await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  return {
    ok: true,
    item: await createOrder(body || {}),
  };
});

router.post('/checkin/customers', async ({ body, req }) => {
  requireCheckInSession(req);
  const payload = body || {};
  if (payload.source && payload.source !== 'kiosk') {
    throw new AppError('Invalid check-in customer source', 400);
  }
  return {
    ok: true,
    item: await createCustomer({
      ...payload,
      id: payload.id || crypto.randomUUID(),
      source: 'kiosk',
    }),
  };
});

router.post('/checkin/orders', async ({ body, req }) => {
  requireCheckInSession(req);
  const payload = body || {};
  if (payload.source && payload.source !== 'kiosk' && payload.source !== 'kiosk-checkin') {
    throw new AppError('Invalid check-in order source', 400);
  }
  return {
    ok: true,
    item: await createOrder({
      ...payload,
      id: payload.id || crypto.randomUUID(),
      status: payload.status || 'pending',
      source: 'kiosk-checkin',
    }),
  };
});

router.post('/messages', async ({ body, req }) => {
  if (env.databaseUrl) {
    await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
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
  await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
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
  await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  return {
    ok: true,
    item: await createAlert({
      ...(body || {}),
      id: body?.id || crypto.randomUUID(),
    }),
  };
});

router.post(/^\/alerts\/([^/]+)\/resolve$/, async ({ params, req }) => {
  await requireSession(req, ['ADMIN', 'OFFICE']);
  return {
    ok: true,
    item: await resolveAlert(params[0]),
  };
});

router.delete(/^\/alerts\/([^/]+)$/, async ({ params, req }) => {
  await requireSession(req, ['ADMIN', 'OFFICE']);
  return {
    ok: true,
    removed: await deleteAlert(params[0]),
  };
});

router.patch(/^\/orders\/([^/]+)$/, async ({ params, body, req }) => {
  if (env.databaseUrl) {
    await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
  return {
    ok: true,
    item: await updateOrder(params[0], body || {}),
  };
});

router.post(/^\/orders\/([^/]+)\/read$/, async ({ params, body, req }) => {
  if (env.databaseUrl) {
    await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  }
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

    sendJson(res, result.statusCode || 200, result.body, result.headers || {});
  } catch (error) {
    if (error instanceof AppError) {
      console.error('GroundCore app error:', req.method, req.url, error.message, error.details || null);
      sendJson(res, error.statusCode || 400, {
        ok: false,
        error: error.message,
        details: error.details || null,
      });
      return;
    }

    console.error('GroundCore request failed:', req.method, req.url, error instanceof Error ? error.stack || error.message : String(error));
    sendJson(res, 500, {
      ok: false,
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

ensureRuntimeReady()
  .then(() => {
    server.listen(env.port, env.host, () => {
      const displayHost = env.host === '0.0.0.0' ? 'localhost' : env.host;
      console.log(`GroundCore backend listening on http://${displayHost}:${env.port}`);
    });
  })
  .catch((error) => {
    console.error('GroundCore startup failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });

function getSessionTokenPayload(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  return verifySessionToken(token, env.sessionSecret);
}

async function issueAppSession(user, req) {
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  return createAppSession({
    username: user.username,
    role: user.role,
    expiresAt,
    userAgent: req.headers['user-agent'] || '',
    ipAddress: getRequestIp(req),
  });
}

async function requireSession(req, allowedRoles = []) {
  const session = getSessionTokenPayload(req);

  if (!session) {
    throw new AppError('Authentication required', 401);
  }

  if (env.databaseUrl) {
    if (!session.sessionId) {
      throw new AppError('Session invalid', 401);
    }
    const storedSession = await getAppSession(session.sessionId);
    if (!storedSession || storedSession.username !== session.username || storedSession.role !== session.role) {
      throw new AppError('Session expired or revoked', 401);
    }
    await touchAppSession(storedSession.id);
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    throw new AppError('Forbidden', 403, { requiredRoles: allowedRoles, actualRole: session.role });
  }

  return session;
}

function requireCheckInSession(req) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  const cookies = parseCookies(req.headers.cookie || '');
  const token = bearerToken || cookies.groundcore_checkin;
  const session = verifyCheckInToken(token, env.checkinSecret);
  if (!session) {
    throw new AppError('Valid check-in session required', 401);
  }
  return session;
}

function sanitizeCheckInMatch(match) {
  if (!match?.customer) return null;
  return {
    matched: true,
    normalizedTail: match.normalizedTail,
    customer: {
      tailNumber: match.customer.tailNumber || '',
      aircraftType: match.customer.aircraftType || '',
      pilotName: match.customer.pilotName || '',
      email: match.customer.email || '',
      phone: match.customer.phone || '',
      company: match.customer.company || '',
    },
  };
}

function validateCheckInOrigin(req) {
  if (!env.databaseUrl) return;

  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const host = req.headers.host || '';
  const allowedPrefixes = [`https://${host}`, `http://${host}`];

  const originAllowed = !origin || allowedPrefixes.some((prefix) => origin.startsWith(prefix));
  const refererAllowed = !referer || allowedPrefixes.some((prefix) => referer.startsWith(prefix));

  if (!originAllowed || !refererAllowed) {
    throw new AppError('Invalid check-in origin', 403);
  }
}

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf('=');
        return idx === -1
          ? [part, '']
          : [decodeURIComponent(part.slice(0, idx)), decodeURIComponent(part.slice(idx + 1))];
      })
  );
}

function createCheckInCookie(token) {
  return `groundcore_checkin=${encodeURIComponent(token)}; Max-Age=600; Path=/; SameSite=Lax`;
}

async function ensureRuntimeReady() {
  if (!env.databaseUrl) return;
  await query(schemaSql);
}

async function getReadiness() {
  if (!env.databaseUrl) {
    return {
      ok: true,
      mode: 'local-file-store',
      checks: {
        databaseConfigured: false,
        schemaReady: true,
      },
    };
  }

  try {
    await query('select 1 as ok');
    await query(schemaSql);
    return {
      ok: true,
      mode: 'postgres',
      checks: {
        databaseConfigured: true,
        databaseReachable: true,
        schemaReady: true,
      },
    };
  } catch (error) {
    return {
      ok: false,
      mode: 'postgres',
      checks: {
        databaseConfigured: true,
        databaseReachable: false,
        schemaReady: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...extraHeaders,
  };

  if (payload && typeof payload === 'object' && payload.cookie && !headers['Set-Cookie']) {
    headers['Set-Cookie'] = payload.cookie;
  }

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload, null, 2));
}
