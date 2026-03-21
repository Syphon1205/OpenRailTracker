import express from "express";
import cors from "cors";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import gtfsRealtimeBindings from "gtfs-realtime-bindings";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import AdmZip from "adm-zip";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const UPLOADS_ROOT = path.join(ROOT, "uploads");
const SIGHTINGS_UPLOAD_DIR = path.join(UPLOADS_ROOT, "sightings");
const SIGHTINGS_FILE = path.join(ROOT, "data", "sightings.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(ROOT, "frontend")));
app.use("/logos", express.static(path.join(ROOT, "logos")));
app.use("/uploads", express.static(UPLOADS_ROOT));

const sightingsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, SIGHTINGS_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").slice(0, 12).replace(/[^.a-zA-Z0-9]/g, "") || ".bin";
      const safeBase = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      cb(null, `${safeBase}${ext}`);
    },
  }),
  limits: {
    fileSize: 80 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ok = file?.mimetype?.startsWith("image/") || file?.mimetype?.startsWith("video/");
    cb(ok ? null : new Error("Only image/video uploads are allowed"), ok);
  },
});

const CACHE_TTL_MS = 15_000;
const ROUTE_CACHE_TTL_MS = 5 * 60_000;
const REALTIME_FRESH_MS = 20 * 60_000;
const ROUTE_MAX_JUMP_KM = 25;
const cache = new Map();

async function ensureSightingsStorage() {
  await mkdir(SIGHTINGS_UPLOAD_DIR, { recursive: true });
  try {
    await access(SIGHTINGS_FILE);
  } catch {
    await writeFile(SIGHTINGS_FILE, JSON.stringify({ sightings: [] }, null, 2), "utf-8");
  }
}

async function loadSightingsDb() {
  await ensureSightingsStorage();
  try {
    const raw = await readFile(SIGHTINGS_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data?.sightings) ? data.sightings : [];
  } catch {
    return [];
  }
}

async function saveSightingsDb(sightings) {
  await ensureSightingsStorage();
  await writeFile(
    SIGHTINGS_FILE,
    JSON.stringify({ sightings: Array.isArray(sightings) ? sightings : [] }, null, 2),
    "utf-8"
  );
}

await ensureSightingsStorage();

const njtGtfsRtConfig = {
  vehiclePositionsUrl: process.env.NJT_GTFS_RT_URL || "",
  tripUpdatesUrl: process.env.NJT_GTFS_RT_TRIP_UPDATES_URL || "",
  apiKey: process.env.NJT_GTFS_RT_KEY || "",
};

const sourceConfigs = {
  amtrak: {
    label: "Amtrak",
    baseUrl: "https://store.transitstat.us/atsa/ts",
    responseType: "transitstat",
    routeGeoJson: [
      "https://gtfs.piemadd.com/data/amtrak/shapes/type_2.geojson",
      "https://gobbler.transitstat.us/additionalShapes/amtrak.json",
    ],
  },
  brightline: {
    label: "Brightline",
    baseUrl: "https://store.transitstat.us/brightline/v1",
    responseType: "transitstat",
    defaultUrl:
      process.env.BRIGHTLINE_GTFS_RT_URL ||
      "https://gtfs.piemadd.com/data/brightline/vehiclePositions.pb",
    tripUpdatesUrl:
      process.env.BRIGHTLINE_GTFS_RT_TRIP_UPDATES_URL ||
      "https://gtfs.piemadd.com/data/brightline/tripUpdates.pb",
    routeGeoJson: ["https://gtfs.piemadd.com/data/brightline/shapes/type_2.geojson"],
  },
  metra: {
    label: "Metra",
    baseUrl: "https://store.transitstat.us/metra/transitStatus",
    responseType: "transitstat",
    routeGeoJson: ["https://gtfs.piemadd.com/data/metra/shapes/type_2.geojson"],
  },
  amtraker: {
    label: "Amtraker",
    baseUrl: "https://api.amtraker.com/v1",
    v3BaseUrl: "https://api.amtraker.com/v3",
    responseType: "amtraker",
  },
  njt: {
    label: "NJ Transit",
    baseUrl: "https://store.transitstat.us/njt_rail",
    responseType: "transitstat",
    routeGeoJson: ["https://gtfs.piemadd.com/data/njt_rail_nonrt/shapes/type_2.geojson"],
  },
  mta: {
    label: "MTA",
    baseUrl: "https://store.transitstat.us/mnrr/transitStatus",
    responseType: "transitstat",
    routeGeoJson: ["https://gtfs.piemadd.com/data/mnrr/shapes/type_2.geojson"],
  },
  lirr: {
    label: "LIRR",
    baseUrl: "https://store.transitstat.us/lirr/transitStatus",
    responseType: "transitstat",
    routeGeoJson: ["https://gtfs.piemadd.com/data/lirr/shapes/type_2.geojson"],
  },
  mbta: {
    label: "MBTA",
    baseUrl: "https://store.transitstat.us/mbta/v1",
    responseType: "transitstat",
    routeGeoJson: [
      "https://gtfs.piemadd.com/data/mbta/shapes/type_0.geojson",
      "https://gtfs.piemadd.com/data/mbta/shapes/type_1.geojson",
      "https://gtfs.piemadd.com/data/mbta/shapes/type_2.geojson",
      "https://gtfs.piemadd.com/data/mbta/shapes/type_4.geojson",
    ],
  },
  dart: {
    label: "DART",
    baseUrl: "https://store.transitstat.us/dart/transitStatus",
    responseType: "transitstat",
  },
  bart: {
    label: "BART",
    baseUrl: "https://store.transitstat.us/bart/transitStatus",
    responseType: "transitstat",
    gtfsStaticUrl:
      process.env.BART_GTFS_STATIC_URL ||
      "https://www.bart.gov/dev/schedules/google_transit.zip",
  },
  marta: {
    label: "MARTA",
    baseUrl: "https://store.transitstat.us/martat/v1",
    responseType: "transitstat",
    routeGeoJson: ["https://gtfs.piemadd.com/data/marta/shapes/type_1.geojson"],
  },
  via: {
    label: "VIA Rail",
    responseType: "gtfs-static",
  },
  septa: {
    label: "SEPTA",
    baseUrl: "https://store.transitstat.us/septa/transitStatus",
    responseType: "transitstat",
    routeGeoJson: ["https://gtfs.piemadd.com/data/septa/shapes/type_2.geojson"],
  },
  metrolink: {
    label: "Metrolink",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: process.env.METROLINK_GTFS_RT_VEHICLE_URL || "",
    tripUpdatesUrl: process.env.METROLINK_GTFS_RT_TRIP_URL || "",
    gtfsStaticUrl:
      process.env.METROLINK_GTFS_STATIC_URL ||
      "http://metrolinktrains.com/globalassets/about/gtfs/gtfs.zip",
  },
  caltrain: {
    label: "Caltrain",
    responseType: "gtfs-rt",
    vehiclePositionsUrl:
      process.env.CALTRAIN_GTFS_RT_VEHICLE_URL ||
      "https://www.caltrain.com/Assets/GTFS/vehicle-positions.pb",
    vehiclePositionsUrlFallbacks: [
      "https://www.caltrain.com/gtfs/vehiclepositions.pb",
      "https://gtfs.piemadd.com/data/caltrain/vehiclePositions.pb",
    ],
    tripUpdatesUrl:
      process.env.CALTRAIN_GTFS_RT_TRIP_URL ||
      "https://www.caltrain.com/Assets/GTFS/trip-updates.pb",
    tripUpdatesUrlFallbacks: [
      "https://www.caltrain.com/gtfs/tripupdates.pb",
      "https://gtfs.piemadd.com/data/caltrain/tripUpdates.pb",
    ],
    agencyCode511: process.env.CALTRAIN_511_AGENCY || "CT",
    apiKey511: process.env.CALTRAIN_511_API_KEY || "",
    routeGeoJson: ["https://gtfs.piemadd.com/data/caltrain/shapes/type_2.geojson"],
  },
  vta: {
    label: "VTA",
    responseType: "route-only",
    gtfsStaticUrl: process.env.VTA_GTFS_STATIC_URL || "",
  },
  muni: {
    label: "MUNI",
    responseType: "route-only",
    gtfsStaticUrl:
      process.env.SFMTA_GTFS_STATIC_URL ||
      "https://muni-gtfs.apps.sfmta.com/data/muni_gtfs-current.zip",
  },
  sfstreetcar: {
    label: "SF Streetcar",
    responseType: "route-only",
  },
  sounder: {
    label: "Sounder",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: "https://gtfs.piemadd.com/data/sounder/vehiclePositions.pb",
    tripUpdatesUrl: "https://gtfs.piemadd.com/data/sounder/tripUpdates.pb",
    routeGeoJson: ["https://gtfs.piemadd.com/data/sounder/shapes/type_2.geojson"],
  },
  sunrail: {
    label: "SunRail",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: "https://gtfs.piemadd.com/data/sunrail/vehiclePositions.pb",
    tripUpdatesUrl: "https://gtfs.piemadd.com/data/sunrail/tripUpdates.pb",
    routeGeoJson: ["https://gtfs.piemadd.com/data/sunrail/shapes/type_2.geojson"],
  },
  trirail: {
    label: "Tri-Rail",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: "https://gtfs.piemadd.com/data/trirail/vehiclePositions.pb",
    tripUpdatesUrl: "https://gtfs.piemadd.com/data/trirail/tripUpdates.pb",
    routeGeoJson: [
      "https://gtfs.piemadd.com/data/trirail/shapes/type_2.geojson",
      "https://gtfs.piemadd.com/data/tri_rail/shapes/type_2.geojson",
    ],
  },
  vre: {
    label: "VRE",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: "https://gtfs.piemadd.com/data/vre/vehiclePositions.pb",
    tripUpdatesUrl: "https://gtfs.piemadd.com/data/vre/tripUpdates.pb",
    routeGeoJson: ["https://gtfs.piemadd.com/data/vre/shapes/type_2.geojson"],
  },
  marc: {
    label: "MARC",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: "https://gtfs.piemadd.com/data/marc/vehiclePositions.pb",
    tripUpdatesUrl: "https://gtfs.piemadd.com/data/marc/tripUpdates.pb",
    routeGeoJson: ["https://gtfs.piemadd.com/data/marc/shapes/type_2.geojson"],
  },
  ace: {
    label: "ACE",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: process.env.ACE_GTFS_RT_VEHICLE_URL || "",
    tripUpdatesUrl: process.env.ACE_GTFS_RT_TRIP_URL || "",
    gtfsStaticUrl:
      process.env.ACE_GTFS_STATIC_URL ||
      "https://cdn.acerail.com/wp-content/uploads/ACEGTFS.zip",
  },
  coaster: {
    label: "Coaster",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: process.env.COASTER_GTFS_RT_VEHICLE_URL || "",
    tripUpdatesUrl: process.env.COASTER_GTFS_RT_TRIP_URL || "",
    gtfsStaticUrl:
      process.env.COASTER_GTFS_STATIC_URL ||
      "https://gonctd.com/google_transit.zip",
  },
  smart: {
    label: "SMART",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: process.env.SMART_GTFS_RT_VEHICLE_URL || "",
    tripUpdatesUrl: process.env.SMART_GTFS_RT_TRIP_URL || "",
  },
  frontrunner: {
    label: "FrontRunner",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: "https://gtfs.piemadd.com/data/frontrunner/vehiclePositions.pb",
    tripUpdatesUrl: "https://gtfs.piemadd.com/data/frontrunner/tripUpdates.pb",
    routeGeoJson: ["https://gtfs.piemadd.com/data/frontrunner/shapes/type_2.geojson"],
  },
  capmetro: {
    label: "CapMetro Rail",
    responseType: "gtfs-rt",
    vehiclePositionsUrl: "https://gtfs.piemadd.com/data/capmetro/vehiclePositions.pb",
    tripUpdatesUrl: "https://gtfs.piemadd.com/data/capmetro/tripUpdates.pb",
    routeGeoJson: ["https://gtfs.piemadd.com/data/capmetro/shapes/type_2.geojson"],
  },
};

const sourceDefaultColors = {
  amtrak: "#1f4fa3",
  amtraker: "#1f4fa3",
  brightline: "#facc15",
  metra: "#3b82f6",
  njt: "#8b5cf6",
  mta: "#1e3a8a",
  lirr: "#0f766e",
  mbta: "#16a34a",
  septa: "#2563eb",
  bart: "#0ea5e9",
  marta: "#f97316",
  dart: "#ef4444",
  metrolink: "#0ea5e9",
  ace: "#14b8a6",
  coaster: "#2563eb",
  smart: "#ef4444",
  vta: "#f59e0b",
  muni: "#ef4444",
  sfstreetcar: "#f97316",
  via: "#f97316",
  coaster: "#2563eb",
  smart: "#ef4444",
};

const amtrakerTileConfig = {
  transitLines: [
    "https://v4mapa.amtraker.com/amtraker/{z}/{x}/{y}.mvt",
    "https://v4mapb.amtraker.com/amtraker/{z}/{x}/{y}.mvt",
    "https://v4mapc.amtraker.com/amtraker/{z}/{x}/{y}.mvt",
    "https://v4mapd.amtraker.com/amtraker/{z}/{x}/{y}.mvt",
  ],
  protomapsLike: [
    "https://v4mapa.amtraker.com/20251018/{z}/{x}/{y}.mvt",
    "https://v4mapb.amtraker.com/20251018/{z}/{x}/{y}.mvt",
    "https://v4mapc.amtraker.com/20251018/{z}/{x}/{y}.mvt",
    "https://v4mapd.amtraker.com/20251018/{z}/{x}/{y}.mvt",
  ],
};

function timeToSeconds(value) {
  if (!value) return null;
  const [h, m, s] = value.split(":").map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 3600 + m * 60 + (Number.isNaN(s) ? 0 : s);
}

function secondsToTime(seconds) {
  if (seconds == null) return "";
  const normalized = seconds % 86400;
  const h = Math.floor(normalized / 3600);
  const m = Math.floor((normalized % 3600) / 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function parseClockTime(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return null;
  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatClockTime(value) {
  const minutes = parseClockTime(value);
  if (minutes == null) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function normalizeHexColor(value) {
  if (!value) return "";
  const trimmed = value.toString().trim().replace("#", "");
  if (trimmed.length === 3 || trimmed.length === 6) {
    return `#${trimmed}`;
  }
  return "";
}

function isRailRouteType(value) {
  const type = Number.parseInt(value, 10);
  if (Number.isNaN(type)) return false;
  const railTypes = new Set([
    2,
    100,
    101,
    102,
    103,
    104,
    105,
    106,
    107,
    108,
    109,
    110,
    111,
    112,
    113,
    114,
    115,
    116,
    117,
  ]);
  return railTypes.has(type);
}

function isUrbanRailRouteType(value) {
  const type = Number.parseInt(value, 10);
  if (Number.isNaN(type)) return false;
  return type === 0 || type === 1 || isRailRouteType(type);
}

function parseTransitstatTimestamp(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (typeof value === "number") {
    const date = value > 1_000_000_000_000 ? new Date(value) : new Date(value * 1000);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const clock = formatClockTime(trimmed);
    if (clock) return clock;
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) return "";
    return new Date(parsed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return "";
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function sanitizeLineCoordinates(rawCoords, sampleStep = 1, maxJumpKm = ROUTE_MAX_JUMP_KM) {
  if (!Array.isArray(rawCoords) || rawCoords.length < 2) return [];

  const cleaned = [];
  for (const point of rawCoords) {
    const lon = Number(point?.[0]);
    const lat = Number(point?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    if (cleaned.length > 0) {
      const [prevLon, prevLat] = cleaned[cleaned.length - 1];
      const jumpKm = haversineDistanceKm(prevLat, prevLon, lat, lon);
      if (jumpKm > maxJumpKm) {
        continue;
      }
    }

    cleaned.push([lon, lat]);
  }

  if (cleaned.length < 2) return [];
  if (sampleStep <= 1) return cleaned;

  const sampled = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (i === 0 || i === cleaned.length - 1 || i % sampleStep === 0) {
      sampled.push(cleaned[i]);
    }
  }
  return sampled.length >= 2 ? sampled : cleaned;
}

function toTimestampMs(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getPredictionClockMinutes(prediction) {
  const candidate =
    prediction?.actualETA ||
    prediction?.actualTime ||
    prediction?.actualArrival ||
    prediction?.actualDeparture ||
    prediction?.actual ||
    prediction?.scheduledETA ||
    prediction?.scheduledTime ||
    prediction?.scheduledArrival ||
    prediction?.scheduledDeparture ||
    prediction?.scheduled;
  return parseClockTime(`${candidate || ""}`);
}

function pickBestPrediction(predictions = []) {
  if (!Array.isArray(predictions) || predictions.length === 0) return {};
  const ranked = predictions
    .map((prediction) => ({ prediction, minutes: getPredictionClockMinutes(prediction) }))
    .filter((row) => row.minutes != null)
    .sort((a, b) => a.minutes - b.minutes);
  if (ranked.length > 0) return ranked[0].prediction;
  return predictions[0] || {};
}

function dedupeTrains(trains) {
  const byKey = new Map();
  trains.forEach((train) => {
    const key = `${train.source}:${train.id}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, train);
      return;
    }

    const existingRealtime = Boolean(existing.realTime);
    const incomingRealtime = Boolean(train.realTime);
    if (incomingRealtime && !existingRealtime) {
      byKey.set(key, train);
      return;
    }
    if (!incomingRealtime && existingRealtime) {
      return;
    }

    if (toTimestampMs(train.lastUpdated) >= toTimestampMs(existing.lastUpdated)) {
      byKey.set(key, train);
    }
  });
  return Array.from(byKey.values());
}

function detectTransitstatSource(train, fallback) {
  const fields = [
    train.agency,
    train.operator,
    train.railroad,
    train.owner,
    train.carrier,
    train.agencyName,
    train.operatorName,
  ];
  const text = fields.filter(Boolean).join(" ").toLowerCase();
  if (!text) return fallback;
  if (text.includes("via")) return "via";
  if (text.includes("amtrak")) return "amtrak";
  if (text.includes("metro-north") || text.includes("mnrr") || text.includes("mta")) return "mta";
  if (text.includes("nj transit") || text.includes("njt")) return "njt";
  return fallback;
}

function isRailVehicle(train) {
  const text = [
    train.line,
    train.dest,
    train.route,
    train.agency,
    train.operator,
    train.railroad,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const mode = `${train.mode || train.vehicleType || train.extra?.mode || ""}`.toLowerCase();
  const blocked = ["bus", "shuttle", "trolleybus", "tram", "streetcar", "coach"];
  if (blocked.some((word) => text.includes(word))) return false;
  if (blocked.some((word) => mode.includes(word))) return false;
  return true;
}

function computeDelayMinutes(raw) {
  if (raw.delayMinutes != null && !Number.isNaN(Number(raw.delayMinutes))) {
    return Number(raw.delayMinutes);
  }

  if (raw.delay != null) {
    if (typeof raw.delay === "number") return raw.delay;
    const match = `${raw.delay}`.match(/-?\d+/);
    if (match) return Number(match[0]);
  }

  if (raw.scheduled && raw.actual) {
    const scheduled = parseClockTime(raw.scheduled);
    const actual = parseClockTime(raw.actual);
    if (scheduled != null && actual != null) {
      return actual - scheduled;
    }

    const scheduledTs = Date.parse(`${raw.scheduled}`);
    const actualTs = Date.parse(`${raw.actual}`);
    if (!Number.isNaN(scheduledTs) && !Number.isNaN(actualTs)) {
      return Math.round((actualTs - scheduledTs) / 60000);
    }
  }

  const statusText = `${raw.status || raw.trainTimely || raw.trainStatus || ""}`.toLowerCase();
  if (statusText.includes("early")) return -1;
  if (statusText.includes("on-time") || statusText.includes("on time")) return 0;
  if (statusText.includes("late") || statusText.includes("delay")) {
    const match = statusText.match(/-?\d+/);
    if (match) return Number(match[0]);
    return 6;
  }

  return null;
}

function normalizeServiceDelay(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return null;
  let value = Math.round(Number(minutes));
  while (value > 720) value -= 1440;
  while (value < -720) value += 1440;
  return value;
}

function computeTimestampDelayMinutes(scheduledValue, actualValue) {
  if (!scheduledValue || !actualValue) return null;
  const scheduledTs = Date.parse(`${scheduledValue}`);
  const actualTs = Date.parse(`${actualValue}`);
  if (Number.isNaN(scheduledTs) || Number.isNaN(actualTs)) return null;
  return normalizeServiceDelay((actualTs - scheduledTs) / 60000);
}

function deriveAmtrakerDelay(entry, focusStation) {
  const stations = Array.isArray(entry?.stations) ? entry.stations : [];
  const primary = focusStation || stations[0] || null;
  const stationSequence = primary ? [primary, ...stations.filter((row) => row !== primary)] : stations;

  const computeFromStation = (station) => {
    if (!station) return null;
    const scheduled = station.schDep || station.schArr;
    if (!scheduled) return null;

    const estimated = station.estDep || station.estArr;
    const estimateDelay = computeTimestampDelayMinutes(scheduled, estimated);
    if (estimateDelay != null) return estimateDelay;

    const actual = station.dep || station.arr || station.postDep || station.postArr;
    const actualDelay = computeTimestampDelayMinutes(scheduled, actual);
    if (actualDelay != null) return actualDelay;

    return null;
  };

  for (const station of stationSequence) {
    const delay = computeFromStation(station);
    if (delay != null) return delay;
  }

  return null;
}

function statusFromDelay(delayMinutes, fallback) {
  if (delayMinutes == null) return fallback || "en-route";
  if (delayMinutes <= -3) return "early";
  if (delayMinutes <= 4) return "on-time";
  if (delayMinutes <= 15) return "late";
  return "delayed";
}

function inferRealtime(raw) {
  if (raw.realTime === true) return true;
  if (raw.realTime === false) return false;

  const lat = raw.lat ?? raw.latitude;
  const lon = raw.lon ?? raw.longitude;
  const hasCoords = lat != null && lon != null;
  if (!hasCoords) return false;

  const updatedMs = toTimestampMs(raw.lastUpdated || raw.updatedAt || raw.timestamp);
  if (!updatedMs) return false;
  return Date.now() - updatedMs <= REALTIME_FRESH_MS;
}

function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

async function parseCsv(filePath) {
  const content = await readFile(filePath, "utf-8");
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function parseCsvOptional(filePath) {
  try {
    return await parseCsv(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function parseZipCsv(zip, fileName) {
  const entry = zip.getEntry(fileName);
  if (!entry) return [];
  const content = entry.getData().toString("utf-8");
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function loadLocalJson(filePath, fallback = []) {
  try {
    const payload = JSON.parse(await readFile(filePath, "utf-8"));
    return payload ?? fallback;
  } catch {
    return fallback;
  }
}

async function loadViaGtfs() {
  const base = path.join(ROOT, "viarail");
  const [routes, trips, stops, stopTimes, calendar, calendarDates, shapes] = await Promise.all([
    parseCsv(path.join(base, "routes.txt")),
    parseCsv(path.join(base, "trips.txt")),
    parseCsv(path.join(base, "stops.txt")),
    parseCsv(path.join(base, "stop_times.txt")),
    parseCsv(path.join(base, "calendar.txt")),
    parseCsv(path.join(base, "calendar_dates.txt")),
    parseCsv(path.join(base, "shapes.txt")),
  ]);

  const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));
  const routesById = new Map(routes.map((route) => [route.route_id, route]));

  const tripsById = new Map(trips.map((trip) => [trip.trip_id, trip]));
  const stopTimesByTrip = new Map();
  stopTimes.forEach((row) => {
    const entry = stopTimesByTrip.get(row.trip_id) || [];
    entry.push({
      ...row,
      arrivalSeconds: timeToSeconds(row.arrival_time),
      departureSeconds: timeToSeconds(row.departure_time),
      stopSequence: Number.parseInt(row.stop_sequence, 10) || 0,
    });
    stopTimesByTrip.set(row.trip_id, entry);
  });

  stopTimesByTrip.forEach((entries) => entries.sort((a, b) => a.stopSequence - b.stopSequence));

  const calendarByService = new Map(calendar.map((row) => [row.service_id, row]));
  const calendarDatesByService = new Map();
  calendarDates.forEach((row) => {
    const entry = calendarDatesByService.get(row.service_id) || [];
    entry.push(row);
    calendarDatesByService.set(row.service_id, entry);
  });

  const shapesById = new Map();
  shapes.forEach((row) => {
    const entry = shapesById.get(row.shape_id) || [];
    entry.push({
      lat: Number.parseFloat(row.shape_pt_lat),
      lon: Number.parseFloat(row.shape_pt_lon),
      seq: Number.parseInt(row.shape_pt_sequence, 10) || 0,
    });
    shapesById.set(row.shape_id, entry);
  });
  shapesById.forEach((points) => points.sort((a, b) => a.seq - b.seq));

  return {
    routesById,
    tripsById,
    stopsById,
    stopTimesByTrip,
    calendarByService,
    calendarDatesByService,
    shapesById,
  };
}

const viaDataPromise = loadViaGtfs();

async function loadNjtGtfs() {
  const base = path.join(ROOT, "njt_rail_data");
  const [routes, trips, stops, stopTimes, calendar, calendarDates, shapes] = await Promise.all([
    parseCsv(path.join(base, "routes.txt")),
    parseCsv(path.join(base, "trips.txt")),
    parseCsv(path.join(base, "stops.txt")),
    parseCsv(path.join(base, "stop_times.txt")),
    parseCsvOptional(path.join(base, "calendar.txt")),
    parseCsvOptional(path.join(base, "calendar_dates.txt")),
    parseCsv(path.join(base, "shapes.txt")),
  ]);

  const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));
  const routesById = new Map(routes.map((route) => [route.route_id, route]));
  const tripsById = new Map(trips.map((trip) => [trip.trip_id, trip]));
  const stopTimesByTrip = new Map();
  stopTimes.forEach((row) => {
    const entry = stopTimesByTrip.get(row.trip_id) || [];
    entry.push({
      stopId: row.stop_id,
      arrivalTime: row.arrival_time,
      departureTime: row.departure_time,
      stopSequence: Number.parseInt(row.stop_sequence, 10),
    });
    stopTimesByTrip.set(row.trip_id, entry);
  });
  stopTimesByTrip.forEach((entries) => entries.sort((a, b) => a.stopSequence - b.stopSequence));

  const calendarByService = new Map(calendar.map((row) => [row.service_id, row]));
  const calendarDatesByService = new Map();
  calendarDates.forEach((row) => {
    const entry = calendarDatesByService.get(row.service_id) || [];
    entry.push(row);
    calendarDatesByService.set(row.service_id, entry);
  });

  const shapesById = new Map();
  shapes.forEach((row) => {
    const entry = shapesById.get(row.shape_id) || [];
    entry.push({
      lat: Number.parseFloat(row.shape_pt_lat),
      lon: Number.parseFloat(row.shape_pt_lon),
      seq: Number.parseInt(row.shape_pt_sequence, 10),
    });
    shapesById.set(row.shape_id, entry);
  });
  shapesById.forEach((points) => points.sort((a, b) => a.seq - b.seq));

  return {
    routesById,
    tripsById,
    stopsById,
    stopTimesByTrip,
    calendarByService,
    calendarDatesByService,
    shapesById,
  };
}

const njtDataPromise = loadNjtGtfs();

async function loadAmtrakGtfs() {
  const base = path.join(ROOT, "Amtrak_GTFS");
  const [routes, trips, shapes] = await Promise.all([
    parseCsv(path.join(base, "routes.txt")),
    parseCsv(path.join(base, "trips.txt")),
    parseCsv(path.join(base, "shapes.txt")),
  ]);

  const routesById = new Map(routes.map((route) => [route.route_id, route]));
  const railRouteIds = new Set(
    routes.filter((route) => isRailRouteType(route.route_type)).map((route) => route.route_id)
  );

  const tripsById = new Map(
    trips.filter((trip) => railRouteIds.has(trip.route_id)).map((trip) => [trip.trip_id, trip])
  );

  const shapesById = new Map();
  shapes.forEach((row) => {
    const entry = shapesById.get(row.shape_id) || [];
    entry.push({
      lat: Number.parseFloat(row.shape_pt_lat),
      lon: Number.parseFloat(row.shape_pt_lon),
      seq: Number.parseInt(row.shape_pt_sequence, 10) || 0,
    });
    shapesById.set(row.shape_id, entry);
  });
  shapesById.forEach((points) => points.sort((a, b) => a.seq - b.seq));

  return {
    routesById,
    tripsById,
    shapesById,
  };
}

const amtrakDataPromise = loadAmtrakGtfs();

async function loadDartGtfs() {
  let routes;
  let trips;
  let stops;
  let stopTimes;
  let calendar;
  let calendarDates;
  let shapes;

  try {
    const base = path.join(ROOT, "DART");
    [routes, trips, stops, stopTimes, calendar, calendarDates, shapes] = await Promise.all([
      parseCsv(path.join(base, "routes.txt")),
      parseCsv(path.join(base, "trips.txt")),
      parseCsv(path.join(base, "stops.txt")),
      parseCsv(path.join(base, "stop_times.txt")),
      parseCsvOptional(path.join(base, "calendar.txt")),
      parseCsvOptional(path.join(base, "calendar_dates.txt")),
      parseCsv(path.join(base, "shapes.txt")),
    ]);
  } catch {
    const url = "https://www.dart.org/transitdata/latest/google_transit.zip";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        Accept: "application/zip",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch DART GTFS (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const zip = new AdmZip(buffer);

    [routes, trips, stops, stopTimes, calendar, calendarDates, shapes] = await Promise.all([
      parseZipCsv(zip, "routes.txt"),
      parseZipCsv(zip, "trips.txt"),
      parseZipCsv(zip, "stops.txt"),
      parseZipCsv(zip, "stop_times.txt"),
      parseZipCsv(zip, "calendar.txt"),
      parseZipCsv(zip, "calendar_dates.txt"),
      parseZipCsv(zip, "shapes.txt"),
    ]);
  }

  const routesById = new Map(routes.map((route) => [route.route_id, route]));
  const railRouteIds = new Set(
    routes.filter((route) => isRailRouteType(route.route_type)).map((route) => route.route_id)
  );

  const tripsById = new Map(
    trips.filter((trip) => railRouteIds.has(trip.route_id)).map((trip) => [trip.trip_id, trip])
  );

  const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));
  const stopTimesByTrip = new Map();
  const railStopIds = new Set();
  stopTimes.forEach((row) => {
    if (!tripsById.has(row.trip_id)) return;
    const entry = stopTimesByTrip.get(row.trip_id) || [];
    const arrivalSeconds = timeToSeconds(row.arrival_time);
    const departureSeconds = timeToSeconds(row.departure_time);
    entry.push({
      ...row,
      arrivalSeconds,
      departureSeconds,
      stopSequence: Number.parseInt(row.stop_sequence, 10) || 0,
    });
    stopTimesByTrip.set(row.trip_id, entry);
    railStopIds.add(row.stop_id);
  });
  stopTimesByTrip.forEach((entries) => entries.sort((a, b) => a.stopSequence - b.stopSequence));

  const calendarByService = new Map(calendar.map((row) => [row.service_id, row]));
  const calendarDatesByService = new Map();
  calendarDates.forEach((row) => {
    const entry = calendarDatesByService.get(row.service_id) || [];
    entry.push(row);
    calendarDatesByService.set(row.service_id, entry);
  });

  const shapesById = new Map();
  shapes.forEach((row) => {
    const entry = shapesById.get(row.shape_id) || [];
    entry.push({
      lat: Number.parseFloat(row.shape_pt_lat),
      lon: Number.parseFloat(row.shape_pt_lon),
      seq: Number.parseInt(row.shape_pt_sequence, 10) || 0,
    });
    shapesById.set(row.shape_id, entry);
  });
  shapesById.forEach((points) => points.sort((a, b) => a.seq - b.seq));

  return {
    routesById,
    tripsById,
    stopsById,
    stopTimesByTrip,
    calendarByService,
    calendarDatesByService,
    shapesById,
    railRouteIds,
    railStopIds,
  };
}

const dartDataPromise = loadDartGtfs();

function isServiceActive(serviceId, dateKey, calendarByService, calendarDatesByService, date) {
  const exceptions = calendarDatesByService.get(serviceId) || [];
  const exception = exceptions.find((row) => row.date === dateKey);
  if (exception) {
    return exception.exception_type === "1";
  }

  const calendarRow = calendarByService.get(serviceId);
  if (!calendarRow) return false;

  const start = calendarRow.start_date;
  const end = calendarRow.end_date;
  if (dateKey < start || dateKey > end) return false;

  const weekday = date.getDay();
  const map = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return calendarRow[map[weekday]] === "1";
}

function normalizeStatus(status) {
  if (!status) return "en-route";
  const normalized = status.toString().toLowerCase().trim();
  const map = {
    "on time": "on-time",
    ontime: "on-time",
    "on-time": "on-time",
    delayed: "delayed",
    delay: "delayed",
    late: "delayed",
    early: "early",
    boarding: "boarding",
    "en route": "en-route",
    enroute: "en-route",
    "en-route": "en-route",
    completed: "completed",
    "no data": "en-route",
  };
  return map[normalized] || "en-route";
}

function normalizeTrain(sourceKey, raw) {
  const routeLabel =
    raw.route ||
    raw.segment ||
    raw.originDestination ||
    (raw.line && raw.dest ? `${raw.line} → ${raw.dest}` : raw.line) ||
    "";

  const delayMinutes = computeDelayMinutes(raw);
  const realTime = inferRealtime(raw);
  const latRaw = raw.lat ?? raw.latitude ?? null;
  const lonRaw = raw.lon ?? raw.longitude ?? null;
  const latNum = latRaw == null ? null : Number(latRaw);
  const lonNum = lonRaw == null ? null : Number(lonRaw);
  const hasZeroZero = latNum != null && lonNum != null && Number.isFinite(latNum) && Number.isFinite(lonNum)
    && Math.abs(latNum) < 0.0001
    && Math.abs(lonNum) < 0.0001;
  const safeLat = hasZeroZero ? null : latRaw;
  const safeLon = hasZeroZero ? null : lonRaw;

  return {
    id: raw.id || raw.trainId || raw.number || raw.runNumber || `${sourceKey}-${raw.name || "unknown"}`,
    trainNum: raw.trainNum || raw.number || raw.trainId || raw.id || null,
    name: raw.name || raw.line || raw.routeName || raw.dest || "Unknown",
    source: sourceKey,
    route: routeLabel,
    status: statusFromDelay(delayMinutes, normalizeStatus(raw.status)),
    nextStop: raw.nextStop || raw.next_station || raw.next || "",
    eta: raw.eta || raw.arrival || raw.arrivalTime || "",
    delay: raw.delay || raw.delayMinutes || raw.late || "",
    scheduled: raw.scheduled || "",
    actual: raw.actual || "",
    delayMinutes,
    lat: safeLat,
    lon: safeLon,
    heading: raw.heading ?? null,
    speed: raw.speed ?? raw.mph ?? null,
    tripId: raw.tripId || null,
    realTime,
    confidence: raw.confidence || (realTime ? "realtime" : "scheduled"),
    lastUpdated: raw.lastUpdated || null,
    lineColor: raw.lineColor || sourceDefaultColors[sourceKey] || null,
    lineTextColor: raw.lineTextColor || null,
    comments: raw.comments || raw.delayReason || raw.cause || raw.description || raw.statusMsg || raw.statusText || raw.remarks || raw.note || raw.trainTimely || "",
    upcomingStops: Array.isArray(raw.upcomingStops) ? raw.upcomingStops : [],
  };
}

function amtrakMergeKey(train) {
  const raw = `${train.id || train.trainNum || ""}`.trim().toUpperCase();
  if (raw) {
    const compact = raw.replace(/[^A-Z0-9]/g, "");
    if (compact) return compact;
  }

  const fallback = `${train.name || ""}`.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return fallback || "UNKNOWN";
}

function mergeAmtrakTrains(primary = [], secondary = []) {
  const merged = new Map();

  [...primary, ...secondary].forEach((train) => {
    const amtrakText = `${train.name || ""} ${train.route || ""} ${train.id || ""}`.toLowerCase();
    if (amtrakText.includes("brightline")) return;

    const key = amtrakMergeKey(train);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...train, source: "amtrak" });
      return;
    }

    const incomingRealtime = Boolean(train.realTime);
    const existingRealtime = Boolean(existing.realTime);

    const next = {
      ...existing,
      ...train,
      source: "amtrak",
      id: existing.id || train.id,
      trainNum: train.trainNum || existing.trainNum,
      name: train.name && train.name !== "Unknown" ? train.name : existing.name,
      route: train.route || existing.route,
      nextStop: train.nextStop || existing.nextStop,
      eta: train.eta || existing.eta,
      scheduled: existing.scheduled || train.scheduled,
      actual: train.actual || existing.actual,
      delayMinutes:
        train.delayMinutes != null && !Number.isNaN(train.delayMinutes)
          ? train.delayMinutes
          : existing.delayMinutes,
      lat: incomingRealtime && train.lat != null ? train.lat : existing.lat ?? train.lat,
      lon: incomingRealtime && train.lon != null ? train.lon : existing.lon ?? train.lon,
      heading: train.heading ?? existing.heading,
      speed: train.speed ?? existing.speed,
      realTime: incomingRealtime || existingRealtime,
      confidence: incomingRealtime ? "realtime" : existing.confidence || train.confidence,
      lastUpdated:
        toTimestampMs(train.lastUpdated) >= toTimestampMs(existing.lastUpdated)
          ? train.lastUpdated
          : existing.lastUpdated,
      lineColor: train.lineColor || existing.lineColor || sourceDefaultColors.amtrak,
      lineTextColor: train.lineTextColor || existing.lineTextColor,
    };

    merged.set(key, next);
  });

  return Array.from(merged.values());
}

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(22_000) : undefined,
    headers: {
      "User-Agent": "OpenRailTracker/0.2",
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }
  return response.json();
}

async function fetchJsonInsecureTls(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: false,
        headers: {
          "User-Agent": "OpenRailTracker/0.2",
          Accept: "application/json",
        },
      },
      (res) => {
        let payload = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          payload += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Failed to fetch ${url} (${res.statusCode})`));
            return;
          }
          try {
            resolve(JSON.parse(payload));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(15_000, () => {
      req.destroy(new Error(`Timeout fetching ${url}`));
    });
  });
}

function buildTransitstatUrl(baseUrl, path) {
  if (!baseUrl) return null;
  if (baseUrl.endsWith("/")) {
    return `${baseUrl}${path}`;
  }
  return `${baseUrl}/${path}`;
}

// Returns [{geometry, color, name}] — geometry is a proper GeoJSON geometry object.
// MultiLineString features are kept as MultiLineString so each sub-line (e.g. outbound
// and inbound) is rendered independently by MapLibre — no stitching that could
// create Chicago→LA→Chicago zigzags.
function geoJsonToRouteFeatures(geojson, source, sampleRate = 1) {
  if (!geojson) return [];
  const features = geojson.type === "FeatureCollection" ? geojson.features : [geojson];
  const results = [];

  const sampleCoords = (coords) => {
    if (!coords || coords.length < 2) return null;
    const out = sanitizeLineCoordinates(coords, sampleRate, ROUTE_MAX_JUMP_KM);
    return out.length >= 2 ? out : null;
  };

  features.forEach((feature) => {
    const geometry = feature?.geometry || feature;
    if (!geometry) return;

    const props = feature?.properties || {};
    const color = normalizeHexColor(
      props.routeColor || props.color || props.route_color || props.colour || ""
    );
    const name =
      props.routeLongName ||
      props.route_long_name ||
      props.routeShortName ||
      props.route_short_name ||
      props.name ||
      props.NAME ||
      sourceConfigs[source]?.label ||
      source;

    if (geometry.type === "LineString") {
      const coords = sampleCoords(geometry.coordinates);
      if (coords) results.push({ geometry: { type: "LineString", coordinates: coords }, color, name });
    } else if (geometry.type === "MultiLineString") {
      // Keep as MultiLineString — MapLibre renders each sub-line with the same style.
      // De-duplicate sub-lines by fingerprint so outbound≈inbound tracks don't double-render.
      const seen = new Set();
      const lines = geometry.coordinates
        .map(sampleCoords)
        .filter(Boolean)
        .filter((line) => {
          // Fingerprint: first + mid + last point rounded to 2 decimal places
          const mid = line[Math.floor(line.length / 2)];
          const fp = `${line[0][0].toFixed(2)},${line[0][1].toFixed(2)}|${mid[0].toFixed(2)},${mid[1].toFixed(2)}|${line[line.length-1][0].toFixed(2)},${line[line.length-1][1].toFixed(2)}`;
          const rev = `${line[line.length-1][0].toFixed(2)},${line[line.length-1][1].toFixed(2)}|${mid[0].toFixed(2)},${mid[1].toFixed(2)}|${line[0][0].toFixed(2)},${line[0][1].toFixed(2)}`;
          if (seen.has(fp) || seen.has(rev)) return false;
          seen.add(fp);
          return true;
        });
      if (lines.length === 0) return;
      const geo = lines.length === 1
        ? { type: "LineString", coordinates: lines[0] }
        : { type: "MultiLineString", coordinates: lines };
      results.push({ geometry: geo, color, name });
    }
  });

  return results;
}

async function fetchGtfsRt(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        Accept: "application/x-protobuf",
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch GTFS-RT (${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGtfsRtWithFallback(primaryUrl, fallbackUrls = []) {
  const urls = [primaryUrl, ...(Array.isArray(fallbackUrls) ? fallbackUrls : [])].filter(Boolean);
  for (const url of urls) {
    try {
      return await fetchGtfsRt(url);
    } catch {
      // try the next endpoint
    }
  }
  return null;
}

async function loadRouteShapesFromGtfsZip(zipUrl, routeToSource) {
  if (!zipUrl) return [];

  const response = await fetch(zipUrl, {
    headers: {
      "User-Agent": "OpenRailTracker/0.2",
      Accept: "*/*",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch GTFS zip (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = new AdmZip(buffer);
  const [routes, trips, shapes, stopTimes, stops] = await Promise.all([
    parseZipCsv(zip, "routes.txt"),
    parseZipCsv(zip, "trips.txt"),
    parseZipCsv(zip, "shapes.txt"),
    parseZipCsv(zip, "stop_times.txt").catch(() => []),
    parseZipCsv(zip, "stops.txt").catch(() => []),
  ]);

  const routesById = new Map(routes.map((route) => [route.route_id, route]));
  const shapesById = new Map();
  shapes.forEach((row) => {
    const entry = shapesById.get(row.shape_id) || [];
    entry.push({
      lat: Number.parseFloat(row.shape_pt_lat),
      lon: Number.parseFloat(row.shape_pt_lon),
      seq: Number.parseInt(row.shape_pt_sequence, 10) || 0,
    });
    shapesById.set(row.shape_id, entry);
  });
  shapesById.forEach((points) => points.sort((a, b) => a.seq - b.seq));

  const stopsById = new Map(
    stops.map((stop) => [
      stop.stop_id,
      {
        lat: Number.parseFloat(stop.stop_lat),
        lon: Number.parseFloat(stop.stop_lon),
      },
    ])
  );
  const stopTimesByTrip = new Map();
  stopTimes.forEach((row) => {
    const entry = stopTimesByTrip.get(row.trip_id) || [];
    entry.push({
      stopId: row.stop_id,
      seq: Number.parseInt(row.stop_sequence, 10) || 0,
    });
    stopTimesByTrip.set(row.trip_id, entry);
  });
  stopTimesByTrip.forEach((entries) => entries.sort((a, b) => a.seq - b.seq));

  const output = [];
  const seen = new Set();

  trips.forEach((trip) => {
    if (!trip.shape_id) return;
    const route = routesById.get(trip.route_id);
    if (!route) return;
    if (!isUrbanRailRouteType(route.route_type)) return;

    const source = routeToSource(route, trip);
    if (!source) return;

    const key = `${source}:${trip.route_id}:${trip.shape_id}`;
    if (seen.has(key)) return;

    let coordinates = [];
    const shape = trip.shape_id ? shapesById.get(trip.shape_id) : null;
    if (shape && shape.length >= 2) {
      coordinates = sanitizeLineCoordinates(
        shape.map((point) => [point.lon, point.lat]),
        1,
        ROUTE_MAX_JUMP_KM
      );
    } else {
      const stopList = stopTimesByTrip.get(trip.trip_id) || [];
      const stopCoords = stopList
        .map((row) => stopsById.get(row.stopId))
        .filter((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lon))
        .map((point) => [point.lon, point.lat]);
      coordinates = sanitizeLineCoordinates(stopCoords, 1, ROUTE_MAX_JUMP_KM);
    }
    if (coordinates.length < 2) return;

    const shortName = `${route.route_short_name || ""}`.trim();
    const longName = `${route.route_long_name || ""}`.trim();
    const fallbackName = shortName ? `${sourceConfigs[source]?.label || source} ${shortName}` : (sourceConfigs[source]?.label || source);

    output.push({
      id: `${source}-${trip.shape_id}`,
      source,
      name: longName || fallbackName,
      color: sourceDefaultColors[source] || "",
      geometry: {
        type: "LineString",
        coordinates,
      },
    });
    seen.add(key);
  });

  return output;
}

async function loadBartRoutesFromGtfs() {
  const url = sourceConfigs.bart.gtfsStaticUrl;
  try {
    return await loadRouteShapesFromGtfsZip(url, () => "bart");
  } catch {
    return [];
  }
}

async function loadMetrolinkRoutesFromGtfs() {
  const url = sourceConfigs.metrolink.gtfsStaticUrl;
  try {
    const shapeBased = await loadRouteShapesFromGtfsZip(url, () => "metrolink");
    if (shapeBased.length > 0) return shapeBased;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        Accept: "*/*",
      },
    });
    if (!response.ok) return [];

    const buffer = Buffer.from(await response.arrayBuffer());
    const zip = new AdmZip(buffer);
    const [routes, trips, stopTimes, stops] = await Promise.all([
      parseZipCsv(zip, "routes.txt"),
      parseZipCsv(zip, "trips.txt"),
      parseZipCsv(zip, "stop_times.txt"),
      parseZipCsv(zip, "stops.txt"),
    ]);

    const routesById = new Map(routes.map((route) => [route.route_id, route]));
    const stopsById = new Map(
      stops.map((stop) => [
        stop.stop_id,
        { lat: Number.parseFloat(stop.stop_lat), lon: Number.parseFloat(stop.stop_lon) },
      ])
    );
    const stopTimesByTrip = new Map();
    stopTimes.forEach((row) => {
      const entry = stopTimesByTrip.get(row.trip_id) || [];
      entry.push({
        stopId: row.stop_id,
        seq: Number.parseInt(row.stop_sequence, 10) || 0,
      });
      stopTimesByTrip.set(row.trip_id, entry);
    });
    stopTimesByTrip.forEach((entries) => entries.sort((a, b) => a.seq - b.seq));

    const seenRouteIds = new Set();
    const output = [];
    trips.forEach((trip) => {
      if (!trip?.route_id || seenRouteIds.has(trip.route_id)) return;
      const route = routesById.get(trip.route_id);
      if (!route || !isUrbanRailRouteType(route.route_type)) return;

      const stopList = stopTimesByTrip.get(trip.trip_id) || [];
      const coords = sanitizeLineCoordinates(
        stopList
          .map((row) => stopsById.get(row.stopId))
          .filter((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lon))
          .map((point) => [point.lon, point.lat]),
        1,
        ROUTE_MAX_JUMP_KM
      );
      if (coords.length < 2) return;

      const shortName = `${route.route_short_name || ""}`.trim();
      const longName = `${route.route_long_name || ""}`.trim();
      output.push({
        id: `metrolink-route-${trip.route_id}`,
        source: "metrolink",
        name: longName || (shortName ? `Metrolink ${shortName}` : "Metrolink"),
        color: normalizeHexColor(route.route_color) || sourceDefaultColors.metrolink,
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      });
      seenRouteIds.add(trip.route_id);
    });

    return output;
  } catch {
    return [];
  }
}

async function loadAceRoutesFromGtfs() {
  const url = sourceConfigs.ace.gtfsStaticUrl;
  try {
    return await loadRouteShapesFromGtfsZip(url, () => "ace");
  } catch {
    return [];
  }
}

async function loadCoasterRoutesFromGtfs() {
  const url = sourceConfigs.coaster.gtfsStaticUrl;
  try {
    return await loadRouteShapesFromGtfsZip(url, () => "coaster");
  } catch {
    return [];
  }
}

async function loadMetrolinkRoutesFromOverpass() {
  const query = `[out:json][timeout:40];
(
  relation["route"="train"]["name"~"Metrolink",i](32.3,-119.7,35.2,-116.2);
  relation["route"="train"]["operator"~"Metrolink|SCRRA",i](32.3,-119.7,35.2,-116.2);
  way["railway"="rail"]["name"~"Metrolink",i](32.3,-119.7,35.2,-116.2);
);
out geom tags;`;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) return [];

    const payload = await response.json();
    const elements = Array.isArray(payload?.elements) ? payload.elements : [];
    const seen = new Set();

    return elements
      .filter((row) => (row?.type === "way" || row?.type === "relation") && Array.isArray(row?.geometry) && row.geometry.length > 1)
      .map((row) => {
        const coordinates = sanitizeLineCoordinates(
          row.geometry.map((point) => [Number(point.lon), Number(point.lat)]),
          1,
          ROUTE_MAX_JUMP_KM
        );
        if (coordinates.length < 2) return null;

        const signature = `${coordinates[0][0].toFixed(4)},${coordinates[0][1].toFixed(4)}:${coordinates[
          coordinates.length - 1
        ][0].toFixed(4)},${coordinates[coordinates.length - 1][1].toFixed(4)}`;
        if (seen.has(signature)) return null;
        seen.add(signature);

        return {
          id: `metrolink-way-${row.id}`,
          source: "metrolink",
          name: row.tags?.name || "Metrolink",
          color: sourceDefaultColors.metrolink,
          geometry: {
            type: "LineString",
            coordinates,
          },
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function loadCoasterRoutesFromOverpass() {
  const query = `[out:json][timeout:35];
(
  relation["route"="train"]["name"~"COASTER|Coaster",i](32.4,-117.6,33.4,-116.8);
  relation["route"="train"]["operator"~"NCTD",i](32.4,-117.6,33.4,-116.8);
  way["railway"="rail"]["name"~"COASTER|Coaster",i](32.4,-117.6,33.4,-116.8);
);
out geom tags;`;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) return [];

    const payload = await response.json();
    const elements = Array.isArray(payload?.elements) ? payload.elements : [];
    const seen = new Set();

    return elements
      .filter((row) => (row?.type === "way" || row?.type === "relation") && Array.isArray(row?.geometry) && row.geometry.length > 1)
      .map((row) => {
        const coordinates = sanitizeLineCoordinates(
          row.geometry.map((point) => [Number(point.lon), Number(point.lat)]),
          1,
          ROUTE_MAX_JUMP_KM
        );
        if (coordinates.length < 2) return null;

        const signature = `${coordinates[0][0].toFixed(4)},${coordinates[0][1].toFixed(4)}:${coordinates[
          coordinates.length - 1
        ][0].toFixed(4)},${coordinates[coordinates.length - 1][1].toFixed(4)}`;
        if (seen.has(signature)) return null;
        seen.add(signature);

        return {
          id: `coaster-way-${row.id}`,
          source: "coaster",
          name: row.tags?.name || "Coaster",
          color: sourceDefaultColors.coaster,
          geometry: {
            type: "LineString",
            coordinates,
          },
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function loadSfmtaRoutesFromGtfs() {
  const url = sourceConfigs.muni.gtfsStaticUrl;
  const streetcarRouteShortNames = new Set(["E", "F"]);
  try {
    return await loadRouteShapesFromGtfsZip(url, (route) => {
      const short = `${route.route_short_name || ""}`.trim().toUpperCase();
      const long = `${route.route_long_name || ""}`.toLowerCase();
      const isStreetcar =
        streetcarRouteShortNames.has(short) ||
        long.includes("streetcar") ||
        long.includes("historic");
      return isStreetcar ? "sfstreetcar" : "muni";
    });
  } catch {
    return [];
  }
}

async function loadVtaRoutesFromOverpass() {
  const query = `[out:json][timeout:35];
(
  rel["type"="route"]["route"~"light_rail|tram"]["operator"~"VTA|Santa Clara Valley Transportation Authority",i](36.8,-122.2,37.6,-121.6);
  rel["type"="route"]["route"~"light_rail|tram"]["network"~"VTA|Santa Clara Valley Transportation Authority",i](36.8,-122.2,37.6,-121.6);
);
way(r)["railway"~"light_rail|tram"]["service"!~"yard|siding|spur"];
out geom tags;`;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) return [];

    const payload = await response.json();
    const elements = Array.isArray(payload?.elements) ? payload.elements : [];
    const seen = new Set();

    return elements
      .filter((row) => (row?.type === "way" || row?.type === "relation") && Array.isArray(row?.geometry) && row.geometry.length > 1)
      .map((row) => {
        const coordinates = sanitizeLineCoordinates(
          row.geometry.map((point) => [Number(point.lon), Number(point.lat)]),
          1,
          ROUTE_MAX_JUMP_KM
        );
        if (coordinates.length < 2) return null;

        const name = row.tags?.name || row.tags?.ref || "VTA Light Rail";
        const signature = `${name}:${coordinates[0][0].toFixed(4)},${coordinates[0][1].toFixed(4)}:${coordinates[coordinates.length - 1][0].toFixed(4)},${coordinates[coordinates.length - 1][1].toFixed(4)}`;
        if (seen.has(signature)) return null;
        seen.add(signature);

        return {
          id: `vta-way-${row.id}`,
          source: "vta",
          name,
          color: sourceDefaultColors.vta,
          geometry: {
            type: "LineString",
            coordinates,
          },
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function loadCaltrainRoutesFromOverpass() {
  const query = `[out:json][timeout:35];
(
  rel["type"="route"]["route"="train"]["operator"~"Caltrain|Peninsula Corridor Joint Powers Board",i](37.0,-122.6,37.9,-121.7);
  rel["type"="route"]["route"="train"]["network"~"Caltrain",i](37.0,-122.6,37.9,-121.7);
);
way(r)["railway"="rail"]["service"!~"yard|siding|spur"];
out geom tags;`;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) return [];

    const payload = await response.json();
    const elements = Array.isArray(payload?.elements) ? payload.elements : [];
    const seen = new Set();

    return elements
      .filter((row) => row?.type === "way" && Array.isArray(row?.geometry) && row.geometry.length > 1)
      .map((row) => {
        const coordinates = sanitizeLineCoordinates(
          row.geometry.map((point) => [Number(point.lon), Number(point.lat)]),
          1,
          ROUTE_MAX_JUMP_KM
        );
        if (coordinates.length < 2) return null;

        const signature = `${coordinates[0][0].toFixed(4)},${coordinates[0][1].toFixed(4)}:${coordinates[
          coordinates.length - 1
        ][0].toFixed(4)},${coordinates[coordinates.length - 1][1].toFixed(4)}`;
        if (seen.has(signature)) return null;
        seen.add(signature);

        return {
          id: `caltrain-way-${row.id}`,
          source: "caltrain",
          name: "Caltrain",
          color: sourceDefaultColors.caltrain,
          geometry: {
            type: "LineString",
            coordinates,
          },
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function loadSmartRoutesFromOverpass() {
  const query = `[out:json][timeout:35];
(
  relation["type"="route"]["route"~"train|light_rail"]["operator"~"SMART|Sonoma-Marin",i](37.7,-123.2,39.9,-122.1);
  relation["type"="route"]["route"~"train|light_rail"]["network"~"SMART|Sonoma-Marin",i](37.7,-123.2,39.9,-122.1);
  relation["type"="route"]["route"~"train|light_rail"]["name"~"SMART|Sonoma-Marin",i](37.7,-123.2,39.9,-122.1);
);
way(r)["railway"~"rail|light_rail"]["service"!~"yard|siding|spur"];
way["railway"~"rail|light_rail"]["operator"~"SMART|Sonoma-Marin",i](37.7,-123.2,39.9,-122.1);
way["railway"~"rail|light_rail"]["name"~"SMART|Sonoma-Marin",i](37.7,-123.2,39.9,-122.1);
way["railway"="rail"]["service"!~"yard|siding|spur"](37.92,-122.95,38.85,-122.24);
out geom tags;`;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) return [];

    const payload = await response.json();
    const elements = Array.isArray(payload?.elements) ? payload.elements : [];
    const seen = new Set();

    return elements
      .filter((row) => row?.type === "way" && Array.isArray(row?.geometry) && row.geometry.length > 1)
      .map((row) => {
        const coordinates = sanitizeLineCoordinates(
          row.geometry.map((point) => [Number(point.lon), Number(point.lat)]),
          1,
          ROUTE_MAX_JUMP_KM
        );
        if (coordinates.length < 2) return null;

        const signature = `${coordinates[0][0].toFixed(4)},${coordinates[0][1].toFixed(4)}:${coordinates[
          coordinates.length - 1
        ][0].toFixed(4)},${coordinates[coordinates.length - 1][1].toFixed(4)}`;
        if (seen.has(signature)) return null;
        seen.add(signature);

        return {
          id: `smart-way-${row.id}`,
          source: "smart",
          name: row.tags?.name || "SMART",
          color: sourceDefaultColors.smart,
          geometry: {
            type: "LineString",
            coordinates,
          },
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchGtfsRtWithHeaders(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        Accept: "application/x-protobuf",
        ...headers,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch GTFS-RT (${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
  } finally {
    clearTimeout(timer);
  }
}

async function loadTransitstatTrains(baseUrl, sourceKey) {
  const url = buildTransitstatUrl(baseUrl, "trains");
  const payload = await fetchJson(url);
  const trains = Object.entries(payload).map(([runNumber, train]) => ({
    ...train,
    runNumber,
  }));

  return trains
    .map((train) => {
      if (train.deadMileage === true || train.deadMileage === "true") return null;
      if (!isRailVehicle(train)) return null;
      const prediction = pickBestPrediction(train.predictions);
      const scheduledTime =
        parseTransitstatTimestamp(
          prediction.scheduledETA ||
            prediction.scheduledTime ||
            prediction.scheduledArrival ||
            prediction.scheduledDeparture ||
            prediction.scheduled
        ) || "";
      const actualTime =
        parseTransitstatTimestamp(
          prediction.actualETA ||
            prediction.actualTime ||
            prediction.actualArrival ||
            prediction.actualDeparture ||
            prediction.actual
        ) || "";
      const updatedTime = parseTransitstatTimestamp(
        prediction.lastUpdated || prediction.updatedAt || train.lastUpdated || payload.lastUpdated
      );

      return normalizeTrain(sourceKey, {
        id: train.runNumber,
        name: train.line || "Train",
        route: train.line && train.dest ? `${train.line} → ${train.dest}` : train.line,
        status: train.realTime ? "en-route" : "scheduled",
        nextStop: prediction.stationName || "",
        eta: actualTime || scheduledTime || "",
        scheduled: scheduledTime,
        actual: actualTime,
        delayMinutes: prediction.delay ?? null,
        delay: "",
        lat: train.lat,
        lon: train.lon,
        heading: train.heading,
        speed: train.speed ?? train.velocity ?? train.mph ?? null,
        realTime: train.realTime,
        confidence: train.realTime ? "realtime" : "scheduled",
        lastUpdated: updatedTime || payload.lastUpdated || new Date().toISOString(),
        lineColor: normalizeHexColor(
          train.lineColor || train.routeColor || train.line_color || train.route_color
        ),
        lineTextColor: normalizeHexColor(
          train.lineTextColor || train.routeTextColor || train.line_text_color || train.route_text_color
        ),
      });
    })
    .filter(Boolean);
}

async function loadAmtrakerTrains() {
  const config = sourceConfigs.amtraker;
  let entries = [];

  try {
    const payload = await fetchJson(`${config.v3BaseUrl || "https://api.amtraker.com/v3"}/all`);
    if (payload?.trains && typeof payload.trains === "object") {
      entries = Object.values(payload.trains).flatMap((value) =>
        Array.isArray(value) ? value : []
      );
    }
  } catch {
    try {
      const payload = await fetchJsonInsecureTls(
        `${config.v3BaseUrl || "https://api.amtraker.com/v3"}/all`
      );
      if (payload?.trains && typeof payload.trains === "object") {
        entries = Object.values(payload.trains).flatMap((value) =>
          Array.isArray(value) ? value : []
        );
      }
    } catch {
      const legacyPayload = await fetchJson(`${config.baseUrl}/trains`);
      entries = Object.values(legacyPayload || {}).flatMap((value) =>
        Array.isArray(value) ? value : []
      );
    }
  }

  return entries.map((entry) => {
    const coords = Array.isArray(entry.coordinates) ? entry.coordinates : [];
    let lat = entry.lat ?? coords[0] ?? null;
    let lon = entry.lon ?? coords[1] ?? null;
    if (lat != null && lon != null) {
      const latNum = Number(lat);
      const lonNum = Number(lon);
      if (!Number.isNaN(latNum) && !Number.isNaN(lonNum)) {
        if (Math.abs(latNum) > 90 && Math.abs(lonNum) <= 90) {
          lat = lonNum;
          lon = latNum;
        } else {
          lat = latNum;
          lon = lonNum;
        }
      }
    }
    const station = Array.isArray(entry.stations)
      ? entry.stations.find((row) => row.code === entry.eventCode || row.status === "Enroute") ||
        entry.stations[0]
      : null;
    const derivedDelayMinutes = deriveAmtrakerDelay(entry, station);
    const eta =
      station?.estArr ||
      station?.estDep ||
      station?.arr ||
      station?.dep ||
      station?.postArr ||
      station?.postDep ||
      "";
    const scheduled = station?.schArr || station?.schDep || entry.origSchDep || "";
    const actual = station?.arr || station?.dep || entry.lastValTS || entry.updatedAt || "";

    return normalizeTrain("amtrak", {
      id: entry.trainID || entry.id || entry.trainNum || entry.routeName || "amtrak",
      trainNum: entry.trainNum || null,
      name: entry.routeName || "Amtrak",
      route: entry.routeName || "",
      status: normalizeStatus(entry.trainTimely || entry.status || entry.trainStatus || station?.status || ""),
      nextStop: station?.stationName || station?.name || entry.eventCode || "",
      eta,
      scheduled,
      actual,
      delayMinutes: derivedDelayMinutes,
      lat,
      lon,
      heading: entry.heading ?? entry.bearing ?? null,
      speed: entry.velocity ?? entry.speed ?? null,
      realTime: true,
      confidence: "realtime",
      lastUpdated: entry.updatedAt || entry.lastValTS || new Date().toISOString(),
      lineColor: normalizeHexColor(entry.iconColor || "") || sourceDefaultColors.amtrak,
    });
  });
}

async function loadAmtrakTrains() {
  const [transitstatResult, amtrakerResult] = await Promise.allSettled([
    loadTransitstatTrains(sourceConfigs.amtrak.baseUrl, "amtrak"),
    loadAmtrakerTrains(),
  ]);

  const transitstat = transitstatResult.status === "fulfilled" ? transitstatResult.value : [];
  const amtraker = amtrakerResult.status === "fulfilled" ? amtrakerResult.value : [];

  return mergeAmtrakTrains(transitstat, amtraker);
}

async function loadBrightlineGtfs() {
  const config = sourceConfigs.brightline;
  if (!config.defaultUrl) return [];
  const [positions, tripUpdates] = await Promise.all([
    fetchGtfsRt(config.defaultUrl),
    config.tripUpdatesUrl ? fetchGtfsRt(config.tripUpdatesUrl) : Promise.resolve(null),
  ]);

  const tripLookup = new Map();
  if (tripUpdates?.entity) {
    tripUpdates.entity.forEach((entity) => {
      const update = entity.tripUpdate;
      if (!update?.trip?.tripId) return;
      const nextStop = update.stopTimeUpdate?.[0]?.stopId || "";
      const nextArrival = update.stopTimeUpdate?.[0]?.arrival?.time;
      const delaySeconds = update.stopTimeUpdate?.[0]?.arrival?.delay;
      tripLookup.set(update.trip.tripId, {
        nextStop,
        eta: nextArrival
          ? new Date(nextArrival * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        delayMinutes: typeof delaySeconds === "number" ? Math.round(delaySeconds / 60) : null,
      });
    });
  }

  const trains = [];
  positions.entity?.forEach((entity) => {
    const vehicle = entity.vehicle;
    if (!vehicle?.position) return;
    const tripId = vehicle.trip?.tripId || "";
    const vehicleId = vehicle.vehicle?.label || vehicle.vehicle?.id || tripId || "Brightline";
    const tripInfo = tripLookup.get(tripId) || {};

    trains.push(
      normalizeTrain("brightline", {
        id: vehicleId,
        name: "Brightline",
        route: tripId,
        status: "en-route",
        nextStop: tripInfo.nextStop,
        eta: tripInfo.eta,
        actual: tripInfo.eta,
        delayMinutes: tripInfo.delayMinutes,
        lat: vehicle.position.latitude,
        lon: vehicle.position.longitude,
        heading: vehicle.position.bearing,
        speed: vehicle.position.speed,
        realTime: true,
        confidence: "realtime",
        lastUpdated: positions.header?.timestamp
          ? new Date(positions.header.timestamp * 1000).toISOString()
          : new Date().toISOString(),
      })
    );
  });

  return trains;
}

async function loadBrightlineLocal() {
  const filePath = path.join(ROOT, "data", "brightline.json");
  const payload = await loadLocalJson(filePath, []);
  if (!Array.isArray(payload)) return [];
  return payload.map((entry) =>
    normalizeTrain("brightline", {
      id: entry.id || entry.name || "Brightline",
      name: entry.name || "Brightline",
      route: entry.route || "",
      status: entry.status || "scheduled",
      nextStop: entry.nextStop || "",
      eta: entry.eta || "",
      scheduled: entry.scheduled || "",
      actual: entry.actual || "",
      delay: entry.delay || "",
      lat: entry.lat ?? null,
      lon: entry.lon ?? null,
      realTime: false,
      confidence: "scheduled",
      lastUpdated: new Date().toISOString(),
    })
  );
}

async function loadBrightlineTrains() {
  const [gtfsResult, transitstatResult] = await Promise.allSettled([
    loadBrightlineGtfs(),
    loadTransitstatSource("brightline"),
  ]);

  const gtfs = gtfsResult.status === "fulfilled" ? gtfsResult.value : [];
  const transitstat = transitstatResult.status === "fulfilled" ? transitstatResult.value : [];
  const merged = dedupeTrains([...gtfs, ...transitstat]);

  if (merged.length > 0) {
    return merged;
  }

  return loadBrightlineLocal();
}

async function loadTransitstatSource(sourceKey) {
  const config = sourceConfigs[sourceKey];
  if (!config?.baseUrl) return [];
  try {
    return await loadTransitstatTrains(config.baseUrl, sourceKey);
  } catch {
    if (sourceKey === "brightline") {
      return loadBrightlineLocal();
    }
    return [];
  }
}

async function loadNjtGtfsRtTrains() {
  if (!njtGtfsRtConfig.vehiclePositionsUrl) return [];
  const headers = njtGtfsRtConfig.apiKey
    ? { "x-api-key": njtGtfsRtConfig.apiKey }
    : {};

  const [positions, tripUpdates] = await Promise.all([
    fetchGtfsRtWithHeaders(njtGtfsRtConfig.vehiclePositionsUrl, headers),
    njtGtfsRtConfig.tripUpdatesUrl
      ? fetchGtfsRtWithHeaders(njtGtfsRtConfig.tripUpdatesUrl, headers)
      : Promise.resolve(null),
  ]);

  const tripLookup = new Map();
  if (tripUpdates?.entity) {
    tripUpdates.entity.forEach((entity) => {
      const update = entity.tripUpdate;
      if (!update?.trip?.tripId) return;
      const nextStop = update.stopTimeUpdate?.[0]?.stopId || "";
      const nextArrival = update.stopTimeUpdate?.[0]?.arrival?.time;
      const delaySeconds = update.stopTimeUpdate?.[0]?.arrival?.delay;
      tripLookup.set(update.trip.tripId, {
        nextStop,
        eta: nextArrival
          ? new Date(nextArrival * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        delayMinutes: typeof delaySeconds === "number" ? Math.round(delaySeconds / 60) : null,
      });
    });
  }

  const trains = [];
  positions.entity?.forEach((entity) => {
    const vehicle = entity.vehicle;
    if (!vehicle?.position) return;
    const tripId = vehicle.trip?.tripId || "";
    const vehicleId = vehicle.vehicle?.label || vehicle.vehicle?.id || tripId || "NJT";
    const routeId = vehicle.trip?.routeId || vehicle.trip?.tripId || "NJT";
    const tripInfo = tripLookup.get(tripId) || {};

    trains.push(
      normalizeTrain("njt", {
        id: vehicleId,
        tripId,
        name: "NJT",
        route: routeId,
        status: "en-route",
        nextStop: tripInfo.nextStop || "",
        eta: tripInfo.eta || "",
        actual: tripInfo.eta || "",
        delayMinutes: tripInfo.delayMinutes ?? null,
        lat: vehicle.position.latitude,
        lon: vehicle.position.longitude,
        heading: vehicle.position.bearing,
        speed: vehicle.position.speed,
        realTime: true,
        confidence: "realtime",
        lastUpdated: positions.header?.timestamp
          ? new Date(positions.header.timestamp * 1000).toISOString()
          : new Date().toISOString(),
      })
    );
  });

  return trains;
}

async function loadNjtScheduledTrains() {
  const njtData = await njtDataPromise;
  const now = new Date();
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const cutoffSeconds = nowSeconds + 2 * 3600;
  const dateKey = getTodayKey(now);
  const hasCalendar =
    njtData.calendarByService.size > 0 || njtData.calendarDatesByService.size > 0;

  const trains = [];
  njtData.tripsById.forEach((trip) => {
    if (
      hasCalendar &&
      !isServiceActive(
        trip.service_id,
        dateKey,
        njtData.calendarByService,
        njtData.calendarDatesByService,
        now
      )
    ) {
      return;
    }

    const stopTimes = njtData.stopTimesByTrip.get(trip.trip_id) || [];
    const nextStop = stopTimes.find((stop) => {
      const time = timeToSeconds(stop.departureTime || stop.arrivalTime);
      return time != null && time >= nowSeconds && time <= cutoffSeconds;
    });
    if (!nextStop) return;

    const stop = njtData.stopsById.get(nextStop.stopId);
    const route = njtData.routesById.get(trip.route_id);
    const arrivalSeconds = timeToSeconds(nextStop.arrivalTime || nextStop.departureTime);
    const eta = secondsToTime(arrivalSeconds);

    trains.push(
      normalizeTrain("njt", {
        id: trip.trip_short_name || trip.trip_id,
        tripId: trip.trip_id,
        name: route?.route_long_name || route?.route_short_name || "NJ Transit",
        route: route?.route_long_name || route?.route_short_name || "NJ Transit",
        status: "scheduled",
        nextStop: stop?.stop_name || "",
        eta,
        scheduled: eta,
        actual: "",
        delay: "",
        lat: stop?.stop_lat ? Number.parseFloat(stop.stop_lat) : null,
        lon: stop?.stop_lon ? Number.parseFloat(stop.stop_lon) : null,
        realTime: false,
        confidence: "scheduled",
        lastUpdated: new Date().toISOString(),
      })
    );
  });

  return trains;
}

function resolveDartLineColor(route) {
  const name = `${route?.route_short_name || ""} ${route?.route_long_name || ""}`
    .toLowerCase()
    .trim();
  if (name.includes("tre") || name.includes("trinity railway express")) return "#ef4444";
  if (name.includes("texrail")) return "#1e3a8a";
  if (name.includes("silver")) return "#9ca3af";
  return normalizeHexColor(route?.route_color || "");
}

async function loadDartTrains() {
  try {
    const realtime = await loadTransitstatSource("dart");
    if (realtime.length > 0) return realtime;
  } catch {
    // Fall through to static fallback.
  }

  const dartData = await dartDataPromise;
  const now = new Date();
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const horizonSeconds = nowSeconds + 45 * 60;
  const dateKey = getTodayKey(now);
  const hasCalendar =
    dartData.calendarByService.size > 0 || dartData.calendarDatesByService.size > 0;

  const byRun = new Map();
  dartData.tripsById.forEach((trip) => {
    if (
      hasCalendar &&
      !isServiceActive(
        trip.service_id,
        dateKey,
        dartData.calendarByService,
        dartData.calendarDatesByService,
        now
      )
    ) {
      return;
    }

    const stopTimes = dartData.stopTimesByTrip.get(trip.trip_id) || [];
    const nextStop = stopTimes.find((stop) => {
      const etaSeconds = stop.arrivalSeconds ?? stop.departureSeconds;
      return etaSeconds != null && etaSeconds >= nowSeconds && etaSeconds <= horizonSeconds;
    });
    if (!nextStop) return;

    const etaSeconds = nextStop.arrivalSeconds ?? nextStop.departureSeconds;
    if (etaSeconds == null) return;

    const stop = dartData.stopsById.get(nextStop.stop_id);
    const route = dartData.routesById.get(trip.route_id);
    const eta = secondsToTime(etaSeconds);
    const trainNum = trip.trip_short_name || trip.trip_id;
    const key = `${route?.route_id || trip.route_id}:${trainNum}`;

    const candidate = normalizeTrain("dart", {
      id: trip.trip_id,
      tripId: trip.trip_id,
      trainNum,
      name: route?.route_long_name || route?.route_short_name || "DART Rail",
      route: route?.route_long_name || route?.route_short_name || "DART Rail",
      status: "on-time",
      nextStop: stop?.stop_name || "",
      eta,
      scheduled: eta,
      actual: eta,
      delay: "",
      lat: stop?.stop_lat ? Number.parseFloat(stop.stop_lat) : null,
      lon: stop?.stop_lon ? Number.parseFloat(stop.stop_lon) : null,
      realTime: false,
      confidence: "scheduled",
      lastUpdated: new Date().toISOString(),
      lineColor: resolveDartLineColor(route) || null,
      lineTextColor: normalizeHexColor(route?.route_text_color || ""),
    });

    const current = byRun.get(key);
    const currentEta = parseClockTime(current?.eta || "") ?? Number.POSITIVE_INFINITY;
    const candidateEta = parseClockTime(candidate.eta || "") ?? Number.POSITIVE_INFINITY;
    if (!current || candidateEta < currentEta) {
      byRun.set(key, candidate);
    }
  });

  return Array.from(byRun.values())
    .sort((a, b) => (parseClockTime(a.eta || "") ?? 0) - (parseClockTime(b.eta || "") ?? 0))
    .slice(0, 80);
}

async function loadViaTrains() {
  const viaData = await viaDataPromise;
  const now = new Date();
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const dateKey = getTodayKey(now);

  const activeTrips = [];
  viaData.tripsById.forEach((trip) => {
    if (
      isServiceActive(
        trip.service_id,
        dateKey,
        viaData.calendarByService,
        viaData.calendarDatesByService,
        now
      )
    ) {
      activeTrips.push(trip);
    }
  });

  const trains = [];
  activeTrips.forEach((trip) => {
    const stopTimes = viaData.stopTimesByTrip.get(trip.trip_id) || [];
    const nextStop = stopTimes.find((stop) => (stop.departureSeconds ?? stop.arrivalSeconds) >= nowSeconds);
    if (!nextStop) return;

    const stop = viaData.stopsById.get(nextStop.stop_id);
    const route = viaData.routesById.get(trip.route_id);

    trains.push(
      normalizeTrain("via", {
        id: trip.trip_short_name || trip.trip_id,
        tripId: trip.trip_id,
        name: route?.route_long_name || route?.route_short_name || "VIA Rail",
        route: route?.route_long_name || route?.route_short_name || "VIA Rail",
        status: "on-time",
        nextStop: stop?.stop_name || "",
        eta: secondsToTime(nextStop.arrivalSeconds ?? nextStop.departureSeconds),
        scheduled: secondsToTime(nextStop.arrivalSeconds ?? nextStop.departureSeconds),
        actual: secondsToTime(nextStop.arrivalSeconds ?? nextStop.departureSeconds),
        delay: "",
        lat: stop?.stop_lat ? Number.parseFloat(stop.stop_lat) : null,
        lon: stop?.stop_lon ? Number.parseFloat(stop.stop_lon) : null,
        realTime: false,
        confidence: "scheduled",
        lastUpdated: new Date().toISOString(),
      })
    );
  });

  return trains;
}

function reclassifyViaTrains(trains) {
  return trains.map((train) => {
    const token = `${train.trainNum || train.id || ""}`.trim();
    if (train.source === "amtrak" && /^V\d+/i.test(token)) {
      return {
        ...train,
        source: "via",
        lineColor: sourceDefaultColors.via,
        name: train.name && train.name !== "Unknown" ? train.name : "VIA Rail",
      };
    }
    return train;
  });
}

// Generic GTFS-RT loader for sources with provider feeds and optional fallbacks
async function loadGenericGtfsRtSource(sourceKey) {
  const config = sourceConfigs[sourceKey];
  if (!config?.vehiclePositionsUrl) return [];

  const [posData, tuData] = await Promise.all([
    fetchGtfsRtWithFallback(config.vehiclePositionsUrl, config.vehiclePositionsUrlFallbacks || []),
    config.tripUpdatesUrl
      ? fetchGtfsRtWithFallback(config.tripUpdatesUrl, config.tripUpdatesUrlFallbacks || [])
      : Promise.resolve(null),
  ]);

  // Build trip → delay/next-stop lookup from TripUpdates
  const tripLookup = new Map();
  if (tuData?.entity) {
    for (const entity of tuData.entity) {
      const update = entity.tripUpdate;
      if (!update?.trip?.tripId) continue;
      const nextStopUpdate = update.stopTimeUpdate?.[0];
      const arrivalDelay   = nextStopUpdate?.arrival?.delay ?? nextStopUpdate?.departure?.delay;
      const arrivalTime    = nextStopUpdate?.arrival?.time  ?? nextStopUpdate?.departure?.time;
      const upcomingStops = Array.isArray(update.stopTimeUpdate)
        ? update.stopTimeUpdate
            .slice(0, 12)
            .map((row) => {
              const ts = row?.arrival?.time ?? row?.departure?.time;
              const delay = row?.arrival?.delay ?? row?.departure?.delay;
              return {
                stopId: row?.stopId || "",
                scheduled: ts ? new Date(Number(ts) * 1000).toISOString() : null,
                actual:
                  ts && typeof delay === "number"
                    ? new Date((Number(ts) + Number(delay)) * 1000).toISOString()
                    : ts
                      ? new Date(Number(ts) * 1000).toISOString()
                      : null,
                delayMinutes: typeof delay === "number" ? Math.round(Number(delay) / 60) : null,
              };
            })
            .filter((row) => row.stopId)
        : [];
      tripLookup.set(update.trip.tripId, {
        routeId: update.trip.routeId || "",
        nextStop: nextStopUpdate?.stopId || "",
        eta: arrivalTime
          ? new Date(Number(arrivalTime) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        delayMinutes: typeof arrivalDelay === "number" ? Math.round(arrivalDelay / 60) : null,
        upcomingStops,
      });
    }
  }

  if (!posData?.entity?.length) return [];

  const trains = [];
  for (const entity of posData.entity) {
    const vehicle = entity.vehicle;
    if (!vehicle?.position) continue;
    const tripId    = vehicle.trip?.tripId || "";
    const vehicleId = vehicle.vehicle?.label || vehicle.vehicle?.id || tripId || `${sourceKey}-${trains.length}`;
    const tripInfo  = tripLookup.get(tripId) || {};
    const routeName = tripInfo.routeId || tripId || config.label;

    trains.push(
      normalizeTrain(sourceKey, {
        id: vehicleId,
        tripId,
        name: config.label,
        route: routeName,
        status: "en-route",
        nextStop: tripInfo.nextStop || "",
        eta: tripInfo.eta || "",
        actual: tripInfo.eta || "",
        scheduled: tripInfo.eta || "",
        delayMinutes: tripInfo.delayMinutes ?? null,
        upcomingStops: tripInfo.upcomingStops || [],
        lat: vehicle.position.latitude,
        lon: vehicle.position.longitude,
        heading: vehicle.position.bearing ?? null,
        speed: vehicle.position.speed ?? null,
        realTime: true,
        confidence: "realtime",
        lastUpdated: posData.header?.timestamp
          ? new Date(Number(posData.header.timestamp) * 1000).toISOString()
          : new Date().toISOString(),
      })
    );
  }
  return trains;
}

function extractXmlTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1]?.trim() || "";
}

async function loadCaltrain511Fallback() {
  const config = sourceConfigs.caltrain;
  if (!config?.apiKey511) return [];

  const url = `https://api.511.org/transit/VehicleMonitoring?api_key=${encodeURIComponent(
    config.apiKey511
  )}&agency=${encodeURIComponent(config.agencyCode511 || "CT")}`;

  let xml = "";
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "OpenRailTracker/0.2",
        Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return [];
    xml = await response.text();
  } catch {
    return [];
  }

  const activities = xml.match(/<VehicleActivity>[\s\S]*?<\/VehicleActivity>/gi) || [];
  const trains = activities
    .map((activity, index) => {
      const vehicleRef = extractXmlTag(activity, "VehicleRef") || `ct-${index}`;
      const lineRef = extractXmlTag(activity, "LineRef") || "Caltrain";
      const destination = extractXmlTag(activity, "DestinationName") || "";
      const lat = Number.parseFloat(extractXmlTag(activity, "Latitude"));
      const lon = Number.parseFloat(extractXmlTag(activity, "Longitude"));
      const bearing = Number.parseFloat(extractXmlTag(activity, "Bearing"));
      const recordedAt = extractXmlTag(activity, "RecordedAtTime");

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      return normalizeTrain("caltrain", {
        id: vehicleRef,
        trainNum: vehicleRef,
        name: "Caltrain",
        route: destination || lineRef,
        status: "en-route",
        nextStop: destination || "",
        lat,
        lon,
        heading: Number.isFinite(bearing) ? bearing : null,
        realTime: true,
        confidence: "realtime",
        lastUpdated: recordedAt || new Date().toISOString(),
      });
    })
    .filter(Boolean);

  return trains;
}

async function loadCaltrainTrains() {
  const primary = await loadGenericGtfsRtSource("caltrain");
  if (primary.length > 0) return primary;

  const via511 = await loadCaltrain511Fallback();
  if (via511.length > 0) return via511;

  return [];
}

async function loadTrains() {
  const cached = cache.get("trains");
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const transitstatKeys = Object.entries(sourceConfigs)
    .filter(
      ([key, config]) =>
        config.responseType === "transitstat" && key !== "amtrak" && key !== "brightline" && key !== "njt" && key !== "mta"
    )
    .map(([key]) => key);

  const gtfsRtKeys = Object.entries(sourceConfigs)
    .filter(([, config]) => config.responseType === "gtfs-rt")
    .map(([key]) => key);

  const results = await Promise.allSettled([
    loadAmtrakTrains(),
    loadBrightlineTrains(),
    ...transitstatKeys.map((key) => loadTransitstatSource(key)),
    ...gtfsRtKeys.map((key) => (key === "caltrain" ? loadCaltrainTrains() : loadGenericGtfsRtSource(key))),
    loadDartTrains(),
    loadViaTrains(),
  ]);

  const trains = reclassifyViaTrains(
    dedupeTrains(
    results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
    ).filter((t) => {
      // Drop trains with no coordinates or stuck at 0,0
      const lat = Number(t.lat);
      const lon = Number(t.lon);
      if (t.lat == null || t.lon == null) return true; // allow null (scheduled trains)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
      if (Math.abs(lat) < 0.01 && Math.abs(lon) < 0.01) {
        return Object.assign(t, { lat: null, lon: null }) && true;
      }
      return true;
    })
  );
  const data = { updatedAt: new Date().toISOString(), trains };
  cache.set("trains", { data, timestamp: Date.now() });
  return data;
}

async function loadStations() {
  const cached = cache.get("stations");
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const [amtrakStations, brightlineStations, dartData] = await Promise.all([
    fetchJson(buildTransitstatUrl(sourceConfigs.amtrak.baseUrl, "stations")),
    fetchJson(buildTransitstatUrl(sourceConfigs.brightline.baseUrl, "stations")),
    dartDataPromise,
  ]);

  const stationList = [];
  Object.values(amtrakStations || {}).forEach((station) => {
    stationList.push({
      id: station.stationID,
      name: station.stationName,
      lat: station.lat,
      lon: station.lon,
      source: "amtrak",
    });
  });

  Object.values(brightlineStations || {}).forEach((station) => {
    stationList.push({
      id: station.stationID,
      name: station.stationName,
      lat: station.lat,
      lon: station.lon,
      source: "brightline",
    });
  });

  const viaData = await viaDataPromise;
  const stations = Array.from(viaData.stopsById.values()).map((stop) => ({
    id: stop.stop_id,
    name: stop.stop_name,
    lat: Number.parseFloat(stop.stop_lat),
    lon: Number.parseFloat(stop.stop_lon),
    source: "via",
  }));

  const dartStations = Array.from(dartData.railStopIds || [])
    .map((stopId) => {
      const stop = dartData.stopsById.get(stopId);
      if (!stop) return null;
      return {
        id: stop.stop_id,
        name: stop.stop_name,
        lat: Number.parseFloat(stop.stop_lat),
        lon: Number.parseFloat(stop.stop_lon),
        source: "dart",
      };
    })
    .filter(Boolean);

  const data = {
    updatedAt: new Date().toISOString(),
    stations: [...stationList, ...stations, ...dartStations],
  };
  cache.set("stations", { data, timestamp: Date.now() });
  return data;
}

async function loadCommuterTrains() {
  const cached = cache.get("commuter-trains");
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const results = await Promise.allSettled([
    loadNjtGtfsRtTrains(),
    loadTransitstatSource("njt"),
    loadTransitstatSource("mta"),
  ]);

  const trains = dedupeTrains(
    results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value)
  ).filter((t) => {
    if (t.lat == null || t.lon == null) return true;
    const lat = Number(t.lat);
    const lon = Number(t.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    if (Math.abs(lat) < 0.01 && Math.abs(lon) < 0.01) {
      return Object.assign(t, { lat: null, lon: null }) && true;
    }
    return true;
  });
  const data = { updatedAt: new Date().toISOString(), trains };
  cache.set("commuter-trains", { data, timestamp: Date.now() });
  return data;
}

async function loadCommuterStations() {
  const cached = cache.get("commuter-stations");
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const [mtaStations, njtData] = await Promise.all([
    fetchJson(buildTransitstatUrl(sourceConfigs.mta.baseUrl, "stations")),
    njtDataPromise,
  ]);

  const stations = [];
  Array.from(njtData.stopsById.values()).forEach((stop) => {
    stations.push({
      id: stop.stop_id,
      name: stop.stop_name,
      lat: Number.parseFloat(stop.stop_lat),
      lon: Number.parseFloat(stop.stop_lon),
      source: "njt",
    });
  });

  Object.values(mtaStations || {}).forEach((station) => {
    stations.push({
      id: station.stationID,
      name: station.stationName,
      lat: station.lat,
      lon: station.lon,
      source: "mta",
    });
  });

  const data = { updatedAt: new Date().toISOString(), stations };
  cache.set("commuter-stations", { data, timestamp: Date.now() });
  return data;
}

async function loadStationBoard(stationId) {
  const arrivals = [];
  
  // Try to find station in Transitstat sources
  const transitstatSources = ['amtrak', 'brightline', 'metra', 'lirr', 'mbta', 'bart', 'marta', 'septa', 'njt', 'mta'];
  let stationData = null;
  
  for (const sourceKey of transitstatSources) {
    try {
      const stationsUrl = `https://store.transitstat.us/${sourceKey}/stations.json`;
      const resp = await fetch(stationsUrl);
      if (!resp.ok) continue;
      const data = await resp.json();
      const station = data.stations?.find(s => s.id === stationId || s.stationId === stationId);
      if (station) {
        stationData = {
          id: station.id || station.stationId,
          name: station.stationName || station.name,
          lat: station.lat,
          lon: station.lon,
          source: sourceKey
        };
        
        // Get predictions for this station
        const predictionsUrl = `https://store.transitstat.us/${sourceKey}/predictions.json`;
        const predResp = await fetch(predictionsUrl);
        if (predResp.ok) {
          const predData = await predResp.json();
          const stationPredictions = predData.predictions?.filter(p => 
            p.stationId === stationId || p.stopId === stationId
          ) || [];
          
          stationPredictions.forEach(pred => {
            const scheduledTime = parseTransitstatTimestamp(pred.scheduledTime || pred.scheduled);
            const actualTime = parseTransitstatTimestamp(pred.arrivalTime || pred.actual || pred.eta);
            arrivals.push({
              trainId: pred.trainId || pred.runNumber || '--',
              route: pred.line || pred.route || sourceKey.toUpperCase(),
              scheduled: scheduledTime || '--',
              actual: actualTime || scheduledTime || '--',
              status: pred.status || 'scheduled',
              delay: pred.delay ? `${pred.delay} min` : '',
              source: sourceKey,
            });
          });
        }
        break;
      }
    } catch (err) {
      // Continue to next source
    }
  }
  
  // Fall back to VIA Rail if not found in Transitstat
  if (!stationData) {
    const viaData = await viaDataPromise;
    const now = new Date();
    const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const dateKey = getTodayKey(now);

    viaData.stopTimesByTrip.forEach((stopTimes, tripId) => {
      const trip = viaData.tripsById.get(tripId);
      if (!trip) return;
      if (
        !isServiceActive(
          trip.service_id,
          dateKey,
          viaData.calendarByService,
          viaData.calendarDatesByService,
          now
        )
      ) {
        return;
      }

      stopTimes.forEach((stop) => {
        if (stop.stop_id !== stationId) return;
        const time = stop.arrivalSeconds ?? stop.departureSeconds;
        if (time == null || time < nowSeconds) return;

        const route = viaData.routesById.get(trip.route_id);
        arrivals.push({
          trainId: trip.trip_short_name || trip.trip_id,
          route: route?.route_long_name || route?.route_short_name || "VIA Rail",
          scheduled: secondsToTime(time),
          actual: "",
          status: "scheduled",
          source: "via",
        });
      });
    });
    
    stationData = viaData.stopsById.get(stationId) || null;
  }

  arrivals.sort((a, b) => (a.scheduled || '').localeCompare(b.scheduled || ''));

  return {
    station: stationData,
    arrivals: arrivals.slice(0, 12),
    updatedAt: new Date().toISOString(),
  };
}

function toDisplayTime(value) {
  if (!value) return "--";
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(String(value))) return String(value).slice(0, 5);
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildStopsFromStaticGtfs(train, gtfsData, sourceKey) {
  if (!train?.tripId || !gtfsData?.stopTimesByTrip || !gtfsData?.stopsById) return [];
  const stopTimes = gtfsData.stopTimesByTrip.get(train.tripId) || [];
  if (stopTimes.length === 0) return [];

  const now = new Date();
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const trainDelay = Number.isFinite(Number(train.delayMinutes)) ? Number(train.delayMinutes) : 0;

  const rows = stopTimes
    .map((stop) => {
      const stopId = stop.stopId || stop.stop_id;
      const station = gtfsData.stopsById.get(stopId);
      const schedSeconds =
        stop.arrivalSeconds ??
        stop.departureSeconds ??
        timeToSeconds(stop.arrivalTime || stop.arrival_time || stop.departureTime || stop.departure_time);
      if (schedSeconds == null || !Number.isFinite(schedSeconds)) return null;
      const actualSeconds = schedSeconds + Math.round(trainDelay * 60);
      return {
        stationId: stopId,
        stationName: station?.stop_name || stopId || "--",
        scheduled: secondsToTime(schedSeconds),
        actual: secondsToTime(actualSeconds),
        delayMinutes: trainDelay,
        etaMinutes: Math.max(0, Math.round((actualSeconds - nowSeconds) / 60)),
        source: sourceKey,
      };
    })
    .filter(Boolean)
    .filter((row) => row.etaMinutes <= 360)
    .sort((a, b) => a.etaMinutes - b.etaMinutes);

  return rows.slice(0, 12);
}

function buildStopsFromRealtime(train) {
  const rows = Array.isArray(train?.upcomingStops) ? train.upcomingStops : [];
  const now = Date.now();
  return rows
    .map((row) => {
      const actualIso = row.actual || row.scheduled || null;
      const actualMs = actualIso ? new Date(actualIso).getTime() : null;
      const etaMinutes =
        actualMs && Number.isFinite(actualMs)
          ? Math.max(0, Math.round((actualMs - now) / 60000))
          : null;
      return {
        stationId: row.stopId || "",
        stationName: row.stopId || "Stop",
        scheduled: toDisplayTime(row.scheduled),
        actual: toDisplayTime(actualIso),
        delayMinutes: Number.isFinite(Number(row.delayMinutes)) ? Number(row.delayMinutes) : null,
        etaMinutes,
        source: train.source,
      };
    })
    .filter((row) => row.stationId)
    .slice(0, 12);
}

async function loadTrainStopsBySourceAndId(sourceKey, trainId) {
  const [main, commuter] = await Promise.all([loadTrains(), loadCommuterTrains()]);
  const allTrains = [...(main?.trains || []), ...(commuter?.trains || [])];
  const train = allTrains.find((row) => `${row.source}` === `${sourceKey}` && `${row.id}` === `${trainId}`);
  if (!train) return null;

  let stops = buildStopsFromRealtime(train);
  if (stops.length === 0 && sourceKey === "njt") {
    const njtData = await njtDataPromise;
    stops = buildStopsFromStaticGtfs(train, njtData, sourceKey);
  } else if (stops.length === 0 && sourceKey === "dart") {
    const dartData = await dartDataPromise;
    stops = buildStopsFromStaticGtfs(train, dartData, sourceKey);
  } else if (stops.length === 0 && sourceKey === "via") {
    const viaData = await viaDataPromise;
    stops = buildStopsFromStaticGtfs(train, viaData, sourceKey);
  }

  return {
    updatedAt: new Date().toISOString(),
    train,
    stops,
  };
}

function isCaltransAmtrakRoute(routeName) {
  const text = `${routeName || ""}`.toLowerCase();
  return (
    text.includes("san joaquin") ||
    text.includes("capitol corridor") ||
    text.includes("pacific surfliner")
  );
}

async function loadAmtrakAdditionalCaltransRoutes() {
  const payload = await fetchJson("https://gobbler.transitstat.us/additionalShapes/amtrak.json");
  if (!payload) return [];

  const routeFeatures = geoJsonToRouteFeatures(payload, "amtrak");
  return routeFeatures
    .filter((feature) => isCaltransAmtrakRoute(feature.name))
    .map((feature, index) => ({
      id: `amtrak-extra-caltrans-${index}`,
      name: feature.name,
      source: "amtrak",
      color: "#facc15",
      geometry: feature.geometry,
    }));
}

async function loadRoutes() {
  const cached = cache.get("routes");
  if (cached && Date.now() - cached.timestamp < ROUTE_CACHE_TTL_MS) {
    return cached.data;
  }

  const routes = [];

  const geojsonRequests = Object.entries(sourceConfigs)
    .filter(
      ([key, config]) =>
        Array.isArray(config.routeGeoJson) &&
        key !== "mta" &&
        key !== "njt" &&
        key !== "amtrak" &&
        key !== "bart" &&
        key !== "caltrain"
    )
    .flatMap(([key, config]) =>
      config.routeGeoJson.map(async (url) => ({
        source: key,
        url,
        data: await fetchJson(url),
      }))
    );

  const geojsonResponses = await Promise.allSettled(geojsonRequests);

  geojsonResponses
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .forEach((entry) => {
      const routeFeatures = geoJsonToRouteFeatures(entry.data, entry.source);
      routeFeatures.forEach((rf, index) => {
        routes.push({
          id: `${entry.source}-${index}`,
          name: rf.name || sourceConfigs[entry.source]?.label || entry.source,
          source: entry.source,
          color: rf.color || "",
          geometry: rf.geometry,
        });
      });
    });

  const [viaData, dartData, amtrakData] = await Promise.all([
    viaDataPromise,
    dartDataPromise,
    amtrakDataPromise,
  ]);

  const seenAmtrakShapes = new Set();
  const amtrakVariantCountByRoute = new Map();
  amtrakData.tripsById.forEach((trip) => {
    if (!trip.shape_id || seenAmtrakShapes.has(trip.shape_id)) return;
    const shape = amtrakData.shapesById.get(trip.shape_id);
    if (!shape || shape.length < 2) return;

    const route = amtrakData.routesById.get(trip.route_id);
    const coords = sanitizeLineCoordinates(
      shape.map((point) => [point.lon, point.lat]),
      1,
      ROUTE_MAX_JUMP_KM
    );
    if (coords.length < 2) return;

    const baseName = route?.route_long_name || route?.route_short_name || trip.trip_headsign || "Amtrak Route";
    const variantIndex = (amtrakVariantCountByRoute.get(trip.route_id) || 0) + 1;
    amtrakVariantCountByRoute.set(trip.route_id, variantIndex);
    const hasMultipleVariants = variantIndex > 1;

    routes.push({
      id: `amtrak-${trip.shape_id}`,
      name: hasMultipleVariants ? `${baseName} (${variantIndex})` : baseName,
      source: "amtrak",
      color: isCaltransAmtrakRoute(baseName) ? "#facc15" : sourceDefaultColors.amtrak,
      geometry: { type: "LineString", coordinates: coords },
    });
    seenAmtrakShapes.add(trip.shape_id);
  });

  const requiredCaltransRoutes = ["San Joaquins", "Capitol Corridor", "Pacific Surfliner"];
  const existingCaltransNames = new Set(
    routes
      .filter((route) => route.source === "amtrak" && isCaltransAmtrakRoute(route.name))
      .map((route) => (route.name || "").toLowerCase())
  );
  const missingCaltrans = requiredCaltransRoutes.some(
    (name) => !existingCaltransNames.has(name.toLowerCase())
  );
  if (missingCaltrans) {
    const extraCaltrans = await loadAmtrakAdditionalCaltransRoutes();
    extraCaltrans.forEach((route) => {
      const key = (route.name || "").toLowerCase();
      if (!existingCaltransNames.has(key)) {
        routes.push(route);
        existingCaltransNames.add(key);
      }
    });
  }

  const seenShapes = new Set();
  viaData.tripsById.forEach((trip) => {
    if (!trip.shape_id) return;
    if (seenShapes.has(trip.shape_id)) return;
    const shape = viaData.shapesById.get(trip.shape_id);
    if (!shape || shape.length === 0) return;

    const route = viaData.routesById.get(trip.route_id);
    const coords = sanitizeLineCoordinates(
      shape.map((point) => [point.lon, point.lat]),
      1,
      ROUTE_MAX_JUMP_KM
    );

    routes.push({
      id: trip.shape_id,
      name: route?.route_long_name || route?.route_short_name || "VIA Route",
      source: "via",
      geometry: { type: "LineString", coordinates: coords },
    });
    seenShapes.add(trip.shape_id);
  });

  const seenDartShapes = new Set();
  dartData.tripsById.forEach((trip) => {
    if (!trip.shape_id || seenDartShapes.has(trip.shape_id)) return;
    const shape = dartData.shapesById.get(trip.shape_id);
    if (!shape || shape.length === 0) return;

    const route = dartData.routesById.get(trip.route_id);
    const coords = sanitizeLineCoordinates(
      shape.map((point) => [point.lon, point.lat]),
      1,
      ROUTE_MAX_JUMP_KM
    );

    routes.push({
      id: `dart-${trip.shape_id}`,
      name: route?.route_long_name || route?.route_short_name || "DART Route",
      source: "dart",
      color: resolveDartLineColor(route),
      geometry: { type: "LineString", coordinates: coords },
    });
    seenDartShapes.add(trip.shape_id);
  });

  const [bartRoutes, sfmtaRoutes, metrolinkRoutes, aceRoutes, coasterRoutes] = await Promise.all([
    loadBartRoutesFromGtfs(),
    loadSfmtaRoutesFromGtfs(),
    loadMetrolinkRoutesFromGtfs(),
    loadAceRoutesFromGtfs(),
    loadCoasterRoutesFromGtfs(),
  ]);

  const smartRoutes = await loadSmartRoutesFromOverpass();
  const vtaRoutes = await loadVtaRoutesFromOverpass();
  const caltrainRoutes = await loadCaltrainRoutesFromOverpass();
  [
    ...bartRoutes,
    ...sfmtaRoutes,
    ...vtaRoutes,
    ...caltrainRoutes,
    ...metrolinkRoutes,
    ...aceRoutes,
    ...coasterRoutes,
    ...smartRoutes,
  ].forEach((route) => routes.push(route));

  const data = { updatedAt: new Date().toISOString(), routes };
  cache.set("routes", { data, timestamp: Date.now() });
  return data;
}

async function loadCommuterRoutes() {
  const cached = cache.get("commuter-routes");
  if (cached && Date.now() - cached.timestamp < ROUTE_CACHE_TTL_MS) {
    return cached.data;
  }

  const routes = [];
  const commuterConfigs = ["mta"]
    .map((key) => [key, sourceConfigs[key]])
    .filter(([, config]) => Array.isArray(config.routeGeoJson));

  const geojsonRequests = commuterConfigs.flatMap(([key, config]) =>
    config.routeGeoJson.map(async (url) => ({
      source: key,
      url,
      data: await fetchJson(url),
    }))
  );

  const [geojsonResponses, njtData] = await Promise.all([
    Promise.allSettled(geojsonRequests),
    njtDataPromise,
  ]);

  geojsonResponses
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .forEach((entry) => {
      const routeFeatures = geoJsonToRouteFeatures(entry.data, entry.source);
      routeFeatures.forEach((rf, idx) => {
        routes.push({
          id: `${entry.source}-commuter-${idx}`,
          name: rf.name || "",
          source: entry.source,
          color: rf.color || "",
          geometry: rf.geometry,
        });
      });
    });

  njtData.shapesById.forEach((points, shapeId) => {
    const coords = points
      .filter((_, i) => i === 0 || i === points.length - 1 || i % 3 === 0)
      .map((p) => [p.lon, p.lat]);
    if (coords.length > 1) {
      routes.push({ id: `njt-${shapeId}`, source: "njt", geometry: { type: "LineString", coordinates: coords } });
    }
  });

  const data = { updatedAt: new Date().toISOString(), routes };
  cache.set("commuter-routes", { data, timestamp: Date.now() });
  return data;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/config", (req, res) => {
  const protomapsKey = process.env.PROTOMAPS_KEY || "a24904bac03ad7e4";
  const darkStyleUrl =
    process.env.PROTOMAPS_STYLE_URL ||
    `https://api.protomaps.com/styles/v2/dark.json?key=${protomapsKey}`;
  const lightStyleUrl = darkStyleUrl.includes("/dark.json")
    ? darkStyleUrl.replace("/dark.json", "/light.json")
    : `https://api.protomaps.com/styles/v2/light.json?key=${protomapsKey}`;

  res.json({
    tileProvider: "protomaps",
    protomapsKey,
    protomapsStyleUrl: darkStyleUrl,
    protomapsLightStyleUrl: lightStyleUrl,
    amtrakDataSources: {
      amtrakerV3All: `${sourceConfigs.amtraker.v3BaseUrl || "https://api.amtraker.com/v3"}/all`,
      transitstatAmtrak: buildTransitstatUrl(sourceConfigs.amtrak.baseUrl, "trains"),
    },
    amtrakerTiles: amtrakerTileConfig,
    contributions: [
      { name: "Protomaps", url: "https://protomaps.com" },
      { name: "OpenStreetMap", url: "https://www.openstreetmap.org/copyright" },
      { name: "CARTO", url: "https://carto.com/attributions" },
      { name: "Transitstat", url: "https://store.transitstat.us" },
      { name: "Amtrak", url: "https://www.amtrak.com" },
      { name: "Brightline", url: "https://www.gobrightline.com" },
      { name: "Metra", url: "https://metra.com" },
      { name: "LIRR", url: "https://new.mta.info/agency/long-island-rail-road" },
      { name: "Metro-North", url: "https://new.mta.info/agency/metro-north-railroad" },
      { name: "NJ Transit", url: "https://www.njtransit.com" },
      { name: "SEPTA", url: "https://www.septa.org" },
      { name: "MBTA", url: "https://www.mbta.com" },
      { name: "BART", url: "https://www.bart.gov" },
      { name: "MARTA", url: "https://www.itsmarta.com" },
      { name: "DART", url: "https://www.dart.org" },
      { name: "VIA Rail", url: "https://www.viarail.ca" },
      { name: "Amtraker API", url: "https://api.amtraker.com" },
      { name: "piemadd/amtraker-vite", url: "https://github.com/piemadd/amtraker-vite" },
      { name: "piemadd/amtrak", url: "https://github.com/piemadd/amtrak" },
    ],
  });
});

app.get("/api/broadcasts", async (req, res) => {
  try {
    const filePath = path.join(ROOT, "data", "broadcasts.json");
    const payload = JSON.parse(await readFile(filePath, "utf-8"));
    res.json({ updatedAt: new Date().toISOString(), broadcasts: payload.broadcasts || [] });
  } catch (error) {
    res.json({ updatedAt: new Date().toISOString(), broadcasts: [] });
  }
});

app.get("/api/sightings", async (req, res) => {
  try {
    const requestedType = `${req.query.type || ""}`.trim().toLowerCase();
    const all = await loadSightingsDb();
    const normalized = all
      .filter((row) => row && row.id)
      .map((row) => ({
        ...row,
        uploaderName: `${row.uploaderName || ""}`.trim(),
        state: `${row.state || ""}`.trim(),
        city: `${row.city || ""}`.trim(),
      }))
      .filter((row) => (requestedType ? `${row.type || ""}`.toLowerCase() === requestedType : true))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    res.json({ updatedAt: new Date().toISOString(), sightings: normalized });
  } catch {
    res.status(500).json({ error: "Failed to load sightings" });
  }
});

app.post("/api/sightings/upload", sightingsUpload.single("media"), async (req, res) => {
  try {
    const body = req.body || {};
    const type = `${body.type || ""}`.trim().toLowerCase();
    if (type !== "heritage" && type !== "special-interest") {
      res.status(400).json({ error: "Invalid sighting type" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Media file required" });
      return;
    }

    const uploaderName = `${body.uploaderName || ""}`.trim();
    const sightingState = `${body.state || ""}`.trim();
    const city = `${body.city || ""}`.trim();
    if (!uploaderName || !sightingState || !city) {
      res.status(400).json({ error: "Uploader name, state, and city are required" });
      return;
    }

    const lat = Number(body.lat);
    const lon = Number(body.lon);

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      type,
      uploaderName,
      state: sightingState,
      city,
      trainLabel: `${body.trainLabel || body.train || ""}`.trim(),
      railroad: `${body.railroad || ""}`.trim(),
      notes: `${body.notes || ""}`.trim(),
      mediaUrl: `/uploads/sightings/${req.file.filename}`,
      mediaType: req.file.mimetype || "application/octet-stream",
      createdAt: new Date().toISOString(),
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      locationText: `${body.locationText || ""}`.trim(),
    };

    const current = await loadSightingsDb();
    current.unshift(entry);
    await saveSightingsDb(current.slice(0, 2000));

    res.json({ ok: true, sighting: entry });
  } catch (error) {
    const message = error?.message || "Upload failed";
    res.status(500).json({ error: message });
  }
});

app.get("/api/trains", async (req, res) => {
  try {
    const data = await loadTrains();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load trains" });
  }
});

app.get("/api/trains/:id", async (req, res) => {
  try {
    const data = await loadTrains();
    const train = data.trains.find((item) => item.id === req.params.id);
    if (!train) {
      res.status(404).json({ error: "Train not found" });
      return;
    }
    res.json({ updatedAt: data.updatedAt, train });
  } catch (error) {
    res.status(500).json({ error: "Failed to load train" });
  }
});

app.get("/api/train-stops/:source/:id", async (req, res) => {
  try {
    const sourceKey = `${req.params.source || ""}`.trim().toLowerCase();
    const trainId = `${req.params.id || ""}`.trim();
    if (!sourceKey || !trainId) {
      res.status(400).json({ error: "Invalid train identifier" });
      return;
    }

    const payload = await loadTrainStopsBySourceAndId(sourceKey, trainId);
    if (!payload?.train) {
      res.status(404).json({ error: "Train not found" });
      return;
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: "Failed to load train stops" });
  }
});

app.get("/api/stations", async (req, res) => {
  try {
    const data = await loadStations();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load stations" });
  }
});

app.get("/api/stations/:id", async (req, res) => {
  try {
    const data = await loadStationBoard(req.params.id);
    if (!data.station) {
      res.status(404).json({ error: "Station not found" });
      return;
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load station" });
  }
});

app.get("/api/routes", async (req, res) => {
  try {
    const data = await loadRoutes();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load routes" });
  }
});

app.get("/api/commuter/trains", async (req, res) => {
  try {
    const data = await loadCommuterTrains();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load commuter trains" });
  }
});

app.get("/api/commuter/stations", async (req, res) => {
  try {
    const data = await loadCommuterStations();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load commuter stations" });
  }
});

app.get("/api/commuter/routes", async (req, res) => {
  try {
    const data = await loadCommuterRoutes();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load commuter routes" });
  }
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`OpenRailTracker backend listening on port ${PORT}`);
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.log(`OpenRailTracker backend already running on http://localhost:${PORT}`);
    process.exit(0);
    return;
  }
  console.error("Backend server failed to start:", error);
  process.exit(1);
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.log(`OpenRailTracker backend already running on http://localhost:${PORT}`);
    process.exit(0);
    return;
  }
  console.error("WebSocket server error:", error);
});

async function broadcastUpdate() {
  const payload = await loadTrains();
  const message = JSON.stringify({ type: "trains", payload });
  const commuterPayload = await loadCommuterTrains();
  const commuterMessage = JSON.stringify({ type: "commuter", payload: commuterPayload });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
      client.send(commuterMessage);
    }
  });
}

wss.on("connection", async (ws) => {
  ws.send(JSON.stringify({ type: "hello", payload: { timestamp: new Date().toISOString() } }));
  const trains = await loadTrains();
  ws.send(JSON.stringify({ type: "trains", payload: trains }));
  const commuter = await loadCommuterTrains();
  ws.send(JSON.stringify({ type: "commuter", payload: commuter }));
});

setInterval(() => {
  broadcastUpdate().catch(() => null);
}, 15_000);
