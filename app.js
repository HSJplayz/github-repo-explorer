'use strict';

const fs = require('fs');
const path = require('path');
const { searchRepos, getRepoBySlug, GitHubError } = require('./explorer.js');

const PUBLIC_DIR = path.join(__dirname, 'public');

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  const h = { ...headers, 'Access-Control-Allow-Origin': '*' };
  if (typeof body !== 'string') h['Content-Type'] = 'application/json';
  res.writeHead(status, h);
  res.end(data);
}

function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;
  const method = req.method;

  if (method === 'OPTIONS') {
    send(res, 204, '', {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Content-Length': '0',
    });
    return;
  }

  if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    const file = path.join(PUBLIC_DIR, 'index.html');
    if (!fs.existsSync(file)) {
      send(res, 404, { ok: false, error: 'index.html missing' });
      return;
    }
    send(res, 200, fs.readFileSync(file, 'utf8'), { 'Content-Type': 'text/html; charset=utf-8' });
    return;
  }

  if (method === 'GET' && pathname === '/api/search') {
    const q = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    return searchRepos(q, { limit }).then(
      (result) => send(res, 200, { ok: true, ...result }),
      (err) => {
        send(res, err instanceof GitHubError && err.status >= 400 && err.status < 600 ? err.status : 500, {
          ok: false,
          error: err.message,
        });
      }
    );
  }

  if (method === 'GET' && pathname === '/api/repo') {
    const slug = url.searchParams.get('slug') || '';
    return getRepoBySlug(slug).then(
      (repo) => send(res, 200, { ok: true, repo }),
      (err) => {
        send(res, err instanceof GitHubError && err.status >= 400 && err.status < 600 ? err.status : 500, {
          ok: false,
          error: err.message,
        });
      }
    );
  }

  send(res, 404, { ok: false, error: 'Not found' });
}

module.exports = { handleRequest, send };