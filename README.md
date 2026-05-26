# OpenRailTracker v1.0.0

OpenRailTracker is a Node/Express rail-tracking application that serves a static MapLibre frontend and aggregates passenger, commuter, freight, signal, alert, and GTFS data across North America.

## v1.0.0 Release Highlights

✨ **New Features:**
- Desktop applications for macOS (Intel & Apple Silicon) and Windows
- Cinematic welcome screen with live rail map for first-time users
- Gallery as a dedicated tab with back button navigation
- Enhanced symbol support from OpenRailwayMap vector tiles
- Improved UI/UX with modern glass-style panels and smooth animations
- Download desktop button in web version

🎯 **Improvements:**
- Removed train protection toggle (signals/ATCS data still visible through map layers)
- Cleaner map display without yard dots
- Dark graphite tones with soft cyan highlights
- Premium dispatcher/radar software aesthetic
- Optimized for both web and desktop platforms

This repository was reconstructed from a container image. Treat the current history as a recovered baseline, not the original project history.

## Project Layout

- `backend/` - Express API, WebSocket server, data loaders, alert scraping, and signal APIs.
- `backend/signals/` - signal repository, event bus, OpenRailwayMap lookup, and ATCS normalization.
- `frontend/` - static browser app served by Express.
- `data/` - committed seed/runtime JSON needed by the app.
- `logos/` - static operator logos.
- `*_GTFS/`, `*_data/`, `viarail/`, `DART/`, etc. - recovered static GTFS datasets used by loaders.
- `uploads/` - runtime user uploads; ignored by Git.

## Requirements

- Node.js 22 or newer is recommended.
- npm 11 or newer.
- Optional: Docker and Docker Compose.
- Optional: PostgreSQL for persistent signal storage.
- Optional: Redis for signal pub/sub across multiple app instances.

## Local Development

```bash
cd backend
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

The backend serves the frontend from `frontend/`, exposes REST endpoints under `/api`, and uses `/ws` for live updates.

## Environment

Use `backend/.env.example` as the source of truth for supported environment variables. Do not commit `backend/.env` or provider tokens.

Important variables for a fuller local run include:

- `METRA_GTFS_API_TOKEN` for Metra GTFS-RT/static access.
- `PROTOMAPS_KEY` or custom style URLs for map styling.
- `SIGNAL_DATABASE_URL` or `DATABASE_URL` for PostgreSQL-backed signal storage.
- `REDIS_URL` for cross-process signal event pub/sub.

## Docker

Build and run with Compose:

```bash
docker compose up --build
```

The compose file reads `backend/.env` if present and bind-mounts `data/`, `uploads/`, and `Metra/` so runtime caches, uploads, and Metra downloads survive container restarts.

## Verification

Useful checks after recovery or edits:

```bash
cd backend
npm ls --depth=0
node --check server.js
```

From the repository root:

```bash
node --check frontend/app.js
node --check frontend/departure-board.js
```

## Known Recovery Notes

- Original Git history, README, Docker files, and deployment files were not recovered.
- `Metra/GTFSAPIREQUEST.txt` is intentionally ignored because the recovered file contained an API token.
- `Metra/GTFS/` was not present in the recovered tree; the backend can recreate it when a valid Metra token is available.
- `npm ci` currently reports audit findings in transitive dependencies. Review before running `npm audit fix`, because automated fixes may change runtime behavior.
