# OpenRailTracker

Modern, map-first passenger rail tracking with real-time updates and a modular, open-source architecture.

## Structure

- frontend: map-centric UI
- backend: API + WebSocket server
- viarail: VIA Rail GTFS static data

## Run locally

1. `cd backend && npm install`
2. `npm start` (from repo root) or `node server.js` (from backend)
3. Open http://localhost:3000 in a browser.

## GitHub Pages + live backend (recommended)

GitHub Pages only serves static files; the **Node server must run elsewhere**. Wire them together like this:

### 1. Host the backend on Render

1. Sign in at [render.com](https://render.com) and connect your GitHub account.
2. **New** → **Blueprint** → select this repo, or **New Web Service** and:
   - **Root directory**: leave empty (repo root).
   - **Build command**: `npm install --prefix backend --no-audit --no-fund`
   - **Start command**: `node backend/server.js`
3. Deploy. Copy your service URL, e.g. `https://openrailtracker-backend.onrender.com` (no trailing slash).

Render sets `PORT` automatically; do not override it. The included `render.yaml` matches the above and uses `/api/health` for health checks.

**Cold starts:** On the free tier the service may sleep; the first request after idle can take ~30–60s.

### 2. Tell GitHub Pages to use that backend

1. On GitHub: repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Name: **`ORT_API_BACKEND_URL`**
3. Value: your Render URL, e.g. `https://openrailtracker-backend.onrender.com`
4. Push to `main` or re-run the **Deploy to GitHub Pages** workflow. The build injects `window.ORT_API_BASE` so `/api/*` and `wss://…/ws` hit your server.

### 3. Pages source

**Settings** → **Pages** → **Source**: **GitHub Actions**. Your site is at `https://<user>.github.io/<repo>/`.

### Fallbacks

- If **`ORT_API_BACKEND_URL`** is not set, the app on `github.io` still falls back to `https://openrailtracker.app` (only works if that host is running this backend).
- For a one-off test: add `?apiBase=https://your-backend.onrender.com` to the Pages URL.

### Other hosts

**Railway / Fly.io**: same start command `node backend/server.js` from repo root; set `ORT_API_BACKEND_URL` to that service’s public `https` URL.

## Desktop (Electron)

Run desktop app with bundled local backend:

1. `npm install`
2. `npm run electron`

This includes:

- Splash screen
- App icon
- First-boot welcome screen

Current focus is the Electron desktop client.

## Data sources

- Amtrak: Transitstat (real-time)
- Brightline: GTFS-RT from feed.gobrightline.com (real-time)
- VIA Rail: local GTFS static data from viarail

## Basemap

Tiles are served via CARTO raster tiles on the frontend.

## Routes

Routes are loaded from:

- Amtrak shapes GeoJSON (Transitstat)
- Brightline shapes GeoJSON (Transitstat)
- VIA Rail GTFS shapes from viarail

To connect an official source or override defaults, set the following environment variables:

- AMTRAK_URL, BRIGHTLINE_URL, VIA_URL
- AMTRAK_DATA_PATH, BRIGHTLINE_DATA_PATH, VIA_DATA_PATH (optional dot-path to the array in the JSON response)

The API expects each source to return an array of train objects. Fields are normalized automatically where possible.

## Next steps

- Replace the data source URLs with official endpoints when approved for use.
- Add authentication headers if required by the official source.
- Add a polling interval in the UI for auto-refresh.
