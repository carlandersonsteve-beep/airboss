#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { transform } from 'esbuild';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PAGES = [
  {
    name: 'index',
    input: path.join(ROOT, 'index.html'),
    output: path.join(ROOT, 'index.html'),
  },
  {
    name: 'kiosk',
    input: path.join(ROOT, 'kiosk.html'),
    output: path.join(ROOT, 'kiosk.html'),
  },
];

const GENERATED_DIR = path.join(ROOT, 'js', 'build');
const VENDOR_DIR = path.join(ROOT, 'js', 'vendor');
const CSS_DIR = path.join(ROOT, 'css');
const TMP_DIR = path.join(ROOT, '.tmp');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(from, to) {
  await ensureDir(path.dirname(to));
  await fs.copyFile(from, to);
}

function localizeBodyStyles(html) {
  return html
    .replace(/font-family:\s*'Inter',\s*sans-serif;/g, "font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;")
    .replace(/@import url\('https:\/\/fonts\.googleapis\.com[^\n]+\n/g, '')
    .replace(/background:\s*#3e2f23 url\('https:\/\/images\.pexels\.com[^']+'\) center center;/g, "background: radial-gradient(circle at top, rgba(201, 169, 97, 0.18), transparent 35%), linear-gradient(180deg, #4b3728 0%, #2b2017 100%);");
}

function replaceHeadAssets(html) {
  html = html.replace(/\s*<script[^>]+src="https:\/\/unpkg\.com\/react@18\/umd\/react\.production\.min\.js"[^>]*><\/script>/, '');
  html = html.replace(/\s*<script[^>]+src="https:\/\/unpkg\.com\/react-dom@18\/umd\/react-dom\.production\.min\.js"[^>]*><\/script>/, '');
  html = html.replace(/\s*<script[^>]+src="https:\/\/unpkg\.com\/@babel\/standalone\/babel\.min\.js"[^>]*><\/script>/, '');
  html = html.replace(/\s*<script[^>]+src="https:\/\/cdn\.tailwindcss\.com"[^>]*><\/script>/, '');
  html = html.replace(/\s*<link[^>]+href="https:\/\/fonts\.googleapis\.com[^>]+>/, '');

  const cssLink = '    <link rel="stylesheet" href="/css/tailwind.generated.css?v=20260519a">\n';
  if (!html.includes('/css/tailwind.generated.css')) {
    html = html.replace('</title>\n', '</title>\n' + cssLink + '    <script src="/js/vendor/react.production.min.js"></script>\n    <script src="/js/vendor/react-dom.production.min.js"></script>\n');
  }
  return html;
}

function extractBodyScripts(html) {
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  const scripts = [];
  let match;
  while ((match = scriptRegex.exec(html))) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    const srcMatch = attrs.match(/src="([^"]+)"/);
    const typeMatch = attrs.match(/type="([^"]+)"/);
    scripts.push({
      fullMatch: match[0],
      attrs,
      body,
      src: srcMatch ? srcMatch[1] : null,
      type: typeMatch ? typeMatch[1] : null,
    });
  }
  return scripts;
}

async function compileScript(sourcePath, outName) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const result = await transform(source, {
    loader: 'jsx',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    format: 'iife',
    minify: false,
    sourcefile: path.relative(ROOT, sourcePath),
  });
  const outPath = path.join(GENERATED_DIR, outName);
  await fs.writeFile(outPath, result.code, 'utf8');
  return outPath;
}

async function compileInlineScript(pageName, code) {
  const result = await transform(code, {
    loader: 'jsx',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    format: 'iife',
    minify: false,
    sourcefile: `${pageName}.inline.jsx`,
  });
  const outPath = path.join(GENERATED_DIR, `${pageName}.app.js`);
  await fs.writeFile(outPath, result.code, 'utf8');
  return outPath;
}

async function buildPage(page) {
  let html = await fs.readFile(page.input, 'utf8');
  html = localizeBodyStyles(html);
  html = replaceHeadAssets(html);

  const scripts = extractBodyScripts(html);
  const replacements = [];
  let inlineBuilt = false;

  for (const script of scripts) {
    if (script.src && script.src.startsWith('http')) continue;
    if (script.src && !script.type) continue;
    if (script.src && script.type === 'text/babel') {
      const srcPath = path.join(ROOT, script.src.split('?')[0]);
      const base = path.basename(srcPath, path.extname(srcPath));
      const outName = `${page.name}-${base}.js`;
      await compileScript(srcPath, outName);
      replacements.push({
        from: script.fullMatch,
        to: `    <script src="/js/build/${outName}?v=20260519a"></script>`,
      });
      continue;
    }
    if (!script.src && script.type === 'text/babel') {
      if (inlineBuilt) throw new Error(`${page.name} has more than one inline text/babel script`);
      await compileInlineScript(page.name, script.body);
      inlineBuilt = true;
      replacements.push({
        from: script.fullMatch,
        to: `    <script src="/js/build/${page.name}.app.js?v=20260519a"></script>`,
      });
    }
  }

  for (const { from, to } of replacements) {
    html = html.replace(from, to);
  }

  await fs.writeFile(page.output, html, 'utf8');
}

async function buildTailwind() {
  await ensureDir(TMP_DIR);
  const configPath = path.join(TMP_DIR, 'tailwind.build.config.cjs');
  await fs.writeFile(
    configPath,
    `module.exports = {\n  content: ['./index.html', './kiosk.html', './src/**/*.js'],\n  theme: { extend: {} },\n  plugins: [],\n};\n`,
    'utf8'
  );

  const inputCss = path.join(CSS_DIR, 'tailwind.input.css');
  const outputCss = path.join(CSS_DIR, 'tailwind.generated.css');
  await execFileAsync(path.join(ROOT, 'node_modules', '.bin', 'tailwindcss'), [
    '-c',
    configPath,
    '-i',
    inputCss,
    '-o',
    outputCss,
    '--minify',
  ], { cwd: ROOT });
}

async function copyVendor() {
  await copyFile(
    path.join(ROOT, 'node_modules', 'react', 'umd', 'react.production.min.js'),
    path.join(VENDOR_DIR, 'react.production.min.js')
  );
  await copyFile(
    path.join(ROOT, 'node_modules', 'react-dom', 'umd', 'react-dom.production.min.js'),
    path.join(VENDOR_DIR, 'react-dom.production.min.js')
  );
}

async function main() {
  await Promise.all([ensureDir(GENERATED_DIR), ensureDir(VENDOR_DIR), ensureDir(CSS_DIR)]);
  await copyVendor();
  await buildTailwind();
  for (const page of PAGES) {
    await buildPage(page);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
