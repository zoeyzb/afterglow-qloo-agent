'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const routes = { '/api/atlas': require('./api/atlas'), '/api/status': require('./api/status') };
const root = path.join(__dirname, 'dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

const app = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const route = routes[pathname];
  if (route) {
    let body = '';
    for await (const part of req) { body += part; if (body.length > 12000) { res.writeHead(413); res.end('Request too large'); return; } }
    req.body = body;
    return route(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end('Method not allowed'); return; }
  const file = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const dest = path.resolve(root, file);
  if (!dest.startsWith(root + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  const ext = path.extname(dest);
  if (!mime[ext]) { res.writeHead(404); res.end('Not found'); return; }
  fs.stat(dest, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end(pathname === '/' ? 'Run `npm run build` first.' : 'Not found'); return; }
    res.setHeader('Content-Type', mime[ext]);
    if (pathname.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(dest).pipe(res);
  });
});
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log('TasteAtlas AI listening on http://localhost:' + port));
