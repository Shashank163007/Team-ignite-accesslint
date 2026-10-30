import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

/** Serve a built app on loopback. Setup failures reject; stop() is idempotent. */
export async function startServer({ rootDir, port = 0 } = {}) {
  if (typeof rootDir !== 'string' || !rootDir.trim()) {
    throw new TypeError('rootDir must be a non-empty directory path');
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError('port must be an integer between 0 and 65535');
  }
  const root = await realpath(resolve(rootDir));
  if (!(await stat(root)).isDirectory()) throw new Error('rootDir must be a directory');
  const insideRoot = (file) => {
    const path = relative(root, file);
    return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
  };

  const server = createServer(async (req, res) => {
    const reply = (status, message) => {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : message);
    };
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return reply(405, 'Method not allowed');
      }
      const [rawPath] = req.url.split('?');
      let pathname;
      try {
        pathname = decodeURIComponent(rawPath);
      } catch {
        return reply(400, 'Malformed path');
      }
      if (!pathname.startsWith('/') || /[\x00-\x1f\x7f]/.test(pathname)) {
        return reply(400, 'Invalid path');
      }
      // Treat backslashes as separators on every OS; reject Windows drive/ADS paths.
      pathname = pathname.replaceAll('\\', '/');
      if (pathname.includes(':')) return reply(403, 'Forbidden');
      let file = resolve(root, `.${pathname}`);
      if (!insideRoot(file)) return reply(403, 'Forbidden');
      file = await realpath(file);
      // Resolve symlinks before reading, including directory index files.
      if (!insideRoot(file)) return reply(403, 'Forbidden');
      if ((await stat(file)).isDirectory()) {
        if (!rawPath.endsWith('/')) {
          const query = req.url.slice(rawPath.length);
          res.writeHead(301, { Location: `${encodeURI(pathname).replace(/^\/+/, '/')}/${query}` });
          return res.end();
        }
        file = await realpath(resolve(file, 'index.html'));
        if (!insideRoot(file)) return reply(403, 'Forbidden');
      }
      if (!(await stat(file)).isFile()) return reply(404, 'Not found');
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': contentTypes[extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) return reply(404, 'Not found');
      if (['EACCES', 'EPERM'].includes(error.code)) return reply(403, 'Forbidden');
      console.error('[accesslint:server]', error);
      reply(500, 'Unable to serve file');
    }
  });
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolveListen();
    });
  });
  server.on('error', (error) => console.error('[accesslint:server]', error));
  let stopping;
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    stop() {
      stopping ??= new Promise((resolveStop, reject) => {
        server.close((error) => error ? reject(error) : resolveStop());
        // Cleanup must also finish when a browser leaves an incomplete request open.
        for (const socket of sockets) socket.destroy();
      });
      return stopping;
    },
  };
}
