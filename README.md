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

## Deploy to GitHub Pages

The frontend deploys to GitHub Pages and connects to a remote backend.

1. **Enable GitHub Pages**: In the repo → Settings → Pages → Source: **GitHub Actions**
2. Push to `main`; the workflow deploys `frontend/` and `logos/` automatically.
3. Your site will be at `https://<user>.github.io/<repo>/`. It uses `https://openrailtracker.app` as the API when hosted on `github.io`.

To use a different backend URL, set `ORT_API_BASE` before build or pass `?apiBase=https://your-backend.example.com` in the URL.

## Deploy the backend

The backend must run separately (GitHub Pages is static-only). Options:

- **Render**: Connect the repo, use the included `render.yaml`, and set your custom domain (e.g. openrailtracker.app) in the Render dashboard.
- **Railway / Fly.io**: Run `node backend/server.js` from the repo root; ensure `PORT` is set from the platform.

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
