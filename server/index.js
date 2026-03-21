import http from 'node:http';
import { URL } from 'node:url';
import { bootstrapPayload } from './lib/bootstrap.js';
import { createRouter } from './lib/router.js';
import { env } from './lib/env.js';
import { schemaSql } from './db/schema.js';

const router = createRouter();

router.get('/health', async () => ({
  ok: true,
  service: 'airboss-backend',
  mode: 'scaffold',
  databaseUrlConfigured: Boolean(env.databaseUrl),
}));

router.get('/bootstrap', async () => bootstrapPayload());

router.get('/schema.sql', async () => ({ sql: schemaSql }));

router.get('/orders', async () => ({
  ok: true,
  items: [],
  note: 'Orders API scaffolded. Back this with Postgres next.',
}));

router.get('/alerts', async () => ({
  ok: true,
  items: [],
  note: 'Alerts API scaffolded. Back this with Postgres next.',
}));

router.get(/^\/orders\/([^/]+)\/messages$/, async ({ params }) => ({
  ok: true,
  orderId: params[0],
  items: [],
  note: 'Order messages API scaffolded. Back this with Postgres next.',
}));

router.post('/orders', async ({ body }) => ({
  ok: true,
  accepted: body,
  note: 'POST /orders scaffold only. Persist to Postgres next.',
}));

router.post(/^\/orders\/([^/]+)\/messages$/, async ({ params, body }) => ({
  ok: true,
  orderId: params[0],
  accepted: body,
  note: 'POST /orders/:id/messages scaffold only. Persist to Postgres next.',
}));

router.post('/alerts', async ({ body }) => ({
  ok: true,
  accepted: body,
  note: 'POST /alerts scaffold only. Persist to Postgres next.',
}));

router.post(/^\/orders\/([^/]+)\/read$/, async ({ params, body }) => ({
  ok: true,
  orderId: params[0],
  accepted: body,
  note: 'POST /orders/:id/read scaffold only. Persist to Postgres next.',
}));

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const result = await router.handle(req, requestUrl);

    if (!result) {
      sendJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    sendJson(res, result.statusCode || 200, result.body);
  } catch (error) {
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
