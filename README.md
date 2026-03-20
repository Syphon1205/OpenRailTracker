# OpenRailTracker

Modern, map-first passenger rail tracking with real-time updates and a modular, open-source architecture.

## Structure

- frontend: map-centric UI
- backend: API + WebSocket server
- viarail: VIA Rail GTFS static data

## Run

1. Install backend dependencies.
2. Start the backend server.
3. Open http://localhost:3000 in a browser.

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
