export function createRouter() {
  const routes = [];

  const add = (method, matcher, handler) => {
    routes.push({ method, matcher, handler });
  };

  return {
    get: (matcher, handler) => add('GET', matcher, handler),
    post: (matcher, handler) => add('POST', matcher, handler),
    patch: (matcher, handler) => add('PATCH', matcher, handler),
    delete: (matcher, handler) => add('DELETE', matcher, handler),

    async handle(req, requestUrl) {
      if (req.method === 'OPTIONS') {
        return { statusCode: 204, body: {} };
      }

      for (const route of routes) {
        if (route.method !== req.method) continue;
        const matched = matchRoute(route.matcher, requestUrl.pathname);
        if (!matched) continue;

        const body = await parseJsonBody(req);
        const payload = await route.handler({
          req,
          requestUrl,
          params: matched.params,
          body,
          query: Object.fromEntries(requestUrl.searchParams.entries()),
        });

        return normalizeResponse(payload);
      }

      return null;
    },
  };
}

function matchRoute(matcher, pathname) {
  if (typeof matcher === 'string') {
    return matcher === pathname ? { params: [] } : null;
  }

  if (matcher instanceof RegExp) {
    const result = pathname.match(matcher);
    return result ? { params: result.slice(1) } : null;
  }

  throw new Error(`Unsupported route matcher: ${String(matcher)}`);
}

async function parseJsonBody(req) {
  if (req.method === 'GET' || req.method === 'DELETE') return null;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: raw };
  }
}

function normalizeResponse(payload) {
  if (payload && typeof payload === 'object' && 'statusCode' in payload && 'body' in payload) {
    return payload;
  }

  return { statusCode: 200, body: payload };
}
