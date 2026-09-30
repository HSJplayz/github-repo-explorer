'use strict';

const GITHUB_API = 'https://api.github.com';

class GitHubError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function cleanRepo(raw) {
  return {
    fullName: raw.full_name || '',
    owner: (raw.owner && raw.owner.login) || '',
    name: raw.name || '',
    htmlUrl: raw.html_url || '',
    description: raw.description || '',
    language: raw.language || '',
    stars: raw.stargazers_count || 0,
    forks: raw.forks_count || 0,
    openIssues: raw.open_issues_count || 0,
    license: (raw.license && raw.license.spdx_id) || null,
    updatedAt: raw.updated_at || null,
    createdAt: raw.created_at || null,
    homepage: raw.homepage || null,
    topics: Array.isArray(raw.topics) ? raw.topics : [],
    sizeKb: raw.size || 0,
  };
}

function assertResponse(res, context) {
  if (res.ok) return;
  let msg = `GitHub API error ${res.status}`;
  if (res.status === 403) {
    msg = 'GitHub API rate limit reached. Try again in a minute.';
  } else if (res.status === 404) {
    msg = `Not found: ${context}`;
  }
  throw new GitHubError(msg, res.status);
}

async function searchRepos(query, opts = {}, fetchImpl = fetch) {
  const cleaned = String(query || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) throw new GitHubError('Empty search query', 400);
  const limit = opts.limit > 0 ? Math.min(opts.limit, 50) : 10;
  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(cleaned)}&sort=${opts.sort || 'stars'}&order=desc&per_page=${limit}`;
  const res = await fetchImpl(url, { headers: { Accept: 'application/vnd.github+json' } });
  assertResponse(res, `search "${query}"`);
  const data = await res.json();
  return {
    query,
    total: data.total_count || 0,
    items: (data.items || []).map(cleanRepo),
  };
}

async function getRepo(owner, name, fetchImpl = fetch) {
  const o = String(owner || '').trim();
  const n = String(name || '').trim();
  if (!o || !n) throw new GitHubError('Both owner and repo name are required', 400);
  const url = `${GITHUB_API}/repos/${encodeURIComponent(o)}/${encodeURIComponent(n)}`;
  const res = await fetchImpl(url, { headers: { Accept: 'application/vnd.github+json' } });
  assertResponse(res, `${o}/${n}`);
  return cleanRepo(await res.json());
}

async function getRepoBySlug(slug, fetchImpl = fetch) {
  const parts = String(slug || '').split('/').filter(Boolean);
  if (parts.length !== 2) throw new GitHubError('Expected "owner/repo" format', 400);
  return getRepo(parts[0], parts[1], fetchImpl);
}

function formatStars(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function formatBytes(kb) {
  if (!kb) return '0 KB';
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

module.exports = {
  GitHubError,
  GITHUB_API,
  searchRepos,
  getRepo,
  getRepoBySlug,
  cleanRepo,
  formatStars,
  formatBytes,
};