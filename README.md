# GitHub Repo Explorer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-18%2B-339933.svg)]()
[![CI](https://github.com/HSJplayz/github-repo-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/HSJplayz/github-repo-explorer/actions)
[![Streak Day 12](https://img.shields.io/badge/Streak-Day%2012-green.svg)](https://github.com/HSJplayz/streak)

> A zero-dependency GitHub repository explorer — search public repos by stars or inspect a single repo in detail, from your **terminal** or a **web UI**. No API token required.

Built with plain Node.js (no frameworks, no npm packages) on **Day 12** of the daily projects streak.

## Why

Before this, "find a good repo" meant opening github.com and clicking through pages. Now it's one command: `node cli.js search "machine learning"`. The web UI gives the same power to non-terminal users, and everything goes through one small, testable core.

## Features

- **Search with star-ordered results** — GitHub `/search/repositories`, `per_page` up to 50.
- **Single-repo deep dive** — fetch full metadata for `owner/repo`.
- **Terminal + web, one core** — `explorer.js` is shared by the CLI and the HTTP `app.js` proxy.
- **Clean room, no tokens** — hits the public GitHub API with the accepted media type; respects rate limits with a helpful message.
- **Zero dependencies** — only built-in `node:` modules; `fetch` comes from Node 18+.
- **Injectable `fetchImpl`** — every API call takes an optional fetch, so tests never touch the network.

## Quick start

### Terminal

```bash
node cli.js search "machine learning"
node cli.js search node --limit 5
node cli.js repo axios/axios
node cli.js --help
```

### Web UI

```bash
node server.js --port 3000
# open http://127.0.0.1:3000
```

| Endpoint | Description |
| --- | --- |
| `GET /api/search?q=query&limit=N` | Star-sorted search results as JSON |
| `GET /api/repo?slug=owner/name` | Single repo metadata as JSON |
| `GET /` | The self-contained browser UI (no CDN) |

The server proxies GitHub (avoiding browser CORS) so a token never touches the client.

## Tests

```bash
node --test test_explorer.js
```

15 tests cover field mapping, query trimming, limit capping, rate-limit and 404 errors, URL construction, formatting helpers, and HTTP routes — all with mocked fetch, no network.

## Structure

```
explorer.js       core: searchRepos, getRepo(s), cleanRepo, formatting (injectable fetch)
cli.js            terminal front end (search + repo commands)
app.js            HTTP handler + GitHub proxy endpoints
server.js         entry point (--port/--host)
public/index.html self-contained browser UI (no CDN)
test_explorer.js  test suite (node:test, mocked fetch)
```

## Future scope

- **Trending & topic pages** — `/topics/<name>`, and a "hot this week" view.
- **Repo diffs / compare** — fetch commit history and language breakdown.
- **Caching** — in-memory TTL cache to stay inside the unauthenticated rate limit.
- **`GITHUB_TOKEN` support** — optional env var to raise the limit to 5000/hr.
- **Watch lists** — save stars/favorites to a local file from the CLI.

## License

MIT.