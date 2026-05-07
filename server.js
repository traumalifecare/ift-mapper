const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const HOMEBASE_API = 'https://app.joinhomebase.com/api/public';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

function sendCorsHeaders(res, req) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  const requested = req?.headers['access-control-request-headers'];
  if (requested) {
    res.setHeader('Access-Control-Allow-Headers', requested);
  } else {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
  }
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function forwardHeaders(req) {
  const headers = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const key = name.toLowerCase();
    if (key === 'host' || key === 'connection' || key === 'content-length') continue;
    headers[name] = value;
  }
  if (!headers.accept) headers.accept = 'application/json';
  return headers;
}

async function proxyZoho(req, res, requestUrl) {
  if (req.method === 'OPTIONS') {
    sendCorsHeaders(res, req);
    res.writeHead(204);
    res.end();
    return;
  }

  const target = requestUrl.searchParams.get('target');
  if (!target) {
    sendCorsHeaders(res, req);
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing target URL');
    return;
  }

  let url;
  try {
    url = new URL(target);
  } catch (err) {
    sendCorsHeaders(res, req);
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid target URL for Zoho proxy');
    return;
  }

  try {
    const headers = forwardHeaders(req);
    const response = await fetch(url.toString(), {
      method: req.method,
      headers,
    });

    sendCorsHeaders(res, req);
    const responseHeaders = {};
    response.headers.forEach((value, name) => {
      if (name.toLowerCase() === 'transfer-encoding') return;
      if (name.toLowerCase() === 'content-encoding') return;
      responseHeaders[name] = value;
    });
    responseHeaders['Content-Type'] = response.headers.get('content-type') || 'application/json';
    res.writeHead(response.status, responseHeaders);
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (err) {
    sendCorsHeaders(res, req);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  }
}

async function proxyHomebase(req, res, targetPath) {
  if (req.method === 'OPTIONS') {
    sendCorsHeaders(res, req);
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(HOMEBASE_API + targetPath, 'https://app.joinhomebase.com');
  const headers = forwardHeaders(req);

  try {
    const response = await fetch(url.toString(), {
      method: req.method,
      headers,
    });

    sendCorsHeaders(res, req);
    const responseHeaders = {};
    response.headers.forEach((value, name) => {
      if (name.toLowerCase() === 'transfer-encoding') return;
      if (name.toLowerCase() === 'content-encoding') return;
      responseHeaders[name] = value;
    });
    responseHeaders['Content-Type'] = response.headers.get('content-type') || 'application/json';
    res.writeHead(response.status, responseHeaders);
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (err) {
    sendCorsHeaders(res, req);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  }
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname.startsWith('/proxy/homebase')) {
    proxyHomebase(req, res, requestUrl.pathname.replace('/proxy/homebase', '') + requestUrl.search);
    return;
  }

  if (requestUrl.pathname.startsWith('/proxy/zoho')) {
    proxyZoho(req, res, requestUrl);
    return;
  }

  if (req.method === 'OPTIONS') {
    sendCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  let filePath = requestUrl.pathname === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, decodeURIComponent(requestUrl.pathname.slice(1)));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    sendFile(res, filePath);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log('Open index.html from the local server, not the file system.');
});
