# Landmark GLB Models

The app now loads models from [frontend/landmarks/models/manifest.json](frontend/landmarks/models/manifest.json).

For a 50-state starting point, copy:

- [frontend/landmarks/models/manifest.all-states.template.json](frontend/landmarks/models/manifest.all-states.template.json)

into `manifest.json`, then fill each `url` with your licensed model URL/path.

You can use:

1) Local files in this folder (recommended)
2) Direct hosted `.glb` URLs (including Sketchfab-hosted export URLs if license allows)

## Legal/license note

Only use models with redistribution rights (for example CC0 / CC-BY with attribution requirements fulfilled).
Sketchfab models have different licenses and download terms per asset.

## Manifest format

Each entry in `landmarks` supports:

- `id`
- `name`
- `lat`
- `lon`
- `altitude`
- `scaleMeters`
- `rotateX`, `rotateY`, `rotateZ`
- `url` (local path or external URL to `.glb`)

## Example

```json
{
	"id": "golden-gate",
	"name": "Golden Gate Bridge",
	"lat": 37.8199,
	"lon": -122.4783,
	"scaleMeters": 130,
	"rotateX": 90,
	"url": "/landmarks/models/golden-gate.glb"
}
```

If a model URL is invalid, that landmark is skipped automatically.

## Validate before launch

Run:

- `npm run landmarks:validate`

This checks local files and remote URLs listed in `manifest.json`.
