// ─── OpenRailTracker Mobile – API Config ────────────────────────────────────
//
// Change SERVER_URL to your machine's local IP when running on a physical device.
// Example: "http://192.168.1.42:3000"
// For simulator/emulator on the same machine, localhost works fine.
//
export const SERVER_URL = "http://localhost:3000";

export const REFRESH_INTERVAL_MS = 20_000; // 20 seconds

export const STATUS_COLORS = {
  "on-time": "#22c55e",
  early:     "#0ea5e9",
  late:      "#f59e0b",
  delayed:   "#ef4444",
  unknown:   "#94a3b8",
};

export const STATUS_LABELS = {
  "on-time": "On Time",
  early:     "Early",
  late:      "Late",
  delayed:   "Delayed",
  unknown:   "Unknown",
};

export const THEME = {
  bg:        "#08101f",
  surface:   "#0c1628",
  surfaceHi: "#121c36",
  border:    "rgba(148,163,184,0.14)",
  text:      "#e2eaf6",
  muted:     "#7f9ab8",
  dim:       "#4a6280",
  primary:   "#3b82f6",
  accent:    "#0ea5e9",
  green:     "#22c55e",
  yellow:    "#f59e0b",
  orange:    "#f97316",
  red:       "#ef4444",
};
