# OpenRailTracker — Mobile (Expo Go)

A native mobile companion for OpenRailTracker that works in **Expo Go** without any native builds or Apple/Google developer accounts.

## Features
| Screen | Description |
|--------|-------------|
| 🗺️ **Map** | Live train positions on a native map. Tap any marker for details. |
| 🚂 **Trains** | Searchable, filterable list of all active trains with real-time status. |
| ⚙️ **Settings** | Configure the backend server URL and view app info. |

## Quick Start

### 1 — Start the backend
```bash
cd ../backend
node server.js
```

### 2 — Find your machine's IP (physical device only)
```bash
ipconfig getifaddr en0
# e.g. 192.168.1.42
```
Open `constants/config.js` and set:
```js
export const SERVER_URL = "http://192.168.1.42:3000";
```
_(For the iOS Simulator or Android Emulator, `localhost` works fine.)_

### 3 — Start Expo
```bash
cd mobile
npx expo start
```

### 4 — Open in Expo Go
- **iOS**: Scan the QR code with the Camera app → opens in Expo Go
- **Android**: Scan the QR code in the Expo Go app
- **Simulator**: Press `i` (iOS) or `a` (Android) in the terminal

## Project Structure
```
mobile/
├── App.js                    ← Root navigation (3 tabs)
├── app.json                  ← Expo config
├── constants/
│   └── config.js             ← SERVER_URL, theme, status colors
├── hooks/
│   └── useTrains.js          ← Polls /api/trains every 20 s
├── components/
│   └── TrainCard.js          ← Reusable train card
└── screens/
    ├── MapScreen.js          ← react-native-maps + train markers
    ├── TrainsScreen.js       ← FlatList with search + filter
    └── SettingsScreen.js     ← Server URL + about
```

## Development Tips
- The app auto-refreshes every 20 seconds (configurable in `constants/config.js`)
- Pull-to-refresh works on the Trains screen
- Tap a map marker → bottom sheet with train details + "Center on map" button
- The Settings screen lets you persist a custom server URL via `AsyncStorage`

## Dependencies
| Package | Purpose |
|---------|---------|
| `react-native-maps` | Native map (included in Expo Go) |
| `@react-navigation/bottom-tabs` | Tab navigation |
| `react-native-safe-area-context` | Safe areas (notch, home bar) |
| `@react-native-async-storage/async-storage` | Persist settings |
| `expo-location` | User location on map |
