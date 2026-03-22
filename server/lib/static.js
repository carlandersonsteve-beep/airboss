import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

export function tryServeStatic(requestUrl, res) {
  const pathname = requestUrl.pathname;
  const filePath = resolvePath(pathname);
  if (!filePath) return false;
  if (!existsSync(filePath)) return false;
  const stat = statSync(filePath);
  if (!stat.isFile()) return false;

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
  });
  createReadStream(filePath).pipe(res);
  return true;
}

function resolvePath(pathname) {
  if (pathname === '/' || pathname === '/index' || pathname === '/index.html') {
    return path.join(ROOT, 'index.html');
  }

  if (pathname === '/kiosk' || pathname === '/kiosk.html') {
    return path.join(ROOT, 'kiosk.html');
  }

  const safePath = normalizePath(pathname);
  if (!safePath) return null;

  const allowedPrefixes = [
    'assets/',
    'src/',
    'css/',
    'js/',
    'manifest.webmanifest',
    'sw.js',
  ];

  const relative = safePath.replace(/^\//, '');
  if (!allowedPrefixes.some((prefix) => relative === prefix || relative.startsWith(prefix))) {
    return null;
  }

  return path.join(ROOT, relative);
}

function normalizePath(pathname) {
  const normalized = path.posix.normalize(pathname);
  if (normalized.includes('..')) return null;
  return normalized;
}
