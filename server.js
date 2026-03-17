import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import gtfsRealtimeBindings from "gtfs-realtime-bindings";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const CACHE_TTL_MS = 30_000;
const cache = new Map();

const sourceConfigs = {
  amtrak: {
    label: "Amtrak",
    envUrl: "AMTRAK_URL",
    envPath: "AMTRAK_DATA_PATH",
    defaultUrl: "https://store.transitstat.us/atsa/ts/trains",
    responseType: "transitstat",
    localFile: path.join(__dirname, "data", "amtrak.json"),
  },
  brightline: {
    label: "Brightline",
    envUrl: "BRIGHTLINE_URL",
    envPath: "BRIGHTLINE_DATA_PATH",
    defaultUrl: "http://feed.gobrightline.com/position_updates.pb",
    tripUpdatesUrl: "http://feed.gobrightline.com/trip_updates.pb",
    responseType: "gtfs-rt",
    localFile: path.join(__dirname, "data", "brightline.json"),
  },
  via: {
    label: "VIA Rail",
    envUrl: "VIA_URL",
    envPath: "VIA_DATA_PATH",
    defaultUrl: null,
    responseType: "array",
    localFile: path.join(__dirname, "data", "via.json"),
  },
};

function getByPath(payload, pathValue) {
  if (!pathValue) {
    return payload;
  }

  return pathValue.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return acc[key];
    }
    return undefined;
  }, payload);
}

function normalizeStatus(status) {
  if (!status) {
    return "en-route";
  }

  const normalized = status.toString().toLowerCase().trim();
  const map = {
    "on time": "on-time",
    ontime: "on-time",
    delayed: "delayed",
    delay: "delayed",
    boarding: "boarding",
    "en route": "en-route",
    enroute: "en-route",
    "en-route": "en-route",
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

  return {
    id:
      raw.id ||
      raw.trainId ||
      raw.number ||
      raw.runNumber ||
      `${sourceKey}-${raw.name || "unknown"}`,
    name: raw.name || raw.line || raw.routeName || raw.dest || "Unknown",
    source: sourceKey,
    route: routeLabel,
    status: normalizeStatus(raw.status),
    nextStop: raw.nextStop || raw.next_station || raw.next || "",
    eta: raw.eta || raw.arrival || raw.arrivalTime || "",
    delay: raw.delay || raw.delayMinutes || raw.late || "",
    lat: raw.lat ?? raw.latitude ?? null,
    lon: raw.lon ?? raw.longitude ?? null,
    heading: raw.heading ?? null,
    speed: raw.speed ?? raw.mph ?? null,
    realTime: raw.realTime ?? null,
  };
}

async function loadLocal(sourceKey) {
  const config = sourceConfigs[sourceKey];
  const fileContent = await readFile(config.localFile, "utf-8");
  return JSON.parse(fileContent);
}

async function loadRemote(sourceKey) {
  const config = sourceConfigs[sourceKey];
  const url = process.env[config.envUrl] || config.defaultUrl;
  if (!url) {
    return null;
  }

  if (config.responseType === "gtfs-rt") {
    return null;
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "OpenRailTracker/0.1",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceKey} data (${response.status})`);
  }

  const data = await response.json();
  const pathValue = process.env[config.envPath];
  const payload = getByPath(data, pathValue) ?? data;

  if (config.responseType === "transitstat") {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return Object.entries(payload).map(([runNumber, train]) => ({
        ...train,
        runNumber,
      }));
    }
  }

  return payload;
}

async function fetchGtfsRt(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "OpenRailTracker/0.1",
      Accept: "application/x-protobuf",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GTFS-RT (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return gtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
}

async function loadBrightlineGtfs() {
  const config = sourceConfigs.brightline;
  const positionsUrl = process.env[config.envUrl] || config.defaultUrl;
  const tripUpdatesUrl = config.tripUpdatesUrl;

  const [positions, tripUpdates] = await Promise.all([
    fetchGtfsRt(positionsUrl),
    tripUpdatesUrl ? fetchGtfsRt(tripUpdatesUrl) : Promise.resolve(null),
  ]);

  const tripLookup = new Map();
  if (tripUpdates?.entity) {
    tripUpdates.entity.forEach((entity) => {
      const update = entity.tripUpdate;
      if (!update?.trip?.tripId) {
        return;
      }

      const nextStop = update.stopTimeUpdate?.[0]?.stopId || "";
      const nextArrival = update.stopTimeUpdate?.[0]?.arrival?.time;
      tripLookup.set(update.trip.tripId, {
        nextStop,
        eta: nextArrival ? new Date(nextArrival * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      });
    });
  }

  const trains = [];
  positions.entity?.forEach((entity) => {
    const vehicle = entity.vehicle;
    if (!vehicle?.position) {
      return;
    }

    const tripId = vehicle.trip?.tripId || "";
    const vehicleId = vehicle.vehicle?.label || vehicle.vehicle?.id || tripId || "Unknown";
    const tripInfo = tripLookup.get(tripId) || {};

    trains.push(
      normalizeTrain("brightline", {
        id: vehicleId,
        name: "Brightline",
        route: tripId,
        status: "en-route",
        nextStop: tripInfo.nextStop,
        eta: tripInfo.eta,
        lat: vehicle.position.latitude,
        lon: vehicle.position.longitude,
        heading: vehicle.position.bearing,
        speed: vehicle.position.speed,
        realTime: vehicle.position ? true : null,
      })
    );
  });

  return trains;
}

async function loadSource(sourceKey) {
  const cached = cache.get(sourceKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let rawTrains = null;
  try {
    const config = sourceConfigs[sourceKey];
    if (config.responseType === "gtfs-rt" && sourceKey === "brightline") {
      rawTrains = await loadBrightlineGtfs();
    } else {
      rawTrains = await loadRemote(sourceKey);
    }
  } catch (error) {
    console.warn(`Remote fetch failed for ${sourceKey}:`, error.message);
  }

  if (!Array.isArray(rawTrains)) {
    rawTrains = await loadLocal(sourceKey);
  }

  const normalized =
    sourceKey === "brightline" && sourceConfigs[sourceKey].responseType === "gtfs-rt"
      ? rawTrains
      : rawTrains.map((train) => normalizeTrain(sourceKey, train));
  cache.set(sourceKey, { data: normalized, timestamp: Date.now() });
  return normalized;
}

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/trains", async (req, res) => {
  try {
    const source = req.query.source;
    const sources = source && source !== "all" ? [source] : Object.keys(sourceConfigs);

    const results = await Promise.all(sources.map((key) => loadSource(key)));
    const trains = results.flat();
    res.json({ updatedAt: new Date().toISOString(), trains });
  } catch (error) {
    res.status(500).json({ error: "Failed to load train data." });
  }
});

app.get("/api/commuter/trains", (req, res) => {
  res.json({ updatedAt: new Date().toISOString(), trains: [] });
});

app.get("/api/commuter/stations", (req, res) => {
  res.json({ updatedAt: new Date().toISOString(), stations: [] });
});

app.get("/api/commuter/routes", (req, res) => {
  res.json({ updatedAt: new Date().toISOString(), routes: [] });
});

app.listen(PORT, () => {
  console.log(`OpenRailTracker running on http://localhost:${PORT}`);
});
