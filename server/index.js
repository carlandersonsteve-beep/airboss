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
  getAppUserByUsername,
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
import { securityHeaders } from './lib/security.js';

const router = createRouter();
const loginThrottleState = new Map();

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
  const username = String(body?.username || '').trim();
  const throttle = getLoginThrottleStatus(username, req);
  if (throttle.blocked) {
    auditEvent('auth.login.blocked', {
      req,
      actor: username || 'unknown',
      retryAfterSeconds: throttle.retryAfterSeconds,
    });
    return {
      statusCode: 429,
      headers: { 'Retry-After': String(throttle.retryAfterSeconds) },
      body: {
        ok: false,
        error: 'Too many login attempts',
        details: { retryAfterSeconds: throttle.retryAfterSeconds },
      },
    };
  }

  const user = await authenticateUser({
    username,
    password: body?.password,
  });

  if (!user) {
    const failure = recordLoginFailure(username, req);
    auditEvent('auth.login.failed', {
      req,
      actor: username || 'unknown',
      retryAfterSeconds: failure.blocked ? failure.retryAfterSeconds : 0,
      blocked: failure.blocked,
    });
    if (failure.blocked) {
      return {
        statusCode: 429,
        headers: { 'Retry-After': String(failure.retryAfterSeconds) },
        body: {
          ok: false,
          error: 'Too many login attempts',
          details: { retryAfterSeconds: failure.retryAfterSeconds },
        },
      };
    }
    throw new AppError('Invalid username or password', 401);
  }

  clearLoginThrottle(username, req);
  const sessionRecord = await issueAppSession(user, req);
  const sessionToken = createSessionToken({ username: user.username, role: user.role, sessionId: sessionRecord.id }, env.sessionSecret);
  auditEvent('auth.login.succeeded', {
    req,
    actor: user.username,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
  return {
    ok: true,
    user: {
      ...user,
    },
    cookie: createSessionCookie(sessionToken),
  };
});

router.post('/change-password', async ({ body, req }) => {
  const session = await requireSession(req, [], { allowPasswordSetup: true });
  const user = await changeUserPassword({
    username: session.username,
    currentPassword: body?.currentPassword,
    newPassword: body?.newPassword,
  });

  if (!user) {
    auditEvent('auth.password_change.failed', {
      req,
      actor: session.username,
      role: session.role,
    });
    throw new AppError('Current password is incorrect', 401);
  }

  const priorSession = getSessionTokenPayload(req);
  if (priorSession?.sessionId) {
    await revokeAppSession(priorSession.sessionId);
  }

  const sessionRecord = await issueAppSession(user, req);
  const sessionToken = createSessionToken({ username: user.username, role: user.role, sessionId: sessionRecord.id }, env.sessionSecret);
  auditEvent('auth.password_change.succeeded', {
    req,
    actor: user.username,
    role: user.role,
  });
  return {
    ok: true,
    user: {
      ...user,
    },
    cookie: createSessionCookie(sessionToken),
  };
});

router.post('/logout', async ({ req }) => {
  const session = getSessionTokenPayload(req);
  if (session?.sessionId) {
    await revokeAppSession(session.sessionId);
  }
  if (session?.username) {
    auditEvent('auth.logout', {
      req,
      actor: session.username,
      role: session.role,
    });
  }
  return { ok: true, cookie: clearSessionCookie() };
});

router.post('/customers', async ({ body, req }) => {
  const session = await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  const item = await createCustomer(body || {});
  auditEvent('customer.created', {
    req,
    actor: session.username,
    role: session.role,
    customerId: item?.id,
    tailNumber: item?.tailNumber,
  });
  return {
    ok: true,
    item,
  };
});

router.post('/orders', async ({ body, req }) => {
  const session = await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  const item = await createOrder(body || {});
  auditEvent('order.created', {
    req,
    actor: session.username,
    role: session.role,
    orderId: item?.id,
    customerId: item?.customerId,
    tailNumber: item?.tailNumber,
    statusTo: item?.status,
  });
  return {
    ok: true,
    item,
  };
});

router.post('/checkin/customers', async ({ body, req }) => {
  requireCheckInSession(req);
  const payload = body || {};
  if (payload.source && payload.source !== 'kiosk') {
    throw new AppError('Invalid check-in customer source', 400);
  }
  const item = await createCustomer({
    ...payload,
    id: payload.id || crypto.randomUUID(),
    source: 'kiosk',
  });
  auditEvent('checkin.customer.created', {
    req,
    actor: 'public-kiosk',
    role: 'KIOSK',
    customerId: item?.id,
    tailNumber: item?.tailNumber,
  });
  return {
    ok: true,
    item,
  };
});

router.post('/checkin/orders', async ({ body, req }) => {
  requireCheckInSession(req);
  const payload = body || {};
  if (payload.source && payload.source !== 'kiosk' && payload.source !== 'kiosk-checkin') {
    throw new AppError('Invalid check-in order source', 400);
  }
  const item = await createOrder({
    ...payload,
    id: payload.id || crypto.randomUUID(),
    status: payload.status || 'pending',
    source: 'kiosk-checkin',
  });
  auditEvent('checkin.order.created', {
    req,
    actor: 'public-kiosk',
    role: 'KIOSK',
    orderId: item?.id,
    customerId: item?.customerId,
    tailNumber: item?.tailNumber,
    statusTo: item?.status,
  });
  return {
    ok: true,
    item,
  };
});

router.post('/messages', async ({ body, req }) => {
  const session = env.databaseUrl
    ? await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP'])
    : getSessionTokenPayload(req);
  const senderRole = resolveAuthorizedRole(session);
  const item = await createOrderMessage({
    ...(body || {}),
    id: body?.id || crypto.randomUUID(),
    orderId: null,
    senderRole,
    sender: senderRole,
  });
  auditEvent('message.created', {
    req,
    actor: session?.username || senderRole || 'local',
    role: session?.role || senderRole,
    orderId: null,
    tailNumber: item?.tailNumber,
    messageLength: item?.text?.length || 0,
  });
  return {
    ok: true,
    item,
  };
});

router.post(/^\/orders\/([^/]+)\/messages$/, async ({ params, body, req }) => {
  const session = await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  const senderRole = resolveAuthorizedRole(session);
  const item = await createOrderMessage({
    ...(body || {}),
    id: body?.id || crypto.randomUUID(),
    orderId: params[0],
    senderRole,
    sender: senderRole,
  });
  auditEvent('message.created', {
    req,
    actor: session.username,
    role: session.role,
    orderId: params[0],
    tailNumber: item?.tailNumber,
    messageLength: item?.text?.length || 0,
  });
  return {
    ok: true,
    item,
  };
});

router.post('/alerts', async ({ body, req }) => {
  const session = await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP']);
  const item = await createAlert({
    ...(body || {}),
    id: body?.id || crypto.randomUUID(),
  });
  auditEvent('alert.created', {
    req,
    actor: session.username,
    role: session.role,
    alertId: item?.id,
    orderId: item?.orderId,
    alertType: item?.type,
  });
  return {
    ok: true,
    item,
  };
});

router.post(/^\/alerts\/([^/]+)\/resolve$/, async ({ params, req }) => {
  const session = await requireSession(req, ['ADMIN', 'OFFICE']);
  const item = await resolveAlert(params[0]);
  auditEvent('alert.resolved', {
    req,
    actor: session.username,
    role: session.role,
    alertId: params[0],
    orderId: item?.orderId,
    alertType: item?.type,
  });
  return {
    ok: true,
    item,
  };
});

router.delete(/^\/alerts\/([^/]+)$/, async ({ params, req }) => {
  const session = await requireSession(req, ['ADMIN', 'OFFICE']);
  const removed = await deleteAlert(params[0]);
  auditEvent('alert.deleted', {
    req,
    actor: session.username,
    role: session.role,
    alertId: params[0],
    removed,
  });
  return {
    ok: true,
    removed,
  };
});

router.patch(/^\/orders\/([^/]+)$/, async ({ params, body, req }) => {
  const session = env.databaseUrl
    ? await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP'])
    : getSessionTokenPayload(req);
  const item = await updateOrder(params[0], body || {});
  auditEvent('order.updated', {
    req,
    actor: session?.username || session?.role || 'local',
    role: session?.role || null,
    orderId: params[0],
    tailNumber: item?.tailNumber,
    statusTo: item?.status,
    patchKeys: Object.keys(body || {}),
  });
  return {
    ok: true,
    item,
  };
});

router.post(/^\/orders\/([^/]+)\/read$/, async ({ params, body, req }) => {
  const session = env.databaseUrl
    ? await requireSession(req, ['ADMIN', 'OFFICE', 'RAMP'])
    : getSessionTokenPayload(req);
  const role = resolveAuthorizedRole(session) || body?.role;
  requireField(role, 'role');
  const item = await upsertThreadRead({
    orderId: params[0],
    role,
    lastReadAt: body?.lastReadAt ? new Date(body.lastReadAt).toISOString() : null,
  });
  auditEvent('thread.read.updated', {
    req,
    actor: session?.username || role,
    role,
    orderId: params[0],
    lastReadAt: item?.lastReadAt || null,
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
      sendJson(res, 404, { ok: false, error: 'Not found' }, {}, req);
      return;
    }

    sendJson(res, result.statusCode || 200, result.body, result.headers || {}, req);
  } catch (error) {
    if (error instanceof AppError) {
      logAppError(req, error);
      sendJson(res, error.statusCode || 400, {
        ok: false,
        error: error.message,
        details: error.details || null,
      }, {}, req);
      return;
    }

    console.error('GroundCore request failed:', req.method, req.url, error instanceof Error ? error.stack || error.message : String(error));
    sendJson(res, 500, {
      ok: false,
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : String(error),
    }, {}, req);
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

function isExpectedAuthNoise(req, error) {
  if (!(error instanceof AppError)) return false;

  const statusCode = error.statusCode || 400;
  const path = String(req?.url || '').split('?')[0];
  const message = error.message || '';

  if (
    statusCode === 401
    && req?.method === 'GET'
    && path === '/bootstrap'
    && ['Authentication required', 'Session invalid', 'Session expired or revoked'].includes(message)
  ) {
    return true;
  }

  if (statusCode === 401 && req?.method === 'POST' && path === '/login' && message === 'Invalid username or password') {
    return true;
  }

  if (statusCode === 403 && message === 'Password change required') {
    return true;
  }

  return false;
}

function logAppError(req, error) {
  const path = String(req?.url || '').split('?')[0];
  const logArgs = [req.method, path, error.message, error.details || null];
  if (isExpectedAuthNoise(req, error)) {
    console.warn('GroundCore auth event:', ...logArgs);
    return;
  }
  console.error('GroundCore app error:', ...logArgs);
}

function auditEvent(event, details = {}) {
  const { req, ...rest } = details || {};
  const payload = {
    ts: new Date().toISOString(),
    event,
    method: req?.method || null,
    path: req ? String(req.url || '').split('?')[0] : null,
    ipAddress: req ? getRequestIp(req) : null,
    ...rest,
  };
  console.log('GroundCore audit:', JSON.stringify(payload));
}

function getLoginThrottleStatus(username, req) {
  if (!env.databaseUrl || env.loginRateLimitMaxAttempts <= 0) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const state = getThrottleEntry(getLoginThrottleKey(username, req));
  if (!state?.blockedUntil || state.blockedUntil <= Date.now()) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  return {
    blocked: true,
    retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntil - Date.now()) / 1000)),
  };
}

function recordLoginFailure(username, req) {
  if (!env.databaseUrl || env.loginRateLimitMaxAttempts <= 0) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const key = getLoginThrottleKey(username, req);
  const state = getThrottleEntry(key) || { attempts: [], blockedUntil: 0 };
  state.attempts = state.attempts.filter((ts) => now - ts <= env.loginRateLimitWindowMs);
  state.attempts.push(now);

  if (state.attempts.length >= env.loginRateLimitMaxAttempts) {
    state.blockedUntil = now + env.loginRateLimitBlockMs;
  }

  loginThrottleState.set(key, state);
  return {
    blocked: state.blockedUntil > now,
    retryAfterSeconds: state.blockedUntil > now ? Math.max(1, Math.ceil((state.blockedUntil - now) / 1000)) : 0,
  };
}

function clearLoginThrottle(username, req) {
  if (!env.databaseUrl || env.loginRateLimitMaxAttempts <= 0) return;
  loginThrottleState.delete(getLoginThrottleKey(username, req));
}

function getThrottleEntry(key) {
  const now = Date.now();
  const state = loginThrottleState.get(key);
  if (!state) return null;
  if (state.blockedUntil && state.blockedUntil <= now) {
    loginThrottleState.delete(key);
    return null;
  }
  state.attempts = (state.attempts || []).filter((ts) => now - ts <= env.loginRateLimitWindowMs);
  if (state.attempts.length === 0 && !state.blockedUntil) {
    loginThrottleState.delete(key);
    return null;
  }
  return state;
}

function getLoginThrottleKey(username, req) {
  return `${String(username || '').trim().toLowerCase()}::${getRequestIp(req)}`;
}

function getSessionTokenPayload(req) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  const cookies = parseCookies(req.headers.cookie || '');
  const token = bearerToken || cookies.groundcore_session;
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

async function requireSession(req, allowedRoles = [], options = {}) {
  const { allowPasswordSetup = false } = options;
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

  const user = await getAppUserByUsername(session.username);
  if (!user || !user.active) {
    throw new AppError('Session invalid', 401);
  }

  if (!allowPasswordSetup && user.mustChangePassword) {
    throw new AppError('Password change required', 403, { mustChangePassword: true });
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    throw new AppError('Forbidden', 403, { requiredRoles: allowedRoles, actualRole: session.role });
  }

  return {
    ...session,
    mustChangePassword: user.mustChangePassword,
  };
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
  const forwarded = env.trustProxy ? req.headers['x-forwarded-for'] : '';
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

function cookieSecurityFlags() {
  const secure = env.isSecureCookieEnvironment ? '; Secure' : '';
  return `; HttpOnly; SameSite=Lax${secure}`;
}

function resolveAuthorizedRole(session) {
  if (!session?.role) return null;
  return session.role === 'ADMIN' ? 'OFFICE' : session.role;
}

function createCheckInCookie(token) {
  return `groundcore_checkin=${encodeURIComponent(token)}; Max-Age=600; Path=/${cookieSecurityFlags()}`;
}

function createSessionCookie(token) {
  return `groundcore_session=${encodeURIComponent(token)}; Max-Age=${12 * 60 * 60}; Path=/${cookieSecurityFlags()}`;
}

function clearSessionCookie() {
  return `groundcore_session=; Max-Age=0; Path=/${cookieSecurityFlags()}`;
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

function resolveAllowedOrigin(requestOrigin, req = null) {
  if (!requestOrigin) return 'null';

  const requestHost = req?.headers?.host || '';
  const sameOriginPrefixes = requestHost
    ? [`http://${requestHost}`, `https://${requestHost}`]
    : [];

  if (sameOriginPrefixes.some((prefix) => requestOrigin === prefix)) {
    return requestOrigin;
  }

  if (env.allowedOrigins.length === 0) return 'null';
  return env.allowedOrigins.includes(requestOrigin) ? requestOrigin : 'null';
}

function sendJson(res, statusCode, payload, extraHeaders = {}, req = null) {
  const requestOrigin = req?.headers?.origin || '';
  const allowOrigin = resolveAllowedOrigin(requestOrigin, req);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'no-store',
    ...securityHeaders(),
    'Vary': 'Origin',
    ...extraHeaders,
  };

  if (payload && typeof payload === 'object' && payload.cookie && !headers['Set-Cookie']) {
    headers['Set-Cookie'] = payload.cookie;
  }

  const responseBody = payload && typeof payload === 'object' && 'cookie' in payload
    ? Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'cookie'))
    : payload;

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(responseBody, null, 2));
}
