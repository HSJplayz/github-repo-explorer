'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  GitHubError,
  cleanRepo,
  searchRepos,
  getRepo,
  getRepoBySlug,
  formatStars,
  formatBytes,
} = require('./explorer.js');
const { handleRequest } = require('./app.js');

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

function mockRes() {
  return {
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(data) {
      this.body = data;
    },
  };
}

function sampleItems(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    full_name: `owner/repo${i}`,
    name: `repo${i}`,
    owner: { login: 'owner' },
    html_url: `https://github.com/owner/repo${i}`,
    description: `Description ${i}`,
    language: 'JavaScript',
    stargazers_count: 1000 * (i + 1),
    forks_count: i,
    open_issues_count: i * 2,
    license: { spdx_id: 'MIT' },
    updated_at: '2026-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    homepage: null,
    topics: ['cli'],
    size: 2048,
  }));
}

test('cleanRepo maps raw GitHub fields to friendly keys', () => {
  const raw = sampleItems(1)[0];
  const r = cleanRepo(raw);
  assert.strictEqual(r.fullName, 'owner/repo0');
  assert.strictEqual(r.stars, 1000);
  assert.strictEqual(r.forks, 0);
  assert.strictEqual(r.license, 'MIT');
  assert.strictEqual(r.language, 'JavaScript');
  assert.deepStrictEqual(r.topics, ['cli']);
  assert.strictEqual(r.sizeKb, 2048);
});

test('searchRepos calls the search endpoint and parses items', async () => {
  const capture = [];
  const fetchImpl = async (url) => {
    capture.push(url);
    return jsonResponse({
      total_count: 3,
      items: sampleItems(3),
    });
  };
  const result = await searchRepos('node cli', { limit: 10 }, fetchImpl);
  assert.strictEqual(result.total, 3);
  assert.strictEqual(result.items.length, 3);
  assert.match(capture[0], /search\/repositories\?q=/);
  assert.ok(capture[0].includes('per_page=10'));
});

test('searchRepos collapses whitespace in the query', async () => {
  const capture = [];
  const fetchImpl = async (url) => {
    capture.push(url);
    return jsonResponse({ total_count: 0, items: [] });
  };
  await searchRepos('  node   cli  ', {}, fetchImpl);
  assert.match(capture[0], /q=node%20cli/);
});

test('searchRepos rejects empty query', async () => {
  await assert.rejects(() => searchRepos('   ', {}, () => Promise.resolve(jsonResponse({ items: [] }))), GitHubError);
});

test('searchRepos caps limit at 50', async () => {
  const capture = [];
  const fetchImpl = async (url) => {
    capture.push(url);
    return jsonResponse({ total_count: 0, items: [] });
  };
  await searchRepos('x', { limit: 999 }, fetchImpl);
  assert.match(capture[0], /per_page=50/);
});

test('searchRepos throws GitHubError on 403 rate limit', async () => {
  const fetchImpl = async () => jsonResponse({ message: 'rate limited' }, 403);
  await assert.rejects(
    () => searchRepos('node', {}, fetchImpl),
    (err) => err instanceof GitHubError && /rate limit/i.test(err.message)
  );
});

test('getRepo fetches a single repository detail', async () => {
  const capture = [];
  const fetchImpl = async (url) => {
    capture.push(url);
    return jsonResponse(sampleItems(1)[0]);
  };
  const r = await getRepo('owner', 'repo0', fetchImpl);
  assert.strictEqual(r.fullName, 'owner/repo0');
  assert.match(capture[0], /repos\/owner\/repo0$/);
});

test('getRepoBySlug requires owner/name format', async () => {
  await assert.rejects(() => getRepoBySlug('justone', () => Promise.resolve(jsonResponse({}))), GitHubError);
  const r = await getRepoBySlug('a/b', async (url) => jsonResponse({ ...sampleItems(1)[0], full_name: 'a/b' }));
  assert.strictEqual(r.fullName, 'a/b');
});

test('getRepo throws GitHubError on 404', async () => {
  const fetchImpl = async () => jsonResponse({ message: 'Not Found' }, 404);
  await assert.rejects(
    () => getRepo('nope', 'nope', fetchImpl),
    (err) => err instanceof GitHubError && err.status === 404
  );
});

test('formatStars gives k-notation', () => {
  assert.strictEqual(formatStars(500), '500');
  assert.strictEqual(formatStars(1500), '1.5k');
  assert.strictEqual(formatStars(1000000), '1000.0k');
});

test('formatBytes converts KB to MB', () => {
  assert.strictEqual(formatBytes(0), '0 KB');
  assert.strictEqual(formatBytes(500), '500 KB');
  assert.strictEqual(formatBytes(2048), '2.0 MB');
});

// ---- HTTP layer ----
test('GET /api/search returns proxied results', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () =>
    jsonResponse({ total_count: 1, items: sampleItems(1), incomplete_results: false });
  try {
    const res = mockRes();
    await handleRequest(
      { method: 'GET', url: 'http://localhost/api/search?q=node&limit=2', headers: { host: 'localhost' } },
      res
    );
    assert.strictEqual(res.status, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.items.length, 1);
    assert.strictEqual(body.items[0].fullName, 'owner/repo0');
  } finally {
    global.fetch = originalFetch;
  }
});

test('GET / returns index.html', async () => {
  const res = mockRes();
  await handleRequest({ method: 'GET', url: 'http://localhost/', headers: { host: 'localhost' } }, res);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers['Content-Type'], /text\/html/);
  assert.ok(res.body.includes('GitHub Repo Explorer'));
});

test('GET /api/repo with bad slug returns 400-ish without network call', async () => {
  const res = mockRes();
  await handleRequest({ method: 'GET', url: 'http://localhost/api/repo?slug=noslash', headers: { host: 'localhost' } }, res);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(JSON.parse(res.body).ok, false);
});

test('GET /unknown route returns 404', async () => {
  const res = mockRes();
  await handleRequest({ method: 'GET', url: 'http://localhost/nope', headers: { host: 'localhost' } }, res);
  assert.strictEqual(res.status, 404);
});