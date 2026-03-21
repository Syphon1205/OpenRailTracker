# OpenRailTracker

Modern, map-first passenger rail tracking with real-time updates and a modular, open-source architecture.

## Structure

- **frontend** — map-centric UI (served by the backend)
- **backend** — Express API + WebSocket server, serves frontend at /
- **viarail** — VIA Rail GTFS static data

## Run locally

1. `cd backend && npm install`
2. `npm start` (from repo root) or `node server.js` (from backend)
3. Open http://localhost:3000 in a browser.

## Deploy (Render — one URL, no CORS)

The backend serves both the API and the frontend. Deploy once; everything runs from a single origin.

### Deploy steps

1. Sign in at [render.com](https://render.com) and connect your GitHub account.
2. **New** → **Blueprint** → select this repo (or **New Web Service**).
3. Use the settings from `render.yaml`:
   - **Build:** `npm install --prefix backend --no-audit --no-fund`
   - **Start:** `node backend/server.js`
   - **Health check path:** `/api/health`
4. Deploy. Your app is live at `https://YOUR-SERVICE.onrender.com` — frontend, API, and WebSocket all on the same host. No secrets, no CORS, no split deployment.

**Cold starts:** On the free tier the service may sleep; the first request after idle can take ~30–60s. Tap Refresh if trains don't load right away.

### Other hosts (Railway, Fly.io)

Same commands: build from repo root, run `node backend/server.js`. Ensure `PORT` is set by the platform.

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
