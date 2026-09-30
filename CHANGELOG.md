# Changelog

All notable changes to this project are documented here.

## [1.0.0] - 2026-09-11

### Added
- Core API client (`explorer.js`): `searchRepos` (star-ordered, capped results), `getRepo` / `getRepoBySlug`, typed `GitHubError` with HTTP status, rate-limit messaging, field mapping via `cleanRepo`, star/bytes formatting. Fetch is injectable so tests run offline.
- Terminal front end (`cli.js`): `search` and `repo` commands with `--limit`, friendly help, error handling.
- Web front end (`public/index.html`): zero-CDN self-contained search UI, Enter-submit, star/language/license badges, links out to GitHub.
- HTTP server (`app.js` + `server.js`): serves the UI and proxies GitHub (`/api/search`, `/api/repo`), CORS, `--port`/`--host`, graceful shutdown.
- Test suite (`test_explorer.js`): 15 `node:test` cases with mocked fetch (query trimming, limit caps, 403/404 errors, URL building, HTTP routes).
- GitHub Actions CI (Node 18 & 22), README, MIT license, `.gitignore`.