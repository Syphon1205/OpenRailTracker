const sources = {
  amtrak: { label: "Amtrak", prefix: "A" },
  brightline: { label: "Brightline", prefix: "B" },
  via: { label: "VIA Rail", prefix: "V" },
  metra: { label: "Metra", prefix: "M" },
  mta: { label: "MTA", prefix: "T" },
  mta_mnr: { label: "Metro-North", prefix: "N" },
  njt: { label: "NJ Transit", prefix: "J" },
  septa: { label: "SEPTA", prefix: "S" },
  mbta: { label: "MBTA Commuter Rail", prefix: "B" },
  lirr: { label: "LIRR", prefix: "L" },
  bart: { label: "BART", prefix: "R" },
  marta: { label: "MARTA", prefix: "T" },
  dart: { label: "DART", prefix: "D" },
  metrolink: { label: "Metrolink", prefix: "K" },
  caltrain: { label: "Caltrain", prefix: "C" },
  rtd: { label: "RTD", prefix: "R" },
  vta: { label: "VTA", prefix: "V" },
  dcta: { label: "DCTA", prefix: "D" },
  muni: { label: "MUNI", prefix: "M" },
  sfstreetcar: { label: "SF Streetcar", prefix: "S" },
  sounder: { label: "Sounder", prefix: "D" },
  sunrail: { label: "SunRail", prefix: "R" },
  trirail: { label: "Tri-Rail", prefix: "T" },
  vre: { label: "VRE", prefix: "V" },
  marc: { label: "MARC", prefix: "A" },
  ace: { label: "ACE", prefix: "A" },
  coaster: { label: "Coaster", prefix: "C" },
  sprinter: { label: "Sprinter", prefix: "S" },
  smart: { label: "SMART", prefix: "S" },
  frontrunner: { label: "FrontRunner", prefix: "F" },
  capmetro: { label: "CapMetro Rail", prefix: "C" },
  gotransit: { label: "GO Transit", prefix: "G" },
  freight: { label: "Freight", prefix: "F" },
  "freight-community": { label: "Freight (Community)", prefix: "F" },
  "up-steam": { label: "UP Steam", prefix: "U" },
  arkansasMissouri: { label: "Arkansas & Missouri", prefix: "A" },
  branson: { label: "Branson Railroad", prefix: "B" },
};

const operatorColors = {
  brightline: "#facc15",
  amtrak: "#004a99",
  amtraker: "#004a99",
  surfliner: "#facc15",
  san_joaquins: "#facc15",
  capitol_corridor: "#facc15",
  via: "#38bdf8",
  njt: "#8b5cf6",
  mta: "#1e3a8a",
  mta_mnr: "#1d4ed8",
  metra: "#3b82f6",
  metrolink: "#0ea5e9",
  caltrain: "#ef4444",
  rtd: "#8b5cf6",
  vta: "#f59e0b",
  dcta: "#14b8a6",
  muni: "#ef4444",
  sfstreetcar: "#f97316",
  septa: "#2563eb",
  mbta: "#16a34a",
  lirr: "#0f766e",
  bart: "#0ea5e9",
  marta: "#f97316",
  dart: "#ef4444",
  sounder: "#f43f5e",
  sunrail: "#f59e0b",
  trirail: "#84cc16",
  vre: "#7c3aed",
  marc: "#fb7185",
  ace: "#7c3aed",
  coaster: "#00AB9B",
  sprinter: "#00AB9B",
  smart: "#ef4444",
  frontrunner: "#22c55e",
  capmetro: "#e11d48",
  gotransit: "#00853e",
  freight: "#64748b",
  "freight-community": "#f97316",
  "up-steam": "#facc15",
  arkansasMissouri: "#7f1d1d",
  branson: "#dc2626",
};

const API_BASE = (() => {
  const queryBase = new URLSearchParams(window.location.search).get("apiBase") || "";
  const globalBase = `${window.ORT_API_BASE || ""}`;
  let base = (queryBase || globalBase).trim();
  if (base) {
    base = base.replace(/\/+$/, "");
    if (base.toLowerCase().endsWith("/api")) base = base.slice(0, -4);
    return base;
  }
  return "";
})();

function apiUrl(path) {
  if (!path || !path.startsWith("/")) return path;
  return `${API_BASE}${path}`;
}

function wsUrl(path) {
  if (!path || !path.startsWith("/")) return path;
  if (!API_BASE) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${path}`;
  }
  const wsBase = API_BASE.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
  return `${wsBase}${path}`;
}

/**
 * Safely sets a value in localStorage with QuotaExceededError protection.
 * If quota is exceeded, it attempts to clear large data caches once.
 */
function safeSetLocalStorage(key, val) {
  if (!safeSetLocalStorage.warnedKeys) {
    safeSetLocalStorage.warnedKeys = new Set();
  }

  try {
    const stringified = typeof val === "string" ? val : JSON.stringify(val);
    // Don't even try if it's likely too large for standard 5MB localStorage (using 2MB threshold)
    if (stringified.length > 2_000_000) {
      const isLargeCacheKey = /^ort-cached-/i.test(`${key || ""}`);
      if (!isLargeCacheKey && !safeSetLocalStorage.warnedKeys.has(key)) {
        safeSetLocalStorage.warnedKeys.add(key);
        console.warn(`Storage: Skipping '${key}' as payload is too large (~${Math.round(stringified.length / 1024)}KB).`);
      }
      return;
    }
    localStorage.setItem(key, stringified);
  } catch (e) {
    if (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014) {
      console.warn("LocalStorage quota exceeded - purging large caches.");
      localStorage.removeItem("ort-cached-routes");
      localStorage.removeItem("ort-cached-stations");
      localStorage.removeItem("ort-cached-trains");
      localStorage.removeItem("ort-cached-commuter");
      try {
        const retryVal = typeof val === "string" ? val : JSON.stringify(val);
        if (retryVal.length < 2_000_000) {
          localStorage.setItem(key, retryVal);
        }
      } catch (e2) {
        // Silently fail if still too full
      }
    }
  }
}

// Starter US-wide landmark catalog (expandable): stylized low-poly 3D landmarks.
const LANDMARKS = [
  { id: "golden-gate", name: "Golden Gate Bridge", state: "CA", lat: 37.8199, lon: -122.4783, height: 160, radius: 140, color: "#f97316" },
  { id: "space-needle", name: "Space Needle", state: "WA", lat: 47.6205, lon: -122.3493, height: 120, radius: 85, color: "#22d3ee" },
  { id: "gateway-arch", name: "Gateway Arch", state: "MO", lat: 38.6247, lon: -90.1848, height: 130, radius: 95, color: "#e2e8f0" },
  { id: "mount-rushmore", name: "Mount Rushmore", state: "SD", lat: 43.8791, lon: -103.4591, height: 90, radius: 125, color: "#94a3b8" },
  { id: "statue-liberty", name: "Statue of Liberty", state: "NY", lat: 40.6892, lon: -74.0445, height: 110, radius: 80, color: "#84cc16" },
  { id: "freedom-tower", name: "One World Trade Center", state: "NY", lat: 40.7127, lon: -74.0134, height: 220, radius: 95, color: "#60a5fa" },
  { id: "hollywood-sign", name: "Hollywood Sign", state: "CA", lat: 34.1341, lon: -118.3215, height: 75, radius: 120, color: "#f8fafc" },
  { id: "alamo", name: "The Alamo", state: "TX", lat: 29.4259, lon: -98.4861, height: 70, radius: 90, color: "#fb7185" },
  { id: "willis", name: "Willis Tower", state: "IL", lat: 41.8789, lon: -87.6359, height: 210, radius: 92, color: "#38bdf8" },
  { id: "mountain-rainier", name: "Mount Rainier", state: "WA", lat: 46.8523, lon: -121.7603, height: 150, radius: 150, color: "#a3e635" },
  { id: "hoover-dam", name: "Hoover Dam", state: "NV", lat: 36.0156, lon: -114.7378, height: 95, radius: 110, color: "#fbbf24" },
  { id: "white-house", name: "White House", state: "DC", lat: 38.8977, lon: -77.0365, height: 80, radius: 85, color: "#f8fafc" },
  { id: "lincoln-memorial", name: "Lincoln Memorial", state: "DC", lat: 38.8893, lon: -77.0502, height: 72, radius: 90, color: "#e2e8f0" },
  { id: "fenway", name: "Fenway Park", state: "MA", lat: 42.3467, lon: -71.0972, height: 65, radius: 95, color: "#ef4444" },
  { id: "liberty-bell", name: "Liberty Bell", state: "PA", lat: 39.9496, lon: -75.1503, height: 62, radius: 75, color: "#22c55e" },
  { id: "french-quarter", name: "French Quarter", state: "LA", lat: 29.9584, lon: -90.0644, height: 60, radius: 105, color: "#f59e0b" },
  { id: "miami-beach", name: "South Beach", state: "FL", lat: 25.7826, lon: -80.1341, height: 68, radius: 100, color: "#06b6d4" },
  { id: "stone-mountain", name: "Stone Mountain", state: "GA", lat: 33.8053, lon: -84.1456, height: 88, radius: 125, color: "#a78bfa" },
  { id: "smoky-mtns", name: "Great Smoky Mountains", state: "TN", lat: 35.6118, lon: -83.4895, height: 120, radius: 150, color: "#65a30d" },
  { id: "denver-union", name: "Denver Union Station", state: "CO", lat: 39.7527, lon: -105.0002, height: 74, radius: 90, color: "#f97316" },
  { id: "canyon-village", name: "Grand Canyon Village", state: "AZ", lat: 36.0544, lon: -112.1401, height: 115, radius: 145, color: "#d97706" },
  { id: "mall-america", name: "Mall of America", state: "MN", lat: 44.8547, lon: -93.2427, height: 58, radius: 95, color: "#3b82f6" },
  { id: "niagara", name: "Niagara Falls", state: "NY", lat: 43.0896, lon: -79.0849, height: 95, radius: 120, color: "#22d3ee" },
  { id: "savannah-historic", name: "Savannah Historic District", state: "GA", lat: 32.0809, lon: -81.0912, height: 55, radius: 95, color: "#10b981" },
  { id: "chicago-riverwalk", name: "Chicago Riverwalk", state: "IL", lat: 41.8871, lon: -87.6217, height: 62, radius: 85, color: "#60a5fa" },
];

// Place real GLB models in frontend/landmarks/models and wire them here.
// These are true 3D landmark models (not extrusions) rendered as a custom WebGL layer.
const DEFAULT_LANDMARK_MODEL_ASSETS = [
  { id: "golden-gate", name: "Golden Gate Bridge", lon: -122.4783, lat: 37.8199, altitude: 0, scaleMeters: 130, rotateX: 90, rotateY: 0, rotateZ: 0, url: "landmarks/models/golden-gate.glb" },
  { id: "statue-liberty", name: "Statue of Liberty", lon: -74.0445, lat: 40.6892, altitude: 0, scaleMeters: 55, rotateX: 90, rotateY: 0, rotateZ: 0, url: "landmarks/models/statue-liberty.glb" },
  { id: "space-needle", name: "Space Needle", lon: -122.3493, lat: 47.6205, altitude: 0, scaleMeters: 70, rotateX: 90, rotateY: 0, rotateZ: 0, url: "landmarks/models/space-needle.glb" },
  { id: "gateway-arch", name: "Gateway Arch", lon: -90.1848, lat: 38.6247, altitude: 0, scaleMeters: 75, rotateX: 90, rotateY: 0, rotateZ: 0, url: "landmarks/models/gateway-arch.glb" },
  { id: "willis", name: "Willis Tower", lon: -87.6359, lat: 41.8789, altitude: 0, scaleMeters: 80, rotateX: 90, rotateY: 0, rotateZ: 0, url: "landmarks/models/willis-tower.glb" },
];

const DEFAULT_PROTOMAPS_KEY = "a24904bac03ad7e4";
const SYNC_LEAD_MS = 6500; // 6.5s anticipatory lead to stay ahead of baseline public trackers
const commuterSources = new Set([
  "metra", "mta", "mta_mnr", "njt", "septa", "mbta", "lirr", "bart", "marta", "dart",
  "metrolink", "caltrain", "rtd", "vta", "dcta", "sounder", "sunrail", "trirail", "vre", "marc",
  "ace", "coaster", "sprinter", "smart", "frontrunner", "capmetro", "gotransit", "muni", "sfstreetcar",
]);

const sourceLogoUrls = {
  metra: "logos/Metra_logo.svg",
  njt: "logos/NJT_logo.svg",
  mta: "logos/MTA_NYC_logo.svg",
  mta_mnr: "logos/MTA_NYC_logo.svg",
};

const operatorPhotoFallbacks = {
  amtrak: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Amtrak%20P42DC%20No.%20146.jpg",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Amtrak%20ACS-64%20No.%20624%20at%20Aberdeen%20station.jpg",
  ],
  via: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/VIA%20Rail%20P42DC%20no.%20913.jpg",
    "https://commons.wikimedia.org/wiki/Special:FilePath/VIA%20Rail%20Canada%20train%20at%20Jasper.jpg",
  ],
  brightline: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Brightline%20Train%20at%20West%20Palm%20Beach%20station.jpg",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Brightline%20train%20departing%20MiamiCentral.jpg",
  ],
  metra: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Metra%20BNSF%20locomotive%20at%20Aurora%20Transportation%20Center.jpg",
  ],
  mta: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/MNRR%20M8%20train%20at%20Bridgeport.jpg",
  ],
  lirr: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/LIRR%20M9%20train%20at%20Jamaica.jpg",
  ],
  njt: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/NJ%20Transit%20ALP-46%20locomotive.jpg",
  ],
  septa: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/SEPTA%20Silverliner%20V%20at%20Temple%20University.jpg",
  ],
  mbta: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/MBTA%20Commuter%20Rail%20train%20at%20South%20Station.jpg",
  ],
  bart: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/BART%20Fleet%20of%20the%20Future%20train.jpg",
  ],
  marta: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/MARTA%20rail%20train%20at%20Lindbergh%20Center.jpg",
  ],
  dart: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/DART%20Rail%20train%20in%20Dallas.jpg",
  ],
  caltrain: [
    "https://commons.wikimedia.org/wiki/Special:FilePath/Caltrain%20MP36PH-3C%20at%20San%20Jose.jpg",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Caltrain%20KISS%20EMU%20at%20Mountain%20View.jpg",
  ],
};

const operatorPhotoTags = {
  amtrak: ["amtrak", "passengertrain"],
  via: ["viarail", "canada", "passengertrain"],
  brightline: ["brightline", "florida", "passengertrain"],
  metra: ["metra", "chicago", "commuterrail"],
  mta: ["metronorth", "newyork", "commuterrail"],
  lirr: ["lirr", "newyork", "commuterrail"],
  njt: ["njtransit", "newjersey", "commuterrail"],
  septa: ["septa", "philadelphia", "commuterrail"],
  mbta: ["mbta", "boston", "commuterrail"],
  bart: ["bart", "bayarea", "train"],
  marta: ["marta", "atlanta", "train"],
  dart: ["dartrail", "dallas", "train"],
  caltrain: ["caltrain", "sanfrancisco", "commuterrail"],
};

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
  "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const railcamCatalog = [
  {
    id: "chicago-il-powerhouse",
    name: "C&NW Power House North",
    city: "Chicago",
    state: "Illinois",
    lat: 41.8858,
    lon: -87.6414,
    host: "Steel Highway Railcams",
    railroads: "Metra UP • CTA Green/Pink",
    description: "Ogilvie approach view with Metra Union Pacific routes and downtown skyline.",
    provider: "youtube",
    videoId: "InQ0-b4DkCw",
    watchUrl: "https://www.youtube.com/watch?v=InQ0-b4DkCw",
    titleHints: ["power house", "chicago", "c&nw"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "genoa-il",
    name: "Genoa Depot",
    city: "Genoa",
    state: "Illinois",
    lat: 42.0970,
    lon: -88.6929,
    host: "Steel Highway Railcams",
    railroads: "CPKC • CN",
    description: "Former depot camera watching the CPKC Chicago Sub and CN crossing in the distance.",
    provider: "youtube",
    videoId: "uqSg5r1hv4g",
    watchUrl: "https://www.youtube.com/watch?v=uqSg5r1hv4g",
    titleHints: ["genoa", "depot"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "neenah-wi",
    name: "Neenah Yard",
    city: "Neenah",
    state: "Wisconsin",
    lat: 44.1862,
    lon: -88.4626,
    host: "Steel Highway Railcams",
    railroads: "CN",
    description: "CN Neenah Sub and yard action with road trains and local jobs.",
    provider: "youtube",
    videoId: "CuCFmBeCD_k",
    watchUrl: "https://www.youtube.com/watch?v=CuCFmBeCD_k",
    titleHints: ["neenah", "yard"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "port-byron-il",
    name: "Port Byron",
    city: "Port Byron",
    state: "Illinois",
    lat: 41.6185,
    lon: -90.3351,
    host: "Steel Highway Railcams",
    railroads: "CPKC • BNSF",
    description: "CPKC Nitrin Sub with Davenport Sub views across the river and BNSF trackage-rights traffic.",
    provider: "youtube",
    videoId: "9ZBnyEk0Q0s",
    watchUrl: "https://www.youtube.com/watch?v=9ZBnyEk0Q0s",
    titleHints: ["port byron"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "grinnell-ia",
    name: "Grinnell",
    city: "Grinnell",
    state: "Iowa",
    lat: 41.7430,
    lon: -92.7224,
    host: "Steel Highway Railcams",
    railroads: "Iowa Interstate • Union Pacific",
    description: "Interlocking view hosted by the Mayflower Community with IAIS and UP traffic.",
    provider: "youtube",
    videoId: "12cNL4d2maA",
    watchUrl: "https://www.youtube.com/watch?v=12cNL4d2maA",
    titleHints: ["grinnell", "mayflower"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "oklahoma-city-ok-ptz",
    name: "Oklahoma City PTZ",
    city: "Oklahoma City",
    state: "Oklahoma",
    lat: 35.5147,
    lon: -97.5153,
    host: "Oklahoma Model Railroad Association",
    railroads: "BNSF",
    description: "OMRA-owned PTZ camera on the BNSF Red Rock Sub at Nowers.",
    provider: "youtube",
    videoId: "jdUc9qYuFHw",
    watchUrl: "https://www.youtube.com/watch?v=jdUc9qYuFHw",
    resolverDisabled: true,
    titleHints: ["oklahoma city", "ptz"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "oklahoma-city-ok-static",
    name: "Oklahoma City Static",
    city: "Oklahoma City",
    state: "Oklahoma",
    lat: 35.5149,
    lon: -97.5151,
    host: "Oklahoma Model Railroad Association",
    railroads: "BNSF",
    description: "OMRA-owned static camera on the BNSF Red Rock Sub at Nowers.",
    provider: "youtube",
    videoId: "z3rTHTEivV0",
    watchUrl: "https://www.youtube.com/watch?v=z3rTHTEivV0",
    titleHints: ["oklahoma city", "static"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "chehalis-wa-ptz",
    name: "Chehalis PTZ",
    city: "Chehalis",
    state: "Washington",
    lat: 46.6635,
    lon: -122.9715,
    host: "Lewis County Historical Museum",
    railroads: "BNSF • Amtrak Cascades",
    description: "Museum-hosted PTZ camera on the Seattle Sub with freight and Cascades traffic.",
    provider: "youtube",
    videoId: "YV8hzUJCp88",
    watchUrl: "https://www.youtube.com/watch?v=YV8hzUJCp88",
    titleHints: ["lewis county historical museum", "chehalis", "ptz"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "ritzville-wa-ptz",
    name: "Ritzville PTZ",
    city: "Ritzville",
    state: "Washington",
    lat: 47.1278,
    lon: -118.3806,
    host: "Ritzville Railroad Depot Museum",
    railroads: "BNSF • Amtrak Empire Builder",
    description: "Depot museum camera on the BNSF Lakeside Sub with Empire Builder Portland section passes.",
    provider: "youtube",
    videoId: "lgtAJgOb6PE",
    watchUrl: "https://www.youtube.com/watch?v=lgtAJgOb6PE",
    titleHints: ["ritzville", "ptz"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "tehachapi-ca-depot",
    name: "Tehachapi Depot",
    city: "Tehachapi",
    state: "California",
    lat: 35.1328,
    lon: -118.4489,
    host: "Tehachapi Live Train Cams",
    railroads: "Union Pacific • BNSF • Amtrak",
    description: "Depot museum area camera on Tehachapi Pass with heavy freight traffic.",
    provider: "youtube",
    videoId: "ITrG1UTPlOI",
    watchUrl: "https://www.youtube.com/watch?v=ITrG1UTPlOI",
    resolverDisabled: true,
    titleHints: ["tehachapi", "depot"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "bridgeport-al-downtown",
    name: "Bridgeport Depot",
    city: "Bridgeport",
    state: "Alabama",
    lat: 34.9478,
    lon: -85.7138,
    host: "Wheels Through Time Photography",
    railroads: "Norfolk Southern • CSX",
    description: "Downtown Bridgeport camera overlooking the Chattanooga area freight corridor.",
    provider: "youtube",
    videoId: "ddpmR0E3otM",
    watchUrl: "https://www.youtube.com/watch?v=ddpmR0E3otM",
    resolverDisabled: true,
    titleHints: ["bridgeport", "depot"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "houston-tx-tower26",
    name: "Houston Tower 26",
    city: "Houston",
    state: "Texas",
    lat: 29.7606,
    lon: -95.3607,
    host: "LIVE Trains",
    railroads: "Union Pacific • BNSF • Amtrak",
    description: "Houston Tower 26 live camera covering the terminal area.",
    provider: "youtube",
    videoId: "cRRQyXQAvsE",
    watchUrl: "https://www.youtube.com/watch?v=cRRQyXQAvsE",
    resolverDisabled: true,
    titleHints: ["houston", "tower 26"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "fort-worth-tx-trinity-metro",
    name: "Trinity Metro Cam",
    city: "Fort Worth",
    state: "Texas",
    lat: 32.7562,
    lon: -97.3324,
    host: "Trinity Metro",
    railroads: "TEXRail • Trinity Railway Express • Amtrak • BNSF/UP freight",
    description: "Official Fort Worth Central Station live webcam from Trinity Metro.",
    provider: "iframe",
    watchUrl: "https://ridetrinitymetro.org/webcam/",
    embedUrl: "https://g1.ipcamlive.com/player/player.php?alias=trinitymetrocam1&skin=white&autoplay=1&mute=1&disableautofullscreen=1&disabletimelapseplayer=1&disabledownloadbutton=1&disableuserpause=1",
    sourceType: "Official webcam page",
    free: true,
  },
  {
    id: "chattanooga-tn-tvrm",
    name: "TVRM Chattanooga",
    city: "Chattanooga",
    state: "Tennessee",
    lat: 35.0467,
    lon: -85.1843,
    host: "Tennessee Valley Railroad Museum",
    railroads: "TVRM • NS • CSX vicinity",
    description: "Official Tennessee Valley Railroad Museum webcam page with live yard activity.",
    provider: "iframe",
    watchUrl: "https://www.tvrail.com/webcam/",
    embedUrl: "https://www.tvrail.com/webcam/",
    sourceType: "Official webcam page",
    free: true,
  },
  {
    id: "north-freedom-wi-midcontinent",
    name: "Mid-Continent Museum",
    city: "North Freedom",
    state: "Wisconsin",
    lat: 43.4623,
    lon: -89.8695,
    host: "Mid-Continent Railway Museum",
    railroads: "Mid-Continent Railway Museum",
    description: "Official Mid-Continent Railway Museum webcam page.",
    provider: "iframe",
    watchUrl: "https://www.midcontinent.org/live-webcam/",
    embedUrl: "https://www.midcontinent.org/live-webcam/",
    sourceType: "Official webcam page",
    free: true,
  },
  {
    id: "truckee-ca-tdrrs",
    name: "Truckee Train Cam",
    city: "Truckee",
    state: "California",
    lat: 39.3273,
    lon: -120.1854,
    host: "Truckee Donner Railroad Society",
    railroads: "Union Pacific • BNSF • Amtrak",
    description: "Official Truckee Donner Railroad Society train cam page from the museum caboose.",
    provider: "iframe",
    watchUrl: "https://tdrrs.org/traincam",
    embedUrl: "https://tdrrs.org/traincam",
    sourceType: "Official webcam page",
    free: true,
  },
  {
    id: "san-luis-obispo-ca-slorrm",
    name: "SLO Railroad Museum",
    city: "San Luis Obispo",
    state: "California",
    lat: 35.2696,
    lon: -120.6545,
    host: "San Luis Obispo Railroad Museum",
    railroads: "Amtrak • Union Pacific • Santa Maria Valley",
    description: "Official SLO Railroad Museum webcam page overlooking the station area.",
    provider: "iframe",
    watchUrl: "https://slorrm.com/webcam.html",
    embedUrl: "https://slorrm.com/webcam.html",
    sourceType: "Official webcam page",
    free: true,
  },
  {
    id: "union-il-irm",
    name: "Illinois Railway Museum",
    city: "Union",
    state: "Illinois",
    lat: 42.2366,
    lon: -88.5267,
    host: "Illinois Railway Museum",
    railroads: "Illinois Railway Museum",
    description: "Official IRM webcam page with multiple live and still museum views.",
    provider: "iframe",
    watchUrl: "https://www2.irm.org/cam/",
    embedUrl: "https://www2.irm.org/cam/",
    sourceType: "Official webcam page",
    free: true,
  },
  {
    id: "la-plata-mo-virtual-railfan",
    name: "La Plata Station",
    city: "La Plata",
    state: "Missouri",
    lat: 40.0237,
    lon: -92.4918,
    host: "Virtual Railfan",
    railroads: "BNSF • Amtrak Southwest Chief",
    description: "Public station-area railcam covering BNSF Marceline Sub traffic and Amtrak Southwest Chief station stops.",
    provider: "youtube",
    watchUrl: "https://www.youtube.com/@VirtualRailfan/streams",
    titleHints: ["La Plata", "Missouri", "LIVE Train Camera"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "ashland-va-virtual-railfan",
    name: "Ashland Station",
    city: "Ashland",
    state: "Virginia",
    lat: 37.7590,
    lon: -77.4811,
    host: "Virtual Railfan",
    railroads: "CSX • Amtrak Northeast Regional",
    description: "Public downtown Ashland railcam watching the CSX RF&P corridor and Amtrak Virginia trains.",
    provider: "youtube",
    watchUrl: "https://www.youtube.com/@VirtualRailfan/streams",
    titleHints: ["Ashland", "Virginia", "LIVE Train Camera"],
    sourceType: "Public YouTube live",
    free: true,
  },
  {
    id: "folkston-ga-virtual-railfan",
    name: "Folkston Funnel",
    city: "Folkston",
    state: "Georgia",
    lat: 30.8304,
    lon: -82.0086,
    host: "Virtual Railfan",
    railroads: "CSX • Amtrak Florida services",
    description: "Public railcam near the Folkston Funnel with CSX freight and Amtrak Florida route traffic.",
    provider: "youtube",
    watchUrl: "https://www.youtube.com/@VirtualRailfan/streams",
    titleHints: ["Folkston", "Georgia", "LIVE Train Camera"],
    sourceType: "Public YouTube live",
    free: true,
  },
];

const railcamById = new Map(railcamCatalog.map((cam) => [cam.id, cam]));

const trainVisionKnowledgeBase = {
  modelRuntime: {
    objectDetector: "TensorFlow.js COCO-SSD compatible train/vehicle detector",
    customClassifier: "ORT train-livery classifier manifest",
    requiredFrameAccess: "HTMLVideoElement, same-origin image, or backend frame proxy",
  },
  labels: [
    { id: "locomotive", name: "Locomotive", kind: "vehicle" },
    { id: "freight-car", name: "Freight car", kind: "vehicle" },
    { id: "passenger-car", name: "Passenger car", kind: "vehicle" },
    { id: "cab-car", name: "Cab car", kind: "vehicle" },
  ],
  railroads: [
    { id: "bnsf", label: "BNSF", color: "#f97316", cues: ["orange", "black", "yellow stripe", "bnsf"] },
    { id: "up", label: "UNION PACIFIC", color: "#facc15", cues: ["yellow", "gray roof", "red stripe", "union pacific", "up"] },
    { id: "amtrak", label: "AMTRAK", color: "#2563eb", cues: ["blue", "silver", "amtrak", "phase", "alc-42", "p42"] },
    { id: "csx", label: "CSX", color: "#fbbf24", cues: ["blue", "yellow nose", "csx"] },
    { id: "ns", label: "NORFOLK SOUTHERN", color: "#111827", cues: ["black", "white horse", "ns", "norfolk southern"] },
    { id: "cn", label: "CN", color: "#ef4444", cues: ["red", "black", "cn", "canadian national"] },
    { id: "cpkc", label: "CPKC", color: "#be123c", cues: ["red", "gray", "cpkc", "canadian pacific", "kcs"] },
    { id: "tre", label: "TRINITY RAILWAY EXPRESS", color: "#dc2626", cues: ["red", "blue", "tre", "trinity railway express"] },
    { id: "texrail", label: "TEXRail", color: "#7c3aed", cues: ["purple", "texrail"] },
    { id: "metra", label: "METRA", color: "#0ea5e9", cues: ["blue", "orange", "metra"] },
  ],
  heritageUnits: [
    { railroad: "UP", units: ["UP 1982", "UP 1983", "UP 1988", "UP 1989", "UP 1995", "UP 1996", "UP 4014"], cue: "Union Pacific heritage / special paint" },
    { railroad: "NS", units: ["NS 1065", "NS 1066", "NS 1067", "NS 1068", "NS 1069", "NS 1070", "NS 1071", "NS 1072", "NS 1073", "NS 1074"], cue: "Norfolk Southern heritage fleet" },
    { railroad: "Amtrak", units: ["AMTK 100", "AMTK 108", "AMTK 130", "AMTK 145", "AMTK 156", "AMTK 160", "AMTK 161", "AMTK 184", "AMTK 301"], cue: "Amtrak heritage, Phase paint, or anniversary paint" },
    { railroad: "BNSF", units: ["BNSF 25", "BNSF 9647"], cue: "BNSF special paint / commemorative units where verified by sightings" },
    { railroad: "CN", units: ["CN 3115", "CN 8952"], cue: "CN heritage or commemorative paint" },
  ],
};

const proposedRailLines = [
  {
    id: "ca-hsr-phase-1",
    name: "California High-Speed Rail Phase 1",
    type: "High-speed rail",
    status: "Under construction / environmentally cleared segments",
    sponsor: "California High-Speed Rail Authority",
    states: "California",
    summary: "Planned San Francisco to Anaheim high-speed rail spine through San Jose, the Central Valley, Palmdale, Burbank, Los Angeles, and Anaheim.",
    sourceUrl: "https://hsr.ca.gov/high-speed-rail-in-california/overview/",
    coordinates: [
      [-122.4194, 37.7749], [-121.8863, 37.3382], [-121.5683, 36.8427], [-120.4829, 37.3022],
      [-119.7871, 36.7378], [-119.0187, 35.3733], [-118.1165, 34.5794], [-118.2437, 34.0522], [-117.9145, 33.8366],
    ],
  },
  {
    id: "ca-hsr-phase-2-sacramento",
    name: "California High-Speed Rail Phase 2 to Sacramento",
    type: "High-speed rail",
    status: "Future phase / planning",
    sponsor: "California High-Speed Rail Authority",
    states: "California",
    summary: "Future northern extension from the Central Valley toward Sacramento via Stockton and Modesto.",
    sourceUrl: "https://hsr.ca.gov/high-speed-rail-in-california/overview/",
    coordinates: [[-120.4829, 37.3022], [-121.0116, 37.6391], [-121.2908, 37.9577], [-121.4944, 38.5816]],
  },
  {
    id: "ca-hsr-phase-2-san-diego",
    name: "California High-Speed Rail Phase 2 to San Diego",
    type: "High-speed rail",
    status: "Future phase / planning",
    sponsor: "California High-Speed Rail Authority",
    states: "California",
    summary: "Future southern extension toward San Bernardino, Riverside, and San Diego.",
    sourceUrl: "https://hsr.ca.gov/high-speed-rail-in-california/overview/",
    coordinates: [[-117.9145, 33.8366], [-117.3962, 34.1083], [-117.3755, 33.9806], [-117.1611, 32.7157]],
  },
  {
    id: "brightline-west",
    name: "Brightline West",
    type: "High-speed rail",
    status: "Under construction",
    sponsor: "Brightline West",
    states: "California, Nevada",
    summary: "A 218-mile high-speed rail project linking Las Vegas with Rancho Cucamonga, with Victor Valley and Hesperia stops.",
    sourceUrl: "https://www.brightlinewest.com/about-us/faq",
    coordinates: [[-115.1398, 36.1699], [-117.2928, 34.5361], [-117.3009, 34.4264], [-117.5931, 34.1064]],
  },
  {
    id: "texas-central",
    name: "Dallas to Houston High-Speed Rail",
    type: "High-speed rail",
    status: "Proposed / environmental review history",
    sponsor: "Texas Central Railway / FRA / TxDOT coordination",
    states: "Texas",
    summary: "Privately developed high-speed rail proposal between the Dallas and Houston areas.",
    sourceUrl: "https://www.txdot.gov/projects/projects-studies/dallas/dallas-houston-high-speed-rail.html",
    coordinates: [[-96.7970, 32.7767], [-96.3736, 31.5493], [-95.3698, 29.7604]],
  },
  {
    id: "cascadia-hsr",
    name: "Cascadia High-Speed Rail",
    type: "High-speed rail",
    status: "Planning / Corridor ID pipeline",
    sponsor: "WSDOT, Oregon, British Columbia partners",
    states: "British Columbia, Washington, Oregon",
    summary: "Conceptual high-speed corridor linking Vancouver, Seattle, Portland, and Eugene.",
    sourceUrl: "https://wsdot.wa.gov/planning/studies/ultra-high-speed-travel/what-is-it",
    coordinates: [[-123.1207, 49.2827], [-122.3321, 47.6062], [-122.6765, 45.5152], [-123.0868, 44.0521]],
  },
  {
    id: "sehsr-richmond-raleigh-charlotte",
    name: "Southeast High-Speed Rail Corridor",
    type: "Higher-speed intercity rail",
    status: "Planning / construction pieces",
    sponsor: "FRA, NCDOT, Virginia DRPT",
    states: "Virginia, North Carolina",
    summary: "Washington/Richmond to Raleigh and Charlotte corridor improvements, including the S-Line program.",
    sourceUrl: "https://railroads.dot.gov/rail-network-development/environment/environmental-reviews/southeast-high-speed-rail-richmond-va",
    coordinates: [[-77.4360, 37.5407], [-77.4019, 37.2279], [-77.4605, 36.7282], [-78.6382, 35.7796], [-80.8431, 35.2271]],
  },
  {
    id: "front-range-passenger-rail",
    name: "Front Range Passenger Rail",
    type: "Intercity / commuter rail",
    status: "Planning",
    sponsor: "CDOT / Front Range Passenger Rail District",
    states: "Colorado",
    summary: "Passenger rail spine along Colorado's Front Range, with planning focused on the Denver to Fort Collins corridor and broader Pueblo/Fort Collins vision.",
    sourceUrl: "https://www.codot.gov/programs/transitandrail/jointpassengerrail",
    coordinates: [[-105.0844, 40.5853], [-105.2705, 40.0150], [-104.9903, 39.7392], [-104.8214, 38.8339], [-104.6091, 38.2544]],
  },
  {
    id: "austin-light-rail-phase-1",
    name: "Austin Light Rail Phase 1",
    type: "Light rail",
    status: "Project development",
    sponsor: "Austin Transit Partnership / CapMetro",
    states: "Texas",
    summary: "Light rail from 38th/Guadalupe through Downtown Austin, splitting toward South Congress/Oltorf and East Riverside near AUS.",
    sourceUrl: "https://www.transit.dot.gov/funding/grants/grant-programs/capital-investments/austin-light-rail-phase-1-project-profile",
    coordinates: [[-97.7410, 30.3021], [-97.7420, 30.2672], [-97.7502, 30.2486], [-97.7590, 30.2362], [-97.7010, 30.2235]],
  },
  {
    id: "maryland-purple-line",
    name: "Maryland Purple Line",
    type: "Light rail",
    status: "Under construction",
    sponsor: "MDOT MTA",
    states: "Maryland",
    summary: "16-mile, 21-station east-west light rail line between Bethesda and New Carrollton.",
    sourceUrl: "https://www.purplelinemd.com/overview",
    coordinates: [[-77.0947, 38.9847], [-77.0261, 38.9907], [-76.9378, 38.9897], [-76.8777, 38.9489]],
  },
  {
    id: "sound-transit-ballard-link",
    name: "Ballard Link Extension",
    type: "Light rail",
    status: "Environmental review / planning",
    sponsor: "Sound Transit",
    states: "Washington",
    summary: "Adds light rail from Downtown Seattle to Ballard, including a second downtown tunnel concept.",
    sourceUrl: "https://www.soundtransit.org/system-expansion/ballard-link-extension",
    coordinates: [[-122.3321, 47.6062], [-122.3480, 47.6205], [-122.3765, 47.6680]],
  },
  {
    id: "sound-transit-west-seattle-link",
    name: "West Seattle Link Extension",
    type: "Light rail",
    status: "Environmental review / planning",
    sponsor: "Sound Transit",
    states: "Washington",
    summary: "Planned Link light rail extension from Downtown Seattle to West Seattle.",
    sourceUrl: "https://www.seattle.gov/designcommission/meetings-and-projects/current-projects/light-rail-expansion-%28wsble%29",
    coordinates: [[-122.3321, 47.6062], [-122.3394, 47.5795], [-122.3863, 47.5632]],
  },
  {
    id: "northern-lights-express",
    name: "Northern Lights Express",
    type: "Intercity passenger rail",
    status: "Proposed / Corridor ID",
    sponsor: "MnDOT",
    states: "Minnesota, Wisconsin",
    summary: "Proposed Minneapolis to Duluth/Superior passenger rail service on approximately 152 miles of existing BNSF-owned track.",
    sourceUrl: "https://dot.state.mn.us/nlx/index.html",
    coordinates: [[-93.2650, 44.9778], [-93.2127, 45.1732], [-93.2642, 45.5727], [-92.9919, 46.0113], [-92.1005, 46.7867], [-92.1041, 46.7208]],
  },
  {
    id: "new-orleans-baton-rouge",
    name: "New Orleans to Baton Rouge Passenger Rail",
    type: "Intercity passenger rail",
    status: "Planning / station development",
    sponsor: "Southern Rail Commission / Louisiana partners",
    states: "Louisiana",
    summary: "Proposed daily passenger rail between New Orleans and Baton Rouge with intermediate stops including airport, LaPlace, and Gonzales concepts.",
    sourceUrl: "https://www.buildbatonrouge.org/projects/rail-station-master-plan",
    coordinates: [[-90.0715, 29.9511], [-90.2565, 29.9930], [-90.4815, 30.0669], [-90.9201, 30.2385], [-91.1871, 30.4515]],
  },
  {
    id: "scranton-new-york",
    name: "Scranton to New York Penn Station",
    type: "Intercity passenger rail",
    status: "Service Development Plan",
    sponsor: "PennDOT / Amtrak / NJ Transit partners",
    states: "Pennsylvania, New Jersey, New York",
    summary: "Approximately 140-mile corridor study to restore passenger rail between Scranton and New York Penn Station via the Lackawanna Cutoff.",
    sourceUrl: "https://www.pa.gov/agencies/penndot/news-and-media/newsroom/statewide/2026/shapiro-administration-advances-scranton-to-new-york-city-rail-c",
    coordinates: [[-75.6624, 41.4089], [-75.1821, 40.9868], [-74.7429, 40.9732], [-74.1724, 40.7357], [-73.9936, 40.7506]],
  },
  {
    id: "tri-rail-coastal-link",
    name: "Tri-Rail Coastal Link",
    type: "Commuter rail",
    status: "Long-range proposal",
    sponsor: "South Florida regional partners",
    states: "Florida",
    summary: "Proposed commuter service concept on the Florida East Coast corridor between Miami and Jupiter.",
    sourceUrl: "https://tri-railcoastallinkstudy.com/about.php",
    coordinates: [[-80.1918, 25.7617], [-80.1373, 26.1224], [-80.0534, 26.7153], [-80.0942, 26.9342]],
  },
  {
    id: "honolulu-rail-ala-moana",
    name: "Honolulu Rail Ala Moana Extension",
    type: "Metro rail",
    status: "Future phase",
    sponsor: "Honolulu Authority for Rapid Transportation",
    states: "Hawaii",
    summary: "Future project phase extending Skyline from Civic Center toward Ala Moana Transit Center.",
    sourceUrl: "https://honolulutransit.org/about/the-project/",
    coordinates: [[-157.8615, 21.3099], [-157.8583, 21.3044], [-157.8480, 21.2917]],
  },
  {
    id: "okc-regional-commuter-south",
    name: "OKC-Norman-Edmond Commuter Rail",
    type: "Commuter rail",
    status: "Regional planning / federal study",
    sponsor: "ONE Transit / Regional Transportation Authority of Central Oklahoma",
    states: "Oklahoma",
    summary: "North-south commuter rail concept linking Edmond, downtown Oklahoma City, Moore, and Norman on the region's favored commuter corridor.",
    sourceUrl: "https://www.rtaok.org/wp-content/uploads/2020/04/Commuter-Corridors-Final-Report-12032015.pdf",
    coordinates: [
      [-97.4781, 35.6534], [-97.4930, 35.6133], [-97.5127, 35.5537], [-97.5129, 35.4994],
      [-97.5126, 35.4654], [-97.5160, 35.4388], [-97.5036, 35.3921], [-97.4867, 35.3395],
      [-97.4664, 35.2768], [-97.4395, 35.2226],
    ],
  },
  {
    id: "okc-regional-commuter-east",
    name: "OKC East Corridor to Tinker",
    type: "Light rail / streetcar corridor",
    status: "Regional corridor planning",
    sponsor: "ONE Transit / Regional Transportation Authority of Central Oklahoma",
    states: "Oklahoma",
    summary: "East-west high-capacity transit corridor concept from downtown Oklahoma City through Del City and Midwest City toward Tinker Air Force Base.",
    sourceUrl: "https://www.rtaok.org/wp-content/uploads/2020/04/Commuter-Corridors-Final-Report-12032015.pdf",
    coordinates: [
      [-97.5126, 35.4654], [-97.4828, 35.4648], [-97.4432, 35.4662], [-97.4010, 35.4655],
      [-97.3712, 35.4631], [-97.4004, 35.4144],
    ],
  },
  {
    id: "okc-airport-rail-corridor",
    name: "OKC Airport Rail Corridor",
    type: "Light rail / commuter rail corridor",
    status: "Regional corridor planning",
    sponsor: "ONE Transit / Oklahoma City regional partners",
    states: "Oklahoma",
    summary: "Southwest corridor concept linking the downtown intermodal hub and Will Rogers World Airport.",
    sourceUrl: "https://www.rtaok.org/wp-content/uploads/2020/04/Commuter-Corridors-Final-Report-12032015.pdf",
    coordinates: [[-97.5126, 35.4654], [-97.5307, 35.4326], [-97.5464, 35.3951], [-97.6007, 35.3931]],
  },
  {
    id: "okc-streetcar-classen-extension",
    name: "OKC Streetcar Classen Extension",
    type: "Streetcar / light rail",
    status: "Expansion concept",
    sponsor: "City of Oklahoma City / MAPS planning context",
    states: "Oklahoma",
    summary: "Conceptual OKC Streetcar expansion north from downtown along the Classen corridor toward NW 63rd Street commuter-rail interface.",
    sourceUrl: "https://www.okc.gov/government/maps-3/projects/modern-streetcar-transit",
    coordinates: [[-97.5158, 35.4688], [-97.5234, 35.4855], [-97.5326, 35.5070], [-97.5364, 35.5364]],
  },
  {
    id: "okc-streetcar-capitol-hill-extension",
    name: "OKC Streetcar Capitol Hill Extension",
    type: "Streetcar / light rail",
    status: "Expansion concept",
    sponsor: "City of Oklahoma City / MAPS planning context",
    states: "Oklahoma",
    summary: "Conceptual OKC Streetcar south extension from downtown toward Capitol Hill and the SW 25th commuter-rail interface.",
    sourceUrl: "https://www.okc.gov/government/maps-3/projects/modern-streetcar-transit",
    coordinates: [[-97.5158, 35.4688], [-97.5201, 35.4490], [-97.5204, 35.4255], [-97.5221, 35.4042]],
  },
  {
    id: "okc-tulsa-intercity",
    name: "Oklahoma City to Tulsa Passenger Rail",
    type: "Intercity passenger rail",
    status: "State rail corridor planning",
    sponsor: "Oklahoma Department of Transportation",
    states: "Oklahoma",
    summary: "State-owned Sooner Sub corridor and passenger rail planning context between Oklahoma City, Sapulpa, and the Tulsa region.",
    sourceUrl: "https://www.odot.org/rail/sooner/",
    coordinates: [[-97.5126, 35.4654], [-97.4781, 35.6534], [-97.0584, 35.6851], [-96.7698, 35.8389], [-96.3911, 35.9987], [-96.1142, 36.0012], [-95.9928, 36.1540]],
  },
  {
    id: "carolinas-charlotte-columbia-charleston",
    name: "South Carolina Intercity Passenger Rail Spine",
    type: "Intercity passenger rail",
    status: "Statewide rail plan vision",
    sponsor: "SCDOT / Southeast Corridor planning context",
    states: "North Carolina, South Carolina",
    summary: "Conceptual Carolinas passenger rail spine connecting Charlotte, Columbia, and Charleston within South Carolina rail planning and Southeast Corridor context.",
    sourceUrl: "https://www.scdot.org/travel/freight-rail.aspx",
    coordinates: [[-80.8431, 35.2271], [-81.0348, 34.0007], [-79.9311, 32.7765]],
  },
  {
    id: "carolinas-atlanta-charlotte",
    name: "Atlanta to Charlotte Passenger Rail Corridor",
    type: "Intercity / higher-speed rail",
    status: "Tier 1 environmental process completed",
    sponsor: "FRA / GDOT / SCDOT / NCDOT",
    states: "Georgia, South Carolina, North Carolina",
    summary: "Southeast Corridor segment studying improved passenger rail between Atlanta and Charlotte via the Upstate South Carolina region.",
    sourceUrl: "https://www.southeastcorridor-commission.org/",
    coordinates: [[-84.3880, 33.7490], [-82.3940, 34.8526], [-81.9320, 34.9496], [-80.8431, 35.2271]],
  },
  {
    id: "front-range-north-south-full",
    name: "Front Range Passenger Rail Full Corridor",
    type: "Intercity / commuter rail",
    status: "Corridor ID / state district planning",
    sponsor: "Front Range Passenger Rail District / CDOT",
    states: "Colorado, Wyoming, New Mexico",
    summary: "Long-range Front Range service vision from Pueblo and Colorado Springs through Denver to Fort Collins, with planning context for extensions toward Cheyenne and New Mexico.",
    sourceUrl: "https://www.frontrangepassengerrail.com/",
    coordinates: [[-104.6091, 38.2544], [-104.8214, 38.8339], [-104.9903, 39.7392], [-105.0844, 40.5853], [-104.8202, 41.1400]],
  },
  {
    id: "cleveland-columbus-dayton-cincinnati",
    name: "Cleveland-Columbus-Dayton-Cincinnati Corridor",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Ohio Rail Development Commission",
    states: "Ohio",
    summary: "Proposed 3C+D passenger rail corridor connecting Ohio's largest metropolitan areas.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-81.6944, 41.4993], [-82.9988, 39.9612], [-84.1916, 39.7589], [-84.5120, 39.1031]],
  },
  {
    id: "chicago-fort-wayne-columbus-pittsburgh",
    name: "Midwest Connect Corridor",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Midwest regional partners",
    states: "Illinois, Indiana, Ohio, Pennsylvania",
    summary: "Proposed passenger corridor from Chicago through Fort Wayne and Columbus toward Pittsburgh.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-87.6298, 41.8781], [-85.1394, 41.0793], [-82.9988, 39.9612], [-79.9959, 40.4406]],
  },
  {
    id: "milwaukee-madison-eau-claire",
    name: "Milwaukee-Madison-Eau Claire Corridor",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "WisDOT",
    states: "Wisconsin, Minnesota",
    summary: "Proposed state-supported passenger rail corridor connecting Milwaukee, Madison, Eau Claire, and the Twin Cities region.",
    sourceUrl: "https://wisconsindot.gov/Pages/projects/multimodal/rail/2024-state-rail-plan.aspx",
    coordinates: [[-87.9065, 43.0389], [-89.4012, 43.0731], [-91.4985, 44.8113], [-93.2650, 44.9778]],
  },
  {
    id: "madison-chicago-hiawatha-extension",
    name: "Chicago-Milwaukee-Madison Corridor",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "WisDOT / Illinois partners",
    states: "Illinois, Wisconsin",
    summary: "Proposed Chicago-Milwaukee-Madison passenger rail corridor tied to state rail planning and Corridor ID work.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-87.6298, 41.8781], [-87.9065, 43.0389], [-89.4012, 43.0731]],
  },
  {
    id: "phoenix-tucson",
    name: "Phoenix to Tucson Passenger Rail",
    type: "Intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Arizona DOT",
    states: "Arizona",
    summary: "Proposed passenger rail service between Phoenix and Tucson with intermediate central Arizona communities.",
    sourceUrl: "https://azdot.gov/planning/transportation-studies/passenger-rail-study-tucson-phoenix",
    coordinates: [[-112.0740, 33.4484], [-111.8413, 33.3062], [-111.3873, 32.8795], [-110.9747, 32.2226]],
  },
  {
    id: "las-vegas-phoenix",
    name: "Las Vegas to Phoenix Passenger Rail",
    type: "Intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Nevada / Arizona regional partners",
    states: "Nevada, Arizona",
    summary: "Proposed intercity passenger rail corridor connecting Las Vegas and Phoenix.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-115.1398, 36.1699], [-114.0530, 35.1894], [-112.0740, 33.4484]],
  },
  {
    id: "salt-lake-city-boise",
    name: "Salt Lake City to Boise Corridor",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Idaho / Utah regional partners",
    states: "Utah, Idaho",
    summary: "Proposed intercity passenger rail corridor reconnecting Salt Lake City, Pocatello, Twin Falls, and Boise.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-111.8910, 40.7608], [-112.0391, 41.2230], [-112.4455, 42.8713], [-114.4609, 42.5629], [-116.2023, 43.6150]],
  },
  {
    id: "boise-portland",
    name: "Boise to Portland Corridor",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Oregon / Idaho regional partners",
    states: "Idaho, Oregon",
    summary: "Proposed passenger rail corridor connecting Boise, eastern Oregon, and Portland.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-116.2023, 43.6150], [-118.0877, 44.0266], [-120.5542, 45.6721], [-122.6765, 45.5152]],
  },
  {
    id: "new-orleans-mobile",
    name: "Gulf Coast Passenger Rail",
    type: "Amtrak / intercity passenger rail",
    status: "Service restoration / development",
    sponsor: "Southern Rail Commission / Amtrak / Gulf Coast states",
    states: "Louisiana, Mississippi, Alabama",
    summary: "Restored and expanded Gulf Coast passenger rail corridor between New Orleans, Mississippi Coast cities, and Mobile.",
    sourceUrl: "https://www.southernrailcommission.org/",
    coordinates: [[-90.0715, 29.9511], [-89.0928, 30.3674], [-88.8853, 30.3674], [-88.0399, 30.6954]],
  },
  {
    id: "i20-corridor-meridian-dallas",
    name: "I-20 Corridor: Meridian to Dallas-Fort Worth",
    type: "Amtrak / long-distance extension",
    status: "FRA Corridor ID / long-distance study context",
    sponsor: "Southern Rail Commission / Amtrak partners",
    states: "Mississippi, Louisiana, Texas",
    summary: "Proposed passenger rail corridor extending east-west service from Mississippi through Louisiana toward Dallas-Fort Worth.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-88.7037, 32.3643], [-90.1848, 32.2988], [-92.1193, 32.5093], [-94.7405, 32.5007], [-96.7970, 32.7767], [-97.3308, 32.7555]],
  },
  {
    id: "nashville-atlanta",
    name: "Nashville to Atlanta Passenger Rail",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Tennessee / Georgia partners",
    states: "Tennessee, Georgia",
    summary: "Proposed passenger rail corridor linking Nashville, Chattanooga, and Atlanta.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-86.7816, 36.1627], [-85.3097, 35.0456], [-84.3880, 33.7490]],
  },
  {
    id: "nashville-memphis",
    name: "Nashville to Memphis Passenger Rail",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Tennessee partners",
    states: "Tennessee",
    summary: "Proposed passenger rail corridor between Tennessee's two largest cities.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-86.7816, 36.1627], [-88.8139, 35.6145], [-90.0490, 35.1495]],
  },
  {
    id: "louisville-nashville",
    name: "Louisville to Nashville Passenger Rail",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Kentucky / Tennessee partners",
    states: "Kentucky, Tennessee",
    summary: "Proposed intercity passenger rail corridor connecting Louisville, Bowling Green, and Nashville.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-85.7585, 38.2527], [-86.4436, 36.9685], [-86.7816, 36.1627]],
  },
  {
    id: "dallas-fort-worth-san-antonio",
    name: "Dallas-Fort Worth to San Antonio Corridor",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Texas partners",
    states: "Texas",
    summary: "Proposed Texas passenger rail corridor connecting DFW, Waco, Austin, and San Antonio.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-97.3308, 32.7555], [-97.1467, 31.5493], [-97.7431, 30.2672], [-98.4936, 29.4241]],
  },
  {
    id: "houston-san-antonio",
    name: "Houston to San Antonio Corridor",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Texas partners",
    states: "Texas",
    summary: "Proposed passenger rail corridor connecting Houston and San Antonio.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-95.3698, 29.7604], [-97.0036, 29.7019], [-98.4936, 29.4241]],
  },
  {
    id: "hartford-providence",
    name: "Hartford to Providence Corridor",
    type: "Intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Connecticut / Rhode Island partners",
    states: "Connecticut, Rhode Island",
    summary: "Proposed east-west passenger rail corridor connecting Hartford, eastern Connecticut, and Providence.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-72.6851, 41.7637], [-72.2162, 41.5243], [-71.4128, 41.8240]],
  },
  {
    id: "boston-albany",
    name: "Boston to Albany Corridor",
    type: "Amtrak / intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "MassDOT / NYSDOT partners",
    states: "Massachusetts, New York",
    summary: "Proposed improvements to east-west passenger rail between Boston, Worcester, Springfield, and Albany.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-71.0589, 42.3601], [-71.8023, 42.2626], [-72.5898, 42.1015], [-73.7562, 42.6526]],
  },
  {
    id: "montreal-boston",
    name: "Montreal to Boston Corridor",
    type: "Intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Vermont / Massachusetts / Quebec partners",
    states: "Quebec, Vermont, New Hampshire, Massachusetts",
    summary: "Proposed international passenger rail corridor connecting Montreal, Vermont/New Hampshire, and Boston.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-73.5673, 45.5017], [-72.5778, 44.4759], [-71.5376, 43.2081], [-71.0589, 42.3601]],
  },
  {
    id: "alto-quebec-windsor",
    name: "Alto High-Speed Rail",
    type: "High-speed rail",
    status: "Federal major project / pre-procurement",
    sponsor: "Government of Canada / Alto",
    states: "Ontario, Quebec",
    summary: "Canadian high-speed rail project for the Quebec City to Toronto corridor, with Ottawa-Montreal identified as a starting point.",
    sourceUrl: "https://www.canada.ca/en/transport-canada/news/2025/12/full-speed-ahead-ottawamontreal-chosen-as-starting-point-for-alto-high-speed-rail.html",
    coordinates: [[-71.2080, 46.8139], [-73.5673, 45.5017], [-75.6972, 45.4215], [-79.3832, 43.6532]],
  },
  {
    id: "surrey-langley-skytrain",
    name: "Surrey-Langley SkyTrain Extension",
    type: "Metro rail",
    status: "Under construction",
    sponsor: "Province of British Columbia / TransLink / Government of Canada",
    states: "British Columbia",
    summary: "SkyTrain extension from King George Station through Surrey to Langley City.",
    sourceUrl: "https://www.canada.ca/en/housing-infrastructure-communities/news/2026/05/new-skytrain-stations-taking-shape-for-transit-riders-south-of-the-fraser.html",
    coordinates: [[-122.8450, 49.1828], [-122.8011, 49.1044], [-122.6604, 49.1042]],
  },
  {
    id: "hamilton-lrt",
    name: "Hamilton LRT",
    type: "Light rail",
    status: "Construction progress / funded",
    sponsor: "Metrolinx / City of Hamilton / Ontario / Canada",
    states: "Ontario",
    summary: "Hamilton B-Line LRT corridor from McMaster University toward Eastgate Square.",
    sourceUrl: "https://www.hamilton.ca/city-council/plans-strategies/city-projects/light-rail-transit",
    coordinates: [[-79.9192, 43.2630], [-79.8711, 43.2557], [-79.8017, 43.2299]],
  },
  {
    id: "gatineau-tramway",
    name: "Gatineau Tramway",
    type: "Light rail",
    status: "Planning / funded planning",
    sponsor: "STO / Quebec / Canada",
    states: "Quebec, Ontario",
    summary: "Proposed tramway connecting west Gatineau with downtown Gatineau and Ottawa.",
    sourceUrl: "https://tramwaygatineauottawa.ca/en/",
    coordinates: [[-75.8318, 45.4386], [-75.7013, 45.4765], [-75.6972, 45.4215]],
  },
  {
    id: "quebec-city-tramway",
    name: "Quebec City Tramway",
    type: "Light rail",
    status: "Planning / procurement reset",
    sponsor: "Quebec City / Quebec partners",
    states: "Quebec",
    summary: "Planned east-west tramway spine for Quebec City.",
    sourceUrl: "https://www.ville.quebec.qc.ca/citoyens/deplacements/reseau_structurant/index.aspx",
    coordinates: [[-71.3830, 46.7600], [-71.2080, 46.8139], [-71.1540, 46.8580]],
  },
  {
    id: "charlotte-red-line",
    name: "Charlotte Red Line",
    type: "Commuter rail",
    status: "Regional planning / corridor preservation",
    sponsor: "Charlotte Area Transit System / regional partners",
    states: "North Carolina",
    summary: "North corridor commuter rail concept from Uptown Charlotte toward Huntersville, Cornelius, Davidson, and Mooresville.",
    sourceUrl: "https://www.charlottenc.gov/CATS/Transit-Planning/2030-Transit-Corridor-System-Plan",
    coordinates: [[-80.8431, 35.2271], [-80.8429, 35.4107], [-80.8570, 35.4868], [-80.8401, 35.5849]],
  },
  {
    id: "raleigh-wilmington",
    name: "Raleigh to Wilmington Passenger Rail",
    type: "Intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "NCDOT",
    states: "North Carolina",
    summary: "Proposed passenger rail corridor from Raleigh through eastern North Carolina to Wilmington.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-78.6382, 35.7796], [-78.0003, 35.5207], [-77.9447, 35.3827], [-77.3664, 35.6127], [-77.9447, 34.2257]],
  },
  {
    id: "raleigh-winston-salem",
    name: "Raleigh to Winston-Salem Corridor",
    type: "Intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "NCDOT",
    states: "North Carolina",
    summary: "Proposed passenger rail corridor connecting Raleigh, Durham, Greensboro, and Winston-Salem.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-78.6382, 35.7796], [-78.8986, 35.9940], [-79.7920, 36.0726], [-80.2442, 36.0999]],
  },
  {
    id: "newport-news-richmond",
    name: "Newport News to Richmond Corridor",
    type: "Intercity passenger rail",
    status: "FRA Corridor ID planning",
    sponsor: "Virginia DRPT",
    states: "Virginia",
    summary: "Proposed and upgraded Virginia passenger rail corridor between Hampton Roads and Richmond.",
    sourceUrl: "https://railroads.dot.gov/corridor-ID-program",
    coordinates: [[-76.4730, 37.0871], [-76.2859, 36.8508], [-76.7075, 37.2707], [-77.4360, 37.5407]],
  },
  {
    id: "wasatch-front-frontrunner-expansion",
    name: "FrontRunner Forward",
    type: "Commuter rail",
    status: "State-funded double-tracking and frequency program",
    sponsor: "Utah Transit Authority / UDOT",
    states: "Utah",
    summary: "FrontRunner commuter rail investment program to add double track, improve frequency, and support future service expansion along the Wasatch Front.",
    sourceUrl: "https://www.rideuta.com/Current-Projects/FrontRunner-Forward",
    coordinates: [[-112.0263, 41.2230], [-111.8910, 40.7608], [-111.6585, 40.2338]],
  },
  {
    id: "valley-link",
    name: "Valley Link",
    type: "Commuter rail",
    status: "Project development / funding pursuit",
    sponsor: "Tri-Valley-San Joaquin Valley Regional Rail Authority",
    states: "California",
    summary: "Planned rail connection between the Dublin/Pleasanton BART area and the Northern San Joaquin Valley.",
    sourceUrl: "https://www.valleylinkrail.com/",
    coordinates: [[-121.8996, 37.7016], [-121.7680, 37.6821], [-121.4252, 37.7397], [-121.2908, 37.9577]],
  },
  {
    id: "south-coast-rail-phase-2",
    name: "South Coast Rail Phase 2",
    type: "Commuter rail",
    status: "Future phase",
    sponsor: "MassDOT / MBTA",
    states: "Massachusetts",
    summary: "Future electrified-style Stoughton route concept for improved South Coast Rail service to New Bedford and Fall River.",
    sourceUrl: "https://www.mass.gov/south-coast-rail",
    coordinates: [[-71.0571, 42.3601], [-71.1023, 42.0834], [-71.0898, 41.9001], [-70.9342, 41.6362], [-71.1550, 41.7015]],
  },
  {
    id: "west-coast-express-expansion",
    name: "West Coast Express Expansion Concepts",
    type: "Commuter rail",
    status: "Regional planning",
    sponsor: "TransLink / Province of British Columbia planning context",
    states: "British Columbia",
    summary: "Potential future commuter rail service improvements and extensions in the Fraser Valley corridor.",
    sourceUrl: "https://www.translink.ca/plans-and-projects/strategies-plans-and-guidelines/transit-service-performance-review",
    coordinates: [[-123.1207, 49.2827], [-122.8011, 49.1044], [-122.5750, 49.0504], [-122.2526, 49.0504]],
  },
  {
    id: "la-metro-sepulveda",
    name: "LA Metro Sepulveda Transit Corridor",
    type: "Heavy rail / automated rail",
    status: "Environmental review",
    sponsor: "LA Metro",
    states: "California",
    summary: "High-capacity rail corridor linking the San Fernando Valley, UCLA/Westwood, and the Westside over or under the Sepulveda Pass.",
    sourceUrl: "https://www.metro.net/projects/sepulvedacorridor/",
    coordinates: [[-118.4489, 34.1808], [-118.4483, 34.1480], [-118.4486, 34.1109], [-118.4438, 34.0635], [-118.4912, 34.0195]],
  },
  {
    id: "la-metro-esfv",
    name: "East San Fernando Valley Light Rail",
    type: "Light rail",
    status: "Pre-construction / funded phase",
    sponsor: "LA Metro",
    states: "California",
    summary: "Light rail project along Van Nuys Boulevard from the Van Nuys Metrolink area toward Sylmar/San Fernando.",
    sourceUrl: "https://www.metro.net/projects/east-sfv/",
    coordinates: [[-118.4492, 34.1867], [-118.4489, 34.2063], [-118.4488, 34.2336], [-118.4482, 34.2819], [-118.4437, 34.3076]],
  },
  {
    id: "la-metro-west-santa-ana",
    name: "West Santa Ana Branch",
    type: "Light rail",
    status: "Environmental / project development",
    sponsor: "LA Metro",
    states: "California",
    summary: "New light rail corridor from southeast Los Angeles County toward downtown Los Angeles using the historic West Santa Ana Branch corridor.",
    sourceUrl: "https://www.metro.net/projects/west-santa-ana/",
    coordinates: [[-118.2437, 34.0522], [-118.2088, 33.9739], [-118.1853, 33.9022], [-118.1170, 33.8583], [-118.0823, 33.8958]],
  },
  {
    id: "bart-silicon-valley-phase-2",
    name: "BART Silicon Valley Phase II",
    type: "Metro rail",
    status: "Under construction",
    sponsor: "VTA / BART",
    states: "California",
    summary: "BART extension through downtown San Jose to Santa Clara.",
    sourceUrl: "https://www.vta.org/projects/bart-sv/phase-ii",
    coordinates: [[-121.8881, 37.3305], [-121.8948, 37.3362], [-121.9015, 37.3525], [-121.9460, 37.3530]],
  },
  {
    id: "caltrain-downtown-extension",
    name: "The Portal / Caltrain Downtown Extension",
    type: "Commuter rail / intercity terminal extension",
    status: "Project development",
    sponsor: "TJPA / Caltrain / California partners",
    states: "California",
    summary: "Rail extension from San Francisco 4th & King to Salesforce Transit Center for Caltrain and future California HSR.",
    sourceUrl: "https://tjpa.org/the-portal",
    coordinates: [[-122.3949, 37.7766], [-122.3986, 37.7829], [-122.3958, 37.7897]],
  },
  {
    id: "ace-valley-rail",
    name: "Valley Rail / ACE Extension",
    type: "Commuter rail",
    status: "Funded phases / project development",
    sponsor: "San Joaquin Regional Rail Commission",
    states: "California",
    summary: "ACE and San Joaquins rail improvements extending passenger service toward Natomas, Sacramento, and Merced corridors.",
    sourceUrl: "https://acerail.com/valley_rail/",
    coordinates: [[-121.2908, 37.9577], [-121.4944, 38.5816], [-121.4689, 38.6582], [-120.4829, 37.3022]],
  },
  {
    id: "smart-north-extension",
    name: "SMART Northern Extensions",
    type: "Commuter rail",
    status: "Phased extension planning",
    sponsor: "SMART",
    states: "California",
    summary: "SMART commuter rail extension concepts north from Windsor toward Healdsburg and Cloverdale.",
    sourceUrl: "https://www.sonomamarintrain.org/projects",
    coordinates: [[-122.8144, 38.5471], [-122.8692, 38.6105], [-122.8675, 38.8055]],
  },
  {
    id: "portland-southwest-corridor",
    name: "Portland Southwest Corridor MAX",
    type: "Light rail",
    status: "Paused / locally prioritized corridor",
    sponsor: "TriMet / Metro",
    states: "Oregon",
    summary: "Southwest Corridor light rail concept from downtown Portland toward Tigard and Tualatin.",
    sourceUrl: "https://trimet.org/swcorridor/",
    coordinates: [[-122.6765, 45.5152], [-122.6988, 45.4736], [-122.7715, 45.4312], [-122.7630, 45.3840]],
  },
  {
    id: "interstate-bridge-max",
    name: "Interstate Bridge MAX Extension",
    type: "Light rail",
    status: "Project development",
    sponsor: "Interstate Bridge Replacement Program / TriMet / C-TRAN",
    states: "Oregon, Washington",
    summary: "MAX Yellow Line extension across the replacement I-5 bridge to Vancouver, Washington.",
    sourceUrl: "https://www.interstatebridge.org/",
    coordinates: [[-122.6824, 45.5849], [-122.6716, 45.6205], [-122.6716, 45.6387]],
  },
  {
    id: "sound-transit-everett-link",
    name: "Everett Link Extension",
    type: "Light rail",
    status: "Planning / environmental review",
    sponsor: "Sound Transit",
    states: "Washington",
    summary: "Planned Link light rail extension from Lynnwood through Paine Field area to Everett.",
    sourceUrl: "https://www.soundtransit.org/system-expansion/everett-link-extension",
    coordinates: [[-122.2940, 47.8209], [-122.3054, 47.9112], [-122.2817, 47.9790], [-122.2021, 47.9780]],
  },
  {
    id: "sound-transit-tacoma-dome-link",
    name: "Tacoma Dome Link Extension",
    type: "Light rail",
    status: "Planning / environmental review",
    sponsor: "Sound Transit",
    states: "Washington",
    summary: "Planned Link light rail extension from Federal Way to Fife and Tacoma Dome.",
    sourceUrl: "https://www.soundtransit.org/system-expansion/tacoma-dome-link-extension",
    coordinates: [[-122.3042, 47.3223], [-122.3124, 47.2484], [-122.3533, 47.2393], [-122.4284, 47.2399]],
  },
  {
    id: "phoenix-i10-west-extension",
    name: "Phoenix I-10 West Extension",
    type: "Light rail",
    status: "Planning",
    sponsor: "Valley Metro / City of Phoenix",
    states: "Arizona",
    summary: "Planned light rail extension west from downtown Phoenix along the I-10 West corridor.",
    sourceUrl: "https://www.valleymetro.org/project/i-10-west-extension",
    coordinates: [[-112.0740, 33.4484], [-112.1202, 33.4600], [-112.1703, 33.4669], [-112.2203, 33.4792]],
  },
  {
    id: "phoenix-capitol-extension",
    name: "Phoenix Capitol Extension",
    type: "Light rail",
    status: "Planning",
    sponsor: "Valley Metro / City of Phoenix",
    states: "Arizona",
    summary: "Light rail extension west from downtown Phoenix to the Arizona State Capitol area.",
    sourceUrl: "https://www.valleymetro.org/project/capitol-extension",
    coordinates: [[-112.0740, 33.4484], [-112.0910, 33.4485], [-112.1089, 33.4484]],
  },
  {
    id: "capmetro-green-line",
    name: "Austin Green Line",
    type: "Commuter rail",
    status: "Long-range commuter rail proposal",
    sponsor: "CapMetro / Project Connect context",
    states: "Texas",
    summary: "Proposed commuter rail corridor from downtown Austin through East Austin toward Manor and Elgin.",
    sourceUrl: "https://www.capmetro.org/project-connect",
    coordinates: [[-97.7431, 30.2672], [-97.6904, 30.2920], [-97.5577, 30.3408], [-97.3703, 30.3497]],
  },
  {
    id: "dart-silver-line",
    name: "DART Silver Line",
    type: "Commuter rail",
    status: "Under construction",
    sponsor: "DART",
    states: "Texas",
    summary: "Regional rail line across North Texas from Plano through Addison and DFW Airport to the TEXRail connection.",
    sourceUrl: "https://www.dart.org/about/plans-projects-and-initiatives/expansion/silver-line-regional-rail-project",
    coordinates: [[-96.6989, 33.0198], [-96.8292, 32.9618], [-96.9442, 32.9537], [-97.0380, 32.8998]],
  },
  {
    id: "denver-northwest-rail",
    name: "Denver Northwest Rail",
    type: "Commuter rail",
    status: "Long-range / phased implementation",
    sponsor: "RTD",
    states: "Colorado",
    summary: "Planned commuter rail corridor from Denver Union Station through Boulder toward Longmont.",
    sourceUrl: "https://www.rtd-denver.com/projects/northwest-rail",
    coordinates: [[-104.9990, 39.7530], [-105.0897, 39.9205], [-105.2705, 40.0150], [-105.1019, 40.1672]],
  },
  {
    id: "metro-blue-line-extension",
    name: "METRO Blue Line Extension",
    type: "Light rail",
    status: "Project development",
    sponsor: "Metropolitan Council / Metro Transit",
    states: "Minnesota",
    summary: "Planned light rail extension from Minneapolis through north Minneapolis, Robbinsdale, Crystal, and Brooklyn Park.",
    sourceUrl: "https://metrocouncil.org/Transportation/Projects/Light-Rail-Projects/METRO-Blue-Line-Extension.aspx",
    coordinates: [[-93.2650, 44.9778], [-93.2886, 45.0114], [-93.3386, 45.0324], [-93.3563, 45.0941]],
  },
  {
    id: "chicago-red-line-extension",
    name: "CTA Red Line Extension",
    type: "Metro rail",
    status: "Federal funding / project development",
    sponsor: "CTA",
    states: "Illinois",
    summary: "Red Line extension from 95th/Dan Ryan to 130th Street on Chicago's Far South Side.",
    sourceUrl: "https://www.transitchicago.com/rle/",
    coordinates: [[-87.6241, 41.7224], [-87.6247, 41.7041], [-87.6255, 41.6815], [-87.6243, 41.6589]],
  },
  {
    id: "metra-southeast-service",
    name: "Metra SouthEast Service",
    type: "Commuter rail",
    status: "Long-range proposal",
    sponsor: "Metra / regional planning context",
    states: "Illinois, Indiana",
    summary: "Proposed commuter rail service from Chicago to the south suburbs and Crete region.",
    sourceUrl: "https://metra.com/",
    coordinates: [[-87.6298, 41.8781], [-87.7034, 41.5731], [-87.6314, 41.5006], [-87.6317, 41.4448]],
  },
  {
    id: "nyc-interborough-express",
    name: "Interborough Express",
    type: "Light rail",
    status: "Project development",
    sponsor: "MTA",
    states: "New York",
    summary: "Proposed light rail line using the Bay Ridge Branch corridor between Brooklyn and Queens.",
    sourceUrl: "https://new.mta.info/project/interborough-express",
    coordinates: [[-74.0121, 40.6455], [-73.9571, 40.6500], [-73.9042, 40.6697], [-73.8448, 40.7218]],
  },
  {
    id: "buffalo-amherst-extension",
    name: "Buffalo Amherst Metro Rail Extension",
    type: "Light rail",
    status: "Environmental review / project development",
    sponsor: "NFTA",
    states: "New York",
    summary: "Proposed Metro Rail extension from University Station through Amherst toward UB North Campus.",
    sourceUrl: "https://www.nftametrotransitexpansion.com/",
    coordinates: [[-78.8311, 42.9547], [-78.8000, 42.9808], [-78.7900, 43.0008]],
  },
  {
    id: "hblr-northern-branch",
    name: "Hudson-Bergen Light Rail Northern Branch",
    type: "Light rail",
    status: "Project development",
    sponsor: "NJ Transit",
    states: "New Jersey",
    summary: "Planned HBLR extension north from North Bergen toward Englewood.",
    sourceUrl: "https://www.njtransit.com/hblr-northern-branch",
    coordinates: [[-74.0324, 40.8061], [-73.9980, 40.8415], [-73.9726, 40.8929]],
  },
  {
    id: "glassboro-camden-line",
    name: "Glassboro-Camden Line",
    type: "Light rail",
    status: "Project development",
    sponsor: "DRPA / PATCO / South Jersey partners",
    states: "New Jersey",
    summary: "Proposed light rail service between Camden and Glassboro in South Jersey.",
    sourceUrl: "https://glassborocamdenline.com/",
    coordinates: [[-75.1196, 39.9259], [-75.1563, 39.8382], [-75.1457, 39.7029]],
  },
  {
    id: "baltimore-red-line",
    name: "Baltimore Red Line",
    type: "Light rail",
    status: "Revived project development",
    sponsor: "MDOT MTA",
    states: "Maryland",
    summary: "East-west transit corridor planned as light rail from west Baltimore through downtown toward Bayview.",
    sourceUrl: "https://redlinemaryland.com/",
    coordinates: [[-76.7114, 39.2873], [-76.6170, 39.2904], [-76.5661, 39.2901], [-76.5440, 39.2927]],
  },
  {
    id: "atlanta-beltline-rail",
    name: "Atlanta BeltLine Light Rail",
    type: "Streetcar / light rail",
    status: "Phased corridor planning",
    sponsor: "Atlanta BeltLine / MARTA",
    states: "Georgia",
    summary: "Planned streetcar/light rail segments along the Atlanta BeltLine corridor.",
    sourceUrl: "https://beltline.org/the-project/transit/",
    coordinates: [[-84.3897, 33.7710], [-84.3610, 33.7605], [-84.3490, 33.7400], [-84.3860, 33.7246], [-84.4178, 33.7487]],
  },
  {
    id: "marta-clifton-corridor",
    name: "MARTA Clifton Corridor",
    type: "Light rail / high-capacity transit",
    status: "Planning",
    sponsor: "MARTA",
    states: "Georgia",
    summary: "High-capacity corridor from Lindbergh/Atlanta region toward Emory and the CDC/Clifton area.",
    sourceUrl: "https://www.itsmarta.com/clifton-corr.aspx",
    coordinates: [[-84.3697, 33.8230], [-84.3380, 33.8007], [-84.3224, 33.7980]],
  },
  {
    id: "sunrail-sunshine-corridor",
    name: "SunRail Sunshine Corridor",
    type: "Commuter rail",
    status: "Project development",
    sponsor: "FDOT / Central Florida partners",
    states: "Florida",
    summary: "Proposed SunRail extension corridor toward Orlando International Airport, Convention Center, and Disney area connections.",
    sourceUrl: "https://corporate.sunrail.com/agency-information/sunshine-corridor/",
    coordinates: [[-81.3792, 28.5383], [-81.3081, 28.4312], [-81.3795, 28.4270], [-81.5639, 28.3852]],
  },
  {
    id: "miami-northeast-corridor",
    name: "Northeast Corridor Commuter Rail",
    type: "Commuter rail",
    status: "Project development",
    sponsor: "Miami-Dade County / FDOT / Brightline corridor partners",
    states: "Florida",
    summary: "Proposed commuter rail service along the FEC/Brightline corridor between downtown Miami and Aventura.",
    sourceUrl: "https://www.miamidade.gov/global/transportation/smart-plan-northeast-corridor.page",
    coordinates: [[-80.1918, 25.7617], [-80.1937, 25.8478], [-80.1856, 25.9305], [-80.1434, 25.9565]],
  },
  {
    id: "tampa-streetcar-extension",
    name: "Tampa Streetcar Extension",
    type: "Streetcar / light rail",
    status: "Project development",
    sponsor: "HART / City of Tampa",
    states: "Florida",
    summary: "Modern streetcar extension and modernization from downtown Tampa toward Tampa Heights.",
    sourceUrl: "https://www.tecolinestreetcar.org/extension-modernization/",
    coordinates: [[-82.4572, 27.9475], [-82.4616, 27.9589], [-82.4630, 27.9694]],
  },
  {
    id: "charlotte-silver-line",
    name: "Charlotte Silver Line",
    type: "Light rail",
    status: "Planning / corridor preservation",
    sponsor: "Charlotte Area Transit System",
    states: "North Carolina",
    summary: "Planned east-west light rail corridor from Matthews through Uptown Charlotte toward the airport and Belmont.",
    sourceUrl: "https://www.charlottenc.gov/CATS/Transit-Planning/Silver-Line",
    coordinates: [[-80.7214, 35.1168], [-80.8431, 35.2271], [-80.9431, 35.2140], [-81.0401, 35.2429]],
  },
  {
    id: "triangle-commuter-rail",
    name: "Triangle Commuter Rail",
    type: "Commuter rail",
    status: "Regional planning / paused study",
    sponsor: "GoTriangle / regional partners",
    states: "North Carolina",
    summary: "Regional commuter rail concept linking Durham, RTP, Raleigh, and Garner/Clayton corridor communities.",
    sourceUrl: "https://gotriangle.org/commuterrail/",
    coordinates: [[-78.8986, 35.9940], [-78.8636, 35.9035], [-78.6382, 35.7796], [-78.6142, 35.7113]],
  },
  {
    id: "ontario-line",
    name: "Ontario Line",
    type: "Metro rail",
    status: "Under construction",
    sponsor: "Metrolinx / Ontario",
    states: "Ontario",
    summary: "New automated metro line crossing Toronto from Exhibition/Ontario Place through downtown to the Ontario Science Centre corridor.",
    sourceUrl: "https://www.metrolinx.com/en/projects-and-programs/ontario-line",
    coordinates: [[-79.4134, 43.6327], [-79.3832, 43.6532], [-79.3470, 43.6650], [-79.3402, 43.7164]],
  },
  {
    id: "eglinton-crosstown-west",
    name: "Eglinton Crosstown West Extension",
    type: "Light rail / metro-style LRT",
    status: "Under construction",
    sponsor: "Metrolinx / Ontario",
    states: "Ontario",
    summary: "Extension of Line 5 Eglinton west from Mount Dennis toward Mississauga and Pearson Airport.",
    sourceUrl: "https://www.metrolinx.com/en/projects-and-programs/eglinton-crosstown-west-extension",
    coordinates: [[-79.4890, 43.6894], [-79.5782, 43.6700], [-79.6306, 43.6777]],
  },
  {
    id: "hurontario-lrt",
    name: "Hazel McCallion Line",
    type: "Light rail",
    status: "Under construction",
    sponsor: "Metrolinx / Peel Region",
    states: "Ontario",
    summary: "Hurontario LRT corridor through Mississauga and Brampton.",
    sourceUrl: "https://www.metrolinx.com/en/projects-and-programs/hazel-mccallion-line",
    coordinates: [[-79.6306, 43.6777], [-79.6441, 43.5890], [-79.5869, 43.5365]],
  },
  {
    id: "calgary-green-line",
    name: "Calgary Green Line",
    type: "Light rail",
    status: "Program reset / funded planning",
    sponsor: "City of Calgary / Alberta / Canada",
    states: "Alberta",
    summary: "North-south CTrain Green Line program through Calgary.",
    sourceUrl: "https://www.calgary.ca/green-line.html",
    coordinates: [[-114.0719, 51.0447], [-114.0628, 51.0305], [-114.0500, 50.9901]],
  },
  {
    id: "edmonton-valley-line-west",
    name: "Edmonton Valley Line West",
    type: "Light rail",
    status: "Under construction",
    sponsor: "City of Edmonton",
    states: "Alberta",
    summary: "Valley Line LRT extension from downtown Edmonton west to Lewis Farms.",
    sourceUrl: "https://www.edmonton.ca/projects_plans/transit/valley-line-west",
    coordinates: [[-113.4938, 53.5461], [-113.5303, 53.5352], [-113.6041, 53.5180]],
  },
];

const sightingStates = [...usStates, "District of Columbia", "Ontario", "Quebec", "British Columbia", "Alberta"];
const HERITAGE_SIGHTING_TTL_MS = 45 * 60 * 1000;

const sightingCitiesByState = {
  Alabama: ["Birmingham", "Huntsville", "Mobile", "Montgomery", "Tuscaloosa"],
  Alaska: ["Anchorage", "Fairbanks", "Juneau"],
  Arizona: ["Flagstaff", "Phoenix", "Tempe", "Tucson", "Yuma"],
  Arkansas: ["Fayetteville", "Fort Smith", "Little Rock", "Texarkana"],
  California: ["Bakersfield", "Emeryville", "Fresno", "Los Angeles", "Oakland", "Sacramento", "San Diego", "San Francisco", "San Jose", "Stockton"],
  Colorado: ["Denver", "Fort Collins", "Grand Junction", "Pueblo"],
  Connecticut: ["Bridgeport", "Hartford", "New Haven", "Stamford"],
  Delaware: ["Dover", "Newark", "Wilmington"],
  "District of Columbia": ["Washington"],
  Florida: ["Fort Lauderdale", "Jacksonville", "Miami", "Orlando", "Tampa", "West Palm Beach"],
  Georgia: ["Atlanta", "Augusta", "Macon", "Savannah"],
  Hawaii: ["Honolulu"],
  Idaho: ["Boise", "Nampa", "Pocatello"],
  Illinois: ["Bloomington", "Carbondale", "Champaign", "Chicago", "Joliet", "Naperville", "Peoria", "Springfield"],
  Indiana: ["Evansville", "Fort Wayne", "Gary", "Indianapolis", "South Bend"],
  Iowa: ["Cedar Rapids", "Council Bluffs", "Des Moines", "Dubuque"],
  Kansas: ["Hutchinson", "Kansas City", "Lawrence", "Topeka", "Wichita"],
  Kentucky: ["Lexington", "Louisville"],
  Louisiana: ["Baton Rouge", "Lafayette", "New Orleans", "Shreveport"],
  Maine: ["Bangor", "Brunswick", "Portland"],
  Maryland: ["Baltimore", "Frederick", "Rockville"],
  Massachusetts: ["Boston", "Framingham", "Springfield", "Worcester"],
  Michigan: ["Ann Arbor", "Detroit", "Flint", "Grand Rapids", "Kalamazoo", "Lansing"],
  Minnesota: ["Duluth", "Minneapolis", "Saint Paul"],
  Mississippi: ["Biloxi", "Gulfport", "Hattiesburg", "Jackson"],
  Missouri: ["Jefferson City", "Kansas City", "Saint Louis", "Springfield"],
  Montana: ["Billings", "Bozeman", "Butte", "Havre", "Whitefish"],
  Nebraska: ["Grand Island", "Lincoln", "Omaha"],
  Nevada: ["Elko", "Las Vegas", "Reno"],
  "New Hampshire": ["Concord", "Dover", "Manchester", "Nashua"],
  "New Jersey": ["Hoboken", "Newark", "New Brunswick", "Trenton"],
  "New Mexico": ["Albuquerque", "Las Cruces", "Santa Fe"],
  "New York": ["Albany", "Buffalo", "New York", "Rochester", "Syracuse", "Utica"],
  "North Carolina": ["Charlotte", "Durham", "Greensboro", "Raleigh"],
  "North Dakota": ["Bismarck", "Fargo", "Grand Forks", "Minot"],
  Ohio: ["Akron", "Cincinnati", "Cleveland", "Columbus", "Dayton", "Toledo"],
  Oklahoma: ["Norman", "Oklahoma City", "Tulsa"],
  Oregon: ["Eugene", "Portland", "Salem"],
  Pennsylvania: ["Erie", "Harrisburg", "Philadelphia", "Pittsburgh", "Scranton"],
  "Rhode Island": ["Newport", "Providence", "Warwick"],
  "South Carolina": ["Charleston", "Columbia", "Greenville"],
  "South Dakota": ["Rapid City", "Sioux Falls"],
  Tennessee: ["Chattanooga", "Knoxville", "Memphis", "Nashville"],
  Texas: ["Amarillo", "Austin", "Dallas", "El Paso", "Fort Worth", "Houston", "San Antonio"],
  Utah: ["Ogden", "Provo", "Salt Lake City"],
  Vermont: ["Burlington", "Essex Junction", "Montpelier", "Saint Albans"],
  Virginia: ["Alexandria", "Charlottesville", "Lynchburg", "Norfolk", "Richmond", "Roanoke"],
  Washington: ["Everett", "Seattle", "Spokane", "Tacoma", "Vancouver"],
  "West Virginia": ["Charleston", "Harpers Ferry", "Huntington", "Martinsburg"],
  Wisconsin: ["Green Bay", "La Crosse", "Madison", "Milwaukee"],
  Wyoming: ["Casper", "Cheyenne", "Laramie"],
  Ontario: ["Toronto", "Ottawa", "London", "Kingston", "Windsor"],
  Quebec: ["Montreal", "Quebec City", "Trois-Rivieres"],
  "British Columbia": ["Vancouver", "Kamloops", "Prince George"],
  Alberta: ["Calgary", "Edmonton", "Red Deer"],
};

// ──────────────────────────────────────────────────────────────────────────────
// 1. UI/UX HIERARCHY - Sidebar State Management
// ──────────────────────────────────────────────────────────────────────────────
const SidebarState = {
  LEFT: "left",
  RIGHT: "right",
  BOTTOM: "bottom",
};

const SIDEBAR_DOCK_KEY = "ort-sidebar-dock-v1";

class SidebarManager {
  constructor() {
    this.state = {
      isSidebarOpen: true,
      isMobile: false,
      sidebarWidth: 360,
      dock: SidebarState.LEFT,
    };
    this.longPressTimer = null;
    this.gesture = {
      active: false,
      startedAt: 0,
      startX: 0,
      startY: 0,
      target: null,
      fromEdge: false,
      fromSidebar: false,
    };
    this.elements = {
      sidebar: document.getElementById("sidebar"),
      app: document.querySelector(".app"),
      toggleList: document.getElementById("toggle-list"),
      floatingList: document.getElementById("floating-list"),
    };
    this.init();
  }

  init() {
    this.checkViewport();
    window.addEventListener("resize", () => this.checkViewport());
    this.bindEvents();
    this.updateUI();
  }

  loadDockPreference() {
    return SidebarState.LEFT;
  }

  saveDockPreference() {
    return;
  }

  checkViewport() {
    const wasMobile = this.state.isMobile;
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;

    this.state.isMobile = isMobile;
    this.state.sidebarWidth = isMobile
      ? Math.min(Math.round(window.innerWidth * 0.84), 348)
      : isTablet
        ? 340
        : Math.max(360, Math.min(460, Math.round(window.innerWidth * 0.22)));
    if (isMobile) {
      this.state.dock = SidebarState.LEFT;
    } else if (wasMobile) {
      this.state.dock = SidebarState.LEFT;
    }
    this.updateUI();
  }

  bindEvents() {
    if (this.elements.toggleList) {
      this.elements.toggleList.addEventListener("click", () => {
        this.toggleSidebar();
      });
    }

    document.addEventListener("pointerdown", (event) => {
      if (!this.state.isMobile || !this.state.isSidebarOpen) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("#sidebar")) return;
      if (target.closest("#toggle-list")) return;
      if (target.closest(".map-actions")) return;
      if (target.closest("#account-sidebar")) return;
      if (target.closest("#account-toggle")) return;
      this.closeSidebar();
    }, { passive: true });

    this.bindMobileDrawerGestures();
  }

  bindMobileDrawerGestures() {
    const resetGesture = () => {
      this.gesture.active = false;
      this.gesture.startedAt = 0;
      this.gesture.startX = 0;
      this.gesture.startY = 0;
      this.gesture.target = null;
      this.gesture.fromEdge = false;
      this.gesture.fromSidebar = false;
    };

    const shouldIgnoreTarget = (target) => {
      if (!(target instanceof Element)) return false;
      if (target.closest(".detail-modal.active")) return true;
      if (target.closest(".railcam-floating-window")) return true;
      if (target.closest("input, textarea, select, button, a, [contenteditable='true']")) return true;
      return false;
    };

    document.addEventListener("touchstart", (event) => {
      if (!this.state.isMobile || event.touches.length !== 1) {
        resetGesture();
        return;
      }
      const touch = event.touches[0];
      const target = event.target;
      const edgeInset = IS_IOS_SAFARI ? 24 : 10;
      const edgeWidth = IS_IOS_SAFARI ? 20 : 28;
      const startX = touch.clientX;
      const startY = touch.clientY;
      const fromEdge = !this.state.isSidebarOpen && startX >= edgeInset && startX <= edgeInset + edgeWidth;
      const fromSidebar = this.state.isSidebarOpen
        && this.elements.sidebar
        && target instanceof Node
        && this.elements.sidebar.contains(target);

      if (!fromEdge && !fromSidebar) {
        resetGesture();
        return;
      }
      if (shouldIgnoreTarget(target)) {
        resetGesture();
        return;
      }

      this.gesture.active = true;
      this.gesture.startedAt = Date.now();
      this.gesture.startX = startX;
      this.gesture.startY = startY;
      this.gesture.target = target;
      this.gesture.fromEdge = fromEdge;
      this.gesture.fromSidebar = Boolean(fromSidebar);

      // iOS Safari: suppress native left-edge history swipe when opening drawer.
      if (fromEdge && event.cancelable) {
        event.preventDefault();
      }
    }, { passive: false });

    document.addEventListener("touchmove", (event) => {
      if (!this.gesture.active || event.touches.length !== 1) {
        return;
      }
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.gesture.startX;
      const deltaY = touch.clientY - this.gesture.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if ((this.gesture.fromEdge || this.gesture.fromSidebar) && absX > absY + 6 && event.cancelable) {
        event.preventDefault();
      }
    }, { passive: false });

    document.addEventListener("touchend", (event) => {
      if (!this.gesture.active || event.changedTouches.length !== 1) {
        resetGesture();
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - this.gesture.startX;
      const deltaY = touch.clientY - this.gesture.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const duration = Date.now() - this.gesture.startedAt;
      const horizontalIntent = absX >= 54 && absX > absY * 1.4 && duration < 450;

      if (horizontalIntent) {
        if (this.gesture.fromEdge && deltaX > 0) {
          this.openSidebar();
        } else if (this.gesture.fromSidebar && (deltaX > 0 || deltaX < -54)) {
          this.closeSidebar();
        }
      }

      resetGesture();
    }, { passive: true });

    document.addEventListener("touchcancel", () => {
      resetGesture();
    }, { passive: true });
  }

  clearLongPress() {
    if (this.longPressTimer) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  cycleDock() {
    return;
  }

  toggleSidebar() {
    this.state.isSidebarOpen = !this.state.isSidebarOpen;
    this.updateUI();
  }

  openSidebar() {
    this.state.isSidebarOpen = true;
    this.updateUI();
    if (state.needsTrainsRender && !state.isRendering) {
      state.needsTrainsRender = false;
      renderTrains(applyFilters(getAllTrains()));
    }
  }

  closeSidebar() {
    this.state.isSidebarOpen = false;
    this.updateUI();
  }

  updateUI() {
    if (!this.elements.floatingList || !this.elements.sidebar) return;

    this.elements.floatingList.classList.toggle("open", this.state.isSidebarOpen);
    this.elements.sidebar.classList.toggle("sidebar-collapsed", !this.state.isSidebarOpen);
    this.elements.sidebar.dataset.dock = this.state.dock;
    this.elements.sidebar.style.setProperty("--sidebar-current-width", `${this.state.sidebarWidth}px`);

    const root = document.documentElement;
    const sidebarWidth = Math.min(this.state.sidebarWidth, Math.max(240, window.innerWidth - 8), 460);
    const panelGap = this.state.isMobile ? 4 : 0;
    const baseGap = this.state.isMobile ? 4 : 0;
    const edgeOffset = this.state.isSidebarOpen ? sidebarWidth + baseGap + panelGap : baseGap;
    const mapActionsLeft = this.state.isSidebarOpen
      ? Math.max(sidebarWidth + (this.state.isMobile ? 18 : 10), 42)
      : (this.state.isMobile ? 12 : 18);
    const drawerLeft = this.state.isSidebarOpen
      ? Math.max(sidebarWidth + (this.state.isMobile ? 10 : 8), 16)
      : mapActionsLeft;

    root.style.setProperty("--panel-gap", `${panelGap}px`);
    root.style.setProperty("--topbar-height", `${this.state.isMobile ? 60 : 68}px`);
    root.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
    root.style.setProperty("--drawer-handle-left", `${drawerLeft}px`);
    root.style.setProperty("--account-drawer-width", `${this.state.isMobile ? Math.min(Math.round(window.innerWidth * 0.88), 360) : Math.max(300, Math.min(420, Math.round(window.innerWidth * 0.2)))}px`);
    root.style.setProperty("--map-actions-top", `${this.state.isMobile ? 118 : 126}px`);
    root.style.setProperty("--map-actions-bottom", "auto");
    root.style.setProperty("--map-actions-left", `${mapActionsLeft}px`);
    root.style.setProperty("--map-actions-right", "auto");
    root.style.setProperty("--contrib-left", `${baseGap}px`);
    root.style.setProperty("--contrib-right", "auto");
    root.style.setProperty("--contrib-bottom", `${baseGap}px`);

    if (this.state.dock === SidebarState.LEFT) {
      root.style.setProperty("--map-actions-left", `${Math.min(mapActionsLeft, window.innerWidth - 56)}px`);
      root.style.setProperty("--contrib-left", `${edgeOffset}px`);
    } else if (this.state.dock === SidebarState.RIGHT) {
      root.style.setProperty("--map-actions-left", "auto");
      root.style.setProperty("--map-actions-right", `${edgeOffset}px`);
      root.style.setProperty("--contrib-left", "auto");
      root.style.setProperty("--contrib-right", `${edgeOffset}px`);
    }

    // Update toggle button state
    if (this.elements.toggleList) {
      this.elements.toggleList.setAttribute("aria-expanded", String(this.state.isSidebarOpen));
      this.elements.toggleList.setAttribute("aria-label", this.state.isSidebarOpen ? "Hide operations sidebar" : "Show operations sidebar");
      this.elements.toggleList.title = this.state.isSidebarOpen ? "Hide operations sidebar" : "Show operations sidebar";
      this.elements.toggleList.innerHTML = `<span id="toggle-list-icon" class="drawer-toggle-icon">${this.state.isSidebarOpen ? "&lt;" : "&gt;"}</span>`;
    }
  }
}

class AccountSidebarManager {
  constructor() {
    this.isOpen = false;
    this.elements = {
      sidebar: document.getElementById("account-sidebar"),
      toggle: document.getElementById("account-toggle"),
      close: document.getElementById("close-account-sidebar"),
    };
    this.bindEvents();
    this.updateUI();
  }

  bindEvents() {
    this.elements.toggle?.addEventListener("click", () => this.toggle());
    this.elements.close?.addEventListener("click", () => this.close());
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.updateUI();
  }

  close() {
    this.isOpen = false;
    this.updateUI();
  }

  updateUI() {
    const { sidebar, toggle } = this.elements;
    if (!sidebar || !toggle) return;
    sidebar.classList.toggle("account-sidebar-open", this.isOpen);
    sidebar.setAttribute("aria-hidden", String(!this.isOpen));
    toggle.setAttribute("aria-expanded", String(this.isOpen));
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 2. PRIVACY & POSTING LOGIC - Geocoding Service
// ──────────────────────────────────────────────────────────────────────────────
class GeocodingService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 300000; // 5 minutes
  }

  async geocodeLocation(locationText) {
    if (!locationText || locationText.trim() === "") {
      return null;
    }

    // Check cache first
    const cacheKey = locationText.toLowerCase().trim();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // Use Nominatim OpenStreetMap API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&limit=1`,
        { headers: { "User-Agent": "OpenRailTracker/1.0" } }
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          displayName: data[0].display_name,
          type: data[0].type,
        };

        // Cache the result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        return result;
      }

      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 3. CROSSING & FREIGHT LOGIC - False Trigger Prevention
// ──────────────────────────────────────────────────────────────────────────────
// CrossingAlertManager removed

// ──────────────────────────────────────────────────────────────────────────────
// 4. MARKER & INTERACTION LOGIC - Directional Markers with Click-to-Popup
// ──────────────────────────────────────────────────────────────────────────────
class TrainMarkerManager {
  constructor(map, state) {
    this.map = map;
    this.state = state;
    this.markers = new Map();
    this.selectedTrain = null;
    this.popup = null;
  }

  // Create directional train marker with arrow
  createDirectionalMarker(train, coords) {
    const key = `${train.source}:${train.id}`;
    const heading = this.getHeadingDegrees(train.heading);

    // Create marker element
    const element = document.createElement("div");
    element.className = "train-directional-marker";
    element.innerHTML = `
      <div class="marker-circle">
        <div class="marker-arrow" style="transform: rotate(${heading}deg)"></div>
      </div>
    `;

    // Create MapLibre marker
    const marker = new maplibregl.Marker({
      element,
      anchor: "center",
    }).setLngLat([coords.lon, coords.lat]);

    // Click handler - opens popup instead of hover
    element.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openTrainPopup(train, [coords.lon, coords.lat]);
    });

    // Hover effects
    element.addEventListener("mouseenter", () => {
      element.style.transform = "scale(1.2)";
      element.style.zIndex = "100";
    });

    element.addEventListener("mouseleave", () => {
      element.style.transform = "scale(1)";
      element.style.zIndex = "";
    });

    return { marker, element, train };
  }

  // Get heading in degrees from compass or numeric
  getHeadingDegrees(heading) {
    if (heading == null || heading === "") return 0;
    if (typeof heading === "number" && !Number.isNaN(heading)) {
      return heading % 360;
    }

    const map = {
      N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
      E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
      S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
      W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
    };

    const str = `${heading}`.trim().toUpperCase();
    if (str in map) return map[str];
    const num = parseFloat(str);
    return Number.isNaN(num) ? 0 : num % 360;
  }

  // Open popup with train details
  openTrainPopup(train, lngLat) {
    openTrainPopup(train, lngLat);
  }

  // Format marker label
  formatMarkerLabel(train) {
    const sources = {
      amtrak: { prefix: "A" },
      brightline: { prefix: "B" },
      via: { prefix: "V" },
      metra: { prefix: "M" },
      mta: { prefix: "T" },
      mta_mnr: { prefix: "N" },
      njt: { prefix: "J" },
      septa: { prefix: "S" },
      mbta: { prefix: "B" },
      lirr: { prefix: "L" },
      bart: { prefix: "R" },
      marta: { prefix: "T" },
      dart: { prefix: "D" },
      metrolink: { prefix: "K" },
      caltrain: { prefix: "C" },
      rtd: { prefix: "R" },
      vta: { prefix: "V" },
      dcta: { prefix: "D" },
      muni: { prefix: "M" },
      sfstreetcar: { prefix: "S" },
      sounder: { prefix: "D" },
      sunrail: { prefix: "R" },
      trirail: { prefix: "T" },
      vre: { prefix: "V" },
      marc: { prefix: "A" },
      ace: { prefix: "A" },
      coaster: { prefix: "C" },
      sprinter: { prefix: "S" },
      smart: { prefix: "S" },
      frontrunner: { prefix: "F" },
      capmetro: { prefix: "C" },
      arkansasMissouri: { prefix: "A" },
      branson: { prefix: "B" },
    };

    const prefix = sources[train.source]?.prefix || "T";
    const candidates = [train.trainNum, train.id, train.name]
      .filter(Boolean)
      .map((value) => `${value}`);

    for (const candidate of candidates) {
      const digits = candidate.match(/\d+/g);
      if (digits && digits.length > 0) {
        return `${prefix}${digits.join("").slice(0, 4)}`;
      }
    }

    return `${prefix}000`;
  }

  // Format heading
  formatHeading(heading) {
    if (heading == null || heading === "") return "--";
    const degrees = this.getHeadingDegrees(heading);
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(((degrees % 360) / 45)) % 8;
    return `${directions[index]} (${Math.round(degrees)}°)`;
  }

  // Get delay status
  getDelayStatus(delayMinutes, status) {
    if (delayMinutes == null || Number.isNaN(delayMinutes)) {
      const normalized = (status || "").toLowerCase();
      if (normalized.includes("arriv")) return "Arrived";
      if (normalized.includes("live")) return "Live";
      if (normalized) {
        return normalized
          .split(/[^a-z0-9]+/i)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      }
      return "Unknown";
    }
    if (delayMinutes < 0) return `${Math.abs(delayMinutes)} min early`;
    if (delayMinutes <= 0) return "On time";
    return `+${delayMinutes} min late`;
  }

  // Get status color
  getStatusColor(status) {
    if (status.includes("early")) return "#4ade80";
    if (status.includes("On time")) return "#4ade80";
    if (status.includes("late")) return "#ef4444";
    if (status.includes("Arrived")) return "#64748b";
    if (status.includes("Live")) return "#facc15";
    return "#64748b";
  }

  // Render train images
  renderTrainImages(images) {
    if (!images || images.length === 0) return "";
    return `
      <div class="train-popup-images">
        ${images.slice(0, 3).map((img, i) => `
          <img src="${img.url}" alt="Train image" class="popup-image" style="order: ${i}" />
        `).join("")}
      </div>
    `;
  }

  // Close popup
  closePopup() {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
  }

  // Update marker position
  updateMarkerPosition(key, lngLat) {
    const entry = this.markers.get(key);
    if (entry && entry.marker) {
      entry.marker.setLngLat(lngLat);
    }
  }

  // Remove marker
  removeMarker(key) {
    const entry = this.markers.get(key);
    if (entry && entry.marker) {
      entry.marker.remove();
    }
    this.markers.delete(key);
  }

  // Clear all markers
  clearMarkers() {
    this.markers.forEach((entry) => {
      if (entry.marker) entry.marker.remove();
    });
    this.markers.clear();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 5. MEDIA MANAGEMENT - Image TTL Cleanup
// ──────────────────────────────────────────────────────────────────────────────
class MediaCleanupService {
  constructor() {
    this.cleanupInterval = null;
    this.cleanupFrequency = 60000; // Run every minute
    this.imageTTL = 45 * 60000; // 45 minutes in milliseconds
    this.enabled = true;
    this.loggedDisabledReason = false;
  }

  // Start the cleanup service
  startCleanup() {
    if (this.cleanupInterval || !this.enabled) return;

    const cleanupUrl = apiUrl("/api/media/cleanup");
    const cleanupOrigin = (() => {
      try {
        return new URL(cleanupUrl, window.location.href).origin;
      } catch {
        return "";
      }
    })();
    const currentOrigin = (() => {
      try {
        return window.location.origin;
      } catch {
        return "";
      }
    })();

    // Media cleanup is a maintenance operation and should be same-origin in-browser.
    // Skip cross-origin calls to avoid noisy CORS/preflight errors in production clients.
    if (cleanupOrigin && currentOrigin && cleanupOrigin !== currentOrigin) {
      this.enabled = false;
      if (!this.loggedDisabledReason) {
        this.loggedDisabledReason = true;
        console.info("Media cleanup disabled in browser due to cross-origin API endpoint.");
      }
      return;
    }

    // Run immediately on start
    this.cleanupImages();

    // Then run periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupImages();
    }, this.cleanupFrequency);
  }

  // Stop the cleanup service
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Cleanup old images
  async cleanupImages() {
    if (!this.enabled) return;

    try {
      const response = await fetch(apiUrl("/api/media/cleanup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttlMinutes: 45 }),
      });

      if (response.ok) {
        const result = await response.json();
        if (Number(result.deletedCount) > 0) {
          console.log(`Media cleanup: deleted ${result.deletedCount} old images`);
        }
      } else {
        // Disable repeated failing calls for auth/CORS/preflight style failures.
        if ([401, 403, 405].includes(Number(response.status))) {
          this.enabled = false;
          this.stopCleanup();
        }
      }
    } catch (error) {
      const message = `${error?.message || ""}`.toLowerCase();
      const isLikelyCorsOrNetwork = error instanceof TypeError
        || message.includes("failed to fetch")
        || message.includes("load failed")
        || message.includes("access control")
        || message.includes("cors");

      if (isLikelyCorsOrNetwork) {
        this.enabled = false;
        this.stopCleanup();
        if (!this.loggedDisabledReason) {
          this.loggedDisabledReason = true;
          console.info("Media cleanup disabled for this session (network/CORS restrictions).");
        }
        return;
      }

      console.error("Media cleanup error:", error);
    }
  }

  // Cleanup specific image by ID
  async deleteImage(imageId) {
    try {
      const response = await fetch(apiUrl(`/api/media/${imageId}`), {
        method: "DELETE",
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to delete image:", error);
      return false;
    }
  }

  // Get image age in minutes
  getImageAgeMinutes(createdAt) {
    const createdAtDate = new Date(createdAt);
    const now = new Date();
    const diffMs = now - createdAtDate;
    return Math.floor(diffMs / 60000); // Convert to minutes
  }

  // Check if image is expired
  isImageExpired(createdAt) {
    const ageMinutes = this.getImageAgeMinutes(createdAt);
    return ageMinutes > 45;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GLOBAL INSTANTIATION
// ──────────────────────────────────────────────────────────────────────────────
let sidebarManager;
let accountSidebarManager;
let geocodingService;
let trainMarkerManager;
let mediaCleanupService;

// Initialize services when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (typeof document !== "undefined") {
    document.body?.classList.toggle("safari-browser", IS_SAFARI_BROWSER);
    document.body?.classList.toggle("safari-sidebar-stable", IS_SAFARI_BROWSER);
    document.body?.setAttribute("data-browser-engine", IS_SAFARI_BROWSER ? "safari" : "other");
  }

  const normalizeButtonTypes = (rootNode) => {
    if (!rootNode || typeof rootNode.querySelectorAll !== "function") return;
    rootNode.querySelectorAll("button:not([type])").forEach((button) => {
      button.setAttribute("type", "button");
    });
    if (rootNode instanceof HTMLButtonElement && !rootNode.hasAttribute("type")) {
      rootNode.setAttribute("type", "button");
    }
  };

  normalizeButtonTypes(document);

  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          normalizeButtonTypes(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  sidebarManager = new SidebarManager();
  accountSidebarManager = new AccountSidebarManager();
  geocodingService = new GeocodingService();
  mediaCleanupService = new MediaCleanupService();
  mediaCleanupService.startCleanup();
  state.locationEnabled = localStorage.getItem(LOCATION_TOGGLE_KEY) === "true";
  updateLocationToggleUi();
  if (state.locationEnabled) {
    locateMe().catch(() => null);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// EXISTING CODE - APP CONTINUES BELOW
// ──────────────────────────────────────────────────────────────────────────────

const elements = {
  list: document.getElementById("train-list"),
  sidebarTrainDetailWrap: document.getElementById("sidebar-train-detail-wrap"),
  sidebarTrainDetail: document.getElementById("sidebar-train-detail"),
  closeSidebarTrainDetail: document.getElementById("close-sidebar-train-detail"),
  board: document.getElementById("station-board"),
  trainDetail: document.getElementById("train-detail"),
  floatingSearch: document.querySelector(".floating-search"),
  lastUpdated: document.getElementById("last-updated"),
  mapVersionPill: document.getElementById("map-version-pill"),
  tooltip: document.getElementById("train-tooltip"),
  search: document.getElementById("search"),
  source: document.getElementById("source"),
  status: document.getElementById("status"),
  refresh: document.getElementById("refresh"),
  toggleSearch: document.getElementById("toggle-search"),
  toggleStations: document.getElementById("toggle-stations"),
  toggleTheme: document.getElementById("toggle-theme"),
  toggleHeritage: document.getElementById("toggle-heritage"),
  toggleSpecialInterest: document.getElementById("toggle-special-interest"),
  btnUploadFind: document.getElementById("btn-upload-find"),
  btnUploadFindTop: document.getElementById("btn-upload-find-top"),
  bottomNavLive: document.getElementById("bottom-nav-live"),
  bottomNavAlerts: document.getElementById("bottom-nav-alerts"),
  bottomNavSettings: document.getElementById("bottom-nav-settings"),
  mobileAlertsScreen: document.getElementById("mobile-alerts-screen"),
  mobileSettingsScreen: document.getElementById("mobile-settings-screen"),
  mobileOpenServiceNotices: document.getElementById("mobile-open-service-notices"),
  mobileOpenSettingsModal: document.getElementById("mobile-open-settings-modal"),
  mobileOpenToolHelp: document.getElementById("mobile-open-tool-help"),
  openBooking: document.getElementById("open-booking"),
  openSchedules: document.getElementById("open-schedules"),
  toggleSaved: document.getElementById("toggle-saved"),
  toggleMaintenance: document.getElementById("toggle-maintenance"),
  openServiceNotices: document.getElementById("open-service-notices"),
  toggleFutureConnections: document.getElementById("toggle-future-connections"),
  toggleFilters: document.getElementById("toggle-filters"),
  filterPanel: document.getElementById("filter-panel"),
  floatingList: document.getElementById("floating-list"),
  toggleList: document.getElementById("toggle-list"),
  toggleListIcon: document.getElementById("toggle-list-icon"),
  quickLookBoard: document.getElementById("quick-look-board"),
  accountToggle: document.getElementById("account-toggle"),
  accountSidebar: document.getElementById("account-sidebar"),
  closeAccountSidebar: document.getElementById("close-account-sidebar"),
  detailModal: document.getElementById("detail-modal"),
  closeModal: document.getElementById("close-modal"),
  clusterModal: document.getElementById("cluster-modal"),
  closeClusterModal: document.getElementById("close-cluster-modal"),
  clusterTabTrains: document.getElementById("cluster-tab-trains"),
  clusterTabStations: document.getElementById("cluster-tab-stations"),
  clusterPaneTrains: document.getElementById("cluster-pane-trains"),
  clusterPaneStations: document.getElementById("cluster-pane-stations"),
  serviceAlertModal: document.getElementById("service-alert-modal"),
  closeServiceAlertModal: document.getElementById("close-service-alert-modal"),
  serviceAlertPanel: document.getElementById("service-alert-panel"),
  bookingModal: document.getElementById("booking-modal"),
  closeBookingModal: document.getElementById("close-booking-modal"),
  bookingPanel: document.getElementById("booking-panel"),
  maintenanceModal: document.getElementById("maintenance-modal"),
  closeMaintenanceModal: document.getElementById("close-maintenance-modal"),
  maintenancePanel: document.getElementById("maintenance-panel"),
  serviceNoticesModal: document.getElementById("service-notices-modal"),
  closeServiceNoticesModal: document.getElementById("close-service-notices-modal"),
  serviceNoticesPanel: document.getElementById("service-notices-panel"),
  railcamModal: document.getElementById("railcam-modal"),
  closeRailcamModal: document.getElementById("close-railcam-modal"),
  railcamNowPlaying: document.getElementById("railcam-now-playing"),
  railcamPlayer: document.getElementById("railcam-player"),
  railcamMeta: document.getElementById("railcam-meta"),
  railcamWindowHost: document.getElementById("railcam-window-host"),
  railcamBetaModal: document.getElementById("railcam-beta-modal"),
  closeRailcamBetaModal: document.getElementById("close-railcam-beta-modal"),
  railcamBetaGotIt: document.getElementById("railcam-beta-got-it"),
  railcamList: document.getElementById("railcam-list"),
  railcamSearch: document.getElementById("railcam-search"),
  railcamState: document.getElementById("railcam-state"),
  toggleRailcams: document.getElementById("toggle-railcams"),
  desktopWelcomeModal: document.getElementById("desktop-welcome-modal"),
  closeDesktopWelcomeModal: document.getElementById("close-desktop-welcome-modal"),
  desktopWelcomeCta: document.getElementById("desktop-welcome-cta"),
  historyToolbar: document.getElementById("history-toolbar"),
  historyPlaybackToggle: document.getElementById("history-playback-toggle"),
  historyPlaybackLive: document.getElementById("history-playback-live"),
  historyPlaybackScrubber: document.getElementById("history-playback-scrubber"),
  historyPlaybackLabel: document.getElementById("history-playback-label"),
  toggleSettings: document.getElementById("toggle-settings"),
  openToolHelpModal: document.getElementById("open-tool-help-modal"),
  toolHelpModal: document.getElementById("tool-help-modal"),
  closeToolHelpModal: document.getElementById("close-tool-help-modal"),
  toggleDepartureBoard: document.getElementById("toggle-departure-board"),
  departureBoardModal: document.getElementById("departure-board-modal"),
  closeDepartureBoardModal: document.getElementById("close-departure-board-modal"),
  departureBoardRows: document.getElementById("departure-board-rows"),
  departureBoardSource: document.getElementById("departure-board-source"),
  quickLive: document.getElementById("quick-live"),
  quickDelay: document.getElementById("quick-delay"),
  quickReset: document.getElementById("quick-reset"),

  contribLinks: document.getElementById("contrib-links"),
  openGalleryModal: document.getElementById("open-gallery-modal"),
  openDownloadModal: document.getElementById("open-download-modal"),
  galleryModal: document.getElementById("gallery-modal"),
  closeGalleryModal: document.getElementById("close-gallery-modal"),
  backGallery: document.getElementById("back-gallery"),
  galleryUploadToggle: document.getElementById("gallery-upload-toggle"),
  galleryUploadClose: document.getElementById("gallery-upload-close"),
  gallerySearch: document.getElementById("gallery-search"),
  galleryRailroadFilter: document.getElementById("gallery-railroad-filter"),
  galleryGrid: document.getElementById("gallery-grid"),
  galleryUploadForm: document.getElementById("gallery-upload-form"),
  galleryUploaderName: document.getElementById("gallery-uploader-name"),
  galleryLocation: document.getElementById("gallery-location"),
  galleryDescription: document.getElementById("gallery-description"),
  galleryDescriptionCount: document.getElementById("gallery-description-count"),
  galleryPhoto: document.getElementById("gallery-photo"),
  galleryUploadStatus: document.getElementById("gallery-upload-status"),
  galleryPhotoDetail: document.getElementById("gallery-photo-detail"),
  downloadModal: document.getElementById("download-modal"),
  closeDownloadModal: document.getElementById("close-download-modal"),
  downloadMacIntel: document.getElementById("download-macos-intel"),
  downloadMacSilicon: document.getElementById("download-macos-silicon"),
  downloadWindows: document.getElementById("download-windows"),
  downloadLinuxAppImage: document.getElementById("download-linux-appimage"),
  downloadLinuxDeb: document.getElementById("download-linux-deb"),
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsModal: document.getElementById("close-settings-modal"),
  openAboutModal: document.getElementById("open-about-modal"),
  aboutModal: document.getElementById("about-modal"),
  closeAboutModal: document.getElementById("close-about-modal"),
  openPrivacyModal: document.getElementById("open-privacy-modal"),
  accountOpenPrivacy: document.getElementById("account-open-privacy"),
  privacyModal: document.getElementById("privacy-modal"),
  closePrivacyModal: document.getElementById("close-privacy-modal"),
  openCreditsModal: document.getElementById("open-credits-modal"),
  creditsModal: document.getElementById("credits-modal"),
  closeCreditsModal: document.getElementById("close-credits-modal"),
  creditsList: document.getElementById("credits-list"),
  saveSettings: document.getElementById("save-settings"),
  settingRefreshInterval: document.getElementById("setting-refresh-interval"),
  settingTrackingMode: document.getElementById("setting-tracking-mode"),
  settingPredictedMovement: document.getElementById("setting-predicted-movement"),
  settingIntervalRow: document.getElementById("setting-interval-row"),
  settingOpenListDefault: document.getElementById("setting-open-list-default"),
  settingSearchOpenDefault: document.getElementById("setting-search-open-default"),
  settingCompactCards: document.getElementById("setting-compact-cards"),
  settingSimpleInfo: document.getElementById("setting-simple-info"),
  settingMapStyle: document.getElementById("setting-map-style"),
  settingTimeZone: document.getElementById("setting-time-zone"),
  settingThemeMode: document.getElementById("setting-theme-mode"),
  settingSpeedLimitsVisible: document.getElementById("setting-speed-limits-visible"),
  settingSpeedDotsVisible: document.getElementById("setting-speed-dots-visible"),
  settingTrainHistoryVisible: document.getElementById("setting-train-history-visible"),
  settingMileMarkersVisible: document.getElementById("setting-mile-markers-visible"),
  settingRoutesVisible: document.getElementById("setting-routes-visible"),
  settingProposedLinesVisible: document.getElementById("setting-proposed-lines-visible"),
  settingFreightVisible: document.getElementById("setting-freight-visible"),
  settingRailcamsVisible: document.getElementById("setting-railcams-visible"),

  settingFreightOperatorHighlight: document.getElementById("setting-freight-operator-highlight"),
  settingStationsVisible: document.getElementById("setting-stations-visible"),
  settingHeritageVisible: document.getElementById("setting-heritage-visible"),
  settingSpecialInterestVisible: document.getElementById("setting-special-interest-visible"),
  settingMaintenanceVisible: document.getElementById("setting-maintenance-visible"),
  sightingModal: document.getElementById("sighting-modal"),
  closeSightingModal: document.getElementById("close-sighting-modal"),
  sightingModalTitle: document.getElementById("sighting-modal-title"),
  sightingTypeRow: document.getElementById("sighting-type-row"),
  sightingForm: document.getElementById("sighting-form"),
  sightingType: document.getElementById("sighting-type"),
  sightingUploaderName: document.getElementById("sighting-uploader-name"),
  sightingState: document.getElementById("sighting-state"),
  sightingCity: document.getElementById("sighting-city"),
  sightingTrain: document.getElementById("sighting-train"),
  sightingRailroad: document.getElementById("sighting-railroad"),
  sightingDirection: document.getElementById("sighting-direction"),
  sightingEstimatedSpeed: document.getElementById("sighting-estimated-speed"),
  sightingModel: document.getElementById("sighting-model"),
  sightingLocation: document.getElementById("sighting-location"),
  sightingNotes: document.getElementById("sighting-notes"),
  sightingMedia: document.getElementById("sighting-media"),
  sightingUseLocation: document.getElementById("sighting-use-location"),
  sightingTakePhoto: document.getElementById("sighting-take-photo"),
  sightingAnalyzePhoto: document.getElementById("sighting-analyze-photo"),
  sightingStatus: document.getElementById("sighting-status"),
  locoSpecsModal: document.getElementById("loco-specs-modal"),
  closeLocoSpecsModal: document.getElementById("close-loco-specs-modal"),
  locoSpecsTitle: document.getElementById("loco-specs-title"),
  locoSpecsSearch: document.getElementById("loco-specs-search"),
  locoSpecsList: document.getElementById("loco-specs-list"),
  btnLocate: document.getElementById("btn-locate"),
  btnFitTrains: document.getElementById("btn-fit-trains"),
  toggleLandmarks: document.getElementById("toggle-landmarks"),
  toggle3d: document.getElementById("toggle-3d"),
  toggleStyle: null, // map style toggle removed
  releaseModal: document.getElementById("release-modal"),
  closeReleaseModal: document.getElementById("close-release-modal"),
  releaseGotIt: document.getElementById("release-got-it"),
  releaseTitle: document.getElementById("release-title"),
  releaseUpdatedAt: document.getElementById("release-updated-at"),
  releaseSpotlight: document.getElementById("release-spotlight"),
  releaseChangeLog: document.getElementById("release-change-log"),
  initialLoader: document.getElementById("initial-loader"),
};

const USER_AGENT = typeof navigator !== "undefined" ? navigator.userAgent : "";
const NAVIGATOR_TOUCH_POINTS = typeof navigator !== "undefined" ? Number(navigator.maxTouchPoints || 0) : 0;
const IS_IPADOS_DESKTOP_UA = /Macintosh/.test(USER_AGENT) && NAVIGATOR_TOUCH_POINTS > 1;
const IS_IOS_DEVICE = /iP(hone|ad|od)/.test(USER_AGENT) || IS_IPADOS_DESKTOP_UA;
const IS_WEBKIT = /WebKit/i.test(USER_AGENT);
const IS_CHROMIUM_IOS = /(CriOS|EdgiOS|FxiOS|OPiOS)/i.test(USER_AGENT);
const IS_SAFARI_BROWSER = /Safari/i.test(USER_AGENT)
  && !/(Chrome|CriOS|Edg|EdgiOS|FxiOS|OPiOS|SamsungBrowser|DuckDuckGo|Brave)/i.test(USER_AGENT);
const IS_IOS_SAFARI = IS_IOS_DEVICE && IS_WEBKIT && !IS_CHROMIUM_IOS && IS_SAFARI_BROWSER;
const DEVICE_MEMORY_GB = typeof navigator !== "undefined" ? Number(navigator.deviceMemory) : NaN;
const CPU_CORES = typeof navigator !== "undefined" ? Number(navigator.hardwareConcurrency) : NaN;

function isLowTierDevice() {
  const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 900;
  if (IS_IOS_SAFARI && isMobileViewport) return true;
  const lowMem = Number.isFinite(DEVICE_MEMORY_GB) && DEVICE_MEMORY_GB > 0 && DEVICE_MEMORY_GB <= 4;
  const lowCpu = Number.isFinite(CPU_CORES) && CPU_CORES > 0 && CPU_CORES <= 4;
  return isMobileViewport && (lowMem || lowCpu);
}

const defaultUiSettings = {
  refreshSeconds: 180,
  trackingMode: "standard",
  predictedMovementVisible: false,
  openListDefault: true,
  searchOpenDefault: true,
  compactCards: false,
  simpleInfoMode: true,
  mapStyle: "overture",
  timeZone: "browser",
  themeMode: "dark",
  speedLimitsVisible: false,
  speedDotsVisible: false,
  trainHistoryVisible: false,
  mileMarkersVisible: false,
  routesVisible: true,
  proposedLinesVisible: false,
  freightVisible: false,
  openRailwayMapStyle: "standard",
  signalVisible: true,
  freightOperatorHighlight: "all",
  stationsVisible: true,
  heritageVisible: false,
  specialInterestVisible: false,
  maintenanceVisible: false,
  railcamsVisible: false,
  railcamVisionEnabled: false,
};

const UI_SETTINGS_KEY = "ort-ui-settings-v2";
const TIMEZONE_MIGRATION_KEY = "ort-timezone-migration-v1";
const TRAIN_HISTORY_KEY = "ort-train-position-history-v1";
const LOCATION_TOGGLE_KEY = "ort-location-enabled-v1";
const MAP_VIEW_KEY = "ort-map-view-v1";
const MANUAL_REFRESH_COOLDOWN_MS = 30_000;
const FREIGHT_COMMUNITY_REFRESH_MS = 5 * 60 * 1000;
const FEATURE_RAILCAMS_ENABLED = true;
const FEATURE_RAILCAM_VISION_ENABLED = false;
const FEATURE_TRAIN_MOVEMENT_ENABLED = true;
const FEATURE_OPENRAILWAYMAP_VECTOR_FREIGHT = true;
const OPENRAILWAYMAP_BASE_URL = "https://openrailwaymap.app";
const OPENRAILWAYMAP_STYLES = new Set(["standard", "speed", "train-protection", "electrification", "track", "operator"]);
const APP_VERSION = "1.0.0";
const APP_RELEASED_AT = "2026-05-21T23:55:00Z";
const RELEASE_MODAL_STORAGE_KEY = "ort-release-notes-v1-0-0";
const RAILCAM_BETA_MODAL_STORAGE_KEY = "ort-railcam-beta-modal-v1";
const DESKTOP_WELCOME_STORAGE_KEY = "ort-desktop-welcome-v1";
function getDesktopBuildLabel() {
  if (typeof window === "undefined" || !window.ORT_DESKTOP_BUILD) return "";
  const build = window.ORT_DESKTOP_BUILD || {};
  if (build.displayLabel) return `${build.displayLabel}`.trim();
  if (build.archLabel) return `${build.archLabel}`.trim();
  const arch = `${build.arch || ""}`.toLowerCase();
  return arch === "arm64" ? "Silicon" : arch === "x64" ? "Intel" : (arch || "Desktop");
}
const RELEASE_NOTES = [
  {
    category: "UX Revamp Update",
    items: [
      "Rebuilt the mobile shell with a cleaner bottom nav, bounded train sheet, and premium settings screen.",
      "Removed obsolete train detail actions while keeping alerts visible directly on the train detail.",
      "Added a build check script so npm run build validates the backend and frontend entry points.",
    ],
  },
  {
    category: "Major Updates",
    items: [
      "Desktop history playback and scrubbing now stay locked to track geometry for smoother replay.",
      "Railcam playback is fully in-app with upgraded overlays and playback controls.",
      "Desktop builds now ship with architecture-aware version labels and packaging metadata.",
    ],
  },
  {
    category: "Critical Fixes",
    items: [
      "Style switching now rehydrates routes, trains, and stations without data gaps.",
      "Metrolink fallback scheduling now keeps trains visible when realtime feeds are unavailable.",
      "Resolved map layer reload timing that could drop train markers during quick style changes.",
    ],
  },
  {
    category: "Small Bug Improvements",
    items: [
      "Hardened local cache writes to avoid quota spikes on slower devices.",
      "Improved route color consistency for commuter agencies across light/dark themes.",
      "Refined tooltips and overlays for clearer readability on high-density maps.",
    ],
  },
];
const MAX_RAILCAM_WINDOWS = 3;
const THEME_OPTIONS = [
  "dark",
  "light",
  "deep-black",
  "obsidian-indigo",
  "graphite-noir",
  "deep-ocean",
  "midnight-plum",
  "emerald-night",
  "mono-graphite",
  "mono-ash",
  "mono-paper",
  "contrast-dark",
  "contrast-light",
  "clean-slate",
  "clean-glacier",
  "pastel-mint",
  "pastel-lilac",
  "pastel-peach",
];
const THEME_CLASS_MAP = {
  light: "light",
  "deep-black": "theme-deep-black",
  "obsidian-indigo": "theme-obsidian-indigo",
  "graphite-noir": "theme-graphite-noir",
  "deep-ocean": "theme-deep-ocean",
  "midnight-plum": "theme-midnight-plum",
  "emerald-night": "theme-emerald-night",
  "mono-graphite": "theme-mono-graphite",
  "mono-ash": "theme-mono-ash",
  "mono-paper": "theme-mono-paper",
  "contrast-dark": "theme-contrast-dark",
  "contrast-light": "theme-contrast-light",
  "clean-slate": "theme-clean-slate",
  "clean-glacier": "theme-clean-glacier",
  "pastel-mint": "theme-pastel-mint",
  "pastel-lilac": "theme-pastel-lilac",
  "pastel-peach": "theme-pastel-peach",
};
const THEME_META_COLORS = {
  dark: "#020305",
  light: "#f0f0f0",
  "deep-black": "#010102",
  "obsidian-indigo": "#0b1020",
  "graphite-noir": "#0f1115",
  "deep-ocean": "#071522",
  "midnight-plum": "#160f1e",
  "emerald-night": "#081712",
  "mono-graphite": "#111315",
  "mono-ash": "#d9dde2",
  "mono-paper": "#f7f7f6",
  "contrast-dark": "#000000",
  "contrast-light": "#ffffff",
  "clean-slate": "#e8eef5",
  "clean-glacier": "#f3f8ff",
  "pastel-mint": "#ecfaf4",
  "pastel-lilac": "#f3efff",
  "pastel-peach": "#fff3ed",
};
const LEGACY_THEME_CLASS_NAMES = [
  "theme-metra",
  "theme-metro-legacy",
  "theme-silver-blue",
  "theme-pumpkin-stripe",
  "theme-heritage-green",
  "theme-warbonnet-red",
  "theme-night-limited",
  "theme-cascade-evergreen",
  "theme-desert-gold",
  "theme-keystone-cream",
  "theme-sunset-copper",
  "theme-midnight-orange",
  "theme-prairie-steel",
  "theme-streamliner-teal",
  "theme-royal-maroon",
  "theme-frost-white",
  "theme-neon-coral",
  "theme-sunline-yellow",
  "theme-shortline-red",
  "theme-hopper-green",
  "theme-diesel-blue",
  "theme-boxcar-brown",
];
const LEGACY_THEME_ALIASES = {
  metra: "obsidian-indigo",
  "metro-legacy": "obsidian-indigo",
  "silver-blue": "obsidian-indigo",
  "pumpkin-stripe": "pastel-peach",
  "heritage-green": "pastel-mint",
  "warbonnet-red": "pastel-peach",
  "night-limited": "deep-black",
  "cascade-evergreen": "pastel-mint",
  "desert-gold": "pastel-peach",
  "keystone-cream": "clean-slate",
  "sunset-copper": "pastel-peach",
  "midnight-orange": "obsidian-indigo",
  "prairie-steel": "clean-slate",
  "streamliner-teal": "pastel-mint",
  "royal-maroon": "pastel-lilac",
  "frost-white": "clean-glacier",
  "neon-coral": "pastel-peach",
  "sunline-yellow": "pastel-peach",
  "shortline-red": "pastel-peach",
  "hopper-green": "pastel-mint",
  "diesel-blue": "obsidian-indigo",
  "boxcar-brown": "pastel-peach",
};

function normalizeThemeMode(themeMode) {
  const raw = `${themeMode || ""}`.trim();
  if (!raw) return defaultUiSettings.themeMode;
  const mapped = LEGACY_THEME_ALIASES[raw] || raw;
  return THEME_OPTIONS.includes(mapped) ? mapped : defaultUiSettings.themeMode;
}

const state = {
  isMobile: typeof window !== "undefined" && window.innerWidth <= 768,
  lowTierDevice: isLowTierDevice(),
  map: null,
  routesVisible: true,
  proposedLinesVisible: false,
  freightVisible: false,
  signalVisible: false,
  freightOperatorHighlight: "all",
  stationsVisible: true,
  showHeritage: false,
  showSI: false,
  trains: [],
  commuterTrains: [],
  freightCommunityTrains: [],
  stations: [],
  commuterStations: [],
  signals: [],
  viewportMileposts: [],
  routes: [],
  commuterRoutes: [],
  freightRoutes: [],
  freightRoutesLoaded: false,
  freightRoutesLoadingPromise: null,
  freightRoutesForceRetryAt: 0,
  routeLines: new Map(),
  routeGeometriesBySource: new Map(),
  routeGeometriesBySourceAndName: new Map(),
  routeColorsBySourceAndName: new Map(),
  routeGeometriesAll: [],
  freightRouteLineOwners: [],
  freightHostLookupCache: new Map(),
  routeDisplayLabelCache: new Map(),
  proposedRailPopup: null,
  proposedRailEventsBound: false,
  syntheticHostFreightCacheKey: "",
  syntheticHostFreightCache: [],
  freightOperators: [],
  sharedRouteDisplayCacheKey: "",
  sharedRouteDisplayCache: null,
  trainIndex: new Map(),
  signalIndex: new Map(),
  selectedStation: null,
  config: null,
  showSavedOnly: false,
  savedTrains: new Set(),
  selectedTrain: null,
  faresPanelActive: false,
  detailLastSyncAt: 0,
  detailLastSignature: "",
  detailSheetState: "peek",
  detailSheetTouchStartY: null,
  detailSheetTouchLastY: null,
  detailSheetSwipeEligible: false,
  lastUpdateTs: 0,
  animationFrame: null,
  hoveredTrain: null,
  hoveredMouseX: null,
  hoveredMouseY: null,
  trainMarkers: new Map(),
  commuterAvailable: true,
  /** null until init; false when /api/health fails (e.g. wrong API base on GitHub Pages). */
  backendReachable: null,
  lastUpdateTime: null,
  photoCache: new Map(),
  locomotiveSpecsCatalog: [],
  locomotiveSpecsLoaded: false,
  photoSelectionToken: 0,
  quickMode: "all",
  uiSettings: { ...defaultUiSettings },
  refreshTimer: null,
  freightRefreshTimer: null,
  lastFreightRefreshAt: 0,
  webSocket: null,
  wsReconnectTimer: null,
  lastWsTrainsSignature: "",
  lastWsCommuterSignature: "",
  trainDataDirty: false,
  pageHidden: typeof document !== "undefined" ? document.hidden : false,
  lastManualRefreshAt: 0,
  /** Set when /api/trains fails or returns an error body; cleared on success with data. */
  dataLoadHint: null,
  consistProfiles: [],
  locationMarker: null,
  locationWatchId: null,
  locationWatchLastCentered: 0,
  userLocation: null,
  locationEnabled: false,
  signalPopup: null,
  signalViewportTimer: null,
  uploadMenuMode: "sighting",
  sightings: [],
  galleryPhotos: [],
  sightingMarkers: new Map(),
  bigBoyStatus: null,
  bigBoyRouteFeature: null,
  bigBoyMarker: null,
  renderQueue: [],
  isRendering: false,
  routePopup: null,
  trainPopup: null,
  incidentPopup: null,
  speedDotPopup: null,
  speedDotLayerEventsBound: false,
  openRailwayMapEventsBound: false,
  suppressNextGlobalMapClick: false,
  routeLodBucket: null,
  routeLodRenderTimer: null,
  routePreparedLodCache: new WeakMap(),
  mapInteractionActive: false,
  mapInteractionReleaseTimer: null,
  trainViewportRefreshTimer: null,
  followSelectedTrainOnMap: false,
  selectedTrainFollowLastMs: 0,
  autoFollowMapMoveUntil: 0,
  mapStyle: "overture",
  mapReady: false,
  styleWatchdogId: null,
  styleFallbackActive: false,
  speedLimitsVisible: false,
  trainPositionHistory: loadTrainPositionHistory(),
  trainHistoryLastPersistAt: 0,
  trainHistoryBounds: null,
  historyPlaybackTimestamp: null,
  historyPlaybackPlaying: false,
  historyPlaybackFrameId: null,
  historyPlaybackLastTick: 0,
  historyPlaybackSpeedMsPerSecond: 5 * 60_000,
  mileMarkersVisible: false,
  buildings3dVisible: false,
  trainLayerEventsBound: false,
  landmarksVisible: false,
  landmarkModelsEnabled: false,
  landmarkCustomLayerAdded: false,
  landmarkModelAssets: [],
  // Algorithmic tracking
  trainSnapshots: new Map(),   // source:id -> { lat, lon, speedMph, headingDeg, ...props }
  algAnimFrameId: null,
  // Live Crossings simulation
  railcamsVisible: false,
  railcamMarkers: new Map(),
  activeRailcamId: railcamCatalog[0]?.id || null,
  railcamWindows: [],
  railcamWindowSerial: 0,
  railcamChoicePopup: null,
  railcamResolvedById: new Map(),
  railcamResolvePending: new Set(),
  railcamVisionStream: null,
  railcamVisionVideo: null,
  railcamVisionCanvas: null,
  railcamVisionFrameId: null,
  railcamVisionWindowId: null,
  pendingSourceData: new Map(),
  sourceUpdateFrameId: null,
  alertHistoryByTrain: new Map(),
  trainStopsCache: new Map(),
  trainMarkerSnapCache: new Map(),
  maintenanceIncidents: [],
  milepostApiAvailable: true,
};

function getLandmarkModelAssets() {
  if (Array.isArray(state.landmarkModelAssets) && state.landmarkModelAssets.length > 0) {
    return state.landmarkModelAssets;
  }
  return DEFAULT_LANDMARK_MODEL_ASSETS;
}

async function loadLandmarkModelManifest() {
  try {
    const response = await fetch("landmarks/models/manifest.json");
    if (!response.ok) return;
    const manifest = await response.json();
    const raw = Array.isArray(manifest?.landmarks) ? manifest.landmarks : [];
    const normalized = raw
      .map((item) => ({
        id: `${item.id || ""}`.trim(),
        name: `${item.name || ""}`.trim(),
        lon: Number(item.lon),
        lat: Number(item.lat),
        altitude: Number(item.altitude || 0),
        scaleMeters: Number(item.scaleMeters || 60),
        rotateX: Number(item.rotateX ?? 90),
        rotateY: Number(item.rotateY ?? 0),
        rotateZ: Number(item.rotateZ ?? 0),
        url: `${item.url || ""}`.trim(),
      }))
      .filter((item) => item.id && item.name && Number.isFinite(item.lon) && Number.isFinite(item.lat) && item.url);

    if (normalized.length > 0) {
      state.landmarkModelAssets = normalized;
    }
  } catch {
    // Keep defaults if manifest is missing/invalid.
  }
}

function hasLandmarkModelRuntime() {
  return Boolean(window.THREE && window.THREE.GLTFLoader && maplibregl?.MercatorCoordinate);
}

function createLandmarkModelLayer() {
  const THREE = window.THREE;
  return {
    id: "landmark-models",
    type: "custom",
    renderingMode: "3d",
    onAdd(map, gl) {
      this.map = map;
      this.camera = new THREE.Camera();
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      this.renderer.autoClear = false;

      const lightA = new THREE.DirectionalLight(0xffffff, 0.95);
      lightA.position.set(0, -70, 100).normalize();
      this.scene.add(lightA);
      const lightB = new THREE.AmbientLight(0xffffff, 0.65);
      this.scene.add(lightB);

      this.models = [];
      const loader = new THREE.GLTFLoader();

      getLandmarkModelAssets().forEach((asset) => {
        loader.load(
          asset.url,
          (gltf) => {
            const model = gltf.scene;
            model.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = false;
                node.receiveShadow = false;
              }
            });
            model.userData.asset = asset;
            model.matrixAutoUpdate = false;
            this.scene.add(model);
            this.models.push(model);
            this.map.triggerRepaint();
          },
          undefined,
          () => {
            // Skip missing/broken model file silently.
          }
        );
      });
    },
    render(gl, matrix) {
      if (!state.landmarksVisible) return;
      const THREE = window.THREE;
      const projectionMatrix = new THREE.Matrix4().fromArray(matrix);
      this.camera.projectionMatrix = projectionMatrix;

      this.models.forEach((model) => {
        const asset = model.userData.asset;
        if (!asset) return;
        const merc = maplibregl.MercatorCoordinate.fromLngLat(
          [asset.lon, asset.lat],
          asset.altitude || 0
        );

        const scale = merc.meterInMercatorCoordinateUnits() * (asset.scaleMeters || 60);
        const pos = new THREE.Vector3(merc.x, merc.y, merc.z);
        const euler = new THREE.Euler(
          ((asset.rotateX || 90) * Math.PI) / 180,
          ((asset.rotateY || 0) * Math.PI) / 180,
          ((asset.rotateZ || 0) * Math.PI) / 180,
          "XYZ"
        );
        const quat = new THREE.Quaternion().setFromEuler(euler);
        const scl = new THREE.Vector3(scale, -scale, scale);
        model.matrix.compose(pos, quat, scl);
      });

      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
      this.map.triggerRepaint();
    },
  };
}

function syncLandmarkModelLayer() {
  if (!state.map) return;
  const map = state.map;
  state.landmarkCustomLayerAdded = Boolean(map.getLayer("landmark-models"));
  const shouldUseModels = state.landmarksVisible && state.landmarkModelsEnabled && hasLandmarkModelRuntime();

  if (shouldUseModels && !state.landmarkCustomLayerAdded && !map.getLayer("landmark-models")) {
    const beforeLayer = map.getLayer("routes-glow") ? "routes-glow" : undefined;
    map.addLayer(createLandmarkModelLayer(), beforeLayer);
    state.landmarkCustomLayerAdded = true;
  }

  if ((!shouldUseModels || !state.landmarksVisible) && map.getLayer("landmark-models")) {
    map.removeLayer("landmark-models");
    state.landmarkCustomLayerAdded = false;
  }
}

function createLandmarkFootprint(lon, lat, radiusMeters = 120, sides = 7) {
  const metersPerLatDeg = 111320;
  const metersPerLonDeg = Math.max(1, metersPerLatDeg * Math.cos((lat * Math.PI) / 180));
  const ring = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = (Math.PI * 2 * i) / sides;
    const xMeters = Math.cos(angle) * radiusMeters;
    const yMeters = Math.sin(angle) * radiusMeters;
    ring.push([lon + xMeters / metersPerLonDeg, lat + yMeters / metersPerLatDeg]);
  }
  ring.push(ring[0]);
  return ring;
}

function buildLandmarkCollections() {
  const points = LANDMARKS.map((landmark) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [landmark.lon, landmark.lat] },
    properties: {
      id: landmark.id,
      name: landmark.name,
      state: landmark.state,
      height: landmark.height || 80,
      color: landmark.color || "#60a5fa",
    },
  }));

  const footprints = LANDMARKS.map((landmark) => ({
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[...createLandmarkFootprint(landmark.lon, landmark.lat, landmark.radius || 110, 8)]],
    },
    properties: {
      id: landmark.id,
      name: landmark.name,
      state: landmark.state,
      height: landmark.height || 80,
      color: landmark.color || "#60a5fa",
      base: 0,
    },
  }));

  return {
    points: { type: "FeatureCollection", features: points },
    footprints: { type: "FeatureCollection", features: footprints },
  };
}

function ensureLandmarkLayers() {
  if (!state.map) return;
  const map = state.map;
  // Landmark fallback geometry is disabled: landmarks are true 3D models only.
  ["landmarks-label", "landmarks-points", "landmarks-3d"].forEach((layerId) => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  });
  if (map.getSource("landmarks")) map.removeSource("landmarks");
  if (map.getSource("landmark-footprints")) map.removeSource("landmark-footprints");
}

function renderLandmarks() {
  if (!state.map) return;
  syncLandmarkModelLayer();
}

function clearDomTrainMarkers() {
  if (!state.trainMarkers || state.trainMarkers.size === 0) return;
  Array.from(state.trainMarkers.values()).forEach((entry) => {
    entry?.marker?.remove?.();
  });
  state.trainMarkers.clear();
}

function sanitizeColorForIconId(color, fallback = "default") {
  const normalized = `${color || ""}`.trim().toLowerCase();
  return normalized ? normalized.replace(/[^a-z0-9]+/g, "-") : fallback;
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke, strokeWidth = 0) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function getTrainBadgeVariant(label = "") {
  const text = `${label || ""}`.trim();
  const length = text.length;
  if (length <= 3) return "sm";
  if (length <= 5) return "md";
  return "lg";
}

function createTrainBadgeImageData(lineColor, delayColor, isOutOfService, variant = "md", label = "", textColor = "#0b0f14", hasAlert = false, source = "") {
  const badgeConfig = variant === "sm"
    ? { height: 42, minOuterW: 58, outerH: 28, outerR: 9, fontSize: 15 }
    : variant === "lg"
      ? { height: 48, minOuterW: 84, outerH: 34, outerR: 10, fontSize: 18 }
      : { height: 46, minOuterW: 70, outerH: 32, outerR: 10, fontSize: 16 };
  const labelText = `${label || ""}`.trim();
  const probeCanvas = document.createElement("canvas");
  const probeCtx = probeCanvas.getContext("2d");
  if (probeCtx) {
    probeCtx.font = `700 ${badgeConfig.fontSize}px "Arial"`;
  }
  const measuredTextWidth = probeCtx && labelText ? Math.ceil(probeCtx.measureText(labelText).width) : 0;
  const computedOuterW = Math.max(
    badgeConfig.minOuterW,
    Math.min(136, measuredTextWidth + (hasAlert ? 30 : 20))
  );
  const dimensions = {
    width: computedOuterW + 6,
    height: badgeConfig.height,
    outerX: 3,
    outerY: 7,
    outerW: computedOuterW,
    outerH: badgeConfig.outerH,
    outerR: badgeConfig.outerR,
  };
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      width: dimensions.width,
      height: dimensions.height,
      data: new Uint8Array(dimensions.width * dimensions.height * 4),
    };
  }

  const sourceKey = `${source || ""}`.trim().toLowerCase();
  const useLineColorFill = commuterSources.has(sourceKey);
  const fillColor = isOutOfService
    ? "#6b7280"
    : (useLineColorFill ? (lineColor || delayColor || "#2563eb") : (delayColor || lineColor || "#2563eb"));
  const strokeColor = "rgba(12,16,24,0.88)";
  drawRoundedRect(ctx, dimensions.outerX, dimensions.outerY, dimensions.outerW, dimensions.outerH, dimensions.outerR, fillColor, strokeColor, 1.7);
  if (hasAlert) {
    const dotX = dimensions.outerX + dimensions.outerW - 7;
    const dotY = dimensions.outerY + 6;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  if (labelText) {
    ctx.font = `700 ${badgeConfig.fontSize}px "Arial"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2.2;
    ctx.strokeText(labelText, canvas.width / 2, canvas.height / 2 + 1);
    ctx.fillStyle = textColor || "#0b0f14";
    ctx.fillText(labelText, canvas.width / 2, canvas.height / 2 + 1);
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return imageData;
}

function getTrainBadgeTextColor(train) {
  const statusText = `${train?.status || ""}`.toLowerCase();
  if (statusText.includes("out-of-service") || statusText.includes("out of service")) {
    return "#f8fafc";
  }
  const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
  const useLineColorFill = commuterSources.has(sourceKey);
  const resolvedLineColor = normalizeHexColor(train?.lineColor) || normalizeHexColor(getTrainDisplayColor(train)) || "#2563eb";
  const resolvedDelayColorRaw = delayColor(train?.delayMinutes, train?.status);
  const resolvedDelayColor = resolvedDelayColorRaw === "#64748b" ? resolvedLineColor : resolvedDelayColorRaw;
  const baseColor = useLineColorFill ? resolvedLineColor : resolvedDelayColor;
  const hex = `${baseColor}`.replace("#", "");
  const expanded = hex.length === 3
    ? hex.split("").map((char) => `${char}${char}`).join("")
    : hex;
  const r = parseInt(expanded.slice(0, 2), 16) / 255;
  const g = parseInt(expanded.slice(2, 4), 16) / 255;
  const b = parseInt(expanded.slice(4, 6), 16) / 255;
  const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
  return luminance < 0.48 ? "#f8fafc" : "#0b0f14";
}

function ensureTrainBadgeImages(features) {
  const map = state.map;
  if (!map || !Array.isArray(features)) return;

  if (!map.hasImage("train-badge-fallback")) {
    try {
      const fallbackCanvas = createTrainBadgeImageData("#2563eb", "#111827", false, "md", "●", "#0b0f14", false);
      map.addImage("train-badge-fallback", fallbackCanvas);
    } catch (e) {
      console.warn("Failed to add fallback badge:", e);
    }
  }

  features.forEach((feature) => {
    const props = feature?.properties || {};
    const iconId = props.badgeIcon;
    if (!iconId || map.hasImage(iconId)) return;
    try {
      const canvas = createTrainBadgeImageData(
        props.lineColor,
        props.delayColor,
        props.isOutOfService,
        props.badgeVariant || "md",
        props.markerText || "",
        props.textColor || "#0b0f14",
        Boolean(props.hasAlert),
        props.source || ""
      );
      map.addImage(iconId, canvas);
    } catch (error) {
      console.warn("Failed to add train badge image:", iconId, error);
    }
  });
}

function ensureTrainLayers() {
  const map = state.map;
  if (!map || !map.getSource("trains")) return;

  if (!map.getLayer("trains-badge")) {
    map.addLayer({
      id: "trains-badge",
      type: "symbol",
      source: "trains",
      minzoom: state.isMobile ? 4.75 : 4.25,
      layout: {
        "icon-image": ["coalesce", ["get", "badgeIcon"], "train-badge-fallback"],
        "icon-size": [
          "interpolate", ["linear"], ["zoom"],
          3, 0.72,
          6, 0.84,
          10, 0.96,
          14, 1.06
        ],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-anchor": "center",
        "icon-pitch-alignment": "map",
        "icon-rotation-alignment": "map",
        "symbol-sort-key": [
          "case",
          ["==", ["get", "hasAlert"], true], 30,
          ["==", ["get", "realTime"], true], 20,
          10
        ],
      },
    });
  }

  // ── Invisible hit area (for click/hover) ──────────────────
  if (!map.getLayer("trains-hit")) {
    map.addLayer({
      id: "trains-hit",
      type: "circle",
      source: "trains",
      minzoom: state.isMobile ? 4.75 : 4.25,
      paint: {
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"], 3, 14, 8, 18, 14, 22
        ],
        "circle-opacity": 0,
        "circle-stroke-width": 0,
      },
    });
  }

  if (!map.getLayer("trains-speed-label")) {
    map.addLayer({
      id: "trains-speed-label",
      type: "symbol",
      source: "trains",
      minzoom: 8.8,
      filter: ["all", ["==", ["get", "realTime"], true], ["==", ["get", "showSpeedLabel"], 1]],
      layout: {
        "text-field": ["concat", ["to-string", ["round", ["coalesce", ["get", "speedMph"], 0]]], " mph"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 9, 12, 10.5, 15, 12],
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-optional": true,
      },
      paint: {
        "text-color": document.body.classList.contains("light") ? "#0f172a" : "#f8fafc",
        "text-halo-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.9)" : "rgba(8,12,20,0.95)",
        "text-halo-width": 1.4,
      },
    });
  }

  setTrainSpeedLabelsVisible(state.uiSettings.predictedMovementVisible);

  // Move hit area on top so it intercepts clicks
  bringTrainLayersToFront(map);

  // Bind interaction handlers once
  if (!state.trainLayerEventsBound) {
    map.on("mouseenter", "trains-hit", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "trains-hit", () => {
      map.getCanvas().style.cursor = "";
    });
    state.trainLayerEventsBound = true;
  }
}

function bringTrainLayersToFront(map = state.map) {
  if (!map) return;
  ["trains-badge", "trains-speed-label", "trains-hit"].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      try { map.moveLayer(layerId); } catch { /* ignore ordering errors */ }
    }
  });
}

function setTrainSpeedLabelsVisible(visible) {
  if (!state.map) return;
  if (state.map.getLayer("trains-speed-label")) {
    state.map.setLayoutProperty("trains-speed-label", "visibility", "none");
  }
}


function buildIncidentPopupHtml(properties) {
  const issueType = properties.issueType || "maintenance";
  const typeLabel = issueType === "rail-issue" ? "Rail Issue" : "Track Maintenance";
  const accent = issueType === "rail-issue" ? "#ef4444" : "#f59e0b";
  const icon = issueType === "rail-issue" ? "⚠" : "🚧";
  return `
    <div class="incident-popup-card incident-popup-card--maintenance">
      <div class="incident-popup-kicker" style="color:${accent}">${icon} ${typeLabel}</div>
      <strong>${escapeHtml(properties.trainName || "Affected train")}</strong>
      <div class="incident-popup-sub">${escapeHtml(sources[properties.source]?.label || properties.source || "--")} • ${escapeHtml(properties.route || "--")}</div>
      <p>${escapeHtml(properties.summary || "Live railroad alert")}</p>
    </div>
  `;
}

function buildMaintenanceModalHtml(properties) {
  const issueType = properties.issueType || "maintenance";
  const title = issueType === "rail-issue" ? "Rail Issue" : "Track Maintenance";
  return `
    <div class="service-alert-shell maintenance-shell">
      <div class="detail-head service-alert-head">
        <div class="detail-brand">
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(sources[properties.source]?.label || properties.source || "Railroad")} • ${escapeHtml(properties.route || "Active route")}</p>
          </div>
        </div>
      </div>
      <section class="service-alert-section">
        <article class="service-alert-entry service-alert-entry--active">
          <div class="service-alert-entry-title">${escapeHtml(properties.summary || "Construction activity reported on this segment.")}</div>
          ${properties.trainName ? `<div class="service-alert-entry-body">Nearest train: ${escapeHtml(properties.trainName)}</div>` : ""}
        </article>
      </section>
    </div>
  `;
}

function openMaintenanceDialog(properties) {
  if (!elements.maintenancePanel || !elements.maintenanceModal) return;
  elements.maintenancePanel.innerHTML = buildMaintenanceModalHtml(properties);
  elements.maintenanceModal.classList.add("active");
}

function ensureIncidentLayers() {
  const map = state.map;
  if (!map) return;

  if (!map.getSource("maintenance-incidents")) {
    map.addSource("maintenance-incidents", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  if (!map.getSource("maintenance-lines")) {
    map.addSource("maintenance-lines", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }

  if (!map.getLayer("maintenance-line")) {
    map.addLayer({
      id: "maintenance-line",
      type: "line",
      source: "maintenance-lines",
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      paint: {
        "line-color": "#f59e0b",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3, 10, 5, 14, 7],
        "line-opacity": 0.82,
        "line-dasharray": [1.2, 1.2],
      },
    });
  }

  if (!map.getLayer("maintenance-point")) {
    map.addLayer({
      id: "maintenance-point",
      type: "symbol",
      source: "maintenance-incidents",
      layout: {
        visibility: "none",
        "text-field": ["case", ["==", ["get", "issueType"], "rail-issue"], "⚠", "🚧"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 16, 10, 18, 14, 22],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": ["case", ["==", ["get", "issueType"], "rail-issue"], "#ef4444", "#f59e0b"],
        "text-halo-color": "rgba(10,10,10,0.92)",
        "text-halo-width": 1.8,
      },
    });
  }

  if (!map.getLayer("maintenance-point-hit")) {
    map.addLayer({
      id: "maintenance-point-hit",
      type: "circle",
      source: "maintenance-incidents",
      layout: { visibility: "none" },
      paint: { "circle-radius": 20, "circle-opacity": 0 },
    });
  }

  if (!map.__incidentHandlersBound) {
    const openIncidentPopup = (event) => {
      const feature = event.features?.[0];
      const props = feature?.properties || {};
      if (!feature) return;
      const isMobileDialog = window.matchMedia?.("(pointer: coarse)")?.matches || window.innerWidth <= 768;
      if (isMobileDialog) {
        openMaintenanceDialog(props);
        return;
      }
      const coordinates = feature.geometry?.type === "Point"
        ? feature.geometry.coordinates
        : [event.lngLat.lng, event.lngLat.lat];
      state.incidentPopup?.remove();
      state.incidentPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 16, maxWidth: "320px" })
        .setLngLat(coordinates)
        .setHTML(buildIncidentPopupHtml(props))
        .addTo(map);
    };

    ["maintenance-point-hit"].forEach((layerId) => {
      map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
    });
    map.on("click", "maintenance-point-hit", (event) => openIncidentPopup(event));
    map.__incidentHandlersBound = true;
  }
}

function loadUiSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(UI_SETTINGS_KEY) || "{}");
    state.uiSettings = {
      refreshSeconds: 180,
      trackingMode: "standard",
      predictedMovementVisible:
        FEATURE_TRAIN_MOVEMENT_ENABLED && typeof raw.predictedMovementVisible === "boolean"
          ? raw.predictedMovementVisible
          : false,
      openListDefault: true,
      searchOpenDefault:
        typeof raw.searchOpenDefault === "boolean"
          ? raw.searchOpenDefault
          : defaultUiSettings.searchOpenDefault,
      compactCards:
        typeof raw.compactCards === "boolean"
          ? raw.compactCards
          : defaultUiSettings.compactCards,
      simpleInfoMode:
        typeof raw.simpleInfoMode === "boolean"
          ? raw.simpleInfoMode
          : defaultUiSettings.simpleInfoMode,
      mapStyle: "overture",
      timeZone: normalizeTimeZoneSetting(raw.timeZone || defaultUiSettings.timeZone),
      themeMode: normalizeThemeMode(raw.themeMode),
      speedLimitsVisible:
        typeof raw.speedLimitsVisible === "boolean"
          ? raw.speedLimitsVisible
          : defaultUiSettings.speedLimitsVisible,
      speedDotsVisible:
        typeof raw.speedDotsVisible === "boolean"
          ? raw.speedDotsVisible
          : defaultUiSettings.speedDotsVisible,
      trainHistoryVisible:
        typeof raw.trainHistoryVisible === "boolean"
          ? raw.trainHistoryVisible
          : defaultUiSettings.trainHistoryVisible,
      mileMarkersVisible: false,
      routesVisible:
        typeof raw.routesVisible === "boolean"
          ? raw.routesVisible
          : defaultUiSettings.routesVisible,
      proposedLinesVisible:
        typeof raw.proposedLinesVisible === "boolean"
          ? raw.proposedLinesVisible
          : defaultUiSettings.proposedLinesVisible,
      freightVisible:
        typeof raw.freightVisible === "boolean"
          ? raw.freightVisible
          : defaultUiSettings.freightVisible,
      openRailwayMapStyle:
        OPENRAILWAYMAP_STYLES.has(`${raw.openRailwayMapStyle || raw.freightOperatorHighlight || ""}`.trim())
          ? `${raw.openRailwayMapStyle || raw.freightOperatorHighlight}`.trim()
          : defaultUiSettings.openRailwayMapStyle,
      signalVisible:
        typeof raw.signalVisible === "boolean"
          ? raw.signalVisible
          : defaultUiSettings.signalVisible,
      freightOperatorHighlight:
        typeof raw.freightOperatorHighlight === "string" && raw.freightOperatorHighlight.trim()
          ? raw.freightOperatorHighlight.trim()
          : defaultUiSettings.freightOperatorHighlight,
      stationsVisible:
        typeof raw.stationsVisible === "boolean"
          ? raw.stationsVisible
          : defaultUiSettings.stationsVisible,
      heritageVisible:
        typeof raw.heritageVisible === "boolean"
          ? raw.heritageVisible
          : defaultUiSettings.heritageVisible,
      specialInterestVisible:
        typeof raw.specialInterestVisible === "boolean"
          ? raw.specialInterestVisible
          : defaultUiSettings.specialInterestVisible,
      maintenanceVisible:
        typeof raw.maintenanceVisible === "boolean"
          ? raw.maintenanceVisible
          : defaultUiSettings.maintenanceVisible,
      railcamsVisible:
        FEATURE_RAILCAMS_ENABLED && typeof raw.railcamsVisible === "boolean"
          ? raw.railcamsVisible
          : defaultUiSettings.railcamsVisible,
      railcamVisionEnabled:
        FEATURE_RAILCAMS_ENABLED && FEATURE_RAILCAM_VISION_ENABLED && typeof raw.railcamVisionEnabled === "boolean"
          ? raw.railcamVisionEnabled
          : defaultUiSettings.railcamVisionEnabled,
    };

  } catch {
    state.uiSettings = { ...defaultUiSettings };
  }

  try {
    const migrated = localStorage.getItem(TIMEZONE_MIGRATION_KEY) === "done";
    if (!migrated && `${state.uiSettings?.timeZone || ""}`.trim() === "UTC") {
      state.uiSettings.timeZone = "browser";
      safeSetLocalStorage(TIMEZONE_MIGRATION_KEY, "done");
    }
  } catch {
    // ignore storage failures
  }

  state.uiSettings.timeZone = "browser";
}

function persistUiSettings() {
  try {
    safeSetLocalStorage(UI_SETTINGS_KEY, state.uiSettings);
  } catch {
    // ignore storage failures
  }
}

function loadTrainPositionHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(TRAIN_HISTORY_KEY) || "{}");
    const nowMs = Date.now();
    const cutoff = nowMs - (36 * 60 * 60 * 1000);
    const history = new Map();
    Object.entries(raw || {}).forEach(([key, value]) => {
      const rows = (Array.isArray(value) ? value : [])
        .map((row) => ({
          lat: Number(row?.lat),
          lon: Number(row?.lon),
          speed: Number.isFinite(Number(row?.speed)) ? Number(row.speed) : null,
          timestamp: Number(row?.timestamp),
        }))
        .filter((row) =>
          Number.isFinite(row.lat)
          && Number.isFinite(row.lon)
          && Number.isFinite(row.timestamp)
          && row.timestamp >= cutoff
        )
        .slice(-360);
      if (rows.length > 0) history.set(key, rows);
    });
    return history;
  } catch {
    return new Map();
  }
}

function persistTrainPositionHistory(nowMs = Date.now()) {
  if ((nowMs - Number(state.trainHistoryLastPersistAt || 0)) < 30_000) return;
  state.trainHistoryLastPersistAt = nowMs;
  try {
    const payload = {};
    state.trainPositionHistory.forEach((rows, key) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      payload[key] = rows.slice(-240);
    });
    safeSetLocalStorage(TRAIN_HISTORY_KEY, payload);
    rebuildTrainHistoryBounds();
  } catch {
    // ignore storage failures
  }
}

function rebuildTrainHistoryBounds() {
  let min = Infinity;
  let max = -Infinity;
  let count = 0;

  state.trainPositionHistory.forEach((rows) => {
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const timestamp = Number(row?.timestamp);
      if (!Number.isFinite(timestamp)) return;
      min = Math.min(min, timestamp);
      max = Math.max(max, timestamp);
      count += 1;
    });
  });

  state.trainHistoryBounds = count > 0 ? { min, max, count } : null;
  return state.trainHistoryBounds;
}

function getTrainHistoryBounds() {
  if (state.trainHistoryBounds && Number.isFinite(state.trainHistoryBounds.min) && Number.isFinite(state.trainHistoryBounds.max)) {
    return state.trainHistoryBounds;
  }
  return rebuildTrainHistoryBounds();
}

function clampHistoryTimestamp(timestampMs) {
  const bounds = getTrainHistoryBounds();
  if (!bounds) return null;
  const value = Number(timestampMs);
  if (!Number.isFinite(value)) return bounds.max;
  return Math.min(Math.max(value, bounds.min), bounds.max);
}

function formatHistoryPlaybackTimestamp(timestampMs) {
  if (!Number.isFinite(Number(timestampMs))) return "Live";
  const value = new Date(timestampMs);
  if (Number.isNaN(value.getTime())) return "Live";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function sampleHistoryPoint(rows, timestampMs) {
  const clean = (Array.isArray(rows) ? rows : [])
    .filter((row) => Number.isFinite(Number(row?.lat)) && Number.isFinite(Number(row?.lon)) && Number.isFinite(Number(row?.timestamp)))
    .map((row) => ({
      lat: Number(row.lat),
      lon: Number(row.lon),
      speed: Number.isFinite(Number(row.speed)) ? Number(row.speed) : null,
      timestamp: Number(row.timestamp),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0];

  const target = Number(timestampMs);
  if (!Number.isFinite(target)) return clean[clean.length - 1];
  if (target <= clean[0].timestamp) return clean[0];
  if (target >= clean[clean.length - 1].timestamp) return clean[clean.length - 1];

  for (let index = 1; index < clean.length; index += 1) {
    const previous = clean[index - 1];
    const current = clean[index];
    if (target > current.timestamp) continue;
    const span = current.timestamp - previous.timestamp || 1;
    const ratio = Math.min(Math.max((target - previous.timestamp) / span, 0), 1);
    return {
      lat: previous.lat + ((current.lat - previous.lat) * ratio),
      lon: previous.lon + ((current.lon - previous.lon) * ratio),
      speed: Number.isFinite(previous.speed) && Number.isFinite(current.speed)
        ? previous.speed + ((current.speed - previous.speed) * ratio)
        : (Number.isFinite(current.speed) ? current.speed : previous.speed),
      timestamp: target,
    };
  }

  return clean[clean.length - 1];
}

function buildHistoryPlaybackTrains(trains, timestampMs) {
  if (!state.uiSettings.trainHistoryVisible) return trains;
  const targetTimestamp = clampHistoryTimestamp(timestampMs);
  if (!Number.isFinite(targetTimestamp)) return trains;

  return (Array.isArray(trains) ? trains : []).map((train) => {
    const key = `${train.source}:${train.id}`;
    const sample = sampleHistoryPoint(state.trainPositionHistory.get(key), targetTimestamp);
    if (!sample) return train;
    const snapped = snapTrainToRoute(train, { lat: sample.lat, lon: sample.lon }, { forceSnap: true });
    const snappedLat = Number.isFinite(Number(snapped?.lat)) ? Number(snapped.lat) : sample.lat;
    const snappedLon = Number.isFinite(Number(snapped?.lon)) ? Number(snapped.lon) : sample.lon;
    const snappedHeading = Number.isFinite(Number(snapped?.trackBearing)) ? Number(snapped.trackBearing) : null;
    return {
      ...train,
      lat: snappedLat,
      lon: snappedLon,
      displayLat: snappedLat,
      displayLon: snappedLon,
      displayHeading: snappedHeading != null ? snappedHeading : train.displayHeading,
      speed: Number.isFinite(sample.speed) ? sample.speed : train.speed,
      currentSpeed: Number.isFinite(sample.speed) ? sample.speed : train.currentSpeed,
      historyPlayback: true,
      historyPlaybackTimestamp: sample.timestamp,
    };
  });
}

function updateHistoryPlaybackUi() {
  const toolbar = elements.historyToolbar;
  const bounds = getTrainHistoryBounds();
  const visible = Boolean(state.uiSettings.trainHistoryVisible);

  if (toolbar) {
    toolbar.hidden = !visible;
  }

  const hasData = Boolean(bounds);
  const timestamp = clampHistoryTimestamp(state.historyPlaybackTimestamp);
  const liveTimestamp = hasData ? bounds.max : null;
  const isLive = !hasData || !Number.isFinite(timestamp) || Math.abs((timestamp || 0) - liveTimestamp) < 60_000;

  if (elements.historyPlaybackToggle) {
    elements.historyPlaybackToggle.textContent = state.historyPlaybackPlaying ? "Pause" : "Play";
    elements.historyPlaybackToggle.disabled = !visible || !hasData;
  }

  if (elements.historyPlaybackLive) {
    elements.historyPlaybackLive.disabled = !visible || !hasData || isLive;
  }

  if (elements.historyPlaybackScrubber) {
    elements.historyPlaybackScrubber.disabled = !visible || !hasData;
    if (hasData) {
      elements.historyPlaybackScrubber.min = String(bounds.min);
      elements.historyPlaybackScrubber.max = String(bounds.max);
      elements.historyPlaybackScrubber.step = "1000";
      elements.historyPlaybackScrubber.value = String(timestamp ?? bounds.max);
    }
  }

  if (elements.historyPlaybackLabel) {
    elements.historyPlaybackLabel.textContent = hasData && Number.isFinite(timestamp) && !isLive
      ? formatHistoryPlaybackTimestamp(timestamp)
      : "Live";
  }
}

function stopHistoryPlayback() {
  state.historyPlaybackPlaying = false;
  state.historyPlaybackLastTick = 0;
  if (state.historyPlaybackFrameId) {
    cancelAnimationFrame(state.historyPlaybackFrameId);
    state.historyPlaybackFrameId = null;
  }
  updateHistoryPlaybackUi();
}

function setHistoryPlaybackTimestamp(timestampMs, { keepPlaying = false } = {}) {
  const bounds = getTrainHistoryBounds();
  if (!bounds) {
    state.historyPlaybackTimestamp = null;
    stopHistoryPlayback();
    updateHistoryPlaybackUi();
    return;
  }

  state.historyPlaybackTimestamp = clampHistoryTimestamp(timestampMs) ?? bounds.max;
  if (!keepPlaying) {
    stopHistoryPlayback();
  } else {
    updateHistoryPlaybackUi();
  }

  if (state.map) {
    refreshTrainMarkersForViewport();
  }
}

function runHistoryPlaybackFrame(nowMs) {
  if (!state.historyPlaybackPlaying) return;
  const bounds = getTrainHistoryBounds();
  if (!bounds) {
    stopHistoryPlayback();
    return;
  }

  const lastTick = Number(state.historyPlaybackLastTick || 0) || nowMs;
  const deltaMs = Math.max(0, nowMs - lastTick);
  state.historyPlaybackLastTick = nowMs;
  const nextTimestamp = clampHistoryTimestamp((Number(state.historyPlaybackTimestamp) || bounds.min) + (deltaMs * (Number(state.historyPlaybackSpeedMsPerSecond) || 300000) / 1000));

  if (!Number.isFinite(nextTimestamp)) {
    stopHistoryPlayback();
    return;
  }

  state.historyPlaybackTimestamp = nextTimestamp;
  refreshTrainMarkersForViewport();
  updateHistoryPlaybackUi();

  if (nextTimestamp >= bounds.max) {
    stopHistoryPlayback();
    state.historyPlaybackTimestamp = bounds.max;
    updateHistoryPlaybackUi();
    refreshTrainMarkersForViewport();
    return;
  }

  state.historyPlaybackFrameId = requestAnimationFrame(runHistoryPlaybackFrame);
}

function setHistoryPlaybackPlaying(playing) {
  const bounds = getTrainHistoryBounds();
  if (!bounds || !state.uiSettings.trainHistoryVisible) {
    stopHistoryPlayback();
    return;
  }

  if (!playing) {
    stopHistoryPlayback();
    return;
  }

  state.historyPlaybackPlaying = true;
  state.historyPlaybackTimestamp = clampHistoryTimestamp(state.historyPlaybackTimestamp) ?? bounds.min;
  state.historyPlaybackLastTick = performance.now();
  updateHistoryPlaybackUi();
  if (state.historyPlaybackFrameId) cancelAnimationFrame(state.historyPlaybackFrameId);
  state.historyPlaybackFrameId = requestAnimationFrame(runHistoryPlaybackFrame);
}

function loadSavedMapView() {
  try {
    const raw = JSON.parse(localStorage.getItem(MAP_VIEW_KEY) || "null");
    if (!raw) return null;
    const lat = Number(raw.lat);
    const lon = Number(raw.lon);
    const zoom = Number(raw.zoom);
    const bearing = Number(raw.bearing || 0);
    const pitch = Number(raw.pitch || 0);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(zoom)) return null;
    if (lat < 5 || lat > 75 || lon < -175 || lon > -50) return null;
    return {
      lat,
      lon,
      zoom,
      bearing: Number.isFinite(bearing) ? bearing : 0,
      pitch: Number.isFinite(pitch) ? pitch : 0,
    };
  } catch {
    return null;
  }
}

function persistMapView() {
  if (!state.map) return;
  try {
    const center = state.map.getCenter();
    if (!center) return;
    safeSetLocalStorage(MAP_VIEW_KEY, {
      lat: Number(center.lat),
      lon: Number(center.lng),
      zoom: Number(state.map.getZoom() || 0),
      bearing: Number(state.map.getBearing() || 0),
      pitch: Number(state.map.getPitch() || 0),
    });
  } catch {
    // ignore storage failures
  }
}

function showFreightPerformanceNotice() {
  if (typeof window === "undefined" || typeof window.alert !== "function") return;
  window.alert("Freight lines can reduce performance on some devices, especially on mobile Safari/Chrome. If the map feels slow, turn Freight lines off in Settings.");
}

function renderReleaseNotesPanel() {
  const desktopLabel = getDesktopBuildLabel();
  const versionLabel = desktopLabel ? `${APP_VERSION} • ${desktopLabel}` : APP_VERSION;
  if (elements.mapVersionPill) {
    elements.mapVersionPill.textContent = versionLabel;
  }
  if (elements.releaseTitle) {
    elements.releaseTitle.textContent = `UX Revamp Update • ${versionLabel}`;
  }
  if (elements.releaseUpdatedAt) {
    elements.releaseUpdatedAt.textContent = `Updated ${formatUpdatedTimestamp(APP_RELEASED_AT)}`;
  }
  if (elements.releaseSpotlight) {
    const hero = "Desktop stability, critical map fixes, and updated release notes for every platform.";
    elements.releaseSpotlight.innerHTML = hero
      ? `
        <div class="release-spotlight-card">
          <span class="release-spotlight-kicker">Featured</span>
          <strong>Desktop Stability Release</strong>
          <p>${escapeHtml(hero)}</p>
        </div>
      `
      : "";
  }
  if (elements.releaseChangeLog) {
    elements.releaseChangeLog.innerHTML = RELEASE_NOTES
      .map((entry) => `
        <section class="release-note-section">
          <h4>${escapeHtml(entry.category)}</h4>
          <ul>
            ${(Array.isArray(entry.items) ? entry.items : [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("")}
          </ul>
        </section>
      `)
      .join("");
  }
}

function dismissReleaseModal() {
  elements.releaseModal?.classList.remove("active");
  try {
    safeSetLocalStorage(RELEASE_MODAL_STORAGE_KEY, APP_VERSION);
  } catch {
    // ignore storage failures
  }
}

function maybeOpenReleaseModal() {
  renderReleaseNotesPanel();
  if (elements.desktopWelcomeModal?.classList.contains("active")) return;
  try {
    const seenVersion = localStorage.getItem(RELEASE_MODAL_STORAGE_KEY);
    if (seenVersion === APP_VERSION) return;
  } catch {
    // ignore storage failures
  }
  elements.releaseModal?.classList.add("active");
}

function dismissDesktopWelcomeModal() {
  elements.desktopWelcomeModal?.classList.remove("active");
  try {
    safeSetLocalStorage(DESKTOP_WELCOME_STORAGE_KEY, "seen");
  } catch {
    // ignore storage failures
  }
}

function maybeOpenDesktopWelcomeModal() {
  if (typeof window === "undefined" || !window.ORT_DESKTOP_BUILD) return;
  try {
    const seen = localStorage.getItem(DESKTOP_WELCOME_STORAGE_KEY);
    if (seen === "seen") return;
  } catch {
    // ignore storage failures
  }
  elements.desktopWelcomeModal?.classList.add("active");
}

function dismissRailcamBetaModal() {
  elements.railcamBetaModal?.classList.remove("active");
  try {
    safeSetLocalStorage(RAILCAM_BETA_MODAL_STORAGE_KEY, "seen");
  } catch {
    // ignore storage failures
  }
}

function maybeOpenRailcamBetaModal() {
  if (!FEATURE_RAILCAMS_ENABLED) return;
  try {
    if (localStorage.getItem(RAILCAM_BETA_MODAL_STORAGE_KEY) === "seen") return;
  } catch {
    // ignore storage failures
  }
  elements.railcamBetaModal?.classList.add("active");
}

async function loadVerifiedConsistProfiles() {
  try {
    const response = await fetch("data/verified-consists.json", { cache: "no-store" });
    if (!response.ok) {
      state.consistProfiles = [];
      return;
    }
    const payload = await response.json();
    state.consistProfiles = Array.isArray(payload) ? payload : [];
  } catch {
    state.consistProfiles = [];
  }
}

function applyUiSettingsToDom() {
  document.body.classList.toggle("compact-cards", Boolean(state.uiSettings.compactCards));
  document.body.classList.remove("ui-solid", "ui-translucent", "ui-transparent");
  if (elements.quickLookBoard) {
    elements.quickLookBoard.hidden = !Boolean(state.uiSettings.compactCards);
  }
  if (elements.floatingList) {
    elements.floatingList.hidden = Boolean(state.uiSettings.compactCards);
  }
  if (elements.settingRefreshInterval) {
    elements.settingRefreshInterval.value = String(state.uiSettings.refreshSeconds);
  }
  if (elements.settingTrackingMode) {
    elements.settingTrackingMode.value = state.uiSettings.trackingMode || "standard";
  }
  if (elements.settingPredictedMovement) {
    elements.settingPredictedMovement.checked = FEATURE_TRAIN_MOVEMENT_ENABLED && Boolean(state.uiSettings.predictedMovementVisible);
    elements.settingPredictedMovement.disabled = !FEATURE_TRAIN_MOVEMENT_ENABLED;
    elements.settingPredictedMovement.title = FEATURE_TRAIN_MOVEMENT_ENABLED
      ? "Enable train movement mode"
      : "Temporarily disabled for stability";
  }
  // Hide the standard interval row when algorithmic mode is active
  if (elements.settingIntervalRow) {
    elements.settingIntervalRow.style.display =
      state.uiSettings.trackingMode === "algorithmic" ? "none" : "";
  }
  if (elements.settingOpenListDefault) {
    elements.settingOpenListDefault.checked = Boolean(state.uiSettings.openListDefault);
  }
  if (elements.settingSearchOpenDefault) {
    elements.settingSearchOpenDefault.checked = Boolean(state.uiSettings.searchOpenDefault);
  }
  if (elements.settingCompactCards) {
    elements.settingCompactCards.checked = Boolean(state.uiSettings.compactCards);
  }
  if (elements.settingSimpleInfo) {
    elements.settingSimpleInfo.checked = Boolean(state.uiSettings.simpleInfoMode);
  }
  if (elements.settingMapStyle) {
    elements.settingMapStyle.value = "overture";
  }
  if (elements.settingTimeZone) {
    elements.settingTimeZone.value = state.uiSettings.timeZone || "browser";
  }
  if (elements.settingThemeMode) {
    elements.settingThemeMode.value = state.uiSettings.themeMode || "dark";
  }
  if (elements.settingSpeedLimitsVisible) {
    elements.settingSpeedLimitsVisible.checked = Boolean(state.uiSettings.speedLimitsVisible);
  }
  if (elements.settingSpeedDotsVisible) {
    elements.settingSpeedDotsVisible.checked = Boolean(state.uiSettings.speedDotsVisible);
  }
  if (elements.settingTrainHistoryVisible) {
    elements.settingTrainHistoryVisible.checked = Boolean(state.uiSettings.trainHistoryVisible);
  }
  updateHistoryPlaybackUi();
  if (elements.settingMileMarkersVisible) {
    elements.settingMileMarkersVisible.checked = Boolean(state.uiSettings.mileMarkersVisible);
  }
  if (elements.settingRoutesVisible) {
    elements.settingRoutesVisible.checked = Boolean(state.uiSettings.routesVisible);
  }
  if (elements.settingProposedLinesVisible) {
    elements.settingProposedLinesVisible.checked = Boolean(state.uiSettings.proposedLinesVisible);
  }
  if (elements.settingFreightVisible) {
    elements.settingFreightVisible.checked = Boolean(state.uiSettings.freightVisible);
  }
  if (elements.settingRailcamsVisible) {
    elements.settingRailcamsVisible.checked = FEATURE_RAILCAMS_ENABLED && Boolean(state.uiSettings.railcamsVisible);
    elements.settingRailcamsVisible.disabled = !FEATURE_RAILCAMS_ENABLED;
  }
  if (elements.settingRailcamsVisible) {
    elements.settingRailcamsVisible.checked = FEATURE_RAILCAMS_ENABLED && Boolean(state.uiSettings.railcamsVisible);
    elements.settingRailcamsVisible.disabled = !FEATURE_RAILCAMS_ENABLED;
  }
  if (elements.settingFreightOperatorHighlight) {
    elements.settingFreightOperatorHighlight.value = state.uiSettings.openRailwayMapStyle || defaultUiSettings.openRailwayMapStyle;
  }
  if (elements.settingStationsVisible) {
    elements.settingStationsVisible.checked = Boolean(state.uiSettings.stationsVisible);
  }
  if (elements.settingHeritageVisible) {
    elements.settingHeritageVisible.checked = Boolean(state.uiSettings.heritageVisible);
  }
  if (elements.settingSpecialInterestVisible) {
    elements.settingSpecialInterestVisible.checked = Boolean(state.uiSettings.specialInterestVisible);
  }
  if (elements.settingMaintenanceVisible) {
    elements.settingMaintenanceVisible.checked = Boolean(state.uiSettings.maintenanceVisible);
  }
  if (elements.toggleMaintenance) {
    elements.toggleMaintenance.dataset.active = String(Boolean(state.uiSettings.maintenanceVisible));
  }
}

// ── Algorithmic engine - 1 second live tracking ──────────────────
function buildTrainFeatureForAlg(snap) {
  if (!shouldRenderTrain(snap)) return null;
  const coords = snap.displayLat != null && snap.displayLon != null
    ? { lat: snap.displayLat, lon: snap.displayLon }
    : snapTrainToRoute(snap, { lat: snap.lat, lon: snap.lon }, { forceSnap: true });
  if (!coords) return null;
  const realTime = Boolean(snap.realTime);
  const markerLabel = formatMarkerLabel(snap);
  const headingDegreesRaw = snap.displayHeading ?? compassToDegrees(snap.heading);
  const headingDegrees = Number.isFinite(Number(headingDegreesRaw)) ? Number(headingDegreesRaw) : 0;
  const statusText = `${snap.status || ""}`.toLowerCase();
  const isOutOfService = statusText.includes("out-of-service") || statusText.includes("out of service");
  const resolvedLineColor = snap.lineColor || getTrainDisplayColor(snap);
  const resolvedDelayColorRaw = delayColor(snap.delayMinutes, snap.status);
  const resolvedDelayColor = resolvedDelayColorRaw === "#64748b" ? resolvedLineColor : resolvedDelayColorRaw;
  const badgeVariant = getTrainBadgeVariant(markerLabel);
  const badgeIcon = `train-badge-${badgeVariant}-${sanitizeColorForIconId(markerLabel, "label")}-${sanitizeColorForIconId(resolvedLineColor, "line")}-${sanitizeColorForIconId(resolvedDelayColor, "delay")}-${isOutOfService ? "oos" : "live"}`;

  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [coords.lon, coords.lat] },
    properties: {
      id: `${snap.source}:${snap.id}`,
      label: markerLabel, markerText: markerLabel,
      delayMinutes: snap.delayMinutes ?? 0,
      source: snap.source,
      companyColor: snap.lineColor || getOperatorColor(snap.source),
      lineColor: resolvedLineColor,
      delayColor: resolvedDelayColor,
      realTime, headingDegrees,
      speedMph: Number.isFinite(Number(snap.currentSpeed)) ? Number(snap.currentSpeed) : (Number(snap.speed) || 0),
      showSpeedLabel: 0,
      hasHeading: headingDegreesRaw != null && realTime,
      hasAlert: Boolean(getServiceAlertText(snap)),
      status: statusText,
      isOutOfService,
      textColor: getTrainBadgeTextColor(snap),
      badgeVariant,
      badgeIcon,
    },
  };
}

function buildTrainFeature(train) {
  if (!train) return null;
  if (!shouldRenderTrain(train)) return null;

  const snapshotKey = `${train.source}:${train.id}`;
  const predictedSnap = state.uiSettings.predictedMovementVisible
    ? state.trainSnapshots.get(snapshotKey)
    : null;

  const rawCoords = normalizeLngLat(
    predictedSnap?.displayLat ?? train.lat,
    predictedSnap?.displayLon ?? train.lon,
    train.source
  );
  if (!rawCoords) return null;

  const forceRouteSnap = `${train?.source || ""}`.trim().toLowerCase() === "freight-community";
  const snapped = snapTrainToRoute(train, rawCoords, { forceSnap: state.uiSettings.predictedMovementVisible });
  const coords = snapped && Number.isFinite(Number(snapped.lat)) && Number.isFinite(Number(snapped.lon))
    ? snapped
    : rawCoords;

  if (forceRouteSnap && snapped && Number.isFinite(Number(snapped.lat)) && Number.isFinite(Number(snapped.lon))) {
    coords.lat = snapped.lat;
    coords.lon = snapped.lon;
  }

  const markerLabel = formatMarkerLabel(train);
  const headingDegreesRaw = Number.isFinite(Number(predictedSnap?.displayHeading))
    ? Number(predictedSnap.displayHeading)
    : (`${train?.source || ""}`.trim().toLowerCase() === "freight-community" && Number.isFinite(Number(snapped?.trackBearing)))
      ? Number(snapped.trackBearing)
    : compassToDegrees(train.heading);
  const headingDegrees = Number.isFinite(Number(headingDegreesRaw)) ? Number(headingDegreesRaw) : 0;
  const realTime = Boolean(train.realTime);
  const statusText = `${train.status || ""}`.toLowerCase();
  const isOutOfService = statusText.includes("out-of-service") || statusText.includes("out of service");
  const resolvedLineColor = train.lineColor || getTrainDisplayColor(train);
  const resolvedDelayColorRaw = delayColor(train.delayMinutes, train.status);
  const resolvedDelayColor = resolvedDelayColorRaw === "#64748b" ? resolvedLineColor : resolvedDelayColorRaw;
  const badgeVariant = getTrainBadgeVariant(markerLabel);
  const badgeIcon = `train-badge-${badgeVariant}-${sanitizeColorForIconId(markerLabel, "label")}-${sanitizeColorForIconId(resolvedLineColor, "line")}-${sanitizeColorForIconId(resolvedDelayColor, "delay")}-${isOutOfService ? "oos" : "live"}`;

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [coords.lon, coords.lat],
    },
    properties: {
      id: `${train.source}:${train.id}`,
      label: markerLabel,
      markerText: markerLabel,
      delayMinutes: train.delayMinutes ?? 0,
      source: train.source,
      companyColor: train.lineColor || getOperatorColor(train.source),
      lineColor: resolvedLineColor,
      delayColor: resolvedDelayColor,
      realTime,
      headingDegrees,
      speedMph: Number.isFinite(Number(predictedSnap?.currentSpeed))
        ? Number(predictedSnap.currentSpeed)
        : (Number.isFinite(Number(train.speed)) ? Number(train.speed) : 0),
      showSpeedLabel: 0,
      hasHeading: headingDegreesRaw != null && realTime,
      hasAlert: Boolean(getServiceAlertText(train)),
      status: statusText,
      isOutOfService,
      textColor: getTrainBadgeTextColor(train),
      badgeVariant,
      badgeIcon,
    },
  };
}

// --- Algorithmic Tracking Helpers ---
function checkSpeedZone(lat, lon, source) {
  // Generalized corridor limits (fallback when no per-segment metadata is available).
  const src = `${source || ""}`.trim().toLowerCase();
  if (src === "brightline") return 110;
  if (src === "amtrak") return 90;
  if (src === "via") return 100;
  if (src === "freight" || src === "freight-community") return 60;
  return commuterSources.has(src) ? 79 : 65;
}

function checkStationDwell(t, currentLat, currentLon) {
  const status = (t.status || "").toLowerCase();
  const apiStopped = status === "stopped" || status === "arrived" || Number(t.speed) === 0;
  if (!apiStopped) return null;

  let closestStation = null;
  let minDistance = Infinity;
  const allStations = state.stations || [];

  for (const station of allStations) {
    if (station.source !== t.source) continue;
    const dist = haversineMiles({ lat: currentLat, lon: currentLon }, { lat: station.lat, lon: station.lon });
    if (dist < minDistance) {
      minDistance = dist;
      closestStation = station;
    }
  }

  // 500 feet = ~0.0947 miles
  if (closestStation && minDistance <= 0.0947) {
    return { lat: closestStation.lat, lon: closestStation.lon, id: closestStation.id };
  }
  return null;
}

function calculateBearingDegrees(fromLat, fromLon, toLat, toLon) {
  if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) return null;
  const lat1 = fromLat * (Math.PI / 180);
  const lat2 = toLat * (Math.PI / 180);
  const dLon = (toLon - fromLon) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - (Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon));
  const brng = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
  return Number.isFinite(brng) ? brng : null;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeStationStopId(value) {
  return `${value || ""}`.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getNextStationTarget(train, coords) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return null;
  const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
  if (!sourceKey) return null;
  const stations = [
    ...(Array.isArray(state.stations) ? state.stations : []),
    ...(Array.isArray(state.commuterStations) ? state.commuterStations : []),
  ];
  if (stations.length === 0) return null;

  const sourceStations = stations.filter((s) => `${s?.source || ""}`.trim().toLowerCase() === sourceKey);
  if (sourceStations.length === 0) return null;

  const upcoming = Array.isArray(train?.upcomingStops) ? train.upcomingStops : [];
  const firstStop = upcoming[0] || null;
  const stopIdNeedle = normalizeStationStopId(firstStop?.stopId || train?.nextStop || "");
  const stopNameNeedle = `${firstStop?.stopName || train?.nextStop || ""}`.trim().toLowerCase();

  let candidate = null;
  if (stopIdNeedle) {
    candidate = sourceStations.find((s) => normalizeStationStopId(s?.id) === stopIdNeedle) || null;
  }
  if (!candidate && stopNameNeedle) {
    candidate = sourceStations.find((s) => `${s?.name || ""}`.trim().toLowerCase() === stopNameNeedle)
      || sourceStations.find((s) => `${s?.name || ""}`.trim().toLowerCase().includes(stopNameNeedle))
      || null;
  }

  if (!candidate) {
    let nearest = null;
    let nearestDist = Infinity;
    sourceStations.forEach((station) => {
      const dist = haversineMiles(coords, { lat: Number(station?.lat), lon: Number(station?.lon) });
      if (Number.isFinite(dist) && dist < nearestDist) {
        nearestDist = dist;
        nearest = station;
      }
    });
    candidate = nearest;
  }

  if (!candidate) return null;
  const stationLat = Number(candidate?.lat);
  const stationLon = Number(candidate?.lon);
  if (!Number.isFinite(stationLat) || !Number.isFinite(stationLon)) return null;
  const distanceMiles = haversineMiles(coords, { lat: stationLat, lon: stationLon });
  const bearingDeg = calculateBearingDegrees(coords.lat, coords.lon, stationLat, stationLon);
  return {
    id: candidate?.id || "",
    name: candidate?.name || "",
    lat: stationLat,
    lon: stationLon,
    distanceMiles,
    bearingDeg,
  };
}

function computeStationApproachSpeedLimit(distanceMiles) {
  if (!Number.isFinite(distanceMiles)) return null;
  if (distanceMiles <= 0.05) return 0;
  if (distanceMiles <= 0.12) return 6;
  if (distanceMiles <= 0.25) return 12;
  if (distanceMiles <= 0.5) return 22;
  if (distanceMiles <= 1.0) return 40;
  if (distanceMiles <= 2.0) return 60;
  if (distanceMiles <= 3.0) return 75;
  return null;
}

function parseTrainUpdatedAtMs(train) {
  const candidates = [train?.lastUpdated, train?.updatedAt, train?.reportedAt];
  for (const value of candidates) {
    const ms = Date.parse(`${value || ""}`);
    if (Number.isFinite(ms)) return ms;
  }
  return NaN;
}

function getPredictiveLeadMs(train, providerAgeMs) {
  const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
  const age = Number.isFinite(providerAgeMs) ? Math.max(0, providerAgeMs) : 0;
  if (sourceKey === "amtrak" || sourceKey === "amtraker") {
    return clampNumber(SYNC_LEAD_MS + age, SYNC_LEAD_MS, 70_000);
  }
  return clampNumber(SYNC_LEAD_MS + Math.min(age, 12_000), SYNC_LEAD_MS, 18_000);
}

function projectCoordinateForward(coords, headingDeg, speedMph, leadMs) {
  if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return coords;
  if (!Number.isFinite(headingDeg) || !Number.isFinite(speedMph) || !Number.isFinite(leadMs)) return coords;
  if (speedMph <= 0 || leadMs <= 0) return coords;

  const leadHours = leadMs / 3_600_000;
  const distanceMiles = clampNumber(speedMph * leadHours, 0, 0.9);
  if (distanceMiles <= 0) return coords;

  const headingRad = headingDeg * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const deltaLat = (distanceMiles / earthRadiusMiles) * (180 / Math.PI) * Math.cos(headingRad);
  const cosLat = Math.cos(coords.lat * Math.PI / 180);
  const safeCos = Math.abs(cosLat) < 0.02 ? 0.02 : cosLat;
  const deltaLon = (distanceMiles / (earthRadiusMiles * safeCos)) * (180 / Math.PI) * Math.sin(headingRad);
  return { lat: coords.lat + deltaLat, lon: coords.lon + deltaLon };
}

// 1-second algorithmic tracking with proper dead-reckoning
function startAlgorithmicEngine() {
  if (!state.uiSettings.predictedMovementVisible) return;
  if (state.algAnimFrameId) cancelAnimationFrame(state.algAnimFrameId);
  let lastTs = performance.now();
  let updateAccumulator = 0;

  // Constant max limiters
  const MAX_SPEED_MPH = 150; // Max reasonable train speed
  const MAX_STEP_DEG = 0.05; // Max allowable position leap per frame in degrees
  const HEADING_BLEND = 0.18;

  // Throttling: keep mobile lighter so map rendering wins over algorithmic smoothing
  const isMobileRuntime = state.isMobile || window.innerWidth <= 768;
  const lowTierRuntime = state.lowTierDevice || isLowTierDevice();
  const UPDATE_INTERVAL = lowTierRuntime ? 200 : (isMobileRuntime ? 120 : 56);
  const PHYSICS_STEP_MS = lowTierRuntime ? 70 : (isMobileRuntime ? 42 : 0);

  function tick(now) {
    const dtMs = now - lastTs;
    if (PHYSICS_STEP_MS > 0 && dtMs < PHYSICS_STEP_MS) {
      state.algAnimFrameId = requestAnimationFrame(tick);
      return;
    }
    lastTs = now;
    updateAccumulator += dtMs;

    const features = [];
    const processedKeys = new Set();

    const zoom = state.map ? state.map.getZoom() : 0;
    const bounds = state.map ? state.map.getBounds() : null;
    let minLat = -90, maxLat = 90, minLon = -180, maxLon = 180;
    if (bounds) {
      const s = bounds.getSouth(), n = bounds.getNorth();
      const w = bounds.getWest(), e = bounds.getEast();
      const dLat = (n - s) * 0.1;
      const dLon = (e - w) * 0.1;
      minLat = s - dLat; maxLat = n + dLat;
      minLon = w - dLon; maxLon = e + dLon;
    }

    // Process each train snapshot
    state.trainSnapshots.forEach((snap, key) => {
      processedKeys.add(key);
      const isSelected = state.selectedTrain && `${state.selectedTrain.source}:${state.selectedTrain.id}` === key;

      // Viewport Culling: Skip physics and rendering for off-screen/low-zoom trains
      const latRaw = Number(snap.lat);
      const lonRaw = Number(snap.lon);
      const isOffScreen = (latRaw < minLat || latRaw > maxLat || lonRaw < minLon || lonRaw > maxLon);
      const snapSourceKey = `${snap.source || ""}`.trim().toLowerCase();
      const isLowZoomFiltered = zoom < 6 && !LOW_ZOOM_ALWAYS_VISIBLE_SOURCES.has(snapSourceKey);

      if (!isSelected && (isOffScreen || isLowZoomFiltered)) {
        return;
      }

      const speedMph = Number(snap.speed) || 0;
      let lat = latRaw;
      let lon = lonRaw;
      let displayLat = Number.isFinite(Number(snap.displayLat)) ? Number(snap.displayLat) : lat;
      let displayLon = Number.isFinite(Number(snap.displayLon)) ? Number(snap.displayLon) : lon;
      let displayHeading = Number.isFinite(Number(snap.displayHeading))
        ? Number(snap.displayHeading)
        : Number(compassToDegrees(snap.heading) ?? 0);

      // Rule 4: Threshold Reset - 2 second Slide
      if (snap.slideDurationMs > 0) {
        const dtMsSlide = Math.min(dtMs, snap.slideDurationMs);
        const fraction = dtMsSlide / snap.slideDurationMs;
        lat += snap.reconLat * fraction;
        lon += snap.reconLon * fraction;
        snap.reconLat *= (1 - fraction);
        snap.reconLon *= (1 - fraction);
        snap.slideDurationMs -= dtMsSlide;
      }

      // Rule 3: Soft Convergence - 30 second Drift
      if (snap.driftUntilMs && snap.driftUntilMs > now && !snap.isDwelling) {
        const timeRemaining = snap.driftUntilMs - now + dtMs; // time from start of this tick
        const dtMsDrift = Math.min(dtMs, timeRemaining);
        const fraction = dtMsDrift / timeRemaining;
        lat += snap.reconLat * fraction;
        lon += snap.reconLon * fraction;
        snap.reconLat *= (1 - fraction);
        snap.reconLon *= (1 - fraction);
      }

      // Physics Engine: Acceleration / Deceleration
      const dtSeconds = dtMs / 1000;
      const speedZoneLimit = checkSpeedZone(lat, lon, snap.source);
      const stationTarget = getNextStationTarget(snap, { lat, lon });
      const stationLimit = computeStationApproachSpeedLimit(Number(stationTarget?.distanceMiles));
      const providerTargetSpeed = Number(snap.targetSpeed);
      const statusTextLower = `${snap.status || ""}`.toLowerCase();
      const isStopStatus =
        statusTextLower.includes("stopped")
        || statusTextLower.includes("arrived")
        || statusTextLower.includes("hold");
      const stationDistanceMiles = Number(stationTarget?.distanceMiles);
      const isStationApproach = Number.isFinite(stationDistanceMiles) && stationDistanceMiles <= 2.5;

      // If provider speed is stale/low between stations, allow cruise acceleration toward track speed.
      const shouldCruiseToTrack = !isStopStatus && !snap.isDwelling && !isStationApproach;
      const cruiseTrackTarget = Number.isFinite(speedZoneLimit)
        ? clampNumber(speedZoneLimit * 0.92, 12, speedZoneLimit)
        : null;
      const baseTarget = shouldCruiseToTrack && Number.isFinite(cruiseTrackTarget)
        ? Math.max(Number.isFinite(providerTargetSpeed) ? providerTargetSpeed : 0, cruiseTrackTarget)
        : (Number.isFinite(providerTargetSpeed) ? providerTargetSpeed : 0);

      const speedCaps = [
        baseTarget,
        Number.isFinite(speedZoneLimit) ? speedZoneLimit : null,
        Number.isFinite(stationLimit) ? stationLimit : null,
      ].filter((value) => Number.isFinite(value) && value >= 0);
      const targetSpeed = speedCaps.length > 0 ? Math.min(...speedCaps) : 0;
      let currentSpeed = snap.currentSpeed || 0;

      const accelGap = Math.max(0, targetSpeed - currentSpeed);
      const dynamicAccelerationRate = accelGap >= 28
        ? 7.5
        : accelGap >= 16
          ? 5.6
          : 3.8;
      const dynamicDecelerationRate = Number.isFinite(stationDistanceMiles) && stationDistanceMiles <= 0.8
        ? 9
        : 5.4;

      if (currentSpeed < targetSpeed) {
        currentSpeed = Math.min(currentSpeed + (dynamicAccelerationRate * dtSeconds), targetSpeed);
      } else if (currentSpeed > targetSpeed) {
        currentSpeed = Math.max(currentSpeed - (dynamicDecelerationRate * dtSeconds), targetSpeed);
      }
      snap.currentSpeed = currentSpeed;

      // Station lock behavior: stop precisely at station when approaching final feet.
      if (stationTarget && Number.isFinite(stationTarget.distanceMiles) && stationTarget.distanceMiles <= 0.03 && currentSpeed <= 4) {
        lat = stationTarget.lat;
        lon = stationTarget.lon;
        displayLat = stationTarget.lat;
        displayLon = stationTarget.lon;
        currentSpeed = 0;
        snap.currentSpeed = 0;
        snap.isDwelling = true;
      } else if (snap.isDwelling && (!stationTarget || Number(stationTarget.distanceMiles) > 0.08 || targetSpeed > 6)) {
        snap.isDwelling = false;
      }

      // Only move if we have valid data, are not dwelling, and speed > 0
      if (Number.isFinite(lat) && Number.isFinite(lon) && currentSpeed > 0.1 && !snap.isDwelling) {
        let targetHeading = Number(compassToDegrees(snap.heading));
        if (stationTarget && Number.isFinite(Number(stationTarget.bearingDeg))) {
          if (!Number.isFinite(targetHeading)) {
            targetHeading = Number(stationTarget.bearingDeg);
          } else {
            const dist = Number(stationTarget.distanceMiles);
            const stationWeight = clampNumber(1 - (dist / 8), 0, 0.75);
            const deltaToStation = ((Number(stationTarget.bearingDeg) - targetHeading + 540) % 360) - 180;
            targetHeading = (targetHeading + (deltaToStation * stationWeight) + 360) % 360;
          }
        }
        if (Number.isFinite(targetHeading)) {
          const headingDelta = ((targetHeading - displayHeading + 540) % 360) - 180;
          displayHeading = (displayHeading + (headingDelta * HEADING_BLEND) + 360) % 360;
        }
        const headingDeg = displayHeading;
        if (Number.isFinite(headingDeg)) {
          // Calculate distance perfectly smoothly for this frame interval
          const dtHours = dtMs / 3_600_000;
          const distMiles = Math.min(currentSpeed * dtHours, MAX_SPEED_MPH / 3600 * (dtMs / 1000));

          if (distMiles > 0) {
            const headingRad = headingDeg * Math.PI / 180;
            const R = 3958.8; // earth radius miles

            // Calculate position change
            const dLat = (distMiles / R) * (180 / Math.PI) * Math.cos(headingRad);
            const dLon = (distMiles / (R * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI) * Math.sin(headingRad);

            // Apply movement with safety limits
            if (Math.abs(dLat) < MAX_STEP_DEG && Math.abs(dLon) < MAX_STEP_DEG) {
              lat += dLat;
              lon += dLon;
            }
          }
        }
      }

      const sourceKey = `${snap?.source || ""}`.trim().toLowerCase();
      const isFreightCommunity = sourceKey === "freight-community";
      const snapFrameCounter = (Number(snap.snapFrameCounter) || 0) + 1;
      const shouldResnap =
        isFreightCommunity
        || !snap.cachedSnappedDisplay
        || currentSpeed > 6
        || (snapFrameCounter % 3 === 0);
      const snappedDisplay = shouldResnap
        ? snapTrainToRoute(snap, { lat, lon }, { forceSnap: true })
        : snap.cachedSnappedDisplay;
      if (snappedDisplay) {
        const followRate = isFreightCommunity ? 1 : (snap.realTime ? 0.34 : 0.22);
        displayLat += (snappedDisplay.lat - displayLat) * followRate;
        displayLon += (snappedDisplay.lon - displayLon) * followRate;

        if (isFreightCommunity) {
          const MAX_TRACK_OFFSET_DEG = 0.0018;
          const dLat = displayLat - snappedDisplay.lat;
          const dLon = displayLon - snappedDisplay.lon;
          if ((dLat * dLat) + (dLon * dLon) > (MAX_TRACK_OFFSET_DEG * MAX_TRACK_OFFSET_DEG)) {
            displayLat = snappedDisplay.lat;
            displayLon = snappedDisplay.lon;
          }
          lat = snappedDisplay.lat;
          lon = snappedDisplay.lon;
        }

        if (Number.isFinite(Number(snappedDisplay.trackBearing))) {
          const targetTrackHeading = Number(snappedDisplay.trackBearing);
          const headingDeltaTrack = ((targetTrackHeading - displayHeading + 540) % 360) - 180;
          displayHeading = (displayHeading + (headingDeltaTrack * 0.38) + 360) % 360;
        }
      } else {
        const freeMotionBlend = clampNumber(dtMs / 180, 0.12, 0.32);
        displayLat += (lat - displayLat) * freeMotionBlend;
        displayLon += (lon - displayLon) * freeMotionBlend;
      }

      // Write back updated position for next frame
      state.trainSnapshots.set(key, {
        ...snap,
        lat,
        lon,
        displayLat,
        displayLon,
        displayHeading,
        snapFrameCounter,
        cachedSnappedDisplay: snappedDisplay || null,
      });

      const feat = buildTrainFeatureForAlg({ ...snap, lat, lon, displayLat, displayLon, displayHeading });
      if (feat) features.push(feat);
    });

    // Clean up snapshots for trains that no longer exist (Throttled: every 60 frames)
    if (!state.tickCount) state.tickCount = 0;
    state.tickCount++;
    if (state.tickCount % 60 === 0) {
      state.trainSnapshots.forEach((val, key) => {
        if (!processedKeys.has(key)) {
          state.trainSnapshots.delete(key);
        }
      });
    }

    // Update map with new train positions (Throttled)
    if (state.map?.getSource("trains") && updateAccumulator >= UPDATE_INTERVAL) {
      updateAccumulator = 0;
      if (state.trainIndex && state.trainIndex.size > 0) {
        const passiveTrains = [];
        state.trainIndex.forEach((train, key) => {
          if (processedKeys.has(key)) return;
          passiveTrains.push(train);
        });
        const visiblePassiveTrains = getVisibleTrainsForZoom(passiveTrains);
        visiblePassiveTrains.forEach((train) => {
          const feature = buildTrainFeature(train);
          if (feature) features.push(feature);
        });
      }

      if (features.length === 0) {
        queueSourceDataUpdate("trains", { type: "FeatureCollection", features: [] });
        updateSelectedTrainViewportFollow(now);
        state.algAnimFrameId = requestAnimationFrame(tick);
        return;
      }

      ensureTrainBadgeImages(features);
      queueSourceDataUpdate("trains", { type: "FeatureCollection", features });
    }

    updateSelectedTrainViewportFollow(now);

    // Continue animation loop
    state.algAnimFrameId = requestAnimationFrame(tick);
  }

  state.algAnimFrameId = requestAnimationFrame(tick);
}

function stopAlgorithmicEngine() {
  if (state.algAnimFrameId) {
    cancelAnimationFrame(state.algAnimFrameId);
    state.algAnimFrameId = null;
  }
  if (state.algAccumulator) delete state.algAccumulator;
}

function isPredictiveMovementEligibleTrain(train) {
  if (!train) return false;
  const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
  if (!PREDICTIVE_MOVEMENT_ALLOWED_SOURCES.has(sourceKey)) return false;
  if (sourceKey !== "dcta") return true;
  const routeText = `${train?.route || ""} ${train?.name || ""}`.trim().toLowerCase();
  return !routeText || routeText.includes("a-train") || routeText.includes("atrain");
}

function updateSelectedTrainViewportFollow(nowMs = performance.now()) {
  if (!state.map || !state.followSelectedTrainOnMap) return;
  if (!state.uiSettings?.predictedMovementVisible) return;
  const selectedTrain = state.selectedTrain;
  if (!selectedTrain || !isPredictiveMovementEligibleTrain(selectedTrain)) return;
  if (state.mapInteractionActive) return;

  if (nowMs - Number(state.selectedTrainFollowLastMs || 0) < 700) return;
  const key = `${selectedTrain.source}:${selectedTrain.id}`;
  const snapshot = state.trainSnapshots.get(key);
  const followLat = Number(snapshot?.displayLat ?? snapshot?.lat ?? selectedTrain?.lat);
  const followLon = Number(snapshot?.displayLon ?? snapshot?.lon ?? selectedTrain?.lon);
  if (!Number.isFinite(followLat) || !Number.isFinite(followLon)) return;

  const canvas = state.map.getCanvas?.();
  if (!canvas) return;
  const point = state.map.project([followLon, followLat]);
  const center = state.map.getCenter();
  const centerPoint = state.map.project([center.lng, center.lat]);
  const dx = point.x - centerPoint.x;
  const dy = point.y - centerPoint.y;
  const distancePx = Math.sqrt((dx * dx) + (dy * dy));
  if (!Number.isFinite(distancePx) || distancePx < 16) return;
  if (state.map.isMoving()) return;

  state.selectedTrainFollowLastMs = nowMs;
  state.autoFollowMapMoveUntil = Date.now() + 1100;
  state.map.easeTo({
    center: [followLon, followLat],
    duration: distancePx > 200 ? 640 : 460,
    easing: (t) => 1 - Math.pow(1 - t, 2),
    essential: true,
  });
}

function canPredictTrainMovement(train) {
  if (!train || !Boolean(train.realTime)) return false;
  if (!isPredictiveMovementEligibleTrain(train)) return false;
  const lat = Number(train.lat);
  const lon = Number(train.lon);
  return Number.isFinite(lat) && Number.isFinite(lon);
}

function syncTrainMovementSnapshots(trains) {
  if (!state.uiSettings.predictedMovementVisible) {
    state.trainSnapshots.clear();
    return;
  }

  const activeKeys = new Set();
  const now = Date.now();

  (Array.isArray(trains) ? trains : []).forEach((train) => {
    if (!canPredictTrainMovement(train)) return;
    const key = `${train.source}:${train.id}`;
    activeKeys.add(key);

    const lat = Number(train.lat);
    const lon = Number(train.lon);
    const providerCoords = snapTrainToRoute(train, { lat, lon }) || { lat, lon };
    const rawProviderSpeed = Number(train.speed);
    const prev = state.trainSnapshots.get(key);

    let estimatedSpeedMph = null;
    let estimatedHeadingDeg = null;
    const prevProviderLat = Number(prev?.providerLat);
    const prevProviderLon = Number(prev?.providerLon);
    const prevProviderAtMs = Number(prev?.providerAtMs);
    if (Number.isFinite(prevProviderLat) && Number.isFinite(prevProviderLon) && Number.isFinite(prevProviderAtMs)) {
      const elapsedSeconds = Math.max(1, (now - prevProviderAtMs) / 1000);
      if (elapsedSeconds >= 5 && elapsedSeconds <= 900) {
        const movedMiles = haversineMiles(
          { lat: prevProviderLat, lon: prevProviderLon },
          { lat: providerCoords.lat, lon: providerCoords.lon }
        );
        if (Number.isFinite(movedMiles) && movedMiles >= 0.003) {
          estimatedSpeedMph = Math.min(160, (movedMiles / elapsedSeconds) * 3600);
          estimatedHeadingDeg = calculateBearingDegrees(prevProviderLat, prevProviderLon, providerCoords.lat, providerCoords.lon);
        }
      }
    }

    const targetSpeed = Number.isFinite(rawProviderSpeed) && rawProviderSpeed > 0
      ? Math.max(0, Math.min(160, rawProviderSpeed))
      : Number.isFinite(estimatedSpeedMph) && estimatedSpeedMph > 0
        ? Math.max(0, Math.min(160, estimatedSpeedMph))
        : Math.max(0, Math.min(160, Number(prev?.currentSpeed) || 0));

    const providerHeadingDeg = compassToDegrees(train.heading);
    const trackHeadingDeg = Number.isFinite(Number(providerCoords?.trackBearing))
      ? Number(providerCoords.trackBearing)
      : null;
    const resolvedHeadingDeg = Number.isFinite(Number(providerHeadingDeg))
      ? Number(providerHeadingDeg)
      : Number.isFinite(Number(trackHeadingDeg))
        ? Number(trackHeadingDeg)
      : Number.isFinite(Number(estimatedHeadingDeg))
        ? Number(estimatedHeadingDeg)
        : Number.isFinite(Number(prev?.displayHeading))
          ? Number(prev.displayHeading)
          : null;

    const reportedAtMs = parseTrainUpdatedAtMs(train);
    const providerAgeMs = Number.isFinite(reportedAtMs) ? Math.max(0, now - reportedAtMs) : 0;
    const leadMs = getPredictiveLeadMs(train, providerAgeMs);
    const projectedProvider = projectCoordinateForward(
      providerCoords,
      Number.isFinite(Number(resolvedHeadingDeg)) ? Number(resolvedHeadingDeg) : NaN,
      targetSpeed,
      leadMs
    );
    const projectedProviderCoords = snapTrainToRoute(train, projectedProvider) || providerCoords;

    const previousLat = Number.isFinite(Number(prev?.lat)) ? Number(prev.lat) : projectedProviderCoords.lat;
    const previousLon = Number.isFinite(Number(prev?.lon)) ? Number(prev.lon) : projectedProviderCoords.lon;
    const deltaLat = projectedProviderCoords.lat - previousLat;
    const deltaLon = projectedProviderCoords.lon - previousLon;
    const correctionMiles = haversineMiles(
      { lat: previousLat, lon: previousLon },
      { lat: projectedProviderCoords.lat, lon: projectedProviderCoords.lon }
    );
    const shouldCorrect = Number.isFinite(correctionMiles) && correctionMiles > 0.01;
    const useQuickSlide = shouldCorrect && correctionMiles > 1.2;

    state.trainSnapshots.set(key, {
      ...train,
      lat: previousLat,
      lon: previousLon,
      heading: Number.isFinite(Number(resolvedHeadingDeg)) ? Number(resolvedHeadingDeg) : train.heading,
      targetSpeed,
      currentSpeed: Number.isFinite(Number(prev?.currentSpeed)) ? Number(prev.currentSpeed) : targetSpeed,
      displayLat: Number.isFinite(Number(prev?.displayLat)) ? Number(prev.displayLat) : projectedProviderCoords.lat,
      displayLon: Number.isFinite(Number(prev?.displayLon)) ? Number(prev.displayLon) : projectedProviderCoords.lon,
      displayHeading: Number.isFinite(Number(prev?.displayHeading))
        ? Number(prev.displayHeading)
        : (Number.isFinite(Number(resolvedHeadingDeg)) ? Number(resolvedHeadingDeg) : 0),
      reconLat: shouldCorrect ? deltaLat : 0,
      reconLon: shouldCorrect ? deltaLon : 0,
      slideDurationMs: useQuickSlide ? 2000 : 0,
      driftUntilMs: shouldCorrect && !useQuickSlide ? now + 30000 : 0,
      isDwelling: targetSpeed < 1,
      realTime: true,
      providerLat: projectedProviderCoords.lat,
      providerLon: projectedProviderCoords.lon,
      providerAtMs: now,
    });
  });

  [...state.trainSnapshots.keys()].forEach((key) => {
    if (!activeKeys.has(key)) state.trainSnapshots.delete(key);
  });
}

function applyTrainMovementMode(trains = getAllTrains()) {
  if (!FEATURE_TRAIN_MOVEMENT_ENABLED) {
    stopAlgorithmicEngine();
    state.trainSnapshots.clear();
    state.followSelectedTrainOnMap = false;
    state.uiSettings.predictedMovementVisible = false;
    setTrainSpeedLabelsVisible(false);
    return;
  }

  const hasFreightCommunity = (Array.isArray(trains) ? trains : []).some(
    (train) => `${train?.source || ""}`.trim().toLowerCase() === "freight-community"
  );
  if (hasFreightCommunity && !state.freightRoutesLoaded && !state.freightRoutesLoadingPromise) {
    loadFreightRoutesDeferred().catch(() => null);
  }

  if (state.uiSettings.predictedMovementVisible) {
    syncTrainMovementSnapshots(trains);
    if (state.trainSnapshots.size > 0) {
      startAlgorithmicEngine();
    } else {
      stopAlgorithmicEngine();
    }
  } else {
    stopAlgorithmicEngine();
    state.trainSnapshots.clear();
    state.followSelectedTrainOnMap = false;
  }
  setTrainSpeedLabelsVisible(state.uiSettings.predictedMovementVisible);
}
// ─────────────────────────────────────────────────────────────────

function scheduleRefresh() {
  if (state.refreshTimer) clearInterval(state.refreshTimer);
  state.refreshTimer = null;
  const refreshSeconds = Number(state.uiSettings?.refreshSeconds);
  const intervalMs = (Number.isFinite(refreshSeconds) && refreshSeconds > 0 ? refreshSeconds : 180) * 1000;
  state.refreshTimer = setInterval(() => {
    if (state.pageHidden) return;
    refreshData().catch(() => null);
  }, intervalMs);
}

function scheduleFreightRefresh() {
  if (state.freightRefreshTimer) clearInterval(state.freightRefreshTimer);
  state.freightRefreshTimer = null;
  state.freightRefreshTimer = setInterval(() => {
    if (state.pageHidden) return;
    refreshData({ freightOnly: true, forceFreight: true }).catch(() => null);
  }, FREIGHT_COMMUNITY_REFRESH_MS);
}

// Convert compass heading string ("NE", "W", etc.) or numeric degrees to degrees 0-360
function compassToDegrees(heading) {
  if (heading == null || heading === "") return null;
  if (typeof heading === "number" && !Number.isNaN(heading)) return heading % 360;
  const map = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  const str = `${heading}`.trim().toUpperCase();
  if (str in map) return map[str];
  const num = parseFloat(str);
  return Number.isNaN(num) ? null : num % 360;
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

function applyUserLocationPosition(pos, { center = false } = {}) {
  if (!pos?.coords || !state.map) return null;
  const longitude = Number(pos.coords.longitude);
  const latitude = Number(pos.coords.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  state.userLocation = {
    lon: longitude,
    lat: latitude,
    accuracy: Number(pos.coords.accuracy) || null,
    updatedAt: Date.now(),
  };
  state.locationEnabled = true;
  safeSetLocalStorage(LOCATION_TOGGLE_KEY, "true");

  if (!state.locationMarker) {
    const el = document.createElement("div");
    el.className = "location-dot";
    state.locationMarker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([longitude, latitude])
      .addTo(state.map);
  } else {
    state.locationMarker.setLngLat([longitude, latitude]);
  }

  if (center) {
    state.locationWatchLastCentered = Date.now();
    state.map.flyTo({ center: [longitude, latitude], zoom: Math.max(state.map.getZoom() || 0, 10), duration: 900 });
  }

  updateLocationToggleUi();
  return state.userLocation;
}

function startLocationWatch({ center = false } = {}) {
  if (!navigator.geolocation) return false;
  if (state.locationWatchId != null) return true;
  state.locationWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const shouldCenter = center && Date.now() - Number(state.locationWatchLastCentered || 0) > 3000;
      applyUserLocationPosition(pos, { center: shouldCenter });
    },
    () => {
      updateLocationToggleUi();
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    }
  );
  return true;
}

async function locateMe() {
  try {
    const pos = await getCurrentLocation();
    const loc = applyUserLocationPosition(pos, { center: true });
    startLocationWatch({ center: false });
    return loc;
  } catch {
    updateLocationToggleUi();
    return null;
  }
}

function updateLocationToggleUi() {
  const isActive = Boolean(state.locationEnabled && state.userLocation);
  if (elements.btnLocate) {
    elements.btnLocate.setAttribute("data-active", String(isActive));
    elements.btnLocate.title = isActive ? "Hide my location" : "Show my location";
    elements.btnLocate.setAttribute("aria-pressed", String(isActive));
  }
  if (elements.sightingUseLocation) {
    elements.sightingUseLocation.textContent = isActive ? "Turn off my location" : "Use my location";
  }
}

function clearUserLocation() {
  if (state.locationWatchId != null && navigator.geolocation?.clearWatch) {
    navigator.geolocation.clearWatch(state.locationWatchId);
  }
  state.locationWatchId = null;
  state.locationWatchLastCentered = 0;
  state.userLocation = null;
  state.locationEnabled = false;
  safeSetLocalStorage(LOCATION_TOGGLE_KEY, "false");
  if (state.locationMarker) {
    state.locationMarker.remove();
    state.locationMarker = null;
  }
  updateLocationToggleUi();
}

async function toggleUserLocation() {
  if (state.locationEnabled && state.userLocation) {
    clearUserLocation();
    return null;
  }
  return await locateMe();
}

function fitToTrains() {
  if (!state.map) return;
  const allTrains = getAllTrains();
  const coords = allTrains
    .map((t) => normalizeLngLat(t.lat, t.lon, t.source))
    .filter(Boolean);
  if (coords.length === 0) return;
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  coords.forEach(({ lon, lat }) => {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  state.map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 60, maxZoom: 9, duration: 800 });
}

const SPEED_LABEL_OVERRIDES = [
  ["heartland flyer", "55 mph"],
  ["coast starlight", "79 mph"],
  ["texas eagle", "79 mph"],
  ["sunset limited", "70 mph"],
  ["capitol corridor", "60 mph"],
  ["san joaquins", "70 mph"],
];

function getSpeedLabelForRoute(route) {
  const name = normalizeRouteName(route?.name);
  for (const [needle, label] of SPEED_LABEL_OVERRIDES) {
    if (name.includes(needle)) {
      return label;
    }
  }
  return null;
}

function ensureSpeedLabelLayers() {
  if (!state.map) return;
  if (!state.map.getSource("speed-labels")) {
    state.map.addSource("speed-labels", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  if (!state.map.getLayer("speed-label-text")) {
    state.map.addLayer({
      id: "speed-label-text",
      type: "symbol",
      source: "speed-labels",
      minzoom: 8.4,
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 11, 12, 12],
        "text-offset": [0, 1],
        "text-allow-overlap": false,
        "text-ignore-placement": false,
      },
      paint: {
        "text-color": "#fefefe",
        "text-halo-color": "rgba(10,10,10,0.92)",
        "text-halo-width": 1.6,
      },
    }, state.map.getLayer("routes-line") ? "routes-line" : undefined);
  }
}

function ensureSpeedLimitLayer() {
  ensureSpeedLabelLayers();
}

function buildSpeedLabelFeatures(routes) {
  const features = [];
  const seen = new Set();
  const isMobile = window.matchMedia?.("(pointer: coarse)")?.matches || window.innerWidth <= 900;
  const maxLabelsPerRoute = isMobile ? 4 : 10;
  const normalizedRoutes = Array.isArray(routes) ? routes : [];
  normalizedRoutes.forEach((route) => {
    const labelText = getSpeedLabelForRoute(route);
    if (!labelText) return;
    const lines = flattenGeometryToLines(route?.geometry || route?.normalizedGeometry);
    lines.forEach((line) => {
      if (!Array.isArray(line) || line.length < 2) return;
      const samples = sampleLinePoints(line, maxLabelsPerRoute * 2);
      let placed = 0;
      samples.forEach((point) => {
        if (placed >= maxLabelsPerRoute) return;
        const key = `${Math.round(point[0] * 1000)}:${Math.round(point[1] * 1000)}:${labelText}`;
        if (seen.has(key)) return;
        seen.add(key);
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: point },
          properties: { label: labelText },
        });
        placed += 1;
      });
    });
  });
  return features;
}

function ensureMileMarkerLayers() {
  if (!state.map) return;
  if (!state.map.getSource("mile-markers")) {
    state.map.addSource("mile-markers", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!state.map.getLayer("mile-marker-dots")) {
    state.map.addLayer({
      id: "mile-marker-dots",
      type: "circle",
      source: "mile-markers",
      minzoom: 8,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2.2, 12, 3.4],
        "circle-color": "#f8fafc",
        "circle-opacity": 0.82,
        "circle-stroke-color": "rgba(15,23,42,0.82)",
        "circle-stroke-width": 1,
      },
    }, state.map.getLayer("trains-badge") ? "trains-badge" : undefined);
  }
  if (!state.map.getLayer("mile-marker-labels")) {
    state.map.addLayer({
      id: "mile-marker-labels",
      type: "symbol",
      source: "mile-markers",
      minzoom: 8.2,
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 10, 12, 11.5],
        "text-offset": [0, 1.1],
        "text-optional": true,
        "text-max-width": 5,
      },
      paint: {
        "text-color": "#f8fafc",
        "text-halo-color": "rgba(8,12,20,0.96)",
        "text-halo-width": 1.8,
      },
    }, state.map.getLayer("trains-badge") ? "trains-badge" : undefined);
  }
}

function setSpeedLimitsVisible(visible) {
  state.uiSettings.speedLimitsVisible = Boolean(visible);
  ensureSpeedLabelLayers();
  ["speed-label-text"].forEach((layerId) => {
    if (!state.map?.getLayer(layerId)) return;
    state.map.setLayoutProperty(layerId, "visibility", state.uiSettings.speedLimitsVisible ? "visible" : "none");
  });
}

function interpolateAlongLineMiles(line, distanceMiles) {
  if (!Array.isArray(line) || line.length < 2 || !Number.isFinite(distanceMiles) || distanceMiles < 0) return null;
  let traveled = 0;
  for (let index = 1; index < line.length; index += 1) {
    const prev = line[index - 1];
    const curr = line[index];
    const segmentMiles = haversineMiles({ lon: prev[0], lat: prev[1] }, { lon: curr[0], lat: curr[1] });
    if (!Number.isFinite(segmentMiles) || segmentMiles <= 0) continue;
    if (traveled + segmentMiles >= distanceMiles) {
      const ratio = (distanceMiles - traveled) / segmentMiles;
      return [
        prev[0] + (curr[0] - prev[0]) * ratio,
        prev[1] + (curr[1] - prev[1]) * ratio,
      ];
    }
    traveled += segmentMiles;
  }
  return line[line.length - 1] || null;
}

function totalLineMiles(line) {
  if (!Array.isArray(line) || line.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < line.length; index += 1) {
    total += haversineMiles(
      { lon: line[index - 1][0], lat: line[index - 1][1] },
      { lon: line[index][0], lat: line[index][1] }
    );
  }
  return total;
}

function buildMileMarkerFeatures(routes) {
  if (Array.isArray(state.viewportMileposts) && state.viewportMileposts.length > 0) {
    return state.viewportMileposts
      .map((milepost) => {
        const coords = normalizeLngLat(milepost.lat, milepost.lon, "freight");
        if (!coords) return null;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [coords.lon, coords.lat] },
          properties: { label: milepost.label || "MP" },
        };
      })
      .filter(Boolean);
  }
  const features = [];
  const seen = new Set();
  (Array.isArray(routes) ? routes : []).forEach((route) => {
    const lines = flattenGeometryToLines(route?.geometry || route?.normalizedGeometry);
    const routeLength = lines.reduce((sum, line) => sum + totalLineMiles(line), 0);
    if (!Number.isFinite(routeLength) || routeLength < 25) return;
    const intervalMiles = routeLength >= 220 ? 50 : 25;
    let offsetMiles = 0;
    lines.forEach((line) => {
      if (!Array.isArray(line) || line.length < 2) {
        return;
      }
      const lineLength = totalLineMiles(line);
      if (!Number.isFinite(lineLength) || lineLength < intervalMiles) {
        offsetMiles += lineLength;
        return;
      }
      for (let mile = intervalMiles; mile < lineLength; mile += intervalMiles) {
        const point = interpolateAlongLineMiles(line, mile);
        if (!point) continue;
        const labelMiles = Math.round(offsetMiles + mile);
        const key = `${Math.round(point[0] * 1000)}:${Math.round(point[1] * 1000)}:${labelMiles}`;
        if (seen.has(key)) continue;
        seen.add(key);
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: point },
          properties: { label: `MP ${labelMiles}` },
        });
      }
      offsetMiles += lineLength;
    });
  });
  return features;
}

let milepostFetchTimer = null;

async function fetchVisibleMileposts() {
  if (state.milepostApiAvailable === false) return;
  if (!state.map || !state.uiSettings?.mileMarkersVisible) return;
  const bounds = state.map.getBounds?.();
  if (!bounds) return;
  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ].join(",");
  const payload = await safeFetchJson(`/api/mileposts/viewport?bbox=${encodeURIComponent(bbox)}`, { mileposts: [] });
  if (payload?.__missing) {
    state.milepostApiAvailable = false;
    return;
  }
  state.viewportMileposts = Array.isArray(payload?.mileposts) ? payload.mileposts : [];
  if (state.map.getSource("mile-markers")) {
    queueSourceDataUpdate("mile-markers", {
      type: "FeatureCollection",
      features: buildMileMarkerFeatures([...(state.routes || []), ...(state.commuterRoutes || []), ...(state.freightRoutes || [])]),
    });
  }
}

function scheduleVisibleMilepostFetch() {
  if (milepostFetchTimer) window.clearTimeout(milepostFetchTimer);
  milepostFetchTimer = window.setTimeout(() => {
    fetchVisibleMileposts().catch((error) => {
      console.warn("Viewport milepost fetch failed:", error);
    });
  }, state.isMobile ? 260 : 140);
}

function setMileMarkersVisible(visible) {
  // Temporarily disabled.
  state.uiSettings.mileMarkersVisible = false;
  ensureMileMarkerLayers();
  ["mile-marker-dots", "mile-marker-labels"].forEach((layerId) => {
    if (state.map?.getLayer(layerId)) {
      state.map.setLayoutProperty(layerId, "visibility", "none");
    }
  });
  state.viewportMileposts = [];
  if (state.map?.getSource("mile-markers")) {
    queueSourceDataUpdate("mile-markers", { type: "FeatureCollection", features: [] });
  }
}

function ensureTrainHistoryLayers() {
  if (!state.map) return;
  if (!state.map.getSource("train-history-lines")) {
    state.map.addSource("train-history-lines", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!state.map.getSource("train-speed-dots")) {
    state.map.addSource("train-speed-dots", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!state.map.getLayer("train-history-line")) {
    state.map.addLayer({
      id: "train-history-line",
      type: "line",
      source: "train-history-lines",
      minzoom: 4,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#60a5fa"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.4, 9, 2.6, 12, 3.4],
        "line-opacity": 0.72,
      },
    }, state.map.getLayer("trains-badge") ? "trains-badge" : undefined);
  }
  if (!state.map.getLayer("train-speed-dot")) {
    state.map.addLayer({
      id: "train-speed-dot",
      type: "circle",
      source: "train-speed-dots",
      minzoom: 5,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4.5, 9, 6.5, 12, 8.5],
        "circle-color": ["coalesce", ["get", "color"], "#38bdf8"],
        "circle-stroke-color": "rgba(5, 10, 18, 0.88)",
        "circle-stroke-width": 2,
        "circle-opacity": 0.92,
      },
    }, state.map.getLayer("trains-badge") ? "trains-badge" : undefined);
  }
  if (!state.map.getLayer("train-speed-dot-label")) {
    state.map.addLayer({
      id: "train-speed-dot-label",
      type: "symbol",
      source: "train-speed-dots",
      minzoom: 7.5,
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 7.5, 9, 12, 11],
        "text-offset": [0, 1.1],
        "text-optional": true,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#f8fafc",
        "text-halo-color": "rgba(5, 10, 18, 0.94)",
        "text-halo-width": 1.8,
      },
    }, state.map.getLayer("trains-badge") ? "trains-badge" : undefined);
  }
  if (!state.map.getLayer("train-speed-dot-hit")) {
    state.map.addLayer({
      id: "train-speed-dot-hit",
      type: "circle",
      source: "train-speed-dots",
      minzoom: 5,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 16, 9, 20, 12, 24],
        "circle-opacity": 0,
        "circle-stroke-width": 0,
      },
    });
  }

  const beforeTrainLayer = state.map.getLayer("trains-badge") ? "trains-badge" : undefined;
  ["train-history-line", "train-speed-dot", "train-speed-dot-label", "train-speed-dot-hit"].forEach((layerId) => {
    if (state.map?.getLayer(layerId)) {
      try { state.map.moveLayer(layerId, beforeTrainLayer); } catch { /* ignore ordering errors */ }
    }
  });
  bringTrainLayersToFront();

  bindSpeedDotLayerEvents();
}

function setTrainHistoryLayerVisibility() {
  ensureTrainHistoryLayers();
  const showHistory = false;
  const showDots = Boolean(state.uiSettings.speedDotsVisible);
  [
    ["train-history-line", showHistory],
    ["train-speed-dot", showDots],
    ["train-speed-dot-label", showDots],
    ["train-speed-dot-hit", showDots],
  ].forEach(([layerId, visible]) => {
    if (state.map?.getLayer(layerId)) {
      state.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  });
}

function buildSpeedDotPopupHtml(properties = {}) {
  const meta = resolveSpeedDotTrainMeta(properties);
  const trainName = meta.trainName;
  const marker = meta.markerLabel || meta.trainNum || "";
  const source = meta.sourceLabel || meta.source || "";
  const speed = Number(properties.speed);
  const speedText = Number.isFinite(speed)
    ? `${Math.round(speed)} mph`
    : (properties.speedText || "--");
  const recordedAt = properties.recordedAt
    ? formatUpdatedTimestamp(properties.recordedAt)
    : "";

  return `
    <div class="speed-dot-popup">
      <span class="speed-dot-popup__kicker">Speed point</span>
      <strong>${escapeHtml(trainName)}</strong>
      <div class="speed-dot-popup__meta">
        ${marker ? `<span>${escapeHtml(marker)}</span>` : ""}
        ${source ? `<span>${escapeHtml(source)}</span>` : ""}
      </div>
      <div class="speed-dot-popup__speed">${escapeHtml(speedText)}</div>
      ${recordedAt ? `<div class="speed-dot-popup__time">Recorded ${escapeHtml(recordedAt)}</div>` : ""}
    </div>
  `;
}

function resolveSpeedDotTrainMeta(properties = {}) {
  const key = properties.trainKey || properties.trainId || "";
  const train = key ? state.trainIndex?.get?.(key) : null;
  const source = properties.source || (key.includes(":") ? key.split(":")[0] : "");
  const rawId = properties.rawTrainId || properties.trainNum || (key.includes(":") ? key.split(":").slice(1).join(":") : "");
  const trainName =
    train?.name
    || properties.trainName
    || properties.route
    || (rawId ? `Train ${rawId}` : "Train");
  return {
    trainName,
    trainNum: train?.trainNum || rawId,
    markerLabel: train ? formatMarkerLabel(train) : (properties.markerLabel || rawId),
    source,
    sourceLabel: train ? (sources[train.source]?.label || train.source || source) : (properties.sourceLabel || sources[source]?.label || source),
  };
}

function openSpeedDotPopup(event) {
  const feature = event?.features?.[0];
  if (!feature?.geometry?.coordinates || !state.map) return;
  state.suppressNextGlobalMapClick = true;
  event.originalEvent?.stopPropagation?.();
  state.speedDotPopup?.remove?.();
  state.speedDotPopup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    offset: 16,
    maxWidth: "280px",
    className: "speed-dot-map-popup",
  })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(buildSpeedDotPopupHtml(feature.properties || {}))
    .addTo(state.map);
}

function bindSpeedDotLayerEvents() {
  if (!state.map || state.speedDotLayerEventsBound) return;
  state.map.on("mouseenter", "train-speed-dot-hit", () => {
    state.map.getCanvas().style.cursor = "pointer";
  });
  state.map.on("mouseleave", "train-speed-dot-hit", () => {
    state.map.getCanvas().style.cursor = "";
  });
  state.map.on("click", "train-speed-dot-hit", openSpeedDotPopup);
  state.speedDotLayerEventsBound = true;
}

function setSpeedDotsVisible(visible) {
  state.uiSettings.speedDotsVisible = Boolean(visible);
  setTrainHistoryLayerVisibility();
  updateTrainHistoryLayers(Array.from(state.trainIndex?.values?.() || []));
}

function setTrainHistoryVisible(visible) {
  state.uiSettings.trainHistoryVisible = Boolean(visible);
  if (!state.uiSettings.trainHistoryVisible) {
    state.historyPlaybackTimestamp = null;
    stopHistoryPlayback();
  } else {
    const bounds = getTrainHistoryBounds();
    state.historyPlaybackTimestamp = bounds?.max ?? Date.now();
    updateHistoryPlaybackUi();
  }
  setTrainHistoryLayerVisibility();
  updateTrainHistoryLayers(Array.from(state.trainIndex?.values?.() || []));
  if (state.uiSettings.trainHistoryVisible) {
    refreshTrainMarkersForViewport();
  }
}

function getTrainHistoryPoint(train, fallbackTimestamp = Date.now()) {
  if (!train) return null;
  const coords = normalizeLngLat(train.lat, train.lon, train.source);
  if (!coords) return null;
  const speed = Number(train.speed ?? train.currentSpeed ?? train.speedMph);
  const timestampRaw = train.lastUpdated || train.timestamp || train.updatedAt || fallbackTimestamp;
  const timestamp = new Date(timestampRaw).getTime();
  return {
    lat: coords.lat,
    lon: coords.lon,
    speed: Number.isFinite(speed) ? speed : null,
    timestamp: Number.isFinite(timestamp) ? timestamp : fallbackTimestamp,
  };
}

function rememberTrainPosition(train, nowMs = Date.now()) {
  if (!train) return;
  const key = `${train.source}:${train.id}`;
  const point = getTrainHistoryPoint(train, nowMs);
  if (!point) return;
  point.trainKey = key;
  point.trainName = train.name || train.route || `Train ${train.trainNum || train.id || ""}`.trim();
  point.trainNum = train.trainNum || train.id || "";
  point.markerLabel = formatMarkerLabel(train);
  point.source = train.source || "";
  point.sourceLabel = sources[train.source]?.label || train.source || "";
  point.route = getRouteDisplayLabel(train);

  const existing = state.trainPositionHistory.get(key) || [];
  const last = existing[existing.length - 1];
  const movedMiles = last ? haversineMiles(last, point) : Infinity;
  const timeDelta = last ? Math.abs(point.timestamp - last.timestamp) : Infinity;
  if (!last || movedMiles >= 0.05 || timeDelta >= 60_000) {
    existing.push(point);
  } else if (last) {
    last.speed = point.speed;
    last.timestamp = Math.max(last.timestamp, point.timestamp);
  }

  const cutoff = nowMs - (72 * 60 * 60 * 1000);
  state.trainPositionHistory.set(
    key,
    existing
      .filter((row) => Number(row.timestamp) >= cutoff)
      .slice(-720)
  );
}

function speedDotColor(speed) {
  const value = Number(speed);
  if (!Number.isFinite(value)) return "#94a3b8";
  if (value >= 80) return "#ef4444";
  if (value >= 60) return "#f59e0b";
  if (value >= 35) return "#22c55e";
  return "#38bdf8";
}

function buildTrainHistoryFeatures() {
  const lineFeatures = [];
  const dotFeatures = [];
  state.trainPositionHistory.forEach((points, key) => {
    const clean = (Array.isArray(points) ? points : [])
      .filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lon))
      .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    if (clean.length < 2) return;

    const train = state.trainIndex?.get?.(key);
    const sourceKey = key.split(":")[0] || "";
    const color = train ? (train.lineColor || getTrainDisplayColor(train)) : (getOperatorColor(sourceKey) || "#60a5fa");
    const latestPoint = clean[clean.length - 1] || {};
    const trainName = train?.name || latestPoint.trainName || key.split(":").slice(1).join(":") || "Train";
    const trainNum = train?.trainNum || latestPoint.trainNum || train?.id || key.split(":").slice(1).join(":") || "";
    const markerLabel = train ? formatMarkerLabel(train) : `${trainNum}`.trim();
    const sourceLabel = train ? (sources[train.source]?.label || train.source || sourceKey) : (latestPoint.sourceLabel || sources[sourceKey]?.label || sourceKey);
    let distanceSinceDot = 0;
    let maxSpeed = Number(clean[0]?.speed);
    for (let index = 1; index < clean.length; index += 1) {
      const previous = clean[index - 1];
      const current = clean[index];
      const segmentMiles = haversineMiles(previous, current);
      if (!Number.isFinite(segmentMiles) || segmentMiles <= 0) continue;
      distanceSinceDot += segmentMiles;
      const currentSpeed = Number(current.speed);
      if (Number.isFinite(currentSpeed)) {
        maxSpeed = Number.isFinite(maxSpeed) ? Math.max(maxSpeed, currentSpeed) : currentSpeed;
      }
      if (distanceSinceDot < 10) continue;
      const labelSpeed = Number.isFinite(maxSpeed) ? Math.round(maxSpeed) : null;
      dotFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [current.lon, current.lat] },
        properties: {
          id: `${key}:${current.timestamp}`,
          trainId: key,
          trainKey: key,
          rawTrainId: trainNum,
          speed: labelSpeed,
          label: labelSpeed != null ? `${labelSpeed}` : "",
          color: speedDotColor(labelSpeed),
          trainName,
          trainNum,
          markerLabel,
          source: sourceKey,
          sourceLabel,
          route: train?.route || latestPoint.route || "",
          speedText: labelSpeed != null ? `${labelSpeed} mph` : "--",
          recordedAt: new Date(Number(current.timestamp || Date.now())).toISOString(),
        },
      });
      distanceSinceDot = 0;
      maxSpeed = currentSpeed;
    }
  });

  return {
    lines: { type: "FeatureCollection", features: lineFeatures },
    dots: { type: "FeatureCollection", features: dotFeatures },
  };
}

function updateTrainHistoryLayers(trains = []) {
  if (!state.map) return;
  ensureTrainHistoryLayers();
  const nowMs = Date.now();
  (Array.isArray(trains) ? trains : []).forEach((train) => rememberTrainPosition(train, nowMs));
  persistTrainPositionHistory(nowMs);

  if (!state.uiSettings.trainHistoryVisible && !state.uiSettings.speedDotsVisible) {
    queueSourceDataUpdate("train-history-lines", { type: "FeatureCollection", features: [] });
    queueSourceDataUpdate("train-speed-dots", { type: "FeatureCollection", features: [] });
    setTrainHistoryLayerVisibility();
    return;
  }

  const features = buildTrainHistoryFeatures();
  queueSourceDataUpdate("train-history-lines", { type: "FeatureCollection", features: [] });
  queueSourceDataUpdate("train-speed-dots", features.dots);
  setTrainHistoryLayerVisibility();
  bringTrainLayersToFront();
}



function haversineMiles(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
}



async function loadSightings() {
  const payload = await safeFetchJson("/api/sightings", { sightings: [] });
  const allSightings = Array.isArray(payload?.sightings) ? payload.sightings : [];
  state.sightings = allSightings.filter((row) => !isExpiredHeritageSighting(row));
  renderSightings();
}

async function loadGallery() {
  const payload = await safeFetchJson("/api/gallery", { photos: [] });
  state.galleryPhotos = Array.isArray(payload?.photos) ? payload.photos : [];
  renderGallery();
}

const GALLERY_RAILROAD_KEYWORDS = {
  up: ["up", "union pacific", "u.p."],
  bnsf: ["bnsf", "burlington northern", "santa fe"],
  ns: ["ns", "norfolk southern"],
  csx: ["csx"],
  amtrak: ["amtrak"],
  cn: ["cn", "canadian national"],
  cpkc: ["cpkc", "canadian pacific", "cp rail", "kansas city southern", "kcs"],
  commuter: [
    "metra",
    "mta",
    "lirr",
    "metro-north",
    "septa",
    "mbta",
    "nj transit",
    "caltrain",
    "dart",
    "tre",
    "texrail",
    "front runner",
    "sounder",
    "go transit",
    "via rail",
    "brightline",
  ],
};

function getGallerySearchText(photo) {
  return [
    photo?.uploaderName,
    photo?.description,
    photo?.locationText,
    photo?.railroad,
    photo?.railroadTag,
    photo?.tags,
  ]
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterGalleryPhotos(photos) {
  const query = `${elements.gallerySearch?.value || ""}`.trim().toLowerCase();
  const railroad = `${elements.galleryRailroadFilter?.value || "all"}`.trim().toLowerCase();
  const railroadTerms = railroad === "all" ? [] : (GALLERY_RAILROAD_KEYWORDS[railroad] || [railroad]);
  return photos.filter((photo) => {
    const haystack = getGallerySearchText(photo);
    const queryMatches = !query || query.split(/\s+/).every((term) => haystack.includes(term));
    const railroadMatches = railroad === "all" || railroadTerms.some((term) => haystack.includes(term));
    return queryMatches && railroadMatches;
  });
}

function renderGallery() {
  if (!elements.galleryGrid) return;
  const photos = Array.isArray(state.galleryPhotos) ? state.galleryPhotos : [];
  if (!photos.length) {
    elements.galleryGrid.innerHTML = `<p class="empty-state">No photos yet. Be the first to add one.</p>`;
    return;
  }
  const filteredPhotos = filterGalleryPhotos(photos);
  if (!filteredPhotos.length) {
    elements.galleryGrid.innerHTML = `<p class="empty-state">No photos match that search.</p>`;
    return;
  }
  elements.galleryGrid.innerHTML = filteredPhotos
    .map((photo) => {
      const created = photo.createdAt ? new Date(photo.createdAt) : null;
      const createdText = created && !Number.isNaN(created.getTime())
        ? created.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
        : "";
      return `
        <button class="gallery-card" type="button" data-gallery-photo-id="${escapeHtml(photo.id || "")}" aria-label="Open photo by ${escapeHtml(photo.uploaderName || "Railfan")}">
          <img src="${escapeHtml(photo.mediaUrl || "")}" alt="${escapeHtml(photo.description || "Rail gallery photo")}" loading="lazy" />
          <div class="gallery-card-body">
            <div class="gallery-card-meta">
              <strong>${escapeHtml(photo.uploaderName || "Railfan")}</strong>
              <span>${escapeHtml(createdText)}</span>
            </div>
            <p>${escapeHtml(photo.description || "")}</p>
            <span class="gallery-location">${escapeHtml(photo.locationText || "")}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function closeGalleryPhotoDetail() {
  if (!elements.galleryPhotoDetail) return;
  elements.galleryPhotoDetail.classList.remove("active");
  elements.galleryPhotoDetail.innerHTML = "";
}

function openGalleryPhotoDetail(photoId) {
  if (!elements.galleryPhotoDetail) return;
  const photo = (state.galleryPhotos || []).find((row) => `${row.id}` === `${photoId}`);
  if (!photo) return;
  const created = photo.createdAt ? new Date(photo.createdAt) : null;
  const createdText = created && !Number.isNaN(created.getTime())
    ? created.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
  elements.galleryPhotoDetail.innerHTML = `
    <div class="gallery-photo-detail__backdrop" data-close-gallery-photo></div>
    <article class="gallery-photo-detail__panel">
      <button class="close-btn gallery-photo-detail__close" type="button" data-close-gallery-photo aria-label="Close photo detail">&#xD7;</button>
      <img src="${escapeHtml(photo.mediaUrl || "")}" alt="${escapeHtml(photo.description || "Rail gallery photo")}" />
      <div class="gallery-photo-detail__body">
        <span class="settings-hero-kicker">${escapeHtml(photo.locationText || "Railfan photo")}</span>
        <h4>${escapeHtml(photo.uploaderName || "Railfan")}</h4>
        <p>${escapeHtml(photo.description || "")}</p>
        ${createdText ? `<span>${escapeHtml(createdText)}</span>` : ""}
      </div>
    </article>
  `;
  elements.galleryPhotoDetail.classList.add("active");
}

function updateGalleryDescriptionCount() {
  if (!elements.galleryDescriptionCount || !elements.galleryDescription) return;
  const count = `${elements.galleryDescription.value || ""}`.length;
  elements.galleryDescriptionCount.textContent = `${Math.min(count, 250)} / 250`;
}

function openGalleryModal() {
  elements.galleryModal?.querySelector(".gallery-content")?.classList.remove("gallery-upload-open");
  elements.galleryModal?.classList.add("active");
  updateGalleryDescriptionCount();
  loadGallery().catch(() => {
    if (elements.galleryGrid) elements.galleryGrid.innerHTML = `<p class="empty-state">Gallery unavailable.</p>`;
  });
}

function closeGalleryModal() {
  closeGalleryPhotoDetail();
  elements.galleryModal?.querySelector(".gallery-content")?.classList.remove("gallery-upload-open");
  elements.galleryModal?.classList.remove("active");
  if (document.body.dataset.appView === "gallery") {
    setAppView(state.previousAppViewBeforeGallery || "map");
  }
}

function setGalleryUploadOpen(open) {
  elements.galleryModal?.querySelector(".gallery-content")?.classList.toggle("gallery-upload-open", Boolean(open));
  if (open) {
    window.setTimeout(() => elements.galleryUploaderName?.focus?.(), 50);
  }
}

function openDownloadModal() {
  elements.downloadModal?.classList.add("active");
}

function closeDownloadModal() {
  elements.downloadModal?.classList.remove("active");
}

function openDownloadLink(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function submitGalleryUpload(event) {
  if (event.cancelable) event.preventDefault();
  const uploaderName = `${elements.galleryUploaderName?.value || ""}`.trim();
  const locationText = `${elements.galleryLocation?.value || ""}`.trim();
  const description = `${elements.galleryDescription?.value || ""}`.trim().slice(0, 250);
  const photo = elements.galleryPhoto?.files?.[0];
  if (!uploaderName || !locationText || !description || !photo) {
    if (elements.galleryUploadStatus) elements.galleryUploadStatus.textContent = "Name, location, description, and photo are required.";
    return;
  }
  if (!`${photo.type || ""}`.startsWith("image/")) {
    if (elements.galleryUploadStatus) elements.galleryUploadStatus.textContent = "Choose an image file.";
    return;
  }
  if (elements.galleryUploadStatus) elements.galleryUploadStatus.textContent = "Uploading photo...";
  const payload = new FormData();
  payload.append("uploaderName", uploaderName);
  payload.append("locationText", locationText);
  payload.append("description", description);
  payload.append("photo", photo);
  try {
    const response = await fetch(apiUrl("/api/gallery/upload"), {
      method: "POST",
      body: payload,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || "Upload failed");
    if (result?.photo) {
      state.galleryPhotos = [result.photo, ...(state.galleryPhotos || [])];
      renderGallery();
    } else {
      await loadGallery();
    }
    elements.galleryUploadForm?.reset();
    updateGalleryDescriptionCount();
    setGalleryUploadOpen(false);
    if (elements.galleryUploadStatus) elements.galleryUploadStatus.textContent = "Photo uploaded.";
  } catch (error) {
    if (elements.galleryUploadStatus) elements.galleryUploadStatus.textContent = error?.message || "Upload failed.";
  }
}

function isExpiredHeritageSighting(sighting) {
  const type = `${sighting?.type || ""}`.trim().toLowerCase();
  if (type !== "heritage") return false;
  const createdMs = Date.parse(`${sighting?.createdAt || sighting?.timestamp || ""}`);
  if (!Number.isFinite(createdMs)) return false;
  return (Date.now() - createdMs) > HERITAGE_SIGHTING_TTL_MS;
}

function renderSightings() {
  if (!state.map) return;
  const seen = new Set();

  state.sightings.forEach((sighting) => {
    if (isExpiredHeritageSighting(sighting)) return;
    const lat = Number(sighting.lat);
    const lon = Number(sighting.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const key = `${sighting.id}`;
    const sightingType = getSightingTypeMeta(sighting.type);
    seen.add(key);
    let marker = state.sightingMarkers.get(key);
    const markerVisible = sightingType.visible || Boolean(sighting.forceVisible);

    if (!marker) {
      const el = document.createElement("div");
      el.className = `sighting-marker ${sightingType.className}${sightingType.companyMarker ? " company-marker" : ""}`;
      el.innerHTML = getSightingMarkerHtml(sighting, sightingType);
      el.title = sighting.trainLabel || "Sighting";
      el.style.pointerEvents = "auto";
      el.style.cursor = "pointer";
      el.style.display = markerVisible ? "" : "none";

      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lon, lat])
        .addTo(state.map);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const locationText = [sighting.city, sighting.state].filter(Boolean).join(", ");
        const mediaContent = sighting.mediaUrl
          ? (sighting.mediaType?.startsWith("video/")
            ? `<video src="${sighting.mediaUrl}" controls playsinline class="sighting-video" style="width:100%; max-width:300px; border-radius:8px;"></video>`
            : `<img src="${sighting.mediaUrl}" alt="Sighting" class="sighting-image" style="max-width:300px; max-height:200px; border-radius:8px; object-fit:contain;" />`)
          : `<div class="sighting-media-empty">No photo attached for this tracker marker.</div>`;
        const html = `
          <div class="sighting-popup-content">
            <div class="sighting-header">
              <span class="sighting-type-badge ${sightingType.className}">${sightingType.badgeLabel}</span>
              <span class="sighting-train">${sighting.trainLabel || "Unknown train"}${sighting.railroad ? ` • ${sighting.railroad}` : ""}</span>
            </div>
            <div class="sighting-uploader">Uploaded by: ${sighting.uploaderName || "Anonymous"}</div>
            ${locationText ? `<div class="sighting-location">${locationText}</div>` : ""}
            <div class="sighting-media-container">${mediaContent}</div>
            ${sighting.notes ? `<div class="sighting-notes">${sighting.notes}</div>` : ""}
            <div class="sighting-footer">
              <span class="sighting-id">ID: ${sighting.id.slice(-8)}</span>
              <span class="sighting-time">${new Date(sighting.createdAt || Date.now()).toLocaleString()}</span>
            </div>
          </div>
        `;
        new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "400px" })
          .setLngLat([lon, lat])
          .setHTML(html)
          .addTo(state.map);
      });
      marker = m;
      state.sightingMarkers.set(key, marker);
    } else {
      marker.setLngLat([lon, lat]);
      const el = marker.getElement();
      el.className = `sighting-marker ${sightingType.className}${sightingType.companyMarker ? " company-marker" : ""}`;
      el.innerHTML = getSightingMarkerHtml(sighting, sightingType);
      el.style.display = markerVisible ? "" : "none";
    }
  });

  Array.from(state.sightingMarkers.entries()).forEach(([key, marker]) => {
    if (seen.has(key)) return;
    marker.remove();
    state.sightingMarkers.delete(key);
  });
}

function ensureBigBoyLayers() {
  if (!state.map) return;
  const map = state.map;

  if (!map.getSource("bigboy-route")) {
    map.addSource("bigboy-route", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  if (!map.getLayer("bigboy-route-glow")) {
    map.addLayer({
      id: "bigboy-route-glow",
      type: "line",
      source: "bigboy-route",
      paint: {
        "line-color": "#facc15",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 5, 8, 8, 14, 11],
        "line-opacity": 0.22,
        "line-blur": 4,
      },
    });
  }

  if (!map.getLayer("bigboy-route-line")) {
    map.addLayer({
      id: "bigboy-route-line",
      type: "line",
      source: "bigboy-route",
      paint: {
        "line-color": "#facc15",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.8, 8, 3.4, 14, 5.2],
        "line-opacity": 0.9,
      },
    });
  }
}

function renderBigBoyOverlay() {
  if (!state.map || !state.mapReady) return;
  ensureBigBoyLayers();

  const routeSource = state.map.getSource("bigboy-route");
  const routeFeature = state.bigBoyRouteFeature;
  if (routeSource) {
    const routeData = routeFeature && routeFeature.type === "FeatureCollection"
      ? routeFeature
      : {
        type: "FeatureCollection",
        features: routeFeature ? [routeFeature] : [],
      };
    routeSource.setData({
      ...routeData,
    });
  }

  const status = state.bigBoyStatus;
  const lat = Number(status?.lat);
  const lon = Number(status?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    if (state.bigBoyMarker) {
      state.bigBoyMarker.remove();
      state.bigBoyMarker = null;
    }
    return;
  }

  if (!state.bigBoyMarker) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "bigboy-marker";
    el.title = "UP4014";
    state.bigBoyMarker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([lon, lat])
      .addTo(state.map);

    el.addEventListener("click", (event) => {
      event.stopPropagation();
      const headingValue = Number(status?.heading);
      const headingText = Number.isFinite(headingValue)
        ? `${Math.round(headingValue)}°`
        : "Unknown";
      const speedValue = Number(status?.speed);
      const speedText = Number.isFinite(speedValue)
        ? `${Math.round(speedValue)} mph`
        : "Unknown";
      const routeFeatureCount = Array.isArray(state.bigBoyRouteFeature?.features)
        ? state.bigBoyRouteFeature.features.length
        : (state.bigBoyRouteFeature ? 1 : 0);
      const popupHtml = `
        <div class="bigboy-popup">
          <div class="bigboy-popup__title">Union Pacific Big Boy</div>
          <div class="bigboy-popup__id">UP4014</div>
          <div class="bigboy-popup__meta">${escapeHtml(status?.movement || "Stopped")} near ${escapeHtml(status?.city || "")}${status?.state ? `, ${escapeHtml(status.state)}` : ""}</div>
          <div class="bigboy-popup__grid">
            <div><span>Railroad</span><strong>Union Pacific</strong></div>
            <div><span>Speed</span><strong>${escapeHtml(speedText)}</strong></div>
            <div><span>Heading</span><strong>${escapeHtml(headingText)}</strong></div>
            <div><span>Tracks shown</span><strong>${escapeHtml(String(routeFeatureCount))}</strong></div>
            <div><span>Coordinates</span><strong>${escapeHtml(lat.toFixed(4))}, ${escapeHtml(lon.toFixed(4))}</strong></div>
            <div><span>Last update</span><strong>${escapeHtml(status?.updated || "Unknown")}</strong></div>
          </div>
        </div>
      `;
      new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 16, maxWidth: "320px" })
        .setLngLat([lon, lat])
        .setHTML(popupHtml)
        .addTo(state.map);
    });
  }

  const markerEl = state.bigBoyMarker.getElement();
  markerEl.innerHTML = `
    <span class="bigboy-marker__label">UP4014</span>
  `;
  state.bigBoyMarker.setLngLat([lon, lat]);
}

async function refreshBigBoyOverlay() {
  try {
    const payload = await safeFetchJson("/api/special/up-bigboy", {});
    state.bigBoyStatus = payload?.status || null;
    state.bigBoyRouteFeature = payload?.route || null;
    renderBigBoyOverlay();
  } catch (error) {
    console.warn("Big Boy overlay refresh failed:", error);
  }
}

function normalizeRailroadMarkerCode(value) {
  const raw = `${value || ""}`.trim().toUpperCase();
  if (!raw) return "";
  if (raw.includes("BNSF")) return "BNSF";
  if (raw.includes("UNION PACIFIC") || raw === "UP" || raw.startsWith("UP ")) return "UP";
  if (raw.includes("NORFOLK") || raw === "NS" || raw.startsWith("NS ")) return "NS";
  if (raw.includes("CSX")) return "CSX";
  if (raw.includes("CANADIAN NATIONAL") || raw === "CN") return "CN";
  if (raw.includes("CPKC") || raw === "CP" || raw.includes("KANSAS CITY SOUTHERN")) return "CPKC";
  const compact = raw.replace(/[^A-Z0-9]/g, "");
  if (!compact) return "";
  return compact.slice(0, 5);
}

function getSightingMarkerHtml(sighting, sightingType) {
  if (sightingType.companyMarker) {
    const company = normalizeRailroadMarkerCode(sighting?.railroad) || "RAIL";
    return `
      <span class="sighting-company-label" style="pointer-events:none;">${escapeHtml(company)}</span>
      <span class="sighting-corner-tag" style="pointer-events:none;">${escapeHtml(sightingType.shortLabel)}</span>
    `;
  }
  return `<span class="sighting-icon" style="pointer-events:none;">${sightingType.shortLabel}</span>`;
}

function populateSightingStates() {
  if (!elements.sightingState) return;
  const previousValue = elements.sightingState.value;
  const options = ["<option value=\"\">Select a state</option>"];
  sightingStates.forEach((name) => {
    options.push(`<option value="${name}">${name}</option>`);
  });
  elements.sightingState.innerHTML = options.join("");
  if (previousValue && sightingStates.includes(previousValue)) {
    elements.sightingState.value = previousValue;
  }
}

function populateSightingCities(stateName, preferredCity = "") {
  if (!elements.sightingCity) return;
  const cityList = sightingCitiesByState[stateName] || [];
  const options = ["<option value=\"\">Select a city</option>"];
  cityList.forEach((name) => {
    options.push(`<option value="${name}">${name}</option>`);
  });
  options.push('<option value="Other">Other / Not listed</option>');
  elements.sightingCity.innerHTML = options.join("");
  elements.sightingCity.disabled = !stateName;
  if (preferredCity) {
    elements.sightingCity.value = preferredCity;
  } else {
    elements.sightingCity.value = "";
  }
}

function getSightingTypeMeta(type) {
  const normalized = `${type || ""}`.trim().toLowerCase();
  if (normalized === "freight") {
    return {
      className: "freight",
      shortLabel: "F",
      badgeLabel: "Freight",
      visible: true,
    };
  }
  if (normalized === "defect-detector") {
    return {
      className: "defect-detector",
      shortLabel: "DF",
      badgeLabel: "Defect Detector",
      visible: true,
    };
  }
  if (normalized === "special-interest") {
    return {
      className: "special-interest",
      shortLabel: "SI",
      badgeLabel: "Special Interest",
      visible: state.showSI,
    };
  }
  return {
    className: "heritage",
    shortLabel: "H",
    badgeLabel: "Heritage",
    visible: state.showHeritage,
    companyMarker: true,
  };
}

function updateSightingFormForType(type) {
  const normalized = `${type || "heritage"}`.trim().toLowerCase();
  const isFreight = state.uploadMenuMode === "freight";

  if (elements.sightingModalTitle) {
    elements.sightingModalTitle.textContent = isFreight ? "Upload Freight Train" : "Upload Sighting";
  }

  if (elements.sightingTypeRow) {
    elements.sightingTypeRow.style.display = isFreight ? "none" : "";
  }

  if (elements.sightingMedia) {
    elements.sightingMedia.required = !isFreight;
    const mediaRow = elements.sightingMedia.closest(".settings-row");
    if (mediaRow) mediaRow.style.display = "";
  }

  document.querySelectorAll(".freight-only-field").forEach((row) => {
    if (row instanceof HTMLElement) {
      row.style.display = isFreight ? "" : "none";
    }
  });
}

function openSightingModal(type) {
  const normalized = type === "defect-detector"
    ? "defect-detector"
    : type === "special-interest"
      ? "special-interest"
      : "heritage";
  state.uploadMenuMode = type === "freight" ? "freight" : "sighting";

  const radioValue = state.uploadMenuMode === "freight" ? "heritage" : normalized;
  const radio = document.querySelector(`input[name="sightingTypeRadio"][value="${radioValue}"]`);
  if (radio) radio.checked = true;

  updateSightingFormForType(radioValue);
  populateSightingStates();
  populateSightingCities("");
  if (elements.sightingStatus) elements.sightingStatus.textContent = "";
  updateLocationToggleUi();
  elements.sightingModal?.classList.add("active");
}

function closeSightingModal() {
  elements.sightingModal?.classList.remove("active");
}

async function analyzeFreightPhotoAutofill() {
  const file = elements.sightingMedia?.files?.[0];
  if (!file) {
    if (elements.sightingStatus) elements.sightingStatus.textContent = "Select or take a photo first.";
    return;
  }

  const isImage = `${file.type || ""}`.startsWith("image/");
  if (!isImage) {
    if (elements.sightingStatus) elements.sightingStatus.textContent = "Use a photo for automatic train detection.";
    return;
  }

  if (elements.sightingStatus) elements.sightingStatus.textContent = "Analyzing photo…";
  const payload = new FormData();
  payload.append("media", file);
  payload.append("trainLabel", `${elements.sightingTrain?.value || ""}`.trim());
  payload.append("railroad", `${elements.sightingRailroad?.value || ""}`.trim());
  payload.append("notes", `${elements.sightingNotes?.value || ""}`.trim());

  try {
    const response = await fetch(apiUrl("/api/freight/analyze-media"), {
      method: "POST",
      body: payload,
    });
    if (!response.ok) throw new Error("Photo analysis failed");
    const result = await response.json();
    const suggestions = result?.suggestions || {};

    if (suggestions.trainNumber && elements.sightingTrain && !`${elements.sightingTrain.value || ""}`.trim()) {
      elements.sightingTrain.value = suggestions.trainNumber;
    }
    if (suggestions.railroad && elements.sightingRailroad && !`${elements.sightingRailroad.value || ""}`.trim()) {
      elements.sightingRailroad.value = suggestions.railroad;
    }
    if (suggestions.model && elements.sightingModel && !`${elements.sightingModel.value || ""}`.trim()) {
      elements.sightingModel.value = suggestions.model;
    }
    if (suggestions.direction && elements.sightingDirection && !`${elements.sightingDirection.value || ""}`.trim()) {
      elements.sightingDirection.value = suggestions.direction;
    }

    const confidence = `${result?.confidence || "medium"}`.toLowerCase();
    if (elements.sightingStatus) {
      elements.sightingStatus.textContent =
        confidence === "high"
          ? "Photo analyzed. Fields autofilled."
          : "Photo analyzed. Check autofilled fields before upload.";
    }
  } catch {
    if (elements.sightingStatus) elements.sightingStatus.textContent = "Could not analyze photo. Fill fields manually.";
  }
}

async function submitSightingUpload(event) {
  if (event.cancelable) event.preventDefault();
  const typeRadio = document.querySelector('input[name="sightingTypeRadio"]:checked');
  const type = typeRadio ? typeRadio.value : "heritage";
  const isFreightUpload = state.uploadMenuMode === "freight";
  const uploaderName = `${elements.sightingUploaderName?.value || ""}`.trim();
  const sightingState = `${elements.sightingState?.value || ""}`.trim();
  const rawSightingCity = `${elements.sightingCity?.value || ""}`.trim();
  const trainLabel = `${elements.sightingTrain?.value || ""}`.trim();
  const file = elements.sightingMedia?.files?.[0];
  const manualLocationText = `${elements.sightingLocation?.value || ""}`.trim();
  const sightingCity = rawSightingCity === "Other" && manualLocationText ? manualLocationText : rawSightingCity;
  if (!uploaderName || !sightingState || !rawSightingCity || !trainLabel || (!isFreightUpload && !file)) {
    if (elements.sightingStatus) {
      elements.sightingStatus.textContent = isFreightUpload
        ? "Uploader, state, city, and train are required."
        : "Uploader, state, city, train, and media are required.";
    }
    return;
  }

  if (rawSightingCity === "Other" && !manualLocationText) {
    if (elements.sightingStatus) {
      elements.sightingStatus.textContent = "Type the town, station, or crossing when City is set to Other.";
    }
    return;
  }

  if (elements.sightingStatus) elements.sightingStatus.textContent = isFreightUpload ? "Uploading freight…" : "Uploading…";

  const railroadInput = `${elements.sightingRailroad?.value || ""}`.trim();
  const notesInput = `${elements.sightingNotes?.value || ""}`.trim();
  const directionInput = `${elements.sightingDirection?.value || ""}`.trim();
  const modelInput = `${elements.sightingModel?.value || ""}`.trim();
  const estimatedSpeedInput = `${elements.sightingEstimatedSpeed?.value || ""}`.trim();
  const estimatedSpeed = Number(estimatedSpeedInput);

  let fallbackLat = null;
  let fallbackLon = null;
  let fallbackLocationSource = "";
  if (state.locationEnabled && state.userLocation) {
    fallbackLat = state.userLocation.lat;
    fallbackLon = state.userLocation.lon;
    fallbackLocationSource = "device";
  }

  let resolvedLat = null;
  let resolvedLon = null;
  let resolvedLocationSource = "";

  if (manualLocationText) {
    if (elements.sightingStatus) elements.sightingStatus.textContent = isFreightUpload ? "Resolving freight location…" : "Using typed location…";

    if (geocodingService) {
      const geocode = await geocodingService.geocodeLocation(`${manualLocationText}, ${sightingState}`);
      if (Number.isFinite(geocode?.lat) && Number.isFinite(geocode?.lon)) {
        resolvedLat = geocode.lat;
        resolvedLon = geocode.lon;
        resolvedLocationSource = "manual-geocoded";
      }
    }

    if (!Number.isFinite(resolvedLat) && Number.isFinite(fallbackLat) && Number.isFinite(fallbackLon)) {
      resolvedLat = fallbackLat;
      resolvedLon = fallbackLon;
      resolvedLocationSource = `manual-${fallbackLocationSource || "fallback"}`;
    } else if (!Number.isFinite(resolvedLat)) {
      resolvedLocationSource = "manual-unresolved";
    }
  } else if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLon)) {
    resolvedLat = fallbackLat;
    resolvedLon = fallbackLon;
    resolvedLocationSource = fallbackLocationSource || "fallback";
  } else {
    resolvedLocationSource = "city-state";
  }

  if (isFreightUpload) {
    const payload = {
      trainNumber: trainLabel,
      railroad: railroadInput,
      direction: directionInput,
      model: modelInput,
      locationLabel: manualLocationText || sightingCity,
      city: sightingCity,
      state: sightingState,
      notes: notesInput,
      uploaderName,
      locationSource: resolvedLocationSource,
    };
    if (Number.isFinite(estimatedSpeed) && estimatedSpeed >= 0) {
      payload.estimatedSpeed = estimatedSpeed;
    }
    if (Number.isFinite(resolvedLat) && Number.isFinite(resolvedLon)) {
      payload.lat = resolvedLat;
      payload.lon = resolvedLon;
    }

    try {
      const response = await fetch(apiUrl("/api/freight/upload"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Freight upload failed");
      const result = await response.json();
      if (result?.train) {
        state.freightCommunityTrains = [result.train, ...(state.freightCommunityTrains || [])]
          .filter((entry, index, arr) => arr.findIndex((x) => `${x.id || ""}` === `${entry.id || ""}`) === index);
        renderTrains(applyFilters(getAllTrains()));
      }
      if (elements.sightingStatus) elements.sightingStatus.textContent = "Freight upload complete.";
      setTimeout(closeSightingModal, 500);
    } catch {
      if (elements.sightingStatus) elements.sightingStatus.textContent = "Freight upload failed. Try again.";
    }
    return;
  }

  const payload = new FormData();
  payload.append("type", type);
  payload.append("uploaderName", uploaderName);
  payload.append("state", sightingState);
  payload.append("city", sightingCity);
  payload.append("trainLabel", trainLabel);
  payload.append("railroad", railroadInput);
  payload.append("locationText", manualLocationText);
  payload.append("notes", notesInput);
  payload.append("media", file);
  payload.append("manualLocationOverride", String(Boolean(manualLocationText)));
  payload.append("locationSource", resolvedLocationSource);
  if (Number.isFinite(resolvedLat) && Number.isFinite(resolvedLon)) {
    payload.append("lat", `${resolvedLat}`);
    payload.append("lon", `${resolvedLon}`);
  }

  try {
    const response = await fetch(apiUrl("/api/sightings/upload"), {
      method: "POST",
      body: payload,
    });
    if (!response.ok) throw new Error("Upload failed");
    const result = await response.json();
    if (result?.sighting) {
      state.sightings.unshift(result.sighting);
      renderSightings();
    } else {
      await loadSightings();
    }
    if (elements.sightingStatus) elements.sightingStatus.textContent = "Upload complete.";
    setTimeout(closeSightingModal, 500);
  } catch {
    if (elements.sightingStatus) elements.sightingStatus.textContent = "Upload failed. Try again.";
  }
}



function formatTimeAgo(timestamp) {
  if (!timestamp) return "--";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "--";
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - parsed.getTime()) / 1000));

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return parsed.toLocaleDateString();
}

function formatUpdatedTimestamp(timestamp) {
  if (!timestamp) return "--";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "--";

  const relative = formatTimeAgo(parsed.toISOString());
  const absolute = parsed.toLocaleString([], withPreferredTimeZone({
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }));
  return `${relative} • ${absolute}`;
}

function updateTimestamp() {
  // Flash the sync dot briefly to indicate a successful data update
  const el = elements.lastUpdated;
  if (!el) return;
  el.classList.remove("sync-flash--active");
  // Use requestAnimationFrame to avoid forced reflow (void el.offsetWidth)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add("sync-flash--active");
    });
  });
}

function renderContributions() {
  if (!elements.contribLinks) return;
  if (state.backendReachable === false) {
    elements.contribLinks.replaceChildren();
    const hint = document.createElement("span");
    hint.className = "contrib-api-warning";
    hint.textContent = API_BASE
      ? `Cannot reach API at ${API_BASE}. Check the URL or add ?apiBase=YOUR_BACKEND_URL to override.`
      : "Cannot reach API. If deployed: the service may be waking up — wait 1–2 min and tap Refresh. If local: run the backend (npm start).";
    elements.contribLinks.appendChild(hint);
    return;
  }
  const contributions = getDisplayContributions();
  if (contributions.length === 0) {
    elements.contribLinks.textContent = "Credits unavailable";
    return;
  }
  const linksMarkup = contributions
    .filter((entry) => `${entry.name || ""}`.trim() !== "511.org")
    .map(
      (entry) =>
        `<a href="${entry.url}" target="_blank" rel="noopener noreferrer">${entry.name}</a>`
    )
    .join("<span>•</span>");
  elements.contribLinks.innerHTML = `
    <span class="contrib-powered"><a href="http://www.511.org" target="_blank" rel="noopener noreferrer">511.org</a></span>
    ${linksMarkup ? `<span class="contrib-separator">•</span>${linksMarkup}` : ""}
  `;
}

function renderCreditsModal() {
  if (!elements.creditsList) return;
  const contributions = getDisplayContributions();
  elements.creditsList.replaceChildren();
  if (contributions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "credits-empty";
    empty.textContent = "Credits unavailable";
    elements.creditsList.appendChild(empty);
    return;
  }

  contributions.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "credits-entry";

    const head = document.createElement("div");
    head.className = "credits-entry-head";

    const title = document.createElement("a");
    title.className = "credits-entry-title";
    title.href = entry.url;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    title.textContent = entry.name || entry.url || "Source";
    head.appendChild(title);

    if (entry.licenseUrl) {
      const license = document.createElement("a");
      license.className = "credits-entry-license";
      license.href = entry.licenseUrl;
      license.target = "_blank";
      license.rel = "noopener noreferrer";
      license.textContent = entry.licenseName || "License";
      head.appendChild(license);
    }

    card.appendChild(head);

    if (entry.changes) {
      const changes = document.createElement("p");
      changes.className = "credits-entry-copy";
      changes.textContent = `Changes made: ${entry.changes}`;
      card.appendChild(changes);
    }

    if (entry.note) {
      const note = document.createElement("p");
      note.className = "credits-entry-note";
      note.textContent = entry.note;
      card.appendChild(note);
    }

    elements.creditsList.appendChild(card);
  });
}

function getDisplayContributions() {
  const rawContributions = Array.isArray(state.config?.contributions)
    ? state.config.contributions
    : [];
  const preferredNames = new Set([
    "511.org",
    "Amtrak",
    "Brightline",
    "Metra",
    "NJ Transit",
    "SEPTA",
    "MTA",
    "Metro-North",
    "LIRR",
    "MBTA",
    "BART",
    "MARTA",
    "DART",
    "VIA Rail",
    "Caltrain",
    "GO Transit",
    "Metrolink",
    "ACE",
  ]);

  const curated = rawContributions
    .filter((entry) => {
      const name = `${entry?.name || ""}`.trim();
      const url = `${entry?.url || ""}`.trim().toLowerCase();
      if (!name) return false;
      if (url.includes("github.com") || url.includes("piemadd")) return false;
      if (preferredNames.has(name)) return true;
      return /transit|rail|railroad|metro|amtrak|metra|septa|lirr|mta|bart|via/i.test(name);
    })
    .map((entry) => ({ ...entry, changes: "", note: "" }));

  if (!curated.some((entry) => `${entry.name || ""}`.includes("511"))) {
    curated.unshift({ name: "511.org", url: "http://www.511.org", changes: "", note: "" });
  }

  return curated;
}

function setQuickMode(mode) {
  state.quickMode = mode;
  elements.quickLive?.setAttribute("data-active", String(mode === "live"));
  elements.quickDelay?.setAttribute("data-active", String(mode === "delayed"));
  renderTrains(applyFilters(getAllTrains()));
}


function parseBoardMinutes(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const text = `${value}`.trim();
  const match = text.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return Number.POSITIVE_INFINITY;
  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const suffix = match[3]?.toUpperCase();
  if (suffix === "PM" && hours < 12) hours += 12;
  if (suffix === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getBoardDisplayTime(train) {
  return formatServiceTime(train.actual || train.eta || train.scheduled || "") || "--:--";
}

function buildDepartureBoardSourceOptions() {
  if (!elements.departureBoardSource) return;
  elements.departureBoardSource.innerHTML = '<option value="all">All Railroads</option>';
  Object.entries(sources).forEach(([key, meta]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = meta.label;
    elements.departureBoardSource.appendChild(option);
  });
}

function renderDepartureBoard() {
  if (!elements.departureBoardRows) return;
  const sourceFilter = elements.departureBoardSource?.value || "all";

  const rows = getAllTrains()
    .filter((train) => (sourceFilter === "all" ? true : train.source === sourceFilter))
    .map((train) => {
      const displayTime = getBoardDisplayTime(train);
      const movement =
        normalizeStatus(train.status).includes("arriv")
          ? "Arrival"
          : train.nextStop
            ? "Arrival"
            : "Departure";
      return {
        time: displayTime,
        sortValue: parseBoardMinutes(displayTime),
        trainId: formatMarkerLabel(train),
        railroad: sources[train.source]?.label || train.source,
        movement,
        destination: train.nextStop || train.route || "--",
        status: formatStatusLabel(train),
        track: train.platform || train.track || "--",
        live: Boolean(train.realTime),
      };
    })
    .sort((a, b) => a.sortValue - b.sortValue)
    .slice(0, 32);

  if (rows.length === 0) {
    elements.departureBoardRows.innerHTML = '<div class="departure-board-empty">No schedules available</div>';
    return;
  }

  elements.departureBoardRows.innerHTML = rows
    .map(
      (row) => `
      <div class="departure-board-grid departure-board-row ${row.live ? "live" : "scheduled"}">
        <span class="flip-cell">${row.time}</span>
        <span class="flip-cell">${row.trainId}</span>
        <span class="flip-cell">${row.railroad}</span>
        <span class="flip-cell">${row.movement}</span>
        <span class="flip-cell">${row.destination}</span>
        <span class="flip-cell">${row.status}</span>
        <span class="flip-cell">${row.track}</span>
      </div>
    `
    )
    .join("");
}

function buildRailcamStateOptions() {
  if (!elements.railcamState) return;
  const states = [...new Set(railcamCatalog.map((cam) => cam.state).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  elements.railcamState.innerHTML = '<option value="all">All states</option>';
  states.forEach((state) => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    elements.railcamState.appendChild(option);
  });
}

function extractYouTubeVideoId(value) {
  const input = `${value || ""}`.trim();
  if (!input) return "";
  const directMatch = input.match(/^[A-Za-z0-9_-]{11}$/);
  if (directMatch) return directMatch[0];
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function getRailcamEmbedUrl(cam) {
  if (!cam) return "";
  if (cam.provider === "youtube") {
    const resolved = state.railcamResolvedById.get(cam.id);
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
    });
    if (resolved?.resolvedEmbedUrl) {
      const joiner = resolved.resolvedEmbedUrl.includes("?") ? "&" : "?";
      return `${resolved.resolvedEmbedUrl}${joiner}${params.toString()}`;
    }
    const videoId = extractYouTubeVideoId(resolved?.resolvedVideoId || cam.videoId || cam.watchUrl);
    if (!videoId) return "";
    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
  }
  if (cam.embedUrl) return cam.embedUrl;
  return cam.watchUrl || "";
}

function isRailcamDirectPlayable(cam) {
  if (!cam) return false;
  if (cam.provider === "youtube") return true;
  if (cam.provider === "iframe") return Boolean(cam.embedUrl || cam.watchUrl);
  return false;
}

function getRailcamWatchUrl(cam) {
  const resolved = state.railcamResolvedById.get(cam?.id);
  return resolved?.resolvedWatchUrl || cam?.watchUrl || "";
}

function getRailcamResolvedMeta(cam) {
  return state.railcamResolvedById.get(cam?.id) || null;
}

function getRailcamPlayerShieldMarkup() {
  return '<button type="button" class="railcam-player-shield" data-railcam-activate aria-label="Enable player controls"></button>';
}

function setRailcamFrameInteractive(frame, interactive) {
  if (!(frame instanceof Element)) return;
  frame.classList.toggle("interactive", Boolean(interactive));
  let shield = frame.querySelector("[data-railcam-activate]");
  if (interactive) {
    shield?.remove();
    return;
  }
  if (!shield) {
    frame.insertAdjacentHTML("afterbegin", getRailcamPlayerShieldMarkup());
  }
}

async function ensureRailcamResolved(cam, options = {}) {
  if (!cam?.id || cam.provider !== "youtube" || !cam.watchUrl) return null;
  if (cam.resolverDisabled) return null;
  const existing = state.railcamResolvedById.get(cam.id);
  const maxAgeMs = Number.isFinite(options.maxAgeMs) ? options.maxAgeMs : 10 * 60_000;
  if (existing && Date.now() - (existing.timestamp || 0) < maxAgeMs) {
    return existing;
  }
  if (state.railcamResolvePending.has(cam.id)) {
    return existing || null;
  }

  state.railcamResolvePending.add(cam.id);
  try {
    const params = new URLSearchParams({ watchUrl: cam.watchUrl });
    if (cam.channelId) {
      params.set("channelId", `${cam.channelId}`.trim());
    }
    (Array.isArray(cam.titleHints) ? cam.titleHints : []).forEach((hint) => {
      const value = `${hint || ""}`.trim();
      if (value) params.append("titleHint", value);
    });
    const response = await fetch(`/api/railcams/resolve?${params.toString()}`);
    if (!response.ok) throw new Error(`Resolver returned ${response.status}`);
    const payload = await response.json();
    state.railcamResolvedById.set(cam.id, {
      ...payload,
      timestamp: Date.now(),
    });
    if (state.activeRailcamId === cam.id) renderRailcamPlayer(cam);
    if (state.railcamWindows.some((entry) => entry.camId === cam.id)) renderRailcamWindows();
    return state.railcamResolvedById.get(cam.id) || null;
  } catch {
    return existing || null;
  } finally {
    state.railcamResolvePending.delete(cam.id);
  }
}

function updateRailcamToggleUi() {
  if (!elements.toggleRailcams) return;
  elements.toggleRailcams.setAttribute("data-active", String(state.railcamsVisible));
  elements.toggleRailcams.setAttribute("aria-pressed", String(state.railcamsVisible));
  elements.toggleRailcams.title = state.railcamsVisible ? "Hide railcams" : "Show railcams";
}

function centerMapOnRailcam(cam) {
  if (!state.map || !cam) return;
  state.map.easeTo({
    center: [cam.lon, cam.lat],
    zoom: Math.max(state.map.getZoom(), 11.5),
    duration: 700,
  });
}

function getRailcamOperatorColor(label = "") {
  const value = `${label}`.toLowerCase();
  if (/bnsf/.test(value)) return "#f97316";
  if (/union pacific|\bup\b/.test(value)) return "#facc15";
  if (/amtrak/.test(value)) return "#2563eb";
  if (/texrail|tex rail/.test(value)) return "#7c3aed";
  if (/trinity railway express|\btre\b/.test(value)) return "#dc2626";
  if (/csx/.test(value)) return "#fbbf24";
  if (/norfolk southern|\bns\b/.test(value)) return "#111827";
  if (/cn\b|canadian national/.test(value)) return "#ef4444";
  if (/cpkc|canadian pacific|\bcp\b/.test(value)) return "#be123c";
  if (/metra/.test(value)) return "#0ea5e9";
  return "#22c55e";
}

function getRailcamOperatorProfiles(cam = {}) {
  const text = `${cam.railroads || ""} ${cam.name || ""} ${cam.description || ""}`.toLowerCase();
  return trainVisionKnowledgeBase.railroads.filter((operator) => {
    return operator.cues.some((cue) => {
      const normalizedCue = `${cue}`.toLowerCase();
      if (normalizedCue.length <= 3) {
        return new RegExp(`\\b${normalizedCue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text);
      }
      return text.includes(normalizedCue);
    });
  });
}

function getRailcamDetectionLabels(cam = {}) {
  const labels = getRailcamOperatorProfiles(cam).map((operator) => operator.label);
  return labels.length ? labels : ["TRAIN"];
}

function getRailcamExpectedOperatorText(cam = {}) {
  return getRailcamDetectionLabels(cam).join(" / ");
}

function stopRailcamVision() {
  if (state.railcamVisionFrameId) {
    cancelAnimationFrame(state.railcamVisionFrameId);
    state.railcamVisionFrameId = null;
  }
  try {
    state.railcamVisionStream?.getTracks?.().forEach((track) => track.stop());
  } catch {
    // ignore track close failures
  }
  state.railcamVisionStream = null;
  state.railcamVisionVideo = null;
  state.railcamVisionCanvas = null;
  state.railcamVisionWindowId = null;
  document.querySelectorAll("[data-railcam-vision-canvas]").forEach((canvas) => {
    const ctx = canvas.getContext?.("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
  });
}

function getRailcamVisionColorTests(cam = {}) {
  const operators = getRailcamOperatorProfiles(cam);
  const selected = operators.length ? operators : trainVisionKnowledgeBase.railroads;
  const testsById = {
    bnsf: (r, g, b) => r > 150 && g > 55 && g < 155 && b < 95,
    up: (r, g, b) => r > 150 && g > 125 && b < 90,
    amtrak: (r, g, b) => b > 120 && r < 120 && g < 160,
    csx: (r, g, b) => (b > 110 && r < 100) || (r > 165 && g > 135 && b < 90),
    ns: (r, g, b) => r < 65 && g < 65 && b < 65,
    cn: (r, g, b) => r > 150 && g < 95 && b < 95,
    cpkc: (r, g, b) => r > 125 && g < 75 && b < 95,
    tre: (r, g, b) => r > 140 && g < 90 && b < 105,
    texrail: (r, g, b) => b > 115 && r > 75 && g < 120,
    metra: (r, g, b) => b > 110 && g > 80 && r < 110,
  };
  return selected.map((operator) => ({
    ...operator,
    test: testsById[operator.id] || (() => false),
  }));
}

function findRailcamVisionDetections(imageData, cam = {}) {
  const { data, width, height } = imageData || {};
  if (!data || !width || !height) return [];
  const tests = getRailcamVisionColorTests(cam);
  const detections = [];
  tests.forEach((operator) => {
    const cell = 6;
    const cols = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);
    const grid = new Uint8Array(cols * rows);
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        let hits = 0;
        let samples = 0;
        for (let yy = y; yy < Math.min(height, y + cell); yy += 2) {
          for (let xx = x; xx < Math.min(width, x + cell); xx += 2) {
            const idx = ((yy * width) + xx) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            samples += 1;
            if (operator.test(r, g, b)) hits += 1;
          }
        }
        if (samples > 0 && hits / samples > 0.35) {
          grid[(Math.floor(y / cell) * cols) + Math.floor(x / cell)] = 1;
        }
      }
    }

    const visited = new Uint8Array(grid.length);
    for (let i = 0; i < grid.length; i += 1) {
      if (!grid[i] || visited[i]) continue;
      const queue = [i];
      visited[i] = 1;
      let minCol = i % cols;
      let maxCol = minCol;
      let minRow = Math.floor(i / cols);
      let maxRow = minRow;
      let count = 0;
      while (queue.length) {
        const current = queue.pop();
        count += 1;
        const col = current % cols;
        const row = Math.floor(current / cols);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
          const nc = col + dc;
          const nr = row + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return;
          const ni = (nr * cols) + nc;
          if (!grid[ni] || visited[ni]) return;
          visited[ni] = 1;
          queue.push(ni);
        });
      }
      const boxWidth = (maxCol - minCol + 1) * cell;
      const boxHeight = (maxRow - minRow + 1) * cell;
      if (count >= 8 && boxWidth >= 30 && boxHeight >= 18) {
        detections.push({
          label: operator.label,
          color: operator.color,
          x: minCol * cell,
          y: minRow * cell,
          width: boxWidth,
          height: boxHeight,
          score: Math.min(0.98, 0.55 + count / 130),
        });
      }
    }
  });
  return detections
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))
    .slice(0, 8);
}

function drawRailcamVisionDetections(canvas, detections, sourceWidth, sourceHeight) {
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || 640));
  const height = Math.max(1, Math.round(rect.height || 360));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const scaleX = width / Math.max(1, sourceWidth);
  const scaleY = height / Math.max(1, sourceHeight);
  detections.forEach((box) => {
    const x = box.x * scaleX;
    const y = box.y * scaleY;
    const w = box.width * scaleX;
    const h = box.height * scaleY;
    ctx.strokeStyle = box.color || "#22c55e";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    const label = `${box.label} ${Math.round((box.score || 0) * 100)}%`;
    ctx.font = "bold 13px Manrope, system-ui, sans-serif";
    const labelWidth = Math.min(width - x, ctx.measureText(label).width + 16);
    ctx.fillStyle = box.color || "#22c55e";
    ctx.fillRect(x, Math.max(0, y - 26), labelWidth, 24);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x + 8, Math.max(16, y - 9));
  });
}

function runRailcamVisionFrame(windowId, cam) {
  if (state.railcamVisionWindowId !== windowId || !state.railcamVisionVideo || !state.railcamVisionCanvas) return;
  const video = state.railcamVisionVideo;
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    const sampleWidth = 360;
    const sampleHeight = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * sampleWidth));
    const canvas = state.railcamVisionCanvas;
    if (!state.railcamVisionSampleCanvas) {
      state.railcamVisionSampleCanvas = document.createElement("canvas");
    }
    const sampleCanvas = state.railcamVisionSampleCanvas;
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    try {
      sampleCtx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
      const imageData = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight);
      const detections = findRailcamVisionDetections(imageData, cam);
      drawRailcamVisionDetections(canvas, detections, sampleWidth, sampleHeight);
    } catch {
      // Capture permission or protected surface failed after start.
    }
  }
  state.railcamVisionFrameId = requestAnimationFrame(() => runRailcamVisionFrame(windowId, cam));
}

async function startRailcamVision(windowId, cam) {
  if (!state.uiSettings.railcamVisionEnabled) {
    window.alert("Turn on Railcam train vision in Settings first.");
    return;
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    window.alert("This browser does not support screen capture for railcam train vision.");
    return;
  }
  stopRailcamVision();
  const node = elements.railcamWindowHost?.querySelector(`[data-railcam-window-id="${windowId}"]`);
  const canvas = node?.querySelector("[data-railcam-vision-canvas]");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 8 },
    audio: false,
  });
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  state.railcamVisionStream = stream;
  state.railcamVisionVideo = video;
  state.railcamVisionCanvas = canvas;
  state.railcamVisionWindowId = windowId;
  stream.getVideoTracks().forEach((track) => {
    track.addEventListener("ended", stopRailcamVision, { once: true });
  });
  runRailcamVisionFrame(windowId, cam);
}

function getRailcamVisionCapability(cam = {}) {
  if (state.uiSettings?.railcamVisionEnabled) {
    return {
      canInspectFrames: true,
      reason: "Screen capture vision",
      detail: "Start vision and choose this railcam window/tab when the browser asks. ORT then reads captured pixels into a detector canvas.",
    };
  }
  return {
    canInspectFrames: false,
    reason: "Protected iframe stream",
    detail: "This railcam is embedded from a third-party player. The browser cannot read its pixels, so live object detection needs a backend frame-access service or a direct camera frame URL.",
  };
}

function buildRailcamDetectionOverlay(cam = {}) {
  if (!FEATURE_RAILCAM_VISION_ENABLED) return "";
  const capability = getRailcamVisionCapability(cam);
  const operators = getRailcamOperatorProfiles(cam);
  const operatorChips = (operators.length ? operators : [{ label: "TRAIN", color: "#22c55e" }])
    .slice(0, 5)
    .map((operator) => `<span style="--railcam-detection-color:${escapeHtml(operator.color || getRailcamOperatorColor(operator.label))}">${escapeHtml(operator.label)}</span>`)
    .join("");
  const heritageCount = trainVisionKnowledgeBase.heritageUnits.reduce((sum, entry) => sum + entry.units.length, 0);
  return `
    <div class="railcam-detection-layer railcam-detection-layer--${capability.canInspectFrames ? "ready" : "blocked"}" aria-live="polite">
      <canvas class="railcam-detection-canvas" data-railcam-vision-canvas></canvas>
      <div class="railcam-vision-status">
        <strong>${capability.canInspectFrames ? "Train vision ready" : "Vision blocked by stream host"}</strong>
        <span>${escapeHtml(capability.detail)}</span>
        <div class="railcam-vision-chips">${operatorChips}</div>
        <em>${trainVisionKnowledgeBase.railroads.length} railroad profiles • ${heritageCount} heritage/special units in knowledge base</em>
      </div>
    </div>
  `;
}

function renderRailcamPlayer(cam) {
  if (!elements.railcamNowPlaying || !elements.railcamPlayer || !elements.railcamMeta) return;
  if (!cam) {
    elements.railcamNowPlaying.textContent = "Live Railcams";
    elements.railcamPlayer.innerHTML = `
      <div class="railcam-player-empty">
        <strong>Select a railcam</strong>
        <span>Turn on the layer, then tap a marker or choose a cam from the list.</span>
      </div>
    `;
    elements.railcamMeta.innerHTML = "";
    return;
  }

  state.activeRailcamId = cam.id;
  syncRailcamMarkers();
  ensureRailcamResolved(cam);
  const embedUrl = getRailcamEmbedUrl(cam);
  const resolvedMeta = getRailcamResolvedMeta(cam);
  const freeBadge = cam.free ? '<span class="railcam-badge railcam-badge--free">Free live</span>' : "";
  elements.railcamNowPlaying.textContent = cam.name;
  elements.railcamPlayer.innerHTML = embedUrl
    ? `
      <div class="railcam-player-frame">
        ${getRailcamPlayerShieldMarkup()}
        ${buildRailcamDetectionOverlay(cam)}
        <iframe
          src="${embedUrl}"
          title="${escapeHtml(cam.name)} live railcam"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>
    `
    : `
      <div class="railcam-player-empty">
        <strong>Playback unavailable</strong>
        <span>This cam can still be opened in an external tab.</span>
      </div>
    `;
  elements.railcamMeta.innerHTML = `
    <div class="railcam-meta-head">
      <div>
        <div class="railcam-kicker">${escapeHtml(cam.city)}, ${escapeHtml(cam.state)}</div>
        <h4>${escapeHtml(cam.name)}</h4>
      </div>
      ${freeBadge}
    </div>
    <p>${escapeHtml(cam.description || "Live public railcam")}</p>
    <div class="railcam-meta-grid">
      <div><span>Host</span><strong>${escapeHtml(cam.host || "Public feed")}</strong></div>
      <div><span>Railroads</span><strong>${escapeHtml(cam.railroads || "--")}</strong></div>
      <div><span>Source</span><strong>${escapeHtml(cam.sourceType || "Public stream")}</strong></div>
      <div><span>Map</span><strong>${escapeHtml(`${cam.city}, ${cam.state}`)}</strong></div>
      <div><span>Status</span><strong>${resolvedMeta?.rotated ? "Auto-updated" : "Current source"}</strong></div>
    </div>
    <div class="railcam-meta-actions">
      <button type="button" class="btn-secondary" data-railcam-popout="${escapeHtml(cam.id)}">Watch Window</button>
      <button type="button" class="btn-secondary" data-railcam-map="${escapeHtml(cam.id)}">Show On Map</button>
      <button type="button" class="btn-secondary" data-railcam-embed="${escapeHtml(cam.id)}">In-App Player</button>
    </div>
  `;
}

function getRailcamWindowById(windowId) {
  return state.railcamWindows.find((entry) => entry.id === windowId) || null;
}

function getRailcamWindowLimit() {
  return window.innerWidth <= 768 ? 1 : MAX_RAILCAM_WINDOWS;
}

function enforceRailcamWindowLimit() {
  const limit = getRailcamWindowLimit();
  if (state.railcamWindows.length <= limit) return;
  state.railcamWindows = state.railcamWindows
    .slice()
    .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
    .slice(0, limit);
  renderRailcamWindows();
}

function closeRailcamChoicePopup() {
  if (!state.railcamChoicePopup) return;
  state.railcamChoicePopup.remove();
  state.railcamChoicePopup = null;
}

function getNearbyRailcams(anchorCam, radiusPx = 34) {
  if (!state.map || !anchorCam) return anchorCam ? [anchorCam] : [];
  const anchorPoint = state.map.project([anchorCam.lon, anchorCam.lat]);
  const radiusSq = radiusPx * radiusPx;
  const nearby = railcamCatalog
    .filter((cam) => isRailcamDirectPlayable(cam))
    .filter((cam) => Number.isFinite(cam.lat) && Number.isFinite(cam.lon))
    .map((cam) => {
      const point = state.map.project([cam.lon, cam.lat]);
      const dx = point.x - anchorPoint.x;
      const dy = point.y - anchorPoint.y;
      const distSq = dx * dx + dy * dy;
      return { cam, distSq };
    })
    .filter((entry) => entry.distSq <= radiusSq)
    .sort((a, b) => a.distSq - b.distSq || a.cam.name.localeCompare(b.cam.name))
    .map((entry) => entry.cam);

  if (nearby.length === 0) return [anchorCam];
  return nearby;
}

function openRailcamChoicePopup(anchorCam, nearbyCams) {
  if (!state.map || !anchorCam || !Array.isArray(nearbyCams) || nearbyCams.length < 2) return;
  closeRailcamChoicePopup();

  const container = document.createElement("div");
  container.className = "railcam-choice-popup";
  container.innerHTML = `
    <div class="railcam-choice-popup-title">Pick a railcam</div>
    <div class="railcam-choice-popup-list"></div>
  `;

  const list = container.querySelector(".railcam-choice-popup-list");
  nearbyCams.forEach((cam) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "railcam-choice-popup-item";
    button.setAttribute("data-railcam-choice", cam.id);
    button.innerHTML = `
      <strong>${escapeHtml(cam.name)}</strong>
      <span>${escapeHtml(cam.city || "")}${cam.city ? ", " : ""}${escapeHtml(cam.state || "")}</span>
    `;
    list?.appendChild(button);
  });

  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-railcam-choice]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const cam = railcamById.get(button.getAttribute("data-railcam-choice") || "");
    if (!cam) return;
    closeRailcamChoicePopup();
    state.activeRailcamId = cam.id;
    centerMapOnRailcam(cam);
    renderRailcamPlayer(cam);
    openRailcamWindow(cam);
  });

  const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 16, maxWidth: "280px" })
    .setLngLat([anchorCam.lon, anchorCam.lat])
    .setDOMContent(container)
    .addTo(state.map);
  popup.on("close", () => {
    if (state.railcamChoicePopup === popup) {
      state.railcamChoicePopup = null;
    }
  });
  state.railcamChoicePopup = popup;
}

function getRailcamWindowPosition(windowId) {
  const node = elements.railcamWindowHost?.querySelector(`[data-railcam-window-id="${windowId}"]`);
  if (node) {
    return {
      width: node.offsetWidth || 420,
      height: node.offsetHeight || 300,
    };
  }
  return { width: 420, height: 300 };
}

function clampRailcamWindowPosition(x, y, width = 420, height = 300) {
  const minX = 12;
  const minY = 12;
  const maxX = Math.max(minX, window.innerWidth - width - 12);
  const maxY = Math.max(minY, window.innerHeight - height - 12);
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}

function getNextRailcamWindowPosition(index = state.railcamWindows.length) {
  const baseX = Math.max(18, window.innerWidth - 460);
  const baseY = 86;
  return clampRailcamWindowPosition(baseX - (index * 28), baseY + (index * 28), 420, 300);
}

function renderRailcamWindows() {
  if (!elements.railcamWindowHost) return;
  elements.railcamWindowHost.innerHTML = state.railcamWindows
    .map((entry) => {
      const cam = railcamById.get(entry.camId);
      if (!cam) return "";
      const embedUrl = getRailcamEmbedUrl(cam);
      const sourceUrl = getRailcamWatchUrl(cam);
      return `
        <section
          class="railcam-floating-window active"
          data-railcam-window-id="${escapeHtml(entry.id)}"
          style="left:${Math.round(entry.x || 18)}px; top:${Math.round(entry.y || 86)}px; z-index:${Math.round(entry.zIndex || 215)}"
          aria-label="${escapeHtml(cam.name)} railcam window"
        >
          <header class="railcam-floating-window-head" data-railcam-drag-handle="${escapeHtml(entry.id)}">
            <div class="railcam-floating-window-copy">
              <span>${escapeHtml(cam.city || "")}${cam.city ? ", " : ""}${escapeHtml(cam.state || "")}</span>
              <strong>${escapeHtml(cam.name)}</strong>
            </div>
            <div class="railcam-floating-window-actions">
              <button class="railcam-floating-window-action" type="button" data-railcam-map="${escapeHtml(cam.id)}" title="Show on map" aria-label="Show railcam on map">Map</button>
              <button class="railcam-floating-window-close" type="button" data-railcam-close="${escapeHtml(entry.id)}" aria-label="Close railcam window">&times;</button>
            </div>
          </header>
          <div class="railcam-floating-window-body">
            ${embedUrl ? `
              <div class="railcam-floating-player-frame">
                ${getRailcamPlayerShieldMarkup()}
                ${buildRailcamDetectionOverlay(cam)}
                <iframe
                  src="${embedUrl}"
                  title="${escapeHtml(cam.name)} live railcam"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen
                ></iframe>
              </div>
            ` : `
              <div class="railcam-player-empty">
                <strong>Playback unavailable</strong>
                <span>This host does not expose an in-app player URL right now.</span>
              </div>
            `}
            <div class="railcam-floating-player-meta">
              <span>${escapeHtml(getRailcamExpectedOperatorText(cam))}</span>
              ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}
            </div>
          </div>
        </section>
      `;
    })
    .join("");
}

function bringRailcamWindowToFront(windowId) {
  const target = getRailcamWindowById(windowId);
  if (!target) return;
  const topZ = state.railcamWindows.reduce((max, entry) => Math.max(max, entry.zIndex || 0), 215);
  target.zIndex = topZ + 1;
  const node = elements.railcamWindowHost?.querySelector(`[data-railcam-window-id="${windowId}"]`);
  if (node) {
    node.style.zIndex = String(target.zIndex);
    return;
  }
  renderRailcamWindows();
}

function setRailcamWindowPosition(windowId, x, y) {
  const target = getRailcamWindowById(windowId);
  if (!target) return;
  const { width, height } = getRailcamWindowPosition(windowId);
  const clamped = clampRailcamWindowPosition(x, y, width, height);
  target.x = clamped.x;
  target.y = clamped.y;
  const node = elements.railcamWindowHost?.querySelector(`[data-railcam-window-id="${windowId}"]`);
  if (node) {
    node.style.left = `${clamped.x}px`;
    node.style.top = `${clamped.y}px`;
    return;
  }
  renderRailcamWindows();
}

function openRailcamWindow(cam) {
  if (!cam) return;
  state.activeRailcamId = cam.id;
  syncRailcamMarkers();
  ensureRailcamResolved(cam);
  const existing = state.railcamWindows.find((entry) => entry.camId === cam.id);
  if (existing) {
    bringRailcamWindowToFront(existing.id);
    return;
  }
  const position = getNextRailcamWindowPosition(state.railcamWindows.length);
  const topZ = state.railcamWindows.reduce((max, entry) => Math.max(max, entry.zIndex || 0), 215);
  state.railcamWindowSerial += 1;
  state.railcamWindows.push({
    id: `railcam-window-${state.railcamWindowSerial}`,
    camId: cam.id,
    x: position.x,
    y: position.y,
    zIndex: topZ + 1,
  });
  enforceRailcamWindowLimit();
  renderRailcamWindows();
}

function closeRailcamWindow(windowId) {
  state.railcamWindows = state.railcamWindows.filter((entry) => entry.id !== windowId);
  renderRailcamWindows();
}

function closeAllRailcamWindows() {
  state.railcamWindows = [];
  renderRailcamWindows();
}

function clampRailcamWindowsToViewport() {
  state.railcamWindows.forEach((entry) => {
    const { width, height } = getRailcamWindowPosition(entry.id);
    const clamped = clampRailcamWindowPosition(entry.x, entry.y, width, height);
    entry.x = clamped.x;
    entry.y = clamped.y;
  });
  renderRailcamWindows();
}

function syncSelectedTrainDetail() {
  const modalActive = Boolean(elements.detailModal?.classList.contains("active"));
  const sidebarActive = Boolean(elements.sidebarTrainDetailWrap?.classList.contains("active"));
  if (!state.selectedTrain || (!modalActive && !sidebarActive) || state.faresPanelActive) return;
  if ((state.detailInteractionUntil || 0) > Date.now()) return;

  const key = `${state.selectedTrain.source}:${state.selectedTrain.id}`;
  const current = state.trainIndex.get(key);
  if (current) {
    const syncSignature = [
      `${current.source || ""}`,
      `${current.id || ""}`,
      `${current.nextStop || ""}`,
      `${current.route || ""}`,
      `${normalizeStatus(current.status)}`,
      `${resolveDelayMinutes(current.delayMinutes, current.status) ?? ""}`,
      `${Number.isFinite(Number(current.speed)) ? Math.round((Number(current.speed) || 0) / 5) : ""}`,
      `${current.actual || ""}`,
      `${current.eta || ""}`,
      `${current.scheduled || ""}`,
      `${Boolean(current.realTime) ? 1 : 0}`,
    ].join("|");

    const now = Date.now();
    const unchanged = state.detailLastSignature === syncSignature;
    const tooSoon = now - (state.detailLastSyncAt || 0) < 4500;
    if (unchanged || tooSoon) {
      state.selectedTrain = current;
      return;
    }

    const modalContent = elements.detailModal?.querySelector(".modal-content");
    const detailScrollHost = sidebarActive ? elements.sidebarTrainDetail : modalContent;
    const activeDetailRoot = sidebarActive ? elements.sidebarTrainDetail : elements.trainDetail;
    const stopsPanelBefore = activeDetailRoot?.querySelector("#train-stops-panel");
    const modalScrollTop = detailScrollHost ? detailScrollHost.scrollTop : 0;
    const stopsScrollTop = stopsPanelBefore ? stopsPanelBefore.scrollTop : 0;

    selectTrain(current);
    state.detailLastSyncAt = now;
    state.detailLastSignature = syncSignature;

    requestAnimationFrame(() => {
      const nextDetailRoot = sidebarActive ? elements.sidebarTrainDetail : elements.trainDetail;
      const nextScrollHost = sidebarActive ? elements.sidebarTrainDetail : modalContent;
      if (nextScrollHost) {
        nextScrollHost.scrollTop = modalScrollTop;
      }
      const stopsPanelAfter = nextDetailRoot?.querySelector("#train-stops-panel");
      if (stopsPanelAfter) {
        stopsPanelAfter.scrollTop = stopsScrollTop;
      }
    });
  }
}

function openRailcamModal(cam = null) {
  if (!FEATURE_RAILCAMS_ENABLED) return;
  const nextCam = cam || railcamById.get(state.activeRailcamId) || railcamCatalog[0] || null;
  if (nextCam) {
    state.activeRailcamId = nextCam.id;
  }
  renderRailcamPlayer(nextCam);
  renderRailcams();
  elements.railcamModal?.classList.add("active");
}

function syncRailcamMarkers() {
  if (!FEATURE_RAILCAMS_ENABLED) {
    Array.from(state.railcamMarkers.values()).forEach((entry) => entry.marker.remove());
    state.railcamMarkers.clear();
    return;
  }
  if (!state.map) return;

  if (!state.railcamsVisible) {
    closeRailcamChoicePopup();
    Array.from(state.railcamMarkers.values()).forEach((entry) => entry.marker.remove());
    state.railcamMarkers.clear();
    return;
  }

  const seen = new Set();
  railcamCatalog.forEach((cam) => {
    if (!isRailcamDirectPlayable(cam)) return;
    if (!Number.isFinite(cam.lat) || !Number.isFinite(cam.lon)) return;
    seen.add(cam.id);

    let entry = state.railcamMarkers.get(cam.id);
    if (!entry) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "railcam-map-marker";
      element.innerHTML = `
        <span class="railcam-map-marker-dot"></span>
        <span class="railcam-map-marker-label">LIVE</span>
      `;
      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([cam.lon, cam.lat])
        .addTo(state.map);

      element.addEventListener("click", (event) => {
        event.stopPropagation();
        const nearbyCams = getNearbyRailcams(cam);
        if (nearbyCams.length > 1) {
          openRailcamChoicePopup(cam, nearbyCams);
          return;
        }
        closeRailcamChoicePopup();
        state.activeRailcamId = cam.id;
        centerMapOnRailcam(cam);
        renderRailcamPlayer(cam);
        openRailcamWindow(cam);
      });

      element.addEventListener("mouseenter", () => {
        state.map.getCanvas().style.cursor = "pointer";
      });

      element.addEventListener("mouseleave", () => {
        state.map.getCanvas().style.cursor = "";
      });

      entry = { marker, element, cam };
      state.railcamMarkers.set(cam.id, entry);
    }

    const active = state.activeRailcamId === cam.id;
    entry.element.classList.toggle("active", active);
    entry.element.title = `${cam.name} • ${cam.city}, ${cam.state}`;
    entry.marker.setLngLat([cam.lon, cam.lat]);
  });

  Array.from(state.railcamMarkers.entries()).forEach(([id, entry]) => {
    if (seen.has(id)) return;
    entry.marker.remove();
    state.railcamMarkers.delete(id);
  });
}

function setRailcamsVisible(visible, options = {}) {
  if (!FEATURE_RAILCAMS_ENABLED) {
    state.railcamsVisible = false;
    updateRailcamToggleUi();
    return;
  }
  state.railcamsVisible = Boolean(visible);
  updateRailcamToggleUi();
  syncRailcamMarkers();

  if (!state.railcamsVisible) {
    closeRailcamChoicePopup();
    closeAllRailcamWindows();
    elements.railcamModal?.classList.remove("active");
    return;
  }

  if (options.openWindow) {
    renderRailcamPlayer(options.cam || railcamById.get(state.activeRailcamId) || railcamCatalog[0] || null);
    elements.railcamModal?.classList.add("active");
  }
}

function renderRailcams() {
  if (!elements.railcamList) return;
  const search = `${elements.railcamSearch?.value || ""}`.trim().toLowerCase();
  const stateFilter = elements.railcamState?.value || "all";

  const filtered = railcamCatalog.filter((cam) => {
    const matchesState = stateFilter === "all" || cam.state === stateFilter;
    const haystack = `${cam.name} ${cam.state} ${cam.city || ""} ${cam.railroads || ""} ${cam.host || ""}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesState && matchesSearch;
  });

  if (filtered.length === 0) {
    elements.railcamList.innerHTML = '<div class="railcam-empty">No cams found for this filter</div>';
    return;
  }

  const grouped = filtered.reduce((acc, cam) => {
    const key = cam.state || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(cam);
    return acc;
  }, {});

  elements.railcamList.innerHTML = Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map(
      (groupState) => `
      <section class="railcam-group">
        <h4>${groupState}</h4>
        ${grouped[groupState]
          .map(
            (cam) => `
          <article class="railcam-card ${cam.id === state.activeRailcamId ? "active" : ""}" data-railcam-id="${escapeHtml(cam.id)}">
            <div class="railcam-card-copy">
              <div class="railcam-card-top">
                <strong>${escapeHtml(cam.name)}</strong>
                ${cam.free ? '<span class="railcam-badge railcam-badge--free">Free</span>' : ""}
              </div>
              <span class="railcam-card-sub">${escapeHtml(cam.city || "")}${cam.city ? ", " : ""}${escapeHtml(cam.state || "")}</span>
              <span class="railcam-card-sub">${escapeHtml(cam.railroads || cam.host || "")}</span>
            </div>
            <div class="railcam-card-actions">
              <button type="button" class="btn-secondary railcam-card-btn" data-railcam-watch="${escapeHtml(cam.id)}">Watch</button>
              <button type="button" class="btn-secondary railcam-card-btn" data-railcam-map="${escapeHtml(cam.id)}">Map</button>
            </div>
          </article>
        `
          )
          .join("")}
      </section>
    `
    )
    .join("");
}

function getOperatorColor(source) {
  // Return operator color if available, otherwise return a default color
  const color = operatorColors[source];
  if (color) return color;

  // Fallback colors for sources without explicit colors
  const fallbackColors = {
    amtrak: "#1f4fa3",
    brightline: "#facc15",
    via: "#f97316",
    njt: "#8b5cf6",
    mta: "#1e3a8a",
    metra: "#3b82f6",
    lirr: "#0f766e",
    septa: "#2563eb",
    mbta: "#16a34a",
    bart: "#0ea5e9",
    marta: "#f97316",
    dart: "#ef4444",
    caltrain: "#ef4444",
    vta: "#f59e0b",
    muni: "#ef4444",
    sfstreetcar: "#f97316",
    sounder: "#f43f5e",
    sunrail: "#f59e0b",
    trirail: "#84cc16",
    vre: "#7c3aed",
    marc: "#fb7185",
    ace: "#7c3aed",
    coaster: "#00AB9B",
    smart: "#ef4444",
    frontrunner: "#22c55e",
    capmetro: "#e11d48",
    arkansasMissouri: "#7f1d1d",
    branson: "#dc2626",
  };

  return fallbackColors[source] || "#94a3b8";
}

function normalizeHexColor(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return "";
  const normalized = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(normalized) || /^#[0-9a-fA-F]{3}$/.test(normalized)
    ? normalized
    : "";
}

function resolveRouteColor(route) {
  return (
    normalizeHexColor(route?.color) ||
    normalizeHexColor(route?.lineColor) ||
    normalizeHexColor(route?.routeColor) ||
    normalizeHexColor(route?.route_color) ||
    getOperatorColor(route?.source)
  );
}

function getRouteColorForTrain(train) {
  if (!train) return null;
  const sourceKey = `${train.source || ""}`.toLowerCase();
  const directColor =
    normalizeHexColor(train.routeColor) ||
    normalizeHexColor(train.route_color) ||
    normalizeHexColor(train.color) ||
    normalizeHexColor(train.lineColor);
  if (directColor) return directColor;
  const sourceMap = state.routeColorsBySourceAndName?.get(sourceKey);
  if (!sourceMap || sourceMap.size === 0) {
    if (sourceKey === "amtrak") return getNamedAmtrakRouteColor(train);
    if (sourceKey === "metra") return getNamedMetraRouteColor(train);
    return null;
  }
  const routeNames = buildRouteNameAliases(train.route || train.name);
  if (routeNames.length === 0) {
    if (sourceKey === "amtrak") return getNamedAmtrakRouteColor(train);
    if (sourceKey === "metra") return getNamedMetraRouteColor(train);
    return null;
  }
  for (const routeName of routeNames) {
    if (sourceMap.has(routeName)) {
      return sourceMap.get(routeName);
    }
  }
  for (const routeName of routeNames) {
    for (const [name, color] of sourceMap) {
      if (name.length >= 3 && routeName.startsWith(`${name} `)) {
        return color;
      }
    }
  }
  for (const routeName of routeNames) {
    for (const [name, color] of sourceMap) {
      if (name.length >= 4 && routeName.includes(name)) {
        return color;
      }
    }
  }
  if (sourceKey === "amtrak") return getNamedAmtrakRouteColor(train);
  if (sourceKey === "metra") return getNamedMetraRouteColor(train);
  return null;
}

function getNamedAmtrakRouteColor(train) {
  const text = normalizeRouteName(`${train?.route || ""} ${train?.name || ""}`);
  if (!text) return null;
  const namedColors = [
    ["acela", "#2563eb"],
    ["northeast regional", "#1d4ed8"],
    ["downeaster", "#7c3aed"],
    ["palmetto", "#ea580c"],
    ["carolinian", "#f97316"],
    ["piedmont", "#dc2626"],
    ["borealis", "#0f766e"],
    ["hiawatha", "#14b8a6"],
    ["heartland flyer", "#f97316"],
    ["lincoln service", "#ef4444"],
    ["illini", "#b91c1c"],
    ["saluki", "#991b1b"],
    ["cascades", "#15803d"],
    ["pacific surfliner", "#facc15"],
    ["capitol corridor", "#f59e0b"],
    ["san joaquins", "#fbbf24"],
    ["empire builder", "#16a34a"],
    ["coast starlight", "#0ea5e9"],
    ["southwest chief", "#ef4444"],
    ["california zephyr", "#8b5cf6"],
    ["sunset limited", "#f59e0b"],
    ["texas eagle", "#b45309"],
    ["crescent", "#22c55e"],
    ["cardinal", "#dc2626"],
    ["lake shore limited", "#2563eb"],
    ["city of new orleans", "#10b981"],
    ["silver star", "#94a3b8"],
    ["silver meteor", "#e5e7eb"],
    ["auto train", "#60a5fa"],
  ];
  const match = namedColors.find(([name]) => text.includes(name));
  return match?.[1] || null;
}

function getNamedMetraRouteColor(train) {
  const text = normalizeRouteName(`${train?.route || ""} ${train?.name || ""} ${train?.routeName || ""}`);
  if (!text) return null;
  const namedColors = [
    ["bnsf", "#f37021"],
    ["union pacific northwest", "#f6c343"],
    ["up-nw", "#f6c343"],
    ["up nw", "#f6c343"],
    ["union pacific north", "#00a9e0"],
    ["up-n", "#00a9e0"],
    ["up n", "#00a9e0"],
    ["union pacific west", "#00a651"],
    ["up-w", "#00a651"],
    ["up w", "#00a651"],
    ["milwaukee district north", "#4f7bbd"],
    ["md-n", "#4f7bbd"],
    ["md n", "#4f7bbd"],
    ["milwaukee district west", "#8fbce6"],
    ["md-w", "#8fbce6"],
    ["md w", "#8fbce6"],
    ["rock island", "#e11d48"],
    ["heritage corridor", "#6f2da8"],
    ["southwest service", "#ec4899"],
    ["north central service", "#00a99d"],
    ["metra electric", "#0083ca"],
  ];
  const match = namedColors.find(([name]) => text.includes(name));
  return match?.[1] || null;
}

function getDartRouteOffset(route) {
  const source = `${route?.source || ""}`.toLowerCase();
  if (source !== "dart") return 0;
  const text = normalizeRouteName(`${route?.name || ""} ${route?.label || ""} ${route?.routeName || ""}`);
  if (!text) return 0;
  if (text.includes("red")) return -6;
  if (text.includes("blue")) return -2;
  if (text.includes("green")) return 2;
  if (text.includes("orange")) return 6;
  if (text.includes("silver")) return 8;
  return 0;
}

function isGenericAmtrakColor(value) {
  const color = normalizeHexColor(value).toLowerCase();
  return color === "#5366c9" || color === "#004a99" || color === "#1f4fa3";
}

function applyRouteColorsToTrains(trains) {
  if (!Array.isArray(trains)) return;
  trains.forEach((train) => {
    if (!train) return;
    const routeColor = getRouteColorForTrain(train);
    if (routeColor) {
      const existingColor = normalizeHexColor(train.lineColor);
      const operatorColor = normalizeHexColor(getOperatorColor(train.source));
      if (train.source === "amtrak") {
        train.lineColor = routeColor;
      } else if (!existingColor || existingColor === operatorColor) {
        train.lineColor = routeColor;
      }
    }
  });
}

function isCommuterTrain(train) {
  return commuterSources.has(train.source);
}

function isOutOfServiceTrain(train) {
  const status = normalizeStatus(train?.status);
  const text = `${train?.status || ""} ${train?.alertReason || ""}`.toLowerCase();
  return status === "out-of-service" || /out of service|out-of-service|deadhead|not in service/.test(text);
}

function isSevereServiceTrain(train) {
  if (isOutOfServiceTrain(train)) return true;
  if (train?.serviceSeverity === "severe" || train?.markerGrey) return true;
  const delay = resolveDelayMinutes(train?.delayMinutes, train?.status);
  return Number.isFinite(Number(delay)) && Number(delay) >= 300;
}

function getTrainDisplayColor(train) {
  if (isSevereServiceTrain(train)) return "#6b7280";
  if (train?.source === "amtrak") {
    const routeColor = getRouteColorForTrain(train);
    if (routeColor && isGenericAmtrakColor(train.lineColor)) return routeColor;
  }
  if (train?.source === "metra") {
    const routeColor = getRouteColorForTrain(train);
    const operatorColor = normalizeHexColor(getOperatorColor("metra"));
    const existingColor = normalizeHexColor(train.lineColor);
    if (routeColor && (!existingColor || existingColor === operatorColor)) return routeColor;
  }
  if (train.lineColor) return train.lineColor;
  const routeColor = getRouteColorForTrain(train);
  if (routeColor) return routeColor;
  return getOperatorColor(train.source);
}

function getOperatorPrefix(source) {
  return sources[source]?.prefix || "T";
}

const routeTokenSources = new Set([
  "dart", "marta", "rtd", "vta", "dcta", "bart", "caltrain", "metrolink",
  "smart", "frontrunner", "capmetro", "muni", "sfstreetcar",
  "mbta", "septa", "njt", "mta", "lirr",
]);

const LOW_ZOOM_ALWAYS_VISIBLE_SOURCES = new Set([
  "amtrak",
  "via",
  "brightline",
  "metra",
  "metrolink",
  "muni",
  "sfstreetcar",
  "freight-community",
]);
const SOURCE_FULL_VISIBILITY_ZOOM = new Map([
  ["dart", 7],
]);
const PREDICTIVE_MOVEMENT_ALLOWED_SOURCES = new Set(["dcta", "amtrak", "via", "metra", "metrolink"]);

function extractMarkerDigits(train) {
  const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
  if (sourceKey === "gotransit") {
    const providerCandidates = [train?.providerId, train?.id, train?.tripId, train?.trainNum]
      .filter(Boolean)
      .map((value) => `${value}`);
    for (const candidate of providerCandidates) {
      const digits = candidate.match(/\d+/g);
      if (digits && digits.length > 0) {
        return digits.join("").slice(-4);
      }
    }
  }

  const candidates = [train?.trainNum, train?.id, train?.name]
    .filter(Boolean)
    .map((value) => `${value}`);

  for (const candidate of candidates) {
    const digits = candidate.match(/\d+/g);
    if (digits && digits.length > 0) {
      return digits.join("").slice(0, 4);
    }
  }

  return "000";
}

function getRouteMarkerToken(train) {
  const text = `${train?.route || train?.name || ""}`.trim();
  if (!text) return "";

  const normalized = text.toLowerCase();
  const namedTokens = [
    ["heartland flyer", "HF"],
    ["gold runner", "GR"],
    ["san joaquins", "SJ"],
    ["orange", "OR"],
    ["green", "GR"],
    ["gold", "GD"],
    ["silver", "SV"],
    ["yellow", "YL"],
    ["purple", "PR"],
    ["brown", "BR"],
    ["blue", "BL"],
    ["red", "RD"],
    ["pink", "PK"],
    ["teal", "TL"],
  ];
  const namedMatch = namedTokens.find(([needle]) => normalized.includes(needle));
  if (namedMatch) return namedMatch[1];

  const compactMatch = text.match(/\b([A-Z]{1,3}|\d{1,2}[A-Z]?|[A-Z]\d{1,2})\b/);
  if (compactMatch) return compactMatch[1].slice(0, 3).toUpperCase();

  const words = text
    .replace(/line|rail|route|service|corridor/gi, " ")
    .split(/[\s/()-]+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) return "";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function formatStatusLabel(train) {
  if (`${train?.source || ""}`.trim().toLowerCase() === "freight-community") {
    const feedSource = `${train?.communitySource || train?.confidence || ""}`.trim().toLowerCase();
    if (feedSource.includes("automated")) return "Automated";
  }
  if (train.realTime) return "Live";
  return train.confidence === "scheduled" ? "Scheduled" : "Estimated";
}

function getSourceMonogram(source) {
  const label = sources[source]?.label || source || "R";
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function getLogoMarkup(source, variant = "default") {
  const logo = sourceLogoUrls[source];
  const sizeClass = variant === "compact" ? "detail-logo--compact" : "";
  const sourceClass = source ? `logo-source-${source}` : "";
  if (logo) {
    return `<img class="detail-logo ${sizeClass} ${sourceClass}" src="${logo}" alt="${sources[source]?.label || source} logo" />`;
  }
  return `<span class="detail-logo-fallback ${sizeClass} ${sourceClass}" style="--logo-color:${getOperatorColor(source)}">${getSourceMonogram(
    source
  )}</span>`;
}

function buildPhotoQueries(train) {
  const operator = sources[train.source]?.label || train.source || "passenger rail";
  const route = `${train.route || ""}`.replace(/[^\w\s-]/g, " ").trim();
  const trainName = `${train.name || ""}`.replace(/[^\w\s-]/g, " ").trim();
  const number = `${train.trainNum || ""}`.replace(/[^\w-]/g, "").trim();

  const queries = [
    `${operator} train ${route}`,
    `${operator} ${route} passenger train`,
    `${operator} locomotive`,
    `${operator} passenger train`,
    `${trainName} train`,
    number ? `${operator} train ${number}` : "",
    "passenger train locomotive",
  ]
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return [...new Set(queries)].slice(0, 5);
}

async function fetchWikimediaPhotoByQuery(query) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&generator=search&gsrnamespace=6&gsrlimit=6" +
    `&gsrsearch=${encodeURIComponent(query)}` +
    "&prop=imageinfo&iiprop=url&iiurlwidth=1280";

  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = await response.json();
  const pages = Object.values(payload?.query?.pages || {});
  if (pages.length === 0) return null;

  const candidate = pages.find((page) => page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url);
  const info = candidate?.imageinfo?.[0];
  return info?.thumburl || info?.url || null;
}

async function fetchRecentFlickrPhoto(train) {
  const tags = operatorPhotoTags[train.source] || ["passengertrain", "railway"];
  const routeTag = `${train.route || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  const tagList = [...tags, routeTag].filter(Boolean).slice(0, 4);
  const endpoint =
    "https://www.flickr.com/services/feeds/photos_public.gne" +
    `?format=json&nojsoncallback=1&tagmode=all&tags=${encodeURIComponent(tagList.join(","))}`;

  const response = await fetch(endpoint);
  if (!response.ok) return null;
  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) return null;

  const preferred = items.find((item) => (item?.title || "").toLowerCase().includes((sources[train.source]?.label || "").toLowerCase()));
  const selected = preferred || items[0];
  const media = selected?.media?.m || "";
  if (!media) return null;

  const largeUrl = media.replace("_m.", "_b.");
  const publishedDate = selected?.published ? new Date(selected.published) : null;
  const publishedText = publishedDate && !Number.isNaN(publishedDate.getTime())
    ? publishedDate.toLocaleDateString()
    : "recent";
  return {
    url: largeUrl,
    attribution: `Recent photo (${publishedText}) • ${selected.author?.replace(/^\("|"\)$/g, "") || "Flickr"}`,
  };
}

async function resolveTrainImageUrl(train) {
  const key = `${train.source}:${train.id}:${train.route || ""}`;
  if (state.photoCache.has(key)) {
    return state.photoCache.get(key);
  }

  try {
    const recentPhoto = await fetchRecentFlickrPhoto(train);
    if (recentPhoto?.url) {
      state.photoCache.set(key, recentPhoto);
      return recentPhoto;
    }
  } catch {
    // fallback to Wikimedia lookup
  }

  const queries = buildPhotoQueries(train);
  for (const query of queries) {
    try {
      const imageUrl = await fetchWikimediaPhotoByQuery(query);
      if (imageUrl) {
        const result = { url: imageUrl, attribution: "Wikimedia Commons" };
        state.photoCache.set(key, result);
        return result;
      }
    } catch {
      // Continue trying additional query variants.
    }
  }

  const fallbacks = operatorPhotoFallbacks[train.source] || [];
  if (fallbacks.length > 0) {
    const hashBase = `${train.id || ""}${train.trainNum || ""}${train.route || ""}`;
    let hash = 0;
    for (let index = 0; index < hashBase.length; index += 1) {
      hash = (hash * 31 + hashBase.charCodeAt(index)) >>> 0;
    }
    const selected = fallbacks[hash % fallbacks.length];
    const result = {
      url: selected,
      attribution: `${sources[train.source]?.label || train.source} (Wikimedia Commons)`,
    };
    state.photoCache.set(key, result);
    return result;
  }

  state.photoCache.set(key, null);
  return null;
}

async function updateDetailHeroImage(train, token) {
  const hero = elements.trainDetail?.querySelector(".detail-hero");
  const caption = elements.trainDetail?.querySelector(".detail-hero-caption");
  if (!hero || !caption) return;

  const imageUrl = await resolveTrainImageUrl(train);
  if (token !== state.photoSelectionToken) return;

  if (imageUrl?.url) {
    hero.onerror = () => {
      hero.hidden = true;
      caption.textContent = "Unable to load this photo right now";
    };
    hero.src = imageUrl.url;
    hero.hidden = false;
    caption.textContent = `Real photo • ${imageUrl.attribution}`;
  } else {
    hero.hidden = true;
    caption.textContent = "No real train photo found for this service";
  }
}

function buildSourceOptions() {
  const option = document.createElement("option");
  option.value = "all";
  option.textContent = "All sources";
  elements.source.innerHTML = "";
  elements.source.appendChild(option);
  Object.entries(sources).forEach(([value, meta]) => {
    const entry = document.createElement("option");
    entry.value = value;
    entry.textContent = meta.label;
    elements.source.appendChild(entry);
  });
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem("savedTrains") || "[]");
    state.savedTrains = new Set(saved);
  } catch {
    state.savedTrains = new Set();
  }
}

function persistSaved() {
  safeSetLocalStorage("savedTrains", Array.from(state.savedTrains));
}

function applyStoredTheme() {
  let themeMode = normalizeThemeMode(state.uiSettings?.themeMode);
  try {
    if (!state.uiSettings?.themeMode) {
      const storedTheme = localStorage.getItem("ort-theme");
      themeMode = normalizeThemeMode(storedTheme);
    }
  } catch {
    themeMode = normalizeThemeMode(state.uiSettings?.themeMode);
  }

  document.body.classList.remove(...new Set(["light", ...Object.values(THEME_CLASS_MAP), ...LEGACY_THEME_CLASS_NAMES]));
  const className = THEME_CLASS_MAP[themeMode];
  if (className) {
    document.body.classList.add(className);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_META_COLORS[themeMode] || THEME_META_COLORS.dark);
}

function openSettingsModal() {
  applyUiSettingsToDom();
  elements.settingsModal?.classList.add("active");
}

function closeSettingsModal() {
  elements.settingsModal?.classList.remove("active");
}

function getMapStyleUrl(styleName, protomapsKey) {
  if (styleName !== "overture") return null;
  if (isLightMapTheme()) return null;
  const configured = `${state.config?.protomapsDarkStyleUrl || state.config?.protomapsStyleUrl || ""}`.trim();
  if (configured) return configured;
  return protomapsKey
    ? `https://api.protomaps.com/styles/v2/dark.json?key=${protomapsKey}`
    : null;
}

function getConfiguredVectorStyleUrl(styleName) {
  if (styleName !== "overture") return null;
  return getMapStyleUrl("overture", state.config?.protomapsKey || DEFAULT_PROTOMAPS_KEY);
}

function getEffectiveMapStyle(styleName) {
  if (isLightMapTheme()) return "light";
  return styleName === "light" ? "light" : "overture";
}

function resolveMapStyle(styleName, { fallbackOnly = false } = {}) {
  const effectiveStyle = getEffectiveMapStyle(styleName);

  if (!fallbackOnly) {
    const vectorStyle = getConfiguredVectorStyleUrl(effectiveStyle);
    if (vectorStyle) return vectorStyle;
  }

  return getRasterFallback(effectiveStyle);
}

function isLightMapTheme(themeMode = state.uiSettings?.themeMode) {
  const mode = normalizeThemeMode(themeMode);
  return [
    "light",
    "mono-ash",
    "mono-paper",
    "contrast-light",
    "clean-glacier",
    "pastel-mint",
    "pastel-lilac",
    "pastel-peach",
  ].includes(mode);
}

function clearStyleWatchdog() {
  if (state.styleWatchdogId) {
    window.clearTimeout(state.styleWatchdogId);
    state.styleWatchdogId = null;
  }
}

function scheduleStyleWatchdog(styleName) {
  clearStyleWatchdog();
  state.mapReady = false;
  state.styleWatchdogId = window.setTimeout(() => {
    if (!state.map || state.mapReady || state.styleFallbackActive) return;
    if (styleName !== "overture") return;

    // Keep Protomaps vector style (POIs/icons/labels) if it is present but still loading.
    const currentStyle = state.map.getStyle?.();
    const hasVectorSources = Object.values(currentStyle?.sources || {}).some((src) => src?.type === "vector");
    if (hasVectorSources) return;

    state.styleFallbackActive = true;
    state.map.setStyle(getRasterFallback(styleName));
    // Map style fallback active

  }, 12000); // Give Protomaps vector/sprite/glyph assets more time before raster fallback

}

function getRasterFallback(styleName) {
  const isLight = styleName === "light";
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      rasterTiles: {
        type: "raster",
        tiles: [
          `https://a.basemaps.cartocdn.com/${isLight ? "light_all" : "dark_all"}/{z}/{x}/{y}{r}.png`,
          `https://b.basemaps.cartocdn.com/${isLight ? "light_all" : "dark_all"}/{z}/{x}/{y}{r}.png`,
        ],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors, &copy; CARTO",
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": isLight ? "#eef2f6" : "#0b1220" } },
      { id: "raster", type: "raster", source: "rasterTiles" },
    ],
  };
}

// Style cycle order shown on the button label / settings selector
const MAP_STYLE_CYCLE = ["overture"];
const MAP_STYLE_LABELS = {
  overture: "Protomaps Dark",
};

function add3dBuildingsLayer() {
  if (!state.map) return false;
  // Protomaps exposes a building source-layer; only available with vector styles
  if (state.map.getLayer("3d-buildings")) return true;
  try {
    // Try to add fill-extrusion from any vector source that has a building-like source-layer.
    const style = state.map.getStyle();
    const styleLayers = Array.isArray(style.layers) ? style.layers : [];
    const vectorSources = Object.entries(style.sources || {})
      .filter(([, s]) => s.type === "vector")
      .map(([id]) => id);

    if (vectorSources.length === 0) return false; // raster style — no buildings possible

    const buildingLayerCandidate = styleLayers.find((layer) => {
      const sourceLayer = layer?.["source-layer"];
      return typeof sourceLayer === "string" && /building|buildings|structure|footprint/i.test(sourceLayer);
    });

    const sourceId = buildingLayerCandidate?.source || vectorSources[0];
    const sourceLayerName = buildingLayerCandidate?.["source-layer"] || "building";

    state.map.addLayer({
      id: "3d-buildings",
      type: "fill-extrusion",
      source: sourceId,
      "source-layer": sourceLayerName,
      minzoom: 12,
      paint: {
        "fill-extrusion-color": [
          "interpolate", ["linear"], ["zoom"],
          14, "#1e293b",
          16, "#334155",
          18, "#475569",
        ],
        "fill-extrusion-height": [
          "coalesce", ["get", "render_height"], ["get", "height"], ["get", "building:levels"], 10
        ],
        "fill-extrusion-base": [
          "coalesce", ["get", "render_min_height"], ["get", "min_height"], 0
        ],
        "fill-extrusion-opacity": 0.82,
      },
    }, "routes-glow"); // insert below route lines so rails show on top of buildings
    state.buildings3dVisible = true;
    return true;
  } catch {
    // Vector source-layer name didn't match.
    return false;
  }
}

function remove3dBuildingsLayer() {
  if (!state.map) return;
  if (state.map.getLayer("3d-buildings")) {
    state.map.removeLayer("3d-buildings");
  }
  state.buildings3dVisible = false;
}

function updateThemeSensitiveLayers() {
  const map = state.map;
  if (!map || !state.mapReady) return;

  const isLightMode = document.body.classList.contains("light");
  
  const labelColor = isLightMode ? "#1e293b" : "#e2e8f0";
  const haloColor = isLightMode ? "rgba(255,255,255,0.92)" : "rgba(10,10,10,0.92)";
  const routeLabelColor = isLightMode ? "#111827" : "#f8fafc";
  const routeHaloColor = isLightMode ? "rgba(255,255,255,0.98)" : "rgba(8,12,20,0.98)";

  if (map.getLayer("station-labels")) {
    map.setPaintProperty("station-labels", "text-color", labelColor);
    map.setPaintProperty("station-labels", "text-halo-color", haloColor);
  }
  if (map.getLayer("routes-label")) {
    map.setPaintProperty("routes-label", "text-color", routeLabelColor);
    map.setPaintProperty("routes-label", "text-halo-color", routeHaloColor);
  }
  if (map.getLayer("proposed-rail-label")) {
    map.setPaintProperty("proposed-rail-label", "text-halo-color", routeHaloColor);
  }
  if (map.getLayer("signals-labels")) {
    map.setPaintProperty("signals-labels", "text-color", routeLabelColor);
    map.setPaintProperty("signals-labels", "text-halo-color", routeHaloColor);
  }
  if (map.getLayer("openrailwaymap-signals")) {
    map.setPaintProperty("openrailwaymap-signals", "raster-opacity", isLightMode ? 0.72 : 0.82);
  }
  ["orm-high-label", "orm-future-high-label", "orm-station-stops", "orm-rail-symbols-text", "orm-signals-text", "orm-signal-boxes-label"].forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "text-color", routeLabelColor);
    map.setPaintProperty(layerId, "text-halo-color", routeHaloColor);
  });
  if (map.getLayer("orm-rail-symbols-halo")) {
    map.setPaintProperty("orm-rail-symbols-halo", "circle-opacity", isLightMode ? 0.22 : 0.32);
    map.setPaintProperty("orm-rail-symbols-halo", "circle-stroke-color", isLightMode ? "rgba(255,255,255,0.9)" : "rgba(8,12,20,0.92)");
  }
  if (map.getLayer("orm-signals-halo")) {
    map.setPaintProperty("orm-signals-halo", "circle-opacity", isLightMode ? 0.2 : 0.3);
    map.setPaintProperty("orm-signals-halo", "circle-stroke-color", isLightMode ? "rgba(255,255,255,0.9)" : "rgba(8,12,20,0.92)");
  }
  if (map.getLayer("orm-station-areas-fill")) {
    map.setPaintProperty("orm-station-areas-fill", "fill-opacity", isLightMode ? 0.15 : 0.22);
  }
  if (map.getLayer("maintenance-point")) {
    map.setPaintProperty("maintenance-point", "text-halo-color", haloColor);
  }
}

function ensureSignalLayers(map, isLightMode) {
  if (!map.getSource("openrailwaymap-signals")) {
    map.addSource("openrailwaymap-signals", {
      type: "raster",
      tiles: ["https://tiles.openrailwaymap.org/signals/{z}/{x}/{y}.png"],
      tileSize: 512,
      maxzoom: 19,
      attribution:
        'Data <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>, Style: <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>',
    });
  }
  if (!map.getLayer("openrailwaymap-signals")) {
    map.addLayer({
      id: "openrailwaymap-signals",
      type: "raster",
      source: "openrailwaymap-signals",
      minzoom: 5,
      paint: {
        "raster-opacity": isLightMode ? 0.72 : 0.82,
        "raster-fade-duration": 120,
      },
    });
  }
  if (!map.getSource("signals")) {
    map.addSource("signals", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  if (!map.getLayer("signals-glow")) {
    map.addLayer({
      id: "signals-glow",
      type: "circle",
      source: "signals",
      minzoom: 6,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 8, 10, 11, 14, 14],
        "circle-color": ["get", "aspectColor"],
        "circle-opacity": 0.22,
        "circle-blur": 0.7,
      },
    });
  }
  if (!map.getLayer("signals-markers")) {
    map.addLayer({
      id: "signals-markers",
      type: "circle",
      source: "signals",
      minzoom: 6,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5, 10, 7.5, 14, 9],
        "circle-color": ["get", "aspectColor"],
        "circle-stroke-width": 2,
        "circle-stroke-color": isLightMode ? "#0f172a" : "#f8fafc",
        "circle-opacity": 0.98,
      },
    });
  }
  if (!map.getLayer("signals-glyphs")) {
    map.addLayer({
      id: "signals-glyphs",
      type: "symbol",
      source: "signals",
      minzoom: 7,
      layout: {
        "text-field": ["get", "aspectGlyph"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 7, 12, 10, 15, 14, 18],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-opacity": 0.98,
      },
    });
  }
  if (!map.getLayer("signals-labels")) {
    map.addLayer({
      id: "signals-labels",
      type: "symbol",
      source: "signals",
      minzoom: 9,
      layout: {
        "text-field": ["get", "signal_id"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 12],
        "text-offset": [0, 1.1],
        "text-anchor": "top",
      },
      paint: {
        "text-color": isLightMode ? "#0f172a" : "#f8fafc",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.95)" : "rgba(8,12,20,0.98)",
        "text-halo-width": 1.5,
      },
    });
  }
}

function readdAppLayers() {
  // After a style change the map is reset; re-add all app sources and layers
  const map = state.map;
  if (!map) return;

  const isLightMode = document.body.classList.contains("light");

  if (!map.getSource("routes")) {
    map.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  ensureRouteRasterLayer(map);
  ensureMileMarkerLayers();
  ensureSpeedLimitLayer();
  if (!map.getLayer("routes-glow")) {
    map.addLayer({
      id: "routes-glow", type: "line", source: "routes",
      filter: ["!=", ["get", "isFreight"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 7, "line-offset": ["coalesce", ["get", "offset"], 0], "line-opacity": 0.18, "line-blur": 3.2 }
    });
  }
  if (!map.getLayer("routes-outline")) {
    map.addLayer({
      id: "routes-outline", type: "line", source: "routes",
      filter: ["!=", ["get", "isFreight"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "rgba(0, 0, 0, 0.92)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.8, 6, 3.8, 10, 5.2, 14, 6.8],
        "line-offset": ["coalesce", ["get", "offset"], 0],
        "line-opacity": 0.8,
      }
    });
  }
  if (!map.getLayer("routes-line")) {
    map.addLayer({
      id: "routes-line", type: "line", source: "routes",
      filter: ["!=", ["get", "isFreight"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.0, 6, 3.0, 10, 4.2, 14, 5.8],
        "line-offset": ["coalesce", ["get", "offset"], 0],
        "line-opacity": 0.96
      }
    });
  }
  if (!map.getLayer("routes-label")) {
    map.addLayer({
      id: "routes-label", type: "symbol", source: "routes", minzoom: 7,
      filter: ["!=", ["get", "isFreight"], 1],
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 560,
        "text-field": ["coalesce", ["get", "label"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 10, 12.5, 14, 14],
        "text-letter-spacing": 0.08,
        "text-rotation-alignment": "map",
        "text-keep-upright": true,
      },
      paint: {
        "text-color": isLightMode ? "#111827" : "#f8fafc",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.98)" : "rgba(8,12,20,0.98)",
        "text-halo-width": 1.8,
      }
    });
  }
  if (!map.getLayer("freight-routes-glow")) {
    map.addLayer({
      id: "freight-routes-glow", type: "line", source: "routes",
      filter: ["==", ["get", "isFreight"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3.6, 6, 5.2, 10, 7.6, 14, 9.6],
        "line-opacity": ["case", ["==", ["get", "isHighlighted"], 1], 0.3, 0.08],
        "line-blur": 4.2,
      }
    });
  }
  if (!map.getLayer("freight-routes-outline")) {
    map.addLayer({
      id: "freight-routes-outline", type: "line", source: "routes",
      filter: ["==", ["get", "isFreight"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "rgba(0, 0, 0, 0.92)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3.7, 6, 5.2, 10, 7.2, 14, 9.4],
        "line-opacity": 0.86,
      }
    });
  }
  if (!map.getLayer("freight-routes-line")) {
    map.addLayer({
      id: "freight-routes-line", type: "line", source: "routes",
      filter: ["==", ["get", "isFreight"], 1],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.8, 6, 4.2, 10, 5.9, 14, 7.8],
        "line-opacity": 0.92,
      }
    });
  }
  if (!map.getLayer("freight-routes-label")) {
    map.addLayer({
      id: "freight-routes-label", type: "symbol", source: "routes", minzoom: 6,
      filter: ["all", ["==", ["get", "isFreight"], 1], ["==", ["get", "isHighlighted"], 1]],
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 720,
        "text-field": ["coalesce", ["get", "ownerDisplay"], ["get", "owner"], ["get", "label"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 10, 12, 14, 13.5],
        "text-letter-spacing": 0.06,
        "text-rotation-alignment": "map",
        "text-keep-upright": true,
      },
      paint: {
        "text-color": isLightMode ? "#111827" : "#f8fafc",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.98)" : "rgba(8,12,20,0.98)",
        "text-halo-width": 1.8,
        "text-opacity": 0.96,
      }
    });
  }
  ensureRouteHitLayer(map);

  if (!map.getSource("stations")) {
    map.addSource("stations", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  if (!map.getLayer("stations")) {
    map.addLayer({
      id: "stations", type: "circle", source: "stations", minzoom: 7,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.75, 10, 3.75, 14, 5], "circle-color": ["coalesce", ["get", "color"], "#ffffff"], "circle-opacity": 0.9,
        "circle-stroke-color": "rgba(0,0,0,0.5)", "circle-stroke-width": 1
      }
    });
  }
  if (!map.getLayer("stations-hit")) {
    map.addLayer({
      id: "stations-hit", type: "circle", source: "stations", minzoom: 6,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 6, 10, 7.5, 14, 9],
        "circle-opacity": 0,
      }
    });
  }
  if (!map.getLayer("station-labels")) {
    map.addLayer({
      id: "station-labels", type: "symbol", source: "stations", minzoom: 8.5,
      layout: {
        "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11,
        "text-anchor": "top", "text-offset": [0, 0.7], "text-optional": true, "text-max-width": 8
      },
      paint: {
        "text-color": isLightMode ? "#1e293b" : "#e2e8f0",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.92)" : "rgba(10,10,10,0.92)",
        "text-halo-width": 1.5
      }
    });
  }

  ensureSignalLayers(map, isLightMode);

  if (!map.getSource("trains")) {
    map.addSource("trains", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  // Remove old layer IDs that may exist from previous code versions
  [
    "trains-fill", "trains-delay", "trains-ring", "trains-badge",
    "trains-label", "trains-arrow", "trains-circle", "trains-label",
    "trains-delay-ring", "trains-hit"
  ].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });

  state.trainLayerEventsBound = false; // allow re-binding after style swap
  ensureTrainLayers();
  ensureIncidentLayers();
  ensureProposedRailLayers();
  ensureOpenRailwayMapFreightLayers(map);
  bindOpenRailwayMapEvents(map);
  // Restore badge images after style reload (they are cleared by MapLibre on setStyle)
  const allTrains = getAllTrains();
  if (allTrains.length > 0) {
    setTimeout(() => {
      renderTrains(applyFilters(allTrains));
    }, 50);
  }

  // Hover listeners are still preserved:
  map.on("mouseenter", "stations-hit", () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "stations-hit", () => { map.getCanvas().style.cursor = ""; });
  map.on("mouseenter", "routes-hit", (e) => {
    map.getCanvas().style.cursor = "crosshair";
    const props = e.features?.[0]?.properties || {};
    const name = props.name || props.source || "Rail Route";
    const owner = props.owner || "";
    const src = sources[props.source]?.label || props.source || "";
    const subtitle = owner && owner !== src ? owner : src;
    const hostFreight = `${props.hostFreight || ""}`.trim();
    const html = `
      <div class="route-popup-inner">
        <strong>${escapeHtml(name)}</strong>
        ${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ""}
        ${hostFreight ? `<span>${escapeHtml(hostFreight)}</span>` : ""}
        ${props.subdivision ? `<span>${escapeHtml(props.subdivision)}</span>` : ""}
        ${props.trainProtection ? `<span>${escapeHtml(props.trainProtection)}</span>` : ""}
      </div>
    `;
    state.routePopup?.setLngLat(e.lngLat).setHTML(html).addTo(map);
  });
  map.on("mousemove", "routes-hit", (e) => { state.routePopup?.setLngLat(e.lngLat); });
  map.on("mouseleave", "routes-hit", () => { map.getCanvas().style.cursor = ""; state.routePopup?.remove(); });
  map.on("click", "routes-hit", openFreightRoutePopup);

  if (state.buildings3dVisible) add3dBuildingsLayer();

  // Re-render data
  renderRoutes([...(state.routes || []), ...(state.commuterRoutes || []), ...(state.freightRoutes || [])]);
  renderStations([...(state.stations || []), ...(state.commuterStations || [])]);
  renderSignals(state.signals || []);
  applyRouteVisibility();
  applyStationVisibility();
  applySignalVisibility();
  renderLandmarks();
  renderTrains(applyFilters(getAllTrains()));
  renderSightings();
  renderBigBoyOverlay();
  renderIncidentLayers();
  setSpeedLimitsVisible(state.uiSettings.speedLimitsVisible);
  setMileMarkersVisible(state.uiSettings.mileMarkersVisible);
  syncRailcamMarkers();
}

function switchMapStyle(styleName) {
  if (!state.map) return;
  const requestedStyle = styleName || "overture";
  const effectiveStyle = getEffectiveMapStyle(requestedStyle);
  const style = resolveMapStyle(requestedStyle);

  state.mapStyle = requestedStyle;
  state.styleFallbackActive = false;
  if (elements.toggleStyle) {
    const next = MAP_STYLE_CYCLE[(MAP_STYLE_CYCLE.indexOf(requestedStyle) + 1) % MAP_STYLE_CYCLE.length];
    elements.toggleStyle.setAttribute("data-style", requestedStyle);
    elements.toggleStyle.title = `Style: ${MAP_STYLE_LABELS[requestedStyle]} → click for ${MAP_STYLE_LABELS[next]}`;
  }

  state.mapReady = false;
  let didRehydrate = false;
  const rehydrateOnce = () => {
    if (didRehydrate) return;
    didRehydrate = true;
    state.mapReady = true;
    clearStyleWatchdog();
    readdAppLayers();
  };

  state.map.once("styledata", rehydrateOnce);
  state.map.once("style.load", rehydrateOnce);
  scheduleStyleWatchdog(effectiveStyle);
  state.map.setStyle(style, { diff: true });
}


// ───────────────────────────────────────────────────────────────

function handleGlobalMapClick(e) {
  if (!state.map) return;
  if (state.suppressNextGlobalMapClick) {
    state.suppressNextGlobalMapClick = false;
    return;
  }
  const features = state.map.queryRenderedFeatures(e.point, { layers: ["trains-hit", "stations-hit", "stations"] });
  if (!features || features.length === 0) {
    if (!isDetailSheetMobileLayout() && state.selectedTrain) {
      clearSelectedTrainDetail();
    }
    return;
  }

  // De-duplicate features by kind and ID
  const mapFeatures = new Map();
  features.forEach((feat) => {
    const id = feat.properties?.id;
    if (!id) return;
    const type = feat.layer?.id === "trains-hit" ? "train" : "station";
    const source = feat.properties?.source || "";
    const key = `${type}:${source}:${id}`;
    if (!mapFeatures.has(key)) mapFeatures.set(key, { type, id, feat });
  });

  const uniqueFeatures = Array.from(mapFeatures.values());
  if (uniqueFeatures.length === 0) return;

  if (uniqueFeatures.length === 1) {
    const meta = uniqueFeatures[0];
    if (meta.type === "train") {
      const train = state.trainIndex.get(meta.id);
      if (train) {
        const coords = meta.feat.geometry?.coordinates;
        openTrainPopup(train, Array.isArray(coords) ? coords : [e.lngLat.lng, e.lngLat.lat]);
      }
    } else if (meta.type === "station") {
      const station = findStationByFeature(meta);
      if (station) selectStation(station);
    }
    return;
  }

  if (uniqueFeatures.length > 4 && state.map.getZoom() < 8) {
    openClusterModal(uniqueFeatures, e.lngLat);
    return;
  }

  // Multiple features overlap! Render the selector popup.
  state.trainPopup?.remove();
  state.trainPopup = null;
  state.routePopup?.remove();
  
  const buttonsHtml = uniqueFeatures.map((meta) => {
    if (meta.type === "train") {
      const train = state.trainIndex.get(meta.id);
      if (!train) return "";
      const isMetra = train.source.toLowerCase() === "metra";
      const badgeClass = isMetra ? `metra-line-color--${train.line_id || train.id}` : "";
      
      let badgeStyle = `background:${train.lineColor || "#000"}`;
      if (isMetra) badgeStyle = "";
      
      const textCol = train.lineTextColor || "#fff";
      const shortId = (train.trainNum || train.id || "").toString().replace(/^.*-([0-9a-zA-Z]+)$/, "$1").slice(0, 4);
      
      return `
        <button class="overlap-btn" onclick="window.selectFeatureFromOverlap('train', '${train.source}:${train.id}')">
          <span class="overlap-badge ${badgeClass}" style="${badgeStyle}; color:${textCol};">
            ${escapeHtml(shortId)}
          </span>
          <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(train.name || train.id)}
          </span>
        </button>
      `;
    } else {
      const station = findStationByFeature(meta);
      if (!station) return "";
      const abbr = (station.abbreviation || station.id || "STA").slice(0, 4);
      return `
        <button class="overlap-btn" onclick="window.selectFeatureFromOverlap('station', '${station.source || ""}:${station.id}')">
          <span class="overlap-badge" style="background:#1f4fa3; color:#fff;">
            ${escapeHtml(abbr)}
          </span>
          <span style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(station.name)}
          </span>
        </button>
      `;
    }
  }).join("");

  const popupHtml = `
    <div class="overlap-popup-container">
      <div class="overlap-popup-header">Multiple Items Found:</div>
      ${buttonsHtml}
    </div>
  `;

  state.overlapPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 12 })
    .setLngLat(e.lngLat)
    .setHTML(popupHtml)
    .addTo(state.map);
}

window.selectFeatureFromOverlap = function(type, lookupId) {
  state.overlapPopup?.remove();
  if (type === "train") {
    const train = state.trainIndex.get(lookupId);
    if (train) selectTrain(train);
  } else if (type === "station") {
    const [source, ...idParts] = `${lookupId || ""}`.split(":");
    const id = idParts.length ? idParts.join(":") : lookupId;
    const station = (state.stations || []).find((row) => `${row.id}` === id && `${row.source || ""}`.trim().toLowerCase() === `${source || ""}`.trim().toLowerCase())
      || (state.stations || []).find((row) => `${row.id}` === lookupId || `${row.id}` === id);
    if (station) selectStation(station);
  }
};

// ───────────────────────────────────────────────────────────────

function openClusterModal(features, clickLngLat) {
  if (!elements.clusterModal) return;

  const trains = [];
  const stations = [];

  features.forEach((meta) => {
    if (meta.type === "train") {
      const train = state.trainIndex.get(meta.id);
      if (train) trains.push(train);
    }
  });

  if (clickLngLat && Array.isArray(state.stations)) {
    const scored = state.stations.map((st) => {
      const dx = (st.lon - clickLngLat.lng) * Math.cos((clickLngLat.lat * Math.PI) / 180);
      const dy = st.lat - clickLngLat.lat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return { st, dist };
    });
    scored.sort((a, b) => a.dist - b.dist);
    const limit = Math.min(15, scored.length);
    for (let i = 0; i < limit; i++) {
      stations.push(scored[i].st);
    }
  }

  elements.clusterTabTrains.textContent = `Nearby (${trains.length})`;
  elements.clusterTabStations.textContent = `Stations (${stations.length})`;

  const trainsHtml = trains.map((train) => {
    const isMetra = train.source.toLowerCase() === "metra";
    const badgeClass = isMetra ? `metra-line-color--${train.line_id || train.id}` : "";
    let badgeStyle = `background:${train.lineColor || "#000"}`;
    if (isMetra) badgeStyle = "";
    const textCol = train.lineTextColor || "#fff";
    const shortId = (train.trainNum || train.id || "").toString().replace(/^.*-([0-9a-zA-Z]+)$/, "$1").slice(0, 4);

    return `
      <button class="overlap-btn cluster-choice" onclick="window.selectFeatureAndCloseCluster('train', '${train.source}:${train.id}')">
        <span class="overlap-badge ${badgeClass}" style="${badgeStyle}; color:${textCol};">
          ${escapeHtml(shortId)}
        </span>
        <span class="cluster-choice-main">
          <strong>${escapeHtml(train.name || train.id)}</strong>
          <small>${escapeHtml([train.source, delayLabel(train.delayMinutes, train.status)].filter(Boolean).join(" • "))}</small>
        </span>
      </button>
    `;
  }).join("");
  elements.clusterPaneTrains.innerHTML = `
    <div class="cluster-queue-head">
      <span>Multiple items here</span>
      <strong>${trains.length} trains</strong>
    </div>
    <div class="cluster-queue-list">
      ${trainsHtml || "<p class='cluster-empty'>No trains in this cluster.</p>"}
    </div>
  `;

  // Render Station buttons
  const stationsHtml = stations.map((station) => {
    const abbr = (station.abbreviation || station.id || "STA").slice(0, 4);
    return `
      <button class="overlap-btn cluster-choice" onclick="window.selectFeatureAndCloseCluster('station', '${station.source || ""}:${station.id}')">
        <span class="overlap-badge" style="background:#1f4fa3; color:#fff;">
          ${escapeHtml(abbr)}
        </span>
        <span class="cluster-choice-main">
          <strong>${escapeHtml(station.name)}</strong>
          <small>Nearest station</small>
        </span>
      </button>
    `;
  }).join("");
  elements.clusterPaneStations.innerHTML = `
    <div class="cluster-queue-head">
      <span>Nearby stations</span>
      <strong>${stations.length}</strong>
    </div>
    <div class="cluster-queue-list">
      ${stationsHtml || "<p class='cluster-empty'>No nearby stations.</p>"}
    </div>
  `;

  // Reset tabs to Trains
  elements.clusterTabTrains.classList.add("active");
  elements.clusterTabStations.classList.remove("active");
  elements.clusterPaneTrains.classList.add("active");
  elements.clusterPaneStations.classList.remove("active");

  elements.clusterModal.classList.add("active");
}

window.selectFeatureAndCloseCluster = function(type, lookupId) {
  elements.clusterModal?.classList.remove("active");
  if (type === "train") {
    const train = state.trainIndex.get(lookupId);
    if (train) {
      const coords = normalizeLngLat(train.lat, train.lon, train.source);
      if (coords && state.map) {
         state.map.flyTo({ center: [coords.lon, coords.lat], zoom: Math.max(state.map.getZoom() || 0, 8), duration: 1800 });
      }
      selectTrain(train);
    }
  } else if (type === "station") {
    const [source, ...idParts] = `${lookupId || ""}`.split(":");
    const id = idParts.length ? idParts.join(":") : lookupId;
    const station = (state.stations || []).find((row) => `${row.id}` === id && `${row.source || ""}`.trim().toLowerCase() === `${source || ""}`.trim().toLowerCase())
      || (state.stations || []).find((row) => `${row.id}` === lookupId || `${row.id}` === id);
    if (station) {
      if (state.map) {
         state.map.flyTo({ center: [station.lon, station.lat], zoom: Math.max(state.map.getZoom() || 0, 8), duration: 1800 });
      }
      selectStation(station);
    }
  }
};

// ───────────────────────────────────────────────────────────────

function initMap() {
  const isTouchDevice = window.matchMedia?.("(pointer: coarse)")?.matches || window.innerWidth <= 768;
  const isLightMode = document.body.classList.contains("light");
  const mobileMinZoom = isTouchDevice ? 4.75 : 4.25;
  const savedMapView = loadSavedMapView();
  const initialCenter = savedMapView ? [savedMapView.lon, savedMapView.lat] : [-98.35, 39.5];
  const initialZoom = savedMapView ? Math.max(mobileMinZoom, savedMapView.zoom) : mobileMinZoom;
  const initialBearing = isTouchDevice ? 0 : (savedMapView?.bearing || 0);
  const initialPitch = isTouchDevice ? 0 : Math.max(0, Math.min(60, savedMapView?.pitch || 0));
  state.mapStyle = MAP_STYLE_CYCLE.includes(state.uiSettings?.mapStyle)
    ? state.uiSettings.mapStyle
    : defaultUiSettings.mapStyle;
  state.mapReady = false;
  state.styleFallbackActive = false;
  const style = resolveMapStyle(state.mapStyle);

  state.map = new maplibregl.Map({
    container: "map",
    style,
    center: initialCenter,
    zoom: initialZoom,
    bearing: initialBearing,
    pitch: initialPitch,
    minZoom: mobileMinZoom,
    maxZoom: 18,
    maxBounds: [[-175, 5], [-50, 75]], // Map Lock: Restrict to North America
    renderWorldCopies: false,
    projection: "mercator",
    attributionControl: true,
    pitchWithRotate: !isTouchDevice,
  });
  if (isTouchDevice) {
    state.map.dragPan?.enable?.();
    state.map.touchZoomRotate?.enable?.();
    state.map.dragRotate?.disable?.();
    state.map.touchZoomRotate?.disableRotation?.();
    state.map.touchPitch?.disable?.();
    state.map.keyboard?.disable?.();
  }

  // Bind the global overlapping hit selector
  state.map.on("click", handleGlobalMapClick);

  scheduleStyleWatchdog(getEffectiveMapStyle(state.mapStyle));
  state.map.once("styledata", () => {
    state.mapReady = true;
    clearStyleWatchdog();
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: !isTouchDevice, visualizePitch: !isTouchDevice }), "bottom-right");
  state.map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "imperial" }), "bottom-left");

  // Sync toggle-style label to current style
  if (elements.toggleStyle) {
    const next = MAP_STYLE_CYCLE[(MAP_STYLE_CYCLE.indexOf(state.mapStyle) + 1) % MAP_STYLE_CYCLE.length];
    elements.toggleStyle.setAttribute("data-style", state.mapStyle);
    elements.toggleStyle.title = `Style: ${MAP_STYLE_LABELS[state.mapStyle]} → click for ${MAP_STYLE_LABELS[next]}`;
  }

  state.map.on("load", () => {
    state.mapReady = true;
    clearStyleWatchdog();
    state.routeLodBucket = getCurrentRouteLodBucket();
    state.map.addSource("routes", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    state.map.addLayer({
      id: "routes-glow",
      type: "line",
      source: "routes",
      filter: ["!=", ["get", "isFreight"], 1],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 6,
        "line-offset": ["coalesce", ["get", "offset"], 0],
        "line-opacity": 0.12,
        "line-blur": 3,
      },
    });

    state.map.addLayer({
      id: "routes-outline",
      type: "line",
      source: "routes",
      filter: ["!=", ["get", "isFreight"], 1],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "rgba(0, 0, 0, 0.92)",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          3, 2.8,
          6, 3.8,
          10, 5.2,
          14, 6.8
        ],
        "line-offset": ["coalesce", ["get", "offset"], 0],
        "line-opacity": 0.8,
      },
    });

    state.map.addLayer({
      id: "routes-line",
      type: "line",
      source: "routes",
      filter: ["!=", ["get", "isFreight"], 1],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          3, 2.0,
          6, 3.0,
          10, 4.2,
          14, 5.8
        ],
        "line-offset": ["coalesce", ["get", "offset"], 0],
        "line-opacity": 0.88,
      },
    });

    state.map.addLayer({
      id: "routes-label",
      type: "symbol",
      source: "routes",
      minzoom: 7,
      filter: ["!=", ["get", "isFreight"], 1],
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 560,
        "text-field": ["coalesce", ["get", "label"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          6, 10,
          10, 12.5,
          14, 14
        ],
        "text-letter-spacing": 0.08,
        "text-rotation-alignment": "map",
        "text-keep-upright": true,
      },
      paint: {
        "text-color": isLightMode ? "#111827" : "#f8fafc",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.98)" : "rgba(8,12,20,0.98)",
        "text-halo-width": 1.8,
      },
    });

    state.map.addLayer({
      id: "freight-routes-glow",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "isFreight"], 1],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3.6, 6, 5.2, 10, 7.6, 14, 9.6],
        "line-opacity": ["case", ["==", ["get", "isHighlighted"], 1], 0.3, 0.08],
        "line-blur": 4.2,
      },
    });

    state.map.addLayer({
      id: "freight-routes-outline",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "isFreight"], 1],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "rgba(0, 0, 0, 0.92)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3.7, 6, 5.2, 10, 7.2, 14, 9.4],
        "line-opacity": 0.86,
      },
    });

    state.map.addLayer({
      id: "freight-routes-line",
      type: "line",
      source: "routes",
      filter: ["==", ["get", "isFreight"], 1],
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.8, 6, 4.2, 10, 5.9, 14, 7.8],
        "line-opacity": 0.96,
      },
    });

    state.map.addLayer({
      id: "freight-routes-label",
      type: "symbol",
      source: "routes",
      minzoom: 6,
      filter: ["all", ["==", ["get", "isFreight"], 1], ["==", ["get", "isHighlighted"], 1]],
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 720,
        "text-field": ["coalesce", ["get", "ownerDisplay"], ["get", "owner"], ["get", "label"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          6, 10,
          10, 12,
          14, 13.5
        ],
        "text-letter-spacing": 0.06,
        "text-rotation-alignment": "map",
        "text-keep-upright": true,
      },
      paint: {
        "text-color": isLightMode ? "#111827" : "#f8fafc",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.98)" : "rgba(8,12,20,0.98)",
        "text-halo-width": 1.8,
        "text-opacity": 0.96,
      },
    });
    ensureRouteHitLayer(state.map);

    ensureRouteRasterLayer(state.map);

    state.map.addSource("stations", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    state.map.addLayer({
      id: "stations",
      type: "circle",
      source: "stations",
      minzoom: 7,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 5.5, 10, 7.5, 14, 10],
        "circle-color": ["coalesce", ["get", "color"], "#ffffff"],
        "circle-opacity": 0.9,
        "circle-stroke-color": "rgba(0,0,0,0.5)",
        "circle-stroke-width": 1,
      },
    });

    state.map.addLayer({
      id: "stations-hit",
      type: "circle",
      source: "stations",
      minzoom: 6,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 12, 10, 15, 14, 18],
        "circle-opacity": 0,
      },
    });

    // Station name labels — appear at zoom 8.5+
    state.map.addLayer({
      id: "station-labels",
      type: "symbol",
      source: "stations",
      minzoom: 8.5,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-anchor": "top",
        "text-offset": [0, 0.7],
        "text-optional": true,
        "text-max-width": 8,
      },
      paint: {
        "text-color": isLightMode ? "#1e293b" : "#e2e8f0",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.92)" : "rgba(10,10,10,0.92)",
        "text-halo-width": 1.5,
      },
    });

    ensureSignalLayers(state.map, isLightMode);

    state.map.addSource("trains", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    ensureMileMarkerLayers();
    ensureSpeedLimitLayer();
    ensureTrainLayers();
    ensureIncidentLayers();
    ensureProposedRailLayers();
    ensureOpenRailwayMapFreightLayers(state.map);
    bindOpenRailwayMapEvents(state.map);
    ensureLandmarkLayers();



    if (state.map.getLayer("background")) {
      state.map.setPaintProperty("background", "background-color", isLightMode ? "#eef2f6" : "#0b1220");
    }


    // After all layers and sources are added, trigger an initial render for routes and stations
    // if data has already arrived from refreshData().
    if (Array.isArray(state.routes) && state.routes.length > 0) {
      renderRoutes([...(state.routes || []), ...(state.commuterRoutes || []), ...(state.freightRoutes || [])]);
      applyRouteVisibility();
    }
    if (Array.isArray(state.stations) && state.stations.length > 0) {
      renderStations(state.stations);
      applyStationVisibility();
    }
    if (Array.isArray(state.signals) && state.signals.length > 0) {
      renderSignals(state.signals);
      applySignalVisibility();
    }

    state.map.on("mouseenter", "stations", () => {
      state.map.getCanvas().style.cursor = "pointer";
    });

    state.map.on("mouseleave", "stations", () => {
      state.map.getCanvas().style.cursor = "";
    });

    const openSignalPopup = (event) => {
      const feature = event.features?.[0];
      const props = feature?.properties || {};
      if (!feature?.geometry?.coordinates) return;
      const updatedText = props.last_update ? new Date(props.last_update).toLocaleString() : "Unknown";
      state.signalPopup?.remove?.();
    state.signalPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14 })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(`
        <div class="route-popup-inner">
          <strong>${escapeHtml(props.signal_id || "Signal")}</strong>
          <span>${escapeHtml(props.aspect || "UNKNOWN")} aspect</span>
          ${props.operator ? `<span>Operator: ${escapeHtml(props.operator)}</span>` : ""}
          ${props.rail_line ? `<span>${escapeHtml(props.rail_line)}</span>` : ""}
          ${props.milepost ? `<span>Milepost ${escapeHtml(`${props.milepost}`)}</span>` : ""}
            <span>Updated ${escapeHtml(updatedText)}</span>
          </div>
        `)
        .addTo(state.map);
    };

    ["signals-markers", "signals-glyphs"].forEach((layerId) => {
      state.map.on("mouseenter", layerId, () => {
        state.map.getCanvas().style.cursor = "pointer";
      });

      state.map.on("mouseleave", layerId, () => {
        state.map.getCanvas().style.cursor = "";
      });

      state.map.on("click", layerId, openSignalPopup);
    });

    state.map.on("mouseenter", "routes-hit", () => {
      state.map.getCanvas().style.cursor = "crosshair";
    });
    state.map.on("mouseleave", "routes-hit", () => {
      state.map.getCanvas().style.cursor = "";
    });
    state.map.on("click", "routes-hit", openFreightRoutePopup);

    renderRoutes([...(state.routes || []), ...(state.commuterRoutes || []), ...(state.freightRoutes || [])]);
    renderStations(state.stations || []);
    renderSignals(state.signals || []);
    applyRouteVisibility();
    applyStationVisibility();
    applySignalVisibility();
    scheduleVisibleSignalFetch();
    renderLandmarks();
    renderTrains(applyFilters(getAllTrains()));
    renderSightings();
    renderBigBoyOverlay();
    renderIncidentLayers();
    setSpeedLimitsVisible(state.uiSettings.speedLimitsVisible);
    setMileMarkersVisible(state.uiSettings.mileMarkersVisible);
    syncRailcamMarkers();

    // Attempt to add 3D buildings if already in 3D mode (e.g. restored from session)
    if (state.buildings3dVisible) add3dBuildingsLayer();
  });

  state.map.on("zoomend", () => {
    const nextLodBucket = getCurrentRouteLodBucket();
    if (state.routeLodBucket !== nextLodBucket) {
      state.routeLodBucket = nextLodBucket;
      if (state.routeLodRenderTimer) {
        clearTimeout(state.routeLodRenderTimer);
      }
      state.routeLodRenderTimer = setTimeout(() => {
        state.routeLodRenderTimer = null;
        renderAllRoutes();
      }, 220);
    }
    scheduleTrainViewportRefresh(20);
    scheduleVisibleSignalFetch();
    scheduleVisibleMilepostFetch();
  });

  state.map.on("movestart", () => {
    const isAutoFollowMove = Date.now() < Number(state.autoFollowMapMoveUntil || 0);
    if (isAutoFollowMove) return;
    if (state.mapInteractionReleaseTimer) {
      clearTimeout(state.mapInteractionReleaseTimer);
      state.mapInteractionReleaseTimer = null;
    }
    setMapInteractionPerformanceMode(true);
  });

  state.map.on("moveend", () => {
    const isAutoFollowMove = Date.now() < Number(state.autoFollowMapMoveUntil || 0);
    if (isAutoFollowMove) {
      setMapInteractionPerformanceMode(false);
    }
    if (state.mapInteractionReleaseTimer) {
      clearTimeout(state.mapInteractionReleaseTimer);
    }
    if (!isAutoFollowMove) {
      state.mapInteractionReleaseTimer = setTimeout(() => {
        state.mapInteractionReleaseTimer = null;
        setMapInteractionPerformanceMode(false);
      }, 120);
    }
    scheduleTrainViewportRefresh(35);
    scheduleVisibleSignalFetch();
    scheduleVisibleMilepostFetch();
    persistMapView();
  });

  state.map.on("error", (event) => {
    if (event?.error) {
      const effectiveStyle = getEffectiveMapStyle(state.mapStyle);
      if (!state.mapReady && !state.styleFallbackActive && effectiveStyle === "overture") {
        state.styleFallbackActive = true;
        clearStyleWatchdog();
        state.map.setStyle(getRasterFallback("dark"));
        console.warn("Map tile load error, style fallback triggered");
        return;
      }
      console.warn("Map tile load error.");
    }
  });

  state.map.on("move", () => {
    if (state.hoveredTrain && state.hoveredMouseX != null) {
      if (elements.tooltip?.classList.contains("visible")) {
        elements.tooltip.style.left = `${state.hoveredMouseX}px`;
        elements.tooltip.style.top = `${state.hoveredMouseY}px`;
      }
    }
  });
}

function formatMarkerLabel(train) {
  const digits = extractMarkerDigits(train);
  const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
  if (sourceKey === "ace") {
    return "ACE";
  }
  if (sourceKey === "dart") {
    const text = `${train?.route || train?.name || train?.trainNum || ""}`.toUpperCase();
    if (text.includes("RED")) return "RED";
    if (text.includes("BLUE")) return "BLUE";
    if (text.includes("GREEN")) return "GREEN";
    if (text.includes("ORANGE")) return "ORANGE";
    if (text.includes("SILVER")) return "SILVER";
    if (text.includes("TEXRAIL")) return "TEXRAIL";
    if (text.includes("TRE")) return "TRE";
    return "DART";
  }
  if (sourceKey === "dcta") {
    return "A-Train";
  }
  if (sourceKey === "freight-community") {
    return normalizeRailroadMarkerCode(train?.ownerCode || train?.railroad || train?.agency) || "FRT";
  }
  if (sourceKey === "metra") return digits;
  if (routeTokenSources.has(sourceKey)) {
    const routeToken = getRouteMarkerToken(train);
    if (routeToken) return `${routeToken}${digits}`;
  }
  return `${getOperatorPrefix(sourceKey)}${digits}`;
}

function shouldRenderTrain(train) {
  if (!train) return false;
  const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
  if (sourceKey !== "metra") return true;

  const lat = Number(train.lat);
  const lon = Number(train.lon);
  if (!Boolean(train.realTime) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return false;
  }

  const status = normalizeStatus(train.status);
  if (status.includes("out-of-service") || status.includes("completed") || status.includes("deadhead")) {
    return false;
  }

  return true;
}

function normalizeStatus(status) {
  return `${status || ""}`.trim().toLowerCase();
}

function inferDelayFromStatus(status) {
  const normalized = normalizeStatus(status);
  if (!normalized) return null;
  if (normalized.includes("out-of-service")) return null;
  if (normalized.includes("arriv")) return 0;
  if (normalized.includes("early")) return -1;
  if (normalized.includes("on-time") || normalized.includes("on time") || normalized.includes("live")) {
    return 0;
  }
  if (normalized.includes("late") || normalized.includes("delay")) return 12;
  return null;
}

function resolveDelayMinutes(delayMinutes, status) {
  if (delayMinutes != null && !Number.isNaN(delayMinutes)) return delayMinutes;
  return inferDelayFromStatus(status);
}

function formatMinutesAsDuration(minutes) {
  const totalMinutes = Math.abs(Math.round(Number(minutes) || 0));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours <= 0) return `${mins} min`;
  if (mins <= 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

function recordAlertHistory(trains) {
  if (!Array.isArray(trains)) return;
  const now = new Date().toISOString();
  trains.forEach((train) => {
    const key = `${train.source}:${train.id}`;
    const text = `${train.alertReason || ""}`.trim();
    if (!key || !text) return;
    const firstSeenAt = train.alertFirstSeenAt || now;
    const lastSeenAt = train.alertLastSeenAt || now;
    const existing = state.alertHistoryByTrain.get(key) || [];
    if (existing[0]?.text === text) {
      existing[0].firstSeenAt =
        new Date(existing[0].firstSeenAt || firstSeenAt).getTime() <= new Date(firstSeenAt).getTime()
          ? existing[0].firstSeenAt || firstSeenAt
          : firstSeenAt;
      existing[0].lastSeenAt =
        new Date(existing[0].lastSeenAt || lastSeenAt).getTime() >= new Date(lastSeenAt).getTime()
          ? existing[0].lastSeenAt || lastSeenAt
          : lastSeenAt;
      state.alertHistoryByTrain.set(key, existing);
      return;
    }
    const next = [
      {
        text,
        firstSeenAt,
        lastSeenAt,
      },
      ...existing,
    ].slice(0, 8);
    state.alertHistoryByTrain.set(key, next);
  });
}

function formatServiceTime(value) {
  if (!value) return "--";
  const raw = `${value}`.trim();

  // GTFS-style clock text (HH:mm[:ss]) should still respect the user's device locale.
  // If hour is outside 0-23 (e.g. 24:15), keep raw text to avoid day rollover ambiguity.
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    const [hh, mm] = raw.split(":");
    const hours = Number(hh);
    const minutes = Number(mm);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const now = new Date();
      const parsedClock = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0
      );
      return parsedClock.toLocaleTimeString([], withPreferredTimeZone({
        hour: "numeric",
        minute: "2-digit",
      }));
    }
    return raw.slice(0, 5);
  }

  let parsed = null;
  // epoch seconds / milliseconds
  if (/^\d{10,13}$/.test(raw)) {
    const numeric = Number(raw);
    parsed = new Date(raw.length === 13 ? numeric : numeric * 1000);
  }

  // iOS-safe parse for timezone-less datetime values
  if (!parsed || Number.isNaN(parsed.getTime())) {
    const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (localMatch) {
      const [, y, m, d, hh, mm, ss] = localMatch;
      parsed = new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(hh),
        Number(mm),
        Number(ss || "0")
      );
    }
  }

  if (!parsed || Number.isNaN(parsed.getTime())) {
    parsed = new Date(raw);
  }
  if (Number.isNaN(parsed.getTime())) return raw;

  const sameDayFormatter = new Intl.DateTimeFormat([], withPreferredTimeZone({
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }));
  const sameDay = sameDayFormatter.format(parsed) === sameDayFormatter.format(new Date());
  if (sameDay) {
    return parsed.toLocaleTimeString([], withPreferredTimeZone({
      hour: "numeric",
      minute: "2-digit",
    }));
  }
  return parsed.toLocaleString([], withPreferredTimeZone({
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }));
}

const SUPPORTED_TIME_ZONES = new Set([
  "browser",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
]);

function normalizeTimeZoneSetting(value) {
  const raw = `${value || ""}`.trim();
  if (!raw || raw === "browser") return "browser";
  if (SUPPORTED_TIME_ZONES.has(raw)) return raw;
  try {
    new Intl.DateTimeFormat([], { timeZone: raw }).format(new Date());
    return raw;
  } catch {
    return "browser";
  }
}

function resolveDeviceTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.trim() ? tz.trim() : null;
  } catch {
    return null;
  }
}

function getPreferredTimeZone() {
  return resolveDeviceTimeZone();
}

function withPreferredTimeZone(options = {}) {
  const opts = { ...(options || {}) };
  const preferred = getPreferredTimeZone();
  if (!preferred) return opts;
  try {
    new Intl.DateTimeFormat([], { timeZone: preferred }).format(new Date());
    opts.timeZone = preferred;
    return opts;
  } catch {
    return opts;
  }
}

function delayColor(delayMinutes, status) {
  if (normalizeStatus(status).includes("out-of-service")) return "#6b7280";
  const resolvedDelay = resolveDelayMinutes(delayMinutes, status);
  if (resolvedDelay == null || Number.isNaN(resolvedDelay)) return "#64748b";
  if (resolvedDelay >= 300) return "#6b7280";
  if (resolvedDelay < 0) return "#22c55e";
  if (resolvedDelay <= 5) return "#22c55e";
  if (resolvedDelay <= 15) return "#facc15";
  if (resolvedDelay <= 30) return "#fb923c";
  return "#ef4444";
}

function syncTrainMarkers(trains) {
  if (!state.map) return;

  const hasFreightCommunity = (Array.isArray(trains) ? trains : []).some(
    (train) => `${train?.source || ""}`.trim().toLowerCase() === "freight-community"
  );
  if (hasFreightCommunity && !state.freightRoutesLoaded && !state.freightRoutesLoadingPromise) {
    loadFreightRoutesDeferred().catch(() => null);
  }

  const seen = new Set();

  trains.forEach((train) => {
    const key = `${train.source}:${train.id}`;
    const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
    const forceRouteSnap = sourceKey === "freight-community" || sourceKey === "ace";
    const rawCoords = normalizeLngLat(train.lat, train.lon, train.source);
    if (!rawCoords) return;

    let coords = snapTrainToRoute(train, rawCoords);
    if (!coords) coords = rawCoords;

    if (forceRouteSnap && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lon))) {
      coords = { lat: Number(coords.lat), lon: Number(coords.lon) };
    }

    const rawLatDiff = Math.abs(coords.lat - rawCoords.lat);
    const rawLonDiff = Math.abs(coords.lon - rawCoords.lon);
    if (
      !forceRouteSnap
      && (!isWithinBounds(coords.lat, coords.lon, train.source) || rawLatDiff > 0.35 || rawLonDiff > 0.35)
    ) {
      coords = rawCoords;
    }

    const previousSnap = state.trainMarkerSnapCache.get(key);
    if (previousSnap && !forceRouteSnap) {
      const rawDeltaLat = rawCoords.lat - previousSnap.rawLat;
      const rawDeltaLon = rawCoords.lon - previousSnap.rawLon;
      const rawDelta2 = (rawDeltaLat * rawDeltaLat) + (rawDeltaLon * rawDeltaLon);

      const snapJumpLat = coords.lat - previousSnap.lat;
      const snapJumpLon = coords.lon - previousSnap.lon;
      const snapJump2 = (snapJumpLat * snapJumpLat) + (snapJumpLon * snapJumpLon);

      const rawMovedVeryLittle = rawDelta2 < (0.0015 * 0.0015);
      const snapJumpedFar = snapJump2 > (0.005 * 0.005);

      if (rawMovedVeryLittle && snapJumpedFar) {
        coords = { lat: previousSnap.lat, lon: previousSnap.lon };
      } else if (snapJump2 > (0.0015 * 0.0015)) {
        coords = {
          lat: previousSnap.lat + ((coords.lat - previousSnap.lat) * 0.22),
          lon: previousSnap.lon + ((coords.lon - previousSnap.lon) * 0.22),
        };
      }
    }

    state.trainMarkerSnapCache.set(key, {
      lat: coords.lat,
      lon: coords.lon,
      rawLat: rawCoords.lat,
      rawLon: rawCoords.lon,
    });

    const label = formatMarkerLabel(train);
    // Subway bullet style: operator color = circle background, delay = ring color
    const bulletColor = train.lineColor || getTrainDisplayColor(train);
    const ringColor = delayColor(train.delayMinutes, train.status);
    seen.add(key);

    let entry = state.trainMarkers.get(key);
    if (!entry) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "train-bullet-marker";

      const marker = new maplibregl.Marker({
        element,
        anchor: "center",
        offset: [0, 0],
        pitchAlignment: "map",
        rotationAlignment: "map",
      })
        .setLngLat([coords.lon, coords.lat])
        .addTo(state.map);

      const entryRef = { marker, element, train };

      element.addEventListener("click", (event) => {
        event.stopPropagation();
        const liveLngLat = entryRef.marker.getLngLat();
        openTrainPopup(entryRef.train, [liveLngLat.lng, liveLngLat.lat]);
      });

      element.addEventListener("mouseenter", () => {
        state.map.getCanvas().style.cursor = "pointer";
      });

      element.addEventListener("mouseleave", () => {
        state.map.getCanvas().style.cursor = "";
      });

      entry = entryRef;
      state.trainMarkers.set(key, entry);
    }

    entry.train = train;
    const markerSourceKey = `${train?.source || ""}`.trim().toLowerCase();
    const isFullTextMarker = markerSourceKey === "dcta" || markerSourceKey === "dart";
    const markerPrefix = isFullTextMarker ? "" : label.slice(0, 1);
    const markerNumber = isFullTextMarker ? label : (label.slice(1) || "000");
    const deg = compassToDegrees(train.heading);
    const arrowHtml =
      train.realTime && deg !== null
        ? `<span class="heading-arrow" style="transform:rotate(${deg}deg)" aria-hidden="true"></span>`
        : "";
    entry.element.innerHTML = isFullTextMarker
      ? `${arrowHtml}<span class="bullet-num bullet-num--full">${markerNumber}</span>`
      : `${arrowHtml}<span class="bullet-prefix">${markerPrefix}</span><span class="bullet-num">${markerNumber}</span>`;
    entry.element.title = `${train.name || "Train"} · ${sources[train.source]?.label || train.source}`;
    entry.element.setAttribute("aria-label", `${train.name || "Train"} ${label}`);
    entry.element.style.background = bulletColor;
    entry.element.style.outline = `3px solid ${ringColor}`;
    entry.element.style.outlineOffset = "1px";
    if (!train.realTime) {
      entry.element.style.opacity = "0.60";
    } else {
      entry.element.style.opacity = "1";
    }
    entry.marker.setLngLat([coords.lon, coords.lat]);
  });

  Array.from(state.trainMarkers.entries()).forEach(([key, entry]) => {
    if (seen.has(key)) return;
    entry.marker.remove();
    state.trainMarkers.delete(key);
    state.trainMarkerSnapCache.delete(key);
  });
}

function delayClass(delayMinutes, status) {
  const resolvedDelay = resolveDelayMinutes(delayMinutes, status);
  if (resolvedDelay == null || Number.isNaN(resolvedDelay)) return "delay-unknown";
  if (resolvedDelay < 0) return "delay-green"; // Early
  if (resolvedDelay <= 5) return "delay-green"; // On time / slightly late
  if (resolvedDelay <= 15) return "delay-yellow"; // Moderately late
  if (resolvedDelay <= 30) return "delay-orange"; // Late
  return "delay-red"; // Very late
}

function delayLabel(delayMinutes, status) {
  const resolvedDelay = resolveDelayMinutes(delayMinutes, status);
  if (resolvedDelay == null || Number.isNaN(resolvedDelay)) {
    const normalized = normalizeStatus(status);
    if (normalized.includes("arriv")) return "Arrived";
    if (normalized.includes("live")) return "Live";
    if (normalized) {
      return normalized
        .split(/[^a-z0-9]+/i)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
    return "Unknown";
  }
  if (resolvedDelay < 0) return `${formatMinutesAsDuration(Math.abs(resolvedDelay))} early`;
  if (resolvedDelay <= 0) {
    const normalized = normalizeStatus(status);
    if (normalized.includes("arriv")) return "Arrived";
    return "On time";
  }
  return `${formatMinutesAsDuration(resolvedDelay)} late`;
}

const sourceBounds = {
  amtrak: { minLon: -130, maxLon: -60, minLat: 20, maxLat: 55 },
  amtraker: { minLon: -130, maxLon: -60, minLat: 20, maxLat: 55 },
  brightline: { minLon: -90, maxLon: -78, minLat: 24, maxLat: 33 },
  via: { minLon: -141, maxLon: -52, minLat: 38, maxLat: 84 },
  metra: { minLon: -90, maxLon: -86, minLat: 41, maxLat: 43.2 },
  mta: { minLon: -80, maxLon: -71, minLat: 40, maxLat: 44.5 },
  mta_mnr: { minLon: -80, maxLon: -71, minLat: 40, maxLat: 44.5 },
  njt: { minLon: -76, maxLon: -72, minLat: 38.5, maxLat: 42.5 },
  septa: { minLon: -76.5, maxLon: -74.2, minLat: 39, maxLat: 41.5 },
  mbta: { minLon: -73.8, maxLon: -69.7, minLat: 41, maxLat: 43.5 },
  lirr: { minLon: -74.5, maxLon: -71.7, minLat: 40, maxLat: 41.5 },
  metrolink: { minLon: -119.5, maxLon: -116, minLat: 32.5, maxLat: 35.5 },
  caltrain: { minLon: -123.5, maxLon: -121, minLat: 36.5, maxLat: 38.6 },
  sounder: { minLon: -123.5, maxLon: -121, minLat: 46.5, maxLat: 48.3 },
  sunrail: { minLon: -82.8, maxLon: -81, minLat: 27.5, maxLat: 29.5 },
  trirail: { minLon: -80.7, maxLon: -80, minLat: 25.2, maxLat: 27.3 },
  vre: { minLon: -78.8, maxLon: -76.5, minLat: 37, maxLat: 39.2 },
  marc: { minLon: -79, maxLon: -76, minLat: 38.5, maxLat: 40.5 },
  ace: { minLon: -122.5, maxLon: -120, minLat: 37, maxLat: 38.8 },
  coaster: { minLon: -118.6, maxLon: -116.8, minLat: 32.3, maxLat: 33.6 },
  smart: { minLon: -123.2, maxLon: -122.2, minLat: 37.8, maxLat: 39.8 },
  frontrunner: { minLon: -112.2, maxLon: -111.5, minLat: 40.2, maxLat: 41.9 },
  capmetro: { minLon: -98, maxLon: -97, minLat: 30, maxLat: 31 },
};

function isWithinBounds(lat, lon, source) {
  // Reject null island
  if (Math.abs(lat) < 0.01 && Math.abs(lon) < 0.01) return false;

  // Check tight static bounds first
  const bounds = sourceBounds[source];
  if (bounds) {
    // Allow a small pad so trains at the edge of a service area still pass
    const pad = 3;
    if (
      lon >= bounds.minLon - pad &&
      lon <= bounds.maxLon + pad &&
      lat >= bounds.minLat - pad &&
      lat <= bounds.maxLat + pad
    ) {
      return true;
    }
    return false; // Known source but outside its bounds → reject
  }

  // Unknown source: accept anything in North America / Canada
  return lon >= -170 && lon <= -40 && lat >= 15 && lat <= 85;
}

function normalizeLngLat(lat, lon, source) {
  if (lat == null || lon == null) return null;
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) return null;
  if (Math.abs(latNum) > 90 || Math.abs(lonNum) > 180) return null;
  if (!isWithinBounds(latNum, lonNum, source)) return null;
  return { lat: latNum, lon: lonNum };
}

function normalizeRouteLine(line) {
  if (!Array.isArray(line)) return [];
  return line
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      // GeoJSON coordinates are always [longitude, latitude]
      const lon = Number(point[0]);
      const lat = Number(point[1]);
      if (Number.isNaN(lon) || Number.isNaN(lat)) return null;
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
      if (Math.abs(lat) < 0.01 && Math.abs(lon) < 0.01) return null; // null island
      return [lon, lat];
    })
    .filter(Boolean);
}

function splitLineOnLargeJumps(line, maxStepDegrees = 4.0) {
  if (!Array.isArray(line) || line.length < 2) return [];
  const chunks = [];
  let chunk = [line[0]];

  for (let index = 1; index < line.length; index += 1) {
    const prev = line[index - 1];
    const curr = line[index];
    const rawLonDelta = Math.abs(curr[0] - prev[0]);
    const lonDelta = Math.min(rawLonDelta, Math.abs(rawLonDelta - 360));
    const latDelta = Math.abs(curr[1] - prev[1]);

    if (lonDelta > maxStepDegrees || latDelta > maxStepDegrees) {
      if (chunk.length >= 2) chunks.push(chunk);
      chunk = [curr];
      continue;
    }
    chunk.push(curr);
  }

  if (chunk.length >= 2) chunks.push(chunk);
  return chunks;
}

function flattenGeometryToLines(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") {
    return splitLineOnLargeJumps(normalizeRouteLine(geometry.coordinates || []));
  }
  if (geometry.type === "MultiLineString") {
    return (geometry.coordinates || [])
      .flatMap((line) => splitLineOnLargeJumps(normalizeRouteLine(line || [])))
      .filter((line) => line.length >= 2);
  }
  return [];
}

function normalizeRouteName(value) {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildRouteNameAliases(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return [];

  const candidates = new Set([raw]);
  ["→", "->", " toward ", " towards ", " to ", " via "].forEach((delimiter) => {
    if (raw.includes(delimiter)) {
      candidates.add(raw.split(delimiter)[0]);
    }
  });
  if (raw.includes("/")) {
    raw.split("/").forEach((part) => candidates.add(part));
  }

  const aliases = new Set();
  candidates.forEach((candidate) => {
    const normalized = normalizeRouteName(candidate);
    if (!normalized) return;
    aliases.add(normalized);

    const simplified = normalized
      .replace(/\bregional rail\b/g, " ")
      .replace(/\brail line\b/g, " ")
      .replace(/\bcommuter rail\b/g, " ")
      .replace(/\brailroad\b/g, " ")
      .replace(/\brail road\b/g, " ")
      .replace(/\bline\b/g, " ")
      .replace(/\bbranch\b/g, " ")
      .replace(/\broute\b/g, " ")
      .replace(/\brail\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (simplified) aliases.add(simplified);
  });

  return Array.from(aliases);
}

// Find route geometry for a train by matching its normalized route label against
// route names in order: exact → prefix (route name is prefix of train route) → substring.
function findNamedLinesByPrefix(trainRouteName, byNameMap) {
  if (!trainRouteName || !byNameMap) return [];
  const aliases = buildRouteNameAliases(trainRouteName);
  for (const alias of aliases) {
    const exact = byNameMap.get(alias);
    if (exact && exact.length > 0) return exact;
  }
  for (const alias of aliases) {
    for (const [routeName, lines] of byNameMap) {
      if (routeName.length >= 3 && alias.startsWith(routeName + " ")) {
        if (lines.length > 0) return lines;
      }
    }
  }
  for (const alias of aliases) {
    for (const [routeName, lines] of byNameMap) {
      if (routeName.length >= 4 && alias.includes(routeName)) {
        if (lines.length > 0) return lines;
      }
    }
  }
  return [];
}

function projectPointToSegment(pointLon, pointLat, aLon, aLat, bLon, bLat) {
  const cosLat = Math.max(0.2, Math.cos((pointLat * Math.PI) / 180));
  const px = pointLon * cosLat;
  const py = pointLat;
  const ax = aLon * cosLat;
  const ay = aLat;
  const bx = bLon * cosLat;
  const by = bLat;
  const abx = bx - ax;
  const aby = by - ay;
  const abLen2 = abx * abx + aby * aby;
  if (abLen2 <= 0) {
    const dx = px - ax;
    const dy = py - ay;
    return {
      lon: aLon,
      lat: aLat,
      distance2: dx * dx + dy * dy,
      t: 0,
      aLon,
      aLat,
      bLon,
      bLat,
    };
  }
  const apx = px - ax;
  const apy = py - ay;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  const dx = px - qx;
  const dy = py - qy;
  return {
    lon: qx / cosLat,
    lat: qy,
    distance2: dx * dx + dy * dy,
    t,
    aLon,
    aLat,
    bLon,
    bLat,
  };
}

function findClosestProjectionOnLines(coords, lines) {
  if (!coords || !Array.isArray(lines) || lines.length === 0) return null;
  let best = null;
  lines.forEach((line) => {
    for (let i = 1; i < line.length; i += 1) {
      const prev = line[i - 1];
      const curr = line[i];
      const candidate = projectPointToSegment(coords.lon, coords.lat, prev[0], prev[1], curr[0], curr[1]);
      if (!best || candidate.distance2 < best.distance2) {
        best = candidate;
      }
    }
  });
  return best;
}

function normalizeDegrees(value) {
  if (!Number.isFinite(Number(value))) return null;
  const deg = Number(value) % 360;
  return deg < 0 ? deg + 360 : deg;
}

function angularDeltaDegrees(a, b) {
  const aa = normalizeDegrees(a);
  const bb = normalizeDegrees(b);
  if (aa == null || bb == null) return 180;
  return Math.abs(((aa - bb + 540) % 360) - 180);
}

function getTrackBearingForProjection(candidate, train) {
  if (!candidate) return null;
  const aLat = Number(candidate.aLat);
  const aLon = Number(candidate.aLon);
  const bLat = Number(candidate.bLat);
  const bLon = Number(candidate.bLon);
  if (![aLat, aLon, bLat, bLon].every(Number.isFinite)) return null;

  const forwardBearing = bearingDegrees(aLat, aLon, bLat, bLon);
  if (!Number.isFinite(forwardBearing)) return null;

  const trainHeading = normalizeDegrees(compassToDegrees(train?.displayHeading ?? train?.heading));
  if (trainHeading == null) return forwardBearing;

  const reverseBearing = (forwardBearing + 180) % 360;
  return angularDeltaDegrees(trainHeading, forwardBearing) <= angularDeltaDegrees(trainHeading, reverseBearing)
    ? forwardBearing
    : reverseBearing;
}

const TEXAS_EAGLE_DALLAS_BBOX = {
  minLat: 32.72,
  maxLat: 32.81,
  minLon: -96.88,
  maxLon: -96.74,
};

function pointInBBox(lon, lat, bbox) {
  return lon >= bbox.minLon && lon <= bbox.maxLon && lat >= bbox.minLat && lat <= bbox.maxLat;
}

function isTreRouteName(route) {
  const name = normalizeRouteName(route?.name);
  return name.includes("trinity railway express") || name === "tre" || name.endsWith(" tre");
}

function isTexasEagleRoute(route) {
  return route?.source === "amtrak" && normalizeRouteName(route?.name).includes("texas eagle");
}

function isHeartlandFlyerRoute(route) {
  return route?.source === "amtrak" && normalizeRouteName(route?.name).includes("heartland flyer");
}

function correctTexasEagleDallasSegment(route, treLines) {
  if (!isTexasEagleRoute(route) || !Array.isArray(treLines) || treLines.length === 0 || !route?.geometry) {
    return route?.geometry;
  }

  const lines = flattenGeometryToLines(route.geometry);
  if (lines.length === 0) return route.geometry;

  const correctedLines = lines.map((line) =>
    line.map((point) => {
      const [lon, lat] = point;
      if (!pointInBBox(lon, lat, TEXAS_EAGLE_DALLAS_BBOX)) return point;

      const projection = findClosestProjectionOnLines({ lon, lat }, treLines);
      if (!projection || projection.distance2 > 0.00025) return point;
      return [projection.lon, projection.lat];
    })
  );

  return correctedLines.length === 1
    ? { type: "LineString", coordinates: correctedLines[0] }
    : { type: "MultiLineString", coordinates: correctedLines };
}

function correctHeartlandFlyerAllianceSegment(route) {
  if (!isHeartlandFlyerRoute(route) || !route?.geometry) {
    return route?.geometry;
  }
  return route.geometry;
}

function snapTrainToRoute(train, coords, options = {}) {
  if (!coords || state.routeGeometriesAll.length === 0) return coords;
  if (`${train?.source || ""}`.trim().toLowerCase() === "gotransit") return coords;

  const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
  const forceSnap = Boolean(options.forceSnap || train?.historyPlayback);
  if (sourceKey === "freight-community") {
    const freightLines = state.routeGeometriesBySource.get("freight") || [];
    if (freightLines.length === 0) return coords;

    const freightByName = state.routeGeometriesBySourceAndName.get("freight");
    const companyCode = `${train?.ownerCode || normalizeRailroadMarkerCode(train?.railroad || train?.agency || "") || ""}`.trim().toLowerCase();
    const routeHints = [
      `${train?.subdivision || ""}`,
      `${train?.routeName || ""}`,
      `${train?.route || ""}`,
      companyCode,
    ].map((value) => normalizeRouteName(value)).filter(Boolean);

    let preferredLines = [];
    if (freightByName && routeHints.length > 0) {
      routeHints.forEach((hint) => {
        preferredLines.push(...findNamedLinesByPrefix(hint, freightByName));
      });
    }

    const dedupe = new Set();
    preferredLines = preferredLines.filter((line) => {
      const key = `${line?.length || 0}:${line?.[0]?.[0] || ""}:${line?.[0]?.[1] || ""}`;
      if (dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    });

    const preferred = preferredLines.length > 0 ? findClosestProjectionOnLines(coords, preferredLines) : null;
    if (preferred && preferred.distance2 <= (0.012 * 0.012)) {
      return {
        lat: preferred.lat,
        lon: preferred.lon,
        trackBearing: getTrackBearingForProjection(preferred, train),
      };
    }

    // Interchange fallback: allow closest freight line when the train is near a junction.
    const interchange = findClosestProjectionOnLines(coords, freightLines);
    if (interchange && interchange.distance2 <= (0.008 * 0.008)) {
      return {
        lat: interchange.lat,
        lon: interchange.lon,
        trackBearing: getTrackBearingForProjection(interchange, train),
      };
    }

    return coords;
  }

  const sourceLines = state.routeGeometriesBySource.get(train.source) || [];
  const byNameMap = state.routeGeometriesBySourceAndName.get(train.source);
  const routeName = normalizeRouteName(train.route || train.name);
  const namedLines = findNamedLinesByPrefix(routeName, byNameMap);
  const aggressiveSnapSources = new Set(["ace", "coaster", "sprinter"]);

  // Amtrak routes have dense overlaps (Sacramento area, Chicago approaches).
  // Avoid snapping to the wrong corridor when route naming is missing/ambiguous.
  if (!forceSnap && (sourceKey === "amtrak" || sourceKey === "amtraker") && namedLines.length === 0) {
    return coords;
  }

  if (aggressiveSnapSources.has(sourceKey) && namedLines.length === 0 && sourceLines.length > 0) {
    const nearestSourceLine = findClosestProjectionOnLines(coords, sourceLines);
    if (nearestSourceLine && nearestSourceLine.distance2 <= (0.02 * 0.02)) {
      return {
        lat: nearestSourceLine.lat,
        lon: nearestSourceLine.lon,
        trackBearing: getTrackBearingForProjection(nearestSourceLine, train),
      };
    }
  }

  // Conservative snap only: never move a marker far from its live GPS point.
  // This completely prevents teleports into oceans/other regions.
  let best = null;
  let maxSnapDistance = forceSnap ? 0.03 : 0.0045; // ~500m default conservative snap window
  if (sourceKey === "dcta") {
    maxSnapDistance = 0.02; // keep A-Train firmly on guideway
  } else if (sourceKey === "ace") {
    maxSnapDistance = 0.022;
  } else if (sourceKey === "coaster" || sourceKey === "sprinter") {
    maxSnapDistance = 0.02;
  }

  if (namedLines.length > 0) {
    best = findClosestProjectionOnLines(coords, namedLines);
    maxSnapDistance = sourceKey === "dcta" ? 0.03 : (sourceKey === "ace" || sourceKey === "coaster" || sourceKey === "sprinter") ? 0.03 : 0.008; // rail corridors with known shapes can snap harder
  } else if (sourceLines.length > 0) {
    best = findClosestProjectionOnLines(coords, sourceLines);
  }

  if (!best) return coords;
  if (best.distance2 > maxSnapDistance * maxSnapDistance) return coords;
  if (!isWithinBounds(best.lat, best.lon, train.source)) return coords;
  return {
    lat: best.lat,
    lon: best.lon,
    trackBearing: getTrackBearingForProjection(best, train),
  };
}

function findFreightHostForCoords(coords) {
  if (!coords || !Array.isArray(state.freightRouteLineOwners) || state.freightRouteLineOwners.length === 0) return null;

  const key = `${Number(coords.lat).toFixed(3)},${Number(coords.lon).toFixed(3)}`;
  if (state.freightHostLookupCache.has(key)) {
    return state.freightHostLookupCache.get(key);
  }

  let best = null;
  const PAD = 0.04;

  for (const candidate of state.freightRouteLineOwners) {
    if (!candidate?.bounds) continue;
    const b = candidate.bounds;
    if (
      coords.lon < b.minLon - PAD || coords.lon > b.maxLon + PAD
      || coords.lat < b.minLat - PAD || coords.lat > b.maxLat + PAD
    ) {
      continue;
    }
    const projection = findClosestProjectionOnLines(coords, [candidate.line]);
    if (!projection) continue;
    const projectionScore = projection.distance2 + (candidate.isSyntheticHost ? 0.0000015 : 0);
    if (!best || projectionScore < best.score) {
      best = {
        ownerCode: candidate.ownerCode,
        owner: candidate.owner,
        subdivision: candidate.subdivision,
        distance2: projection.distance2,
        score: projectionScore,
      };
    }
  }

  const MAX_DISTANCE2 = 0.0025 * 0.0025;
  const resolved = best && best.distance2 <= MAX_DISTANCE2 ? best : null;
  state.freightHostLookupCache.set(key, resolved);
  return resolved;
}

function getRouteDisplayLabel(train) {
  const baseRoute = `${train?.route || train?.routeName || "--"}`.trim() || "--";
  const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
  if (!sourceKey || sourceKey === "freight" || sourceKey === "freight-community") return baseRoute;
  if (!state.freightVisible) return baseRoute;

  const rawCoords = normalizeLngLat(train?.lat, train?.lon, train?.source);
  if (!rawCoords) return baseRoute;

  const cacheKey = `${sourceKey}:${train?.id || ""}:${(train?.route || train?.routeName || "").trim()}:${rawCoords.lat.toFixed(3)},${rawCoords.lon.toFixed(3)}`;
  if (state.routeDisplayLabelCache.has(cacheKey)) {
    return state.routeDisplayLabelCache.get(cacheKey);
  }

  const snappedCoords = snapTrainToRoute(train, rawCoords) || rawCoords;
  const host = findFreightHostForCoords(snappedCoords);
  if (!host) {
    state.routeDisplayLabelCache.set(cacheKey, baseRoute);
    return baseRoute;
  }

  const hostCode = `${host.ownerCode || host.owner || "Freight"}`.trim();
  if (!hostCode) {
    state.routeDisplayLabelCache.set(cacheKey, baseRoute);
    return baseRoute;
  }
  const baseNeedle = normalizeRouteName(baseRoute);
  const hostNeedle = normalizeRouteName(hostCode);
  if (baseNeedle && hostNeedle && baseNeedle.includes(hostNeedle)) {
    state.routeDisplayLabelCache.set(cacheKey, baseRoute);
    return baseRoute;
  }

  const label = `${baseRoute} / ${hostCode}`;
  state.routeDisplayLabelCache.set(cacheKey, label);
  return label;
}

function buildRouteSignature(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return "";
  const step = Math.max(1, Math.floor(coordinates.length / 36));
  const reduced = [];
  for (let index = 0; index < coordinates.length; index += step) {
    reduced.push(coordinates[index]);
  }
  const lastPoint = coordinates[coordinates.length - 1];
  if (reduced[reduced.length - 1] !== lastPoint) reduced.push(lastPoint);

  return reduced
    .map((point) => `${point[0].toFixed(3)},${point[1].toFixed(3)}`)
    .join("|");
}

function getRouteDisplayPriority(route) {
  const source = `${route?.source || ""}`.toLowerCase();
  if (source === "amtrak") return 100;
  if (source === "via") return 95;
  if (source === "brightline") return 90;
  if (source === "metra") return 82;
  if (source === "caltrain") return 80;
  if (source === "ace") return 78;
  if (source === "coaster") return 76;
  if (source === "metrolink") return 74;
  if (source === "dart") return 72;
  return 50;
}

function shouldAttemptSharedTrackMerge(route) {
  const source = `${route?.source || ""}`.toLowerCase();
  return source === "amtrak" || source === "caltrain" || source === "ace" || source === "coaster" || source === "metrolink";
}

function buildRouteBounds(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return null;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  lines.forEach((line) => {
    (line || []).forEach((point) => {
      if (!Array.isArray(point) || point.length < 2) return;
      minLon = Math.min(minLon, point[0]);
      minLat = Math.min(minLat, point[1]);
      maxLon = Math.max(maxLon, point[0]);
      maxLat = Math.max(maxLat, point[1]);
    });
  });
  if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) return null;
  return { minLon, minLat, maxLon, maxLat };
}

function simplifyRouteLine(line, step = 1, maxPoints = Infinity) {
  if (!Array.isArray(line) || line.length <= 2) return line;
  const simplified = [];
  const normalizedStep = Math.max(1, Number(step) || 1);
  for (let index = 0; index < line.length; index += normalizedStep) {
    simplified.push(line[index]);
  }
  const lastPoint = line[line.length - 1];
  if (simplified[simplified.length - 1] !== lastPoint) {
    simplified.push(lastPoint);
  }
  let result = simplified.length >= 2 ? simplified : line;

  if (Number.isFinite(maxPoints) && maxPoints > 2 && result.length > maxPoints) {
    const limitStep = Math.ceil(result.length / maxPoints);
    const limited = [];
    for (let index = 0; index < result.length; index += limitStep) {
      limited.push(result[index]);
    }
    if (limited[limited.length - 1] !== lastPoint) {
      limited.push(lastPoint);
    }
    if (limited.length >= 2) {
      result = limited;
    }
  }

  return result;
}

function getRouteSimplificationConfig(route, lodBucket = null) {
  const source = `${route?.source || ""}`.toLowerCase();
  const isFreight = source === "freight";
  const isLowTier = Boolean(state.lowTierDevice);
  const bucket = Number.isFinite(Number(lodBucket))
    ? Number(lodBucket)
    : getCurrentRouteLodBucket();

  if (isLowTier) {
    if (isFreight) {
      if (bucket === 4) return { step: 3, maxPoints: 900 };
      if (bucket === 3) return { step: 3, maxPoints: 900 };
      if (bucket === 2) return { step: 5, maxPoints: 700 };
      if (bucket === 1) return { step: 7, maxPoints: 480 };
      return { step: 9, maxPoints: 320 };
    }
    if (bucket === 4) return { step: 2, maxPoints: 600 };
    if (bucket === 3) return { step: 2, maxPoints: 600 };
    if (bucket === 2) return { step: 3, maxPoints: 420 };
    if (bucket === 1) return { step: 5, maxPoints: 260 };
    return { step: 7, maxPoints: 180 };
  }

  if (isFreight) {
    if (bucket === 4) return { step: 2, maxPoints: 1200 };
    if (bucket === 3) return { step: 2, maxPoints: 1200 };
    if (bucket === 2) return { step: 4, maxPoints: 1300 };
    if (bucket === 1) return { step: 6, maxPoints: 900 };
    return { step: 8, maxPoints: 620 };
  }

  if (bucket === 4) return { step: 2, maxPoints: 900 };
  if (bucket === 3) return { step: 2, maxPoints: 900 };
  if (bucket === 2) return { step: 3, maxPoints: 560 };
  if (bucket === 1) return { step: 4, maxPoints: 360 };
  return { step: 6, maxPoints: 240 };
}

function getCurrentRouteLodBucket() {
  const zoom = Number(state.map?.getZoom?.() ?? 6);
  if (zoom >= 8) return 4;
  if (zoom >= 7) return 3;
  if (zoom >= 6) return 2;
  if (zoom >= 5) return 1;
  return 0;
}

function boundsOverlap(a, b, padding = 0.02) {
  if (!a || !b) return false;
  return !(
    a.maxLon + padding < b.minLon ||
    b.maxLon + padding < a.minLon ||
    a.maxLat + padding < b.minLat ||
    b.maxLat + padding < a.minLat
  );
}

function sampleLinePoints(line, targetCount = 28) {
  if (!Array.isArray(line) || line.length === 0) return [];
  const step = Math.max(1, Math.floor(line.length / targetCount));
  const sampled = [];
  for (let index = 0; index < line.length; index += step) {
    sampled.push(line[index]);
  }
  const last = line[line.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

function distanceToLineAtPoint(point, line) {
  if (!Array.isArray(point) || point.length < 2 || !Array.isArray(line) || line.length < 2) return Infinity;
  const projection = findClosestProjectionOnLines({ lon: point[0], lat: point[1] }, [line]);
  return projection ? Math.sqrt(projection.distance2) : Infinity;
}

function routeOverlapRatio(candidateLines, targetLines) {
  if (!Array.isArray(candidateLines) || candidateLines.length === 0 || !Array.isArray(targetLines) || targetLines.length === 0) {
    return 0;
  }
  let matches = 0;
  let total = 0;
  candidateLines.forEach((line) => {
    sampleLinePoints(line).forEach((point) => {
      total += 1;
      const bestDistance = targetLines.reduce((best, targetLine) => {
        const distance = distanceToLineAtPoint(point, targetLine);
        return Math.min(best, distance);
      }, Infinity);
      if (bestDistance <= 0.0045) {
        matches += 1;
      }
    });
  });
  return total > 0 ? matches / total : 0;
}

function mergeSharedRouteNames(primaryName, secondaryName) {
  const names = [];
  [primaryName, secondaryName].forEach((name) => {
    const clean = `${name || ""}`.trim();
    if (!clean) return;
    const normalized = normalizeRouteName(clean);
    if (!normalized) return;
    if (names.some((existing) => normalizeRouteName(existing) === normalized)) return;
    names.push(clean);
  });
  if (names.length <= 1) return names[0] || "";
  return `${names[0]} and ${names.slice(1).join(" and ")}`;
}

function buildSharedTrackDisplayRoutes(preparedRoutes) {
  const activeRoutes = Array.isArray(preparedRoutes) ? preparedRoutes : [];
  const cacheKey = activeRoutes
    .map((route) => `${route?.id || ""}|${route?.source || ""}|${route?.name || ""}|${(route?.signatures || []).join("~")}`)
    .join("||");
  if (cacheKey && state.sharedRouteDisplayCacheKey === cacheKey && Array.isArray(state.sharedRouteDisplayCache)) {
    return state.sharedRouteDisplayCache;
  }
  const suppressedIds = new Set();
  const sharedOverlays = [];

  const prioritySorted = [...activeRoutes].sort((a, b) => {
    const priorityDiff = getRouteDisplayPriority(b) - getRouteDisplayPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return (b.flattened?.[0]?.length || 0) - (a.flattened?.[0]?.length || 0);
  });

  prioritySorted.forEach((candidate) => {
    if (!candidate?.id || suppressedIds.has(candidate.id)) return;
    if (!shouldAttemptSharedTrackMerge(candidate)) return;
    const candidatePriority = getRouteDisplayPriority(candidate);
    const candidateLines = candidate.flattened || [];
    if (candidateLines.length === 0) return;

    const baseRoute = prioritySorted.find((base) => {
      if (!base?.id || base.id === candidate.id) return false;
      if (suppressedIds.has(base.id)) return false;
      if (!shouldAttemptSharedTrackMerge(base)) return false;
      if (getRouteDisplayPriority(base) <= candidatePriority) return false;
      if (!boundsOverlap(candidate.bounds, base.bounds)) return false;
      const overlap = routeOverlapRatio(candidateLines, base.flattened || []);
      return overlap >= 0.9;
    });

    if (!baseRoute) return;

    suppressedIds.add(candidate.id);
    sharedOverlays.push({
      id: `shared-${baseRoute.id}-${candidate.id}`,
      name: mergeSharedRouteNames(baseRoute.name, candidate.name),
      source: baseRoute.source,
      color: resolveRouteColor(baseRoute),
      geometry: candidate.normalizedGeometry,
      flattened: candidate.flattened,
    });
  });

  const result = [
    ...activeRoutes.filter((route) => route?.id && !suppressedIds.has(route.id)),
    ...sharedOverlays,
  ];
  state.sharedRouteDisplayCacheKey = cacheKey;
  state.sharedRouteDisplayCache = result;
  return result;
}

function showTrainTooltip(train, x, y) {
  if (!elements.tooltip || x == null) return;
  elements.tooltip.style.left = `${x}px`;
  elements.tooltip.style.top = `${y}px`;
  const etaText = train.actual || train.eta || "--";
  const schedText = train.scheduled || "--";

  // Format speed display
  let speedText = "--";
  if (train.speed != null && train.speed !== "") {
    const speed = typeof train.speed === "number" ? train.speed : parseFloat(train.speed);
    if (!isNaN(speed)) {
      speedText = `${Math.round(speed)} mph`;
    }
  }

  // Format heading display
  let headingText = "--";
  const headingDegrees = compassToDegrees(train.heading);
  if (headingDegrees != null) {
    const heading = Number(headingDegrees);
    if (!isNaN(heading)) {
      const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      const index = Math.round(((heading % 360) / 45)) % 8;
      headingText = `${directions[index]} (${Math.round(heading)}°)`;
    }
  }

  const sourceLabel = sources[train.source]?.label || train.source || "--";
  const routeLabel = getRouteDisplayLabel(train);
  const statusText = delayLabel(train.delayMinutes, train.status);
  const realtimeLabel = train.realTime ? "Live position" : "Scheduled position";
  elements.tooltip.innerHTML = `
    <div class="train-tooltip-card">
      <div class="train-tooltip-head">
        <strong style="color:${getTrainDisplayColor(train)}">${escapeHtml(train.name || "Train")}</strong>
        <span>${escapeHtml(formatMarkerLabel(train))}</span>
      </div>
      <div class="train-tooltip-sub">${escapeHtml(sourceLabel)} • ${escapeHtml(routeLabel)}</div>
      <div class="train-tooltip-grid">
        <div><span>Next</span><strong>${escapeHtml(train.nextStop || "--")}</strong></div>
        <div><span>Status</span><strong>${escapeHtml(statusText)}</strong></div>
        <div><span>ETA</span><strong>${escapeHtml(etaText)}</strong></div>
        <div><span>Sched</span><strong>${escapeHtml(schedText)}</strong></div>
        <div><span>Speed</span><strong>${escapeHtml(speedText)}</strong></div>
        <div><span>Heading</span><strong>${escapeHtml(headingText)}</strong></div>
      </div>
      <div class="train-tooltip-foot">${escapeHtml(realtimeLabel)}</div>
    </div>
  `;
  elements.tooltip.classList.add("visible");
  elements.tooltip.setAttribute("aria-hidden", "false");
  state.hoveredTrain = train;
  state.hoveredMouseX = x;
  state.hoveredMouseY = y;
}

function hideTrainTooltip() {
  if (!elements.tooltip) return;
  elements.tooltip.classList.remove("visible");
  elements.tooltip.setAttribute("aria-hidden", "true");
  state.hoveredTrain = null;
  state.hoveredMouseX = null;
  state.hoveredMouseY = null;
}

function getServiceAlertText(train) {
  const alerts = collectServiceAlertEntries(train);
  if (alerts[0]?.text) return alerts[0].text;
  const delay = resolveDelayMinutes(train?.delayMinutes, train?.status);
  if (Number.isFinite(Number(delay)) && Number(delay) > 5) {
    const name = train?.name || formatMarkerLabel(train) || "Train";
    const nextStop = train?.nextStop ? ` Next stop: ${train.nextStop}.` : "";
    return `${name} is currently ${delayLabel(delay, train?.status).toLowerCase()}.${nextStop}`;
  }
  return "";
}

function normalizeServiceAlertText(value) {
  return `${value || ""}`
    .replace(/\s+/g, " ")
    .replace(/[\u2022·]+/g, " • ")
    .replace(/\s+•\s+/g, " • ")
    .trim();
}

function collectServiceAlertEntries(train) {
  if (!train) return [];
  const entries = [];
  const seen = new Set();

  const pushEntry = (raw, fallbackSource = "Reported", fallbackTimestamp = "") => {
    let text = "";
    let source = fallbackSource;
    let timestamp = fallbackTimestamp;
    let firstSeenAt = "";

    if (raw && typeof raw === "object") {
      text = normalizeServiceAlertText(raw.text || raw.message || raw.title || raw.description || "");
      source = `${raw.source || raw.provider || raw.agency || fallbackSource || "Reported"}`.trim();
      timestamp = raw.timestamp || raw.updatedAt || raw.publishedAt || fallbackTimestamp || "";
      firstSeenAt = raw.firstSeenAt || raw.first_seen_at || raw.recordTime || raw.record_time || timestamp || "";
    } else {
      text = normalizeServiceAlertText(raw);
    }

    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ text, source, timestamp, firstSeenAt });
  };

  const candidates = [
    train.serviceAlerts,
    train.alertReason,
    train.alert,
    train.serviceAlert,
    train.alertText,
    train.statusText,
    train.statusMessage,
  ];

  candidates.forEach((candidate) => {
    if (!candidate) return;
    if (Array.isArray(candidate)) {
      candidate.forEach((entry) => pushEntry(entry));
      return;
    }
    pushEntry(candidate);
  });

  if (entries.length === 0) {
    const delay = resolveDelayMinutes(train?.delayMinutes, train?.status);
    if (Number.isFinite(Number(delay)) && Number(delay) > 5) {
      const name = train?.name || formatMarkerLabel(train) || "Train";
      const nextStop = train?.nextStop ? ` Next stop: ${train.nextStop}.` : "";
      pushEntry(
        {
          text: `${name} is currently ${delayLabel(delay, train?.status).toLowerCase()}.${nextStop}`,
          source: sources[train.source]?.label || train.source || "Reported",
          timestamp: train.lastUpdated || "",
          firstSeenAt: train.lastUpdated || "",
        },
        "Reported",
        train.lastUpdated || ""
      );
    }
  }

  return entries.slice(0, 8);
}

function inferAlertSeverityFromText(text) {
  const normalized = `${text || ""}`.toLowerCase();
  if (!normalized) return "minor";
  if (/(cancel|suspend|derail|evacuat|fire|hazard|police|medical emergency|fatal)/.test(normalized)) return "critical";
  if (/(major delay|significant|disabled train|single track|bypass|bus bridge|mechanical issue)/.test(normalized)) return "major";
  if (/(delay|late|slow order|advisory|maintenance|holding|congestion)/.test(normalized)) return "minor";
  return "info";
}

function getServiceAlertSeverity(train, alertEntries = collectServiceAlertEntries(train)) {
  if (isOutOfServiceTrain(train)) return "critical";
  if (train?.serviceSeverity === "severe") return "critical";
  const delay = resolveDelayMinutes(train?.delayMinutes, train?.status);
  if (Number.isFinite(Number(delay)) && Number(delay) >= 60) return "major";

  let worst = "info";
  const rank = { info: 0, minor: 1, major: 2, critical: 3 };
  alertEntries.forEach((entry) => {
    const severity = inferAlertSeverityFromText(entry?.text || "");
    if (rank[severity] > rank[worst]) worst = severity;
  });
  return worst;
}

function getServiceAlertSeverityLabel(severity) {
  if (severity === "critical") return "Critical";
  if (severity === "major") return "Major";
  if (severity === "minor") return "Service";
  return "Info";
}

function formatAlertSeenMeta(entry, train) {
  const firstSeen = entry?.firstSeenAt || train?.alertFirstSeenAt || entry?.timestamp || "";
  if (firstSeen) return `First seen ${formatServiceTime(firstSeen)}`;
  if (train?.lastUpdated) return `Updated ${formatUpdatedTimestamp(train.lastUpdated)}`;
  return "";
}

function escapeHtml(value) {
  return `${value ?? ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findRelatedSightingsForTrain(train) {
  const trainNeedles = [
    `${train.trainNum || ""}`.trim().toLowerCase(),
    `${train.id || ""}`.trim().toLowerCase(),
    `${train.name || ""}`.trim().toLowerCase(),
  ].filter(Boolean);

  return (state.sightings || [])
    .filter((row) => {
      const label = `${row.trainLabel || ""}`.trim().toLowerCase();
      if (!label) return false;
      return trainNeedles.some((needle) => label.includes(needle) || needle.includes(label));
    })
    .slice(0, 3);
}

function getTrainKey(train) {
  return `${train?.source || ""}:${train?.id || ""}`;
}

function isTrainCurrentlyTracked(train) {
  if (!state.followSelectedTrainOnMap) return false;
  if (!state.selectedTrain || !train) return false;
  return getTrainKey(state.selectedTrain) === getTrainKey(train);
}

function setTrainTracking(train, enabled) {
  const shouldEnable = Boolean(enabled);
  if (!shouldEnable) {
    state.followSelectedTrainOnMap = false;
    state.selectedTrainFollowLastMs = 0;
    return false;
  }
  if (!state.uiSettings?.predictedMovementVisible) return false;
  if (!isPredictiveMovementEligibleTrain(train)) return false;
  state.selectedTrain = train;
  state.followSelectedTrainOnMap = true;
  state.selectedTrainFollowLastMs = 0;
  return true;
}

function getTrainSpeedDisplayInfo(train) {
  const providerSpeed = Number(train?.speed);
  const providerText = Number.isFinite(providerSpeed) && providerSpeed >= 0
    ? `${Math.round(providerSpeed)} mph`
    : "--";

  if (!state.uiSettings?.predictedMovementVisible || !isPredictiveMovementEligibleTrain(train)) {
    return { label: "Speed", text: providerText, isPredicted: false };
  }

  const snapshotKey = `${train?.source || ""}:${train?.id || ""}`;
  const predictedSpeed = Number(state.trainSnapshots.get(snapshotKey)?.currentSpeed);
  if (!Number.isFinite(predictedSpeed) || predictedSpeed < 0) {
    return { label: "Speed", text: providerText, isPredicted: false };
  }

  return {
    label: "Speed (Move)",
    text: `${Math.round(predictedSpeed)} mph`,
    isPredicted: true,
  };
}

function buildTrainPopupHtml(train) {
  const isFreightCommunity = `${train?.source || ""}`.trim().toLowerCase() === "freight-community";
  const statusText = delayLabel(train.delayMinutes, train.status);
  const speedInfo = getTrainSpeedDisplayInfo(train);
  const speedText = speedInfo.text;
  const nextStopText = train.nextStop || "--";
  const routeLabel = getRouteDisplayLabel(train);
  const etaText = formatServiceTime(train.actual || train.eta || "");
  const showTrackControl = Boolean(state.uiSettings?.predictedMovementVisible && isPredictiveMovementEligibleTrain(train));
  const isTracking = isTrainCurrentlyTracked(train);
  const yardRows = isFreightCommunity ? getUpcomingFreightYards(train, 4) : [];
  const popupActions = [];
  if (showTrackControl) {
    popupActions.push(`<button type="button" class="btn-secondary train-popup-track-btn ${isTracking ? "active" : ""}" data-train-track="${escapeHtml(`${train.source}:${train.id}`)}">${isTracking ? "Tracking" : "Track"}</button>`);
  }
  return `
    <div class="train-popup-card">
      <div class="train-popup-header">
        <div class="train-popup-brand">
          ${getLogoMarkup(train.source, "compact")}
          <div class="train-popup-brand-copy">
            <strong>${escapeHtml(train.name || "Train")}</strong>
            <span>${escapeHtml(formatMarkerLabel(train))}</span>
          </div>
        </div>
      </div>
      <div class="train-popup-subhead">${escapeHtml(sources[train.source]?.label || train.source || "--")} • ${escapeHtml(routeLabel)}</div>
      <div class="train-popup-highlights">
        <div class="train-popup-highlight">
          <span>Next Stop</span>
          <strong>${escapeHtml(nextStopText)}</strong>
        </div>
        <div class="train-popup-highlight">
          <span>Status</span>
          <strong>${escapeHtml(statusText)}</strong>
        </div>
      </div>
      <div class="train-popup-grid">
        <div><span>${escapeHtml(speedInfo.label)}</span><strong>${escapeHtml(speedText)}</strong></div>
        <div><span>ETA</span><strong>${escapeHtml(etaText)}</strong></div>
      </div>
      <div class="train-popup-stops">
        <div class="train-popup-stops-head">${isFreightCommunity ? "Upcoming Yards" : "Upcoming Stops"}</div>
        <div class="train-popup-stops-body" data-train-popup-stops>
          ${isFreightCommunity ? buildTrainPopupStopsHtml(yardRows) : '<div class="train-popup-stops-loading">Loading stops…</div>'}
        </div>
      </div>
      ${popupActions.length > 0 ? `<div class="train-popup-actions">${popupActions.join("")}</div>` : ""}
    </div>
  `;
}

function buildSimpleTrainInfoPopupHtml(train) {
  const statusText = delayLabel(train.delayMinutes, train.status);
  const speedInfo = getTrainSpeedDisplayInfo(train);
  const speedText = speedInfo.text;
  const etaText = formatServiceTime(train.actual || train.eta || "");
  const routeLabel = getRouteDisplayLabel(train);
  const headingText = Number.isFinite(Number(train.heading)) ? `${Math.round(Number(train.heading))}°` : "--";
  const rawTrainKey = `${train.source}:${train.id}`;
  const showTrackControl = Boolean(state.uiSettings?.predictedMovementVisible && isPredictiveMovementEligibleTrain(train));
  const isTracking = isTrainCurrentlyTracked(train);
  const nextStopText = train.nextStop || "--";
  const popupActions = [];
  if (showTrackControl) {
    popupActions.push(`<button type="button" class="btn-secondary simple-info-popup__track-btn ${isTracking ? "active" : ""}" data-train-track="${escapeHtml(rawTrainKey)}">${isTracking ? "Tracking" : "Track"}</button>`);
  }
  return `
    <div class="simple-info-popup">
      <div class="simple-info-popup__title">${escapeHtml(train.name || "Train")}</div>
      <div class="simple-info-popup__id">${escapeHtml(formatMarkerLabel(train))}</div>
      <div class="simple-info-popup__meta">${escapeHtml(sources[train.source]?.label || train.source || "--")} • ${escapeHtml(routeLabel)}</div>
      <div class="simple-info-popup__meta">Next stop: ${escapeHtml(nextStopText)}</div>
      <div class="simple-info-popup__grid">
        <div><span>Status</span><strong>${escapeHtml(statusText)}</strong></div>
        <div><span>${escapeHtml(speedInfo.label)}</span><strong>${escapeHtml(speedText)}</strong></div>
        <div><span>Heading</span><strong>${escapeHtml(headingText)}</strong></div>
        <div><span>ETA</span><strong>${escapeHtml(etaText)}</strong></div>
      </div>
      <div class="simple-info-popup__updated">Updated ${escapeHtml(formatUpdatedTimestamp(train.lastUpdated))}</div>
      ${popupActions.length > 0 ? `<div class="simple-info-popup__actions">${popupActions.join("")}</div>` : ""}
    </div>
  `;
}

function buildTrainPopupStopsHtml(stops) {
  if (!Array.isArray(stops) || stops.length === 0) {
    return `<div class="train-popup-stops-empty">No upcoming stops available yet.</div>`;
  }

  const compactMode = window.matchMedia?.("(pointer: coarse)")?.matches || window.innerWidth <= 900;
  const limit = compactMode ? 2 : 4;

  return stops.slice(0, limit).map((row) => {
    const stationName = row.stationName || row.stationId || "Stop";
    const eta = Number.isFinite(Number(row.etaMinutes))
      ? formatMinutesAsDuration(Math.max(0, Number(row.etaMinutes)))
      : "--";
    const timeText = row.actual || row.scheduled || "--";
    const platform = row.platform || row.track || "";
    const platformText = platform
      ? `<span class="train-popup-stop-platform">${escapeHtml(row.platform ? `Platform ${platform}` : `Track ${platform}`)}</span>`
      : "";
    return `
      <div class="train-popup-stop-row">
        <div class="train-popup-stop-main">
          <strong>${escapeHtml(stationName)}</strong>
          ${platformText}
        </div>
        <div class="train-popup-stop-meta">
          <span>${escapeHtml(timeText)}</span>
          <span>${escapeHtml(eta)}</span>
        </div>
      </div>
    `;
  }).join("");
}

function openTrainPopup(train, lngLat) {
  if (!train) return;
  state.followSelectedTrainOnMap = false;
  state.selectedTrainFollowLastMs = 0;
  state.trainPopup?.remove();
  state.trainPopup = null;

  selectTrain(train);
}

window.openTrainDetailFromSimpleInfo = function openTrainDetailFromSimpleInfo(encodedTrainKey) {
  const key = decodeURIComponent(`${encodedTrainKey || ""}`);
  const train = state.trainIndex.get(key) || getAllTrains().find((row) => `${row.source}:${row.id}` === key);
  if (!train) return;
  state.trainPopup?.remove?.();
  state.trainPopup = null;
  selectTrain(train);
};

function renderRoutes(routes) {
  state.renderedRoutes = routes;
  const currentLodBucket = Number.isFinite(Number(state.routeLodBucket))
    ? Number(state.routeLodBucket)
    : getCurrentRouteLodBucket();
  state.routeLodBucket = currentLodBucket;
  if (!(state.routePreparedLodCache instanceof WeakMap)) {
    state.routePreparedLodCache = new WeakMap();
  }
  if (!(state.freightHostLookupCache instanceof Map)) {
    state.freightHostLookupCache = new Map();
  }
  const highlightSelection = `${state.uiSettings.freightOperatorHighlight || "all"}`.trim() || "all";
  const hostSharedSources = new Set([
    "amtrak", "ace", "septa", "njt", "mbta", "marc", "vre", "sounder", "caltrain", "metrolink", "coaster", "gotransit", "mta_mnr", "lirr",
  ]);
  const shouldGenerateSyntheticHosts = Boolean(!state.routesVisible && state.freightVisible);

  const realFreightRoutes = Array.isArray(routes)
    ? routes.filter((route) => route?.source === "freight")
    : [];

  const realFreightOwnerLineIndex = [];
  realFreightRoutes.forEach((route) => {
    const geometry = route?.geometry || (route?.polyline ? { type: "LineString", coordinates: route.polyline } : null);
    if (!geometry) return;
    const flattenedRaw = flattenGeometryToLines(geometry);
    if (flattenedRaw.length === 0) return;
    const simplificationConfig = getRouteSimplificationConfig(route, currentLodBucket);
    const representative = flattenedRaw[0];
    const line = simplifyRouteLine(representative, simplificationConfig.step, simplificationConfig.maxPoints);
    realFreightOwnerLineIndex.push({
      line,
      bounds: buildRouteBounds([line]),
      ownerCode: `${route.ownerCode || route.owner || ""}`.trim(),
      owner: `${route.owner || route.ownerCode || "Freight Railroad"}`.trim(),
    });
  });

  const inferHostOwnerForSharedRoute = (route) => {
    if (!route || realFreightOwnerLineIndex.length === 0) {
      return { ownerCode: "Freight", owner: "Freight Railroad" };
    }

    const geometry = route?.geometry || (route?.polyline ? { type: "LineString", coordinates: route.polyline } : null);
    if (!geometry) {
      return { ownerCode: "Freight", owner: "Freight Railroad" };
    }

    const flattenedRaw = flattenGeometryToLines(geometry);
    if (flattenedRaw.length === 0) {
      return { ownerCode: "Freight", owner: "Freight Railroad" };
    }

    const ownerScores = new Map();
    const MAX_DISTANCE = 0.012;
    const PAD = 0.08;

    flattenedRaw.forEach((line) => {
      sampleLinePoints(line, 6).forEach((point) => {
        if (!Array.isArray(point) || point.length < 2) return;

        let nearest = null;
        realFreightOwnerLineIndex.forEach((candidate) => {
          const b = candidate?.bounds;
          if (!b) return;
          if (
            point[0] < b.minLon - PAD || point[0] > b.maxLon + PAD
            || point[1] < b.minLat - PAD || point[1] > b.maxLat + PAD
          ) {
            return;
          }

          const distance = distanceToLineAtPoint(point, candidate.line);
          if (!Number.isFinite(distance)) return;
          if (!nearest || distance < nearest.distance) {
            nearest = { candidate, distance };
          }
        });

        if (!nearest || nearest.distance > MAX_DISTANCE) return;
        const ownerCode = `${nearest.candidate.ownerCode || nearest.candidate.owner || ""}`.trim();
        const owner = `${nearest.candidate.owner || nearest.candidate.ownerCode || "Freight Railroad"}`.trim();
        if (!ownerCode) return;

        const weight = Math.max(0.05, 1 - (nearest.distance / MAX_DISTANCE));
        const current = ownerScores.get(ownerCode) || { ownerCode, owner, score: 0 };
        current.score += weight;
        ownerScores.set(ownerCode, current);
      });
    });

    const best = [...ownerScores.values()].sort((a, b) => b.score - a.score)[0];
    if (!best || best.score < 1.5) {
      return { ownerCode: "Freight", owner: "Freight Railroad" };
    }
    return { ownerCode: best.ownerCode, owner: best.owner };
  };

  const hostSharedCandidates = Array.isArray(routes)
    ? routes.filter((route) => route?.source !== "freight" && hostSharedSources.has(`${route?.source || ""}`.toLowerCase()))
    : [];

  const syntheticCacheKey = shouldGenerateSyntheticHosts
    ? `${realFreightRoutes.length}:${hostSharedCandidates.length}:${realFreightRoutes.map((route) => `${route.id || ""}:${route.ownerCode || route.owner || ""}`).join("|")}:${hostSharedCandidates.map((route) => `${route.id || route.name || ""}`).join("|")}`
    : "";

  let syntheticHostFreightRoutes = [];
  if (shouldGenerateSyntheticHosts) {
    if (state.syntheticHostFreightCacheKey === syntheticCacheKey && Array.isArray(state.syntheticHostFreightCache)) {
      syntheticHostFreightRoutes = state.syntheticHostFreightCache;
    } else {
      syntheticHostFreightRoutes = hostSharedCandidates.map((route) => {
        const inferredHost = inferHostOwnerForSharedRoute(route);
        return {
          ...route,
          id: `host-freight-${normalizeRouteName(route.id || route.name || route.route_id || route.shortName || route.label || "route")}`,
          source: "freight",
          ownerCode: inferredHost.ownerCode,
          owner: inferredHost.owner,
          freightClass: "shared-passenger-corridor",
          syntheticHostFreight: true,
          color: "#6b7280",
        };
      });
      state.syntheticHostFreightCacheKey = syntheticCacheKey;
      state.syntheticHostFreightCache = syntheticHostFreightRoutes;
    }
  }

  const allFreightRoutes = Array.isArray(routes)
    ? [
      ...routes.filter((route) => route?.source === "freight"),
      ...syntheticHostFreightRoutes,
    ]
    : [];
  const freightOperators = allFreightRoutes
    .map((route) => ({
      value: `${route.ownerCode || route.owner || ""}`.trim(),
      label: `${route.owner || route.ownerCode || "Freight Railroad"}`.trim(),
    }))
    .filter((entry) => entry.value && entry.label);
  const uniqueFreightOperators = Array.from(new Map(
    freightOperators.map((entry) => [entry.value, entry])
  ).values()).sort((a, b) => a.label.localeCompare(b.label));
  state.freightOperators = uniqueFreightOperators;
  if (
    highlightSelection !== "all" &&
    !uniqueFreightOperators.some((entry) => entry.value === highlightSelection)
  ) {
    state.uiSettings.freightOperatorHighlight = "all";
  }
  rebuildFreightOperatorOptions();

  const routePool = Array.isArray(routes)
    ? [...routes.filter((route) => route?.source !== "freight"), ...allFreightRoutes]
    : [];

  const visibleRoutes = routePool
    .filter((route) => {
        if (route?.source !== "freight") return true;
        if (!state.freightVisible) return false;
        if (highlightSelection === "all") return true;
        return `${route.ownerCode || route.owner || ""}`.trim() === highlightSelection;
      });

  const seen = new Set();
  const features = [];
  const routeGeometriesBySource = new Map();
  const routeGeometriesBySourceAndName = new Map();
  const routeColorsBySourceAndName = new Map();
  const routeGeometriesAll = [];
  const freightRouteLineOwners = [];
  const preparedRoutes = [];
  const freightPreparedRoutes = [];
  const treRouteLines = visibleRoutes
    .filter((route) => route?.source === "dart" && isTreRouteName(route))
    .flatMap((route) => flattenGeometryToLines(route.geometry || (route.polyline ? { type: "LineString", coordinates: route.polyline } : null)));
  const treRouteSignature = `${treRouteLines.length}:${treRouteLines.reduce((count, line) => count + (Array.isArray(line) ? line.length : 0), 0)}`;

  const getPreparedGeometryForRoute = (route) => {
    if (!route) return null;
    let routeCache = state.routePreparedLodCache.get(route);
    if (!routeCache) {
      routeCache = new Map();
      state.routePreparedLodCache.set(route, routeCache);
    }

    const sourceKey = `${route?.source || ""}`.toLowerCase();
    const needsTreContext = sourceKey === "amtrak" || sourceKey === "dart";
    const cacheKey = needsTreContext
      ? `${currentLodBucket}|${treRouteSignature}`
      : `${currentLodBucket}`;
    const cached = routeCache.get(cacheKey);
    if (cached) return cached;

    let geometry = route.geometry;
    if (!geometry && route.polyline && route.polyline.length > 0) {
      geometry = { type: "LineString", coordinates: route.polyline };
    }
    geometry = correctTexasEagleDallasSegment({ ...route, geometry }, treRouteLines);
    geometry = correctHeartlandFlyerAllianceSegment({ ...route, geometry });
    if (!geometry) {
      routeCache.set(cacheKey, null);
      return null;
    }

    const flattenedRaw = flattenGeometryToLines(geometry);
    if (flattenedRaw.length === 0) {
      routeCache.set(cacheKey, null);
      return null;
    }

    const simplificationConfig = getRouteSimplificationConfig(route, currentLodBucket);
    const flattened = flattenedRaw.map((line) => simplifyRouteLine(line, simplificationConfig.step, simplificationConfig.maxPoints));
    const normalizedGeometry =
      flattened.length === 1
        ? { type: "LineString", coordinates: flattened[0] }
        : { type: "MultiLineString", coordinates: flattened };

    const preparedGeometry = {
      geometry,
      flattened,
      normalizedGeometry,
      bounds: buildRouteBounds(flattened),
    };
    routeCache.set(cacheKey, preparedGeometry);

    if (routeCache.size > 10) {
      const firstKey = routeCache.keys().next().value;
      if (firstKey != null) {
        routeCache.delete(firstKey);
      }
    }

    return preparedGeometry;
  };

  const appendRouteLinesToSnapIndex = (route, flattened, color) => {
    const sourceKey = `${route?.source || ""}`.toLowerCase();
    if (!sourceKey || !Array.isArray(flattened) || flattened.length === 0) return;

    let sourceLines = routeGeometriesBySource.get(sourceKey);
    if (!sourceLines) {
      sourceLines = [];
      routeGeometriesBySource.set(sourceKey, sourceLines);
    }
    for (let i = 0; i < flattened.length; i++) {
      sourceLines.push(flattened[i]);
      routeGeometriesAll.push(flattened[i]);
    }

    const routeNames = buildRouteNameAliases(route?.name || route?.routeName || route?.subdivision || route?.ownerCode || route?.owner);
    if (routeNames.length > 0) {
      let colorMap = routeColorsBySourceAndName.get(sourceKey);
      if (color && !colorMap) {
        colorMap = new Map();
        routeColorsBySourceAndName.set(sourceKey, colorMap);
      }
      let byName = routeGeometriesBySourceAndName.get(sourceKey);
      if (!byName) {
        byName = new Map();
        routeGeometriesBySourceAndName.set(sourceKey, byName);
      }
      routeNames.forEach((routeName) => {
        if (color && colorMap && !colorMap.has(routeName)) {
          colorMap.set(routeName, color);
        }
        const namedLines = byName.get(routeName) || [];
        namedLines.push(...flattened);
        byName.set(routeName, namedLines);
      });
    }
  };

  allFreightRoutes.forEach((route) => {
    const preparedGeometry = getPreparedGeometryForRoute(route);
    const flattened = preparedGeometry?.flattened || [];
    if (flattened.length === 0) return;
    flattened.forEach((line) => {
      freightRouteLineOwners.push({
        line,
        bounds: buildRouteBounds([line]),
        ownerCode: `${route.ownerCode || route.owner || ""}`.trim(),
        owner: `${route.owner || route.ownerCode || "Freight Railroad"}`.trim(),
        subdivision: `${route.subdivision || route.name || ""}`.trim(),
        isSyntheticHost: Boolean(route.syntheticHostFreight),
      });
    });
  });

  const hostMetadataCache = state.freightHostLookupCache;
  const hostCacheScope = `${currentLodBucket}|${allFreightRoutes.length}|${allFreightRoutes
    .map((route) => `${route?.id || route?.name || route?.subdivision || ""}:${route?.ownerCode || route?.owner || ""}`)
    .join("|")}`;
  const inferHostFreightMetadata = (preparedRoute) => {
    if (!preparedRoute || preparedRoute.source === "freight") return null;
    const cacheKey = `${hostCacheScope}|${preparedRoute.id || ""}|${(preparedRoute.signatures || []).join("~")}`;
    if (hostMetadataCache.has(cacheKey)) return hostMetadataCache.get(cacheKey);
    if (!Array.isArray(preparedRoute.flattened) || preparedRoute.flattened.length === 0 || freightRouteLineOwners.length === 0) {
      hostMetadataCache.set(cacheKey, null);
      return null;
    }

    const scoreByHost = new Map();
    const MAX_DISTANCE = 0.011;
    const PAD = 0.08;

    preparedRoute.flattened.forEach((line) => {
      sampleLinePoints(line, 10).forEach((point) => {
        if (!Array.isArray(point) || point.length < 2) return;

        let nearest = null;
        freightRouteLineOwners.forEach((candidate) => {
          const bounds = candidate?.bounds;
          if (!bounds) return;
          if (
            point[0] < bounds.minLon - PAD || point[0] > bounds.maxLon + PAD
            || point[1] < bounds.minLat - PAD || point[1] > bounds.maxLat + PAD
          ) {
            return;
          }

          const distance = distanceToLineAtPoint(point, candidate.line);
          if (!Number.isFinite(distance)) return;
          if (!nearest || distance < nearest.distance) {
            nearest = { candidate, distance };
          }
        });

        if (!nearest || nearest.distance > MAX_DISTANCE) return;
        const ownerCode = `${nearest.candidate.ownerCode || nearest.candidate.owner || ""}`.trim();
        const owner = `${nearest.candidate.owner || nearest.candidate.ownerCode || "Freight Railroad"}`.trim();
        const subdivision = `${nearest.candidate.subdivision || ""}`.trim();
        if (!ownerCode && !owner) return;

        const hostKey = `${ownerCode || owner}|${subdivision}`;
        const weight = Math.max(0.05, 1 - (nearest.distance / MAX_DISTANCE));
        const current = scoreByHost.get(hostKey) || { ownerCode, owner, subdivision, score: 0 };
        current.score += weight;
        scoreByHost.set(hostKey, current);
      });
    });

    const ranked = [...scoreByHost.values()]
      .filter((entry) => entry.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    if (ranked.length === 0) {
      hostMetadataCache.set(cacheKey, null);
      return null;
    }

    const hostFreight = ranked
      .map((entry) => {
        const operator = entry.ownerCode || entry.owner;
        if (entry.subdivision) return `${operator} ${entry.subdivision}`.replace(/\s+/g, " ").trim();
        return `${operator}`.trim();
      })
      .filter(Boolean)
      .join(" • ");

    const metadata = {
      hostFreight,
      hostOperators: ranked.map((entry) => (entry.ownerCode || entry.owner || "").trim()).filter(Boolean).join(", "),
      hostSubdivisions: ranked.map((entry) => `${entry.subdivision || ""}`.trim()).filter(Boolean).join(", "),
    };
    hostMetadataCache.set(cacheKey, metadata);
    return metadata;
  };

  if (hostMetadataCache.size > 1200) {
    const trimCount = hostMetadataCache.size - 900;
    let trimmed = 0;
    for (const key of hostMetadataCache.keys()) {
      hostMetadataCache.delete(key);
      trimmed += 1;
      if (trimmed >= trimCount) break;
    }
  }

  visibleRoutes.forEach((route) => {
    const preparedGeometry = getPreparedGeometryForRoute(route);
    if (!preparedGeometry) return;
    const { geometry, flattened, normalizedGeometry, bounds } = preparedGeometry;

    const color = resolveRouteColor(route);
    const offset = getDartRouteOffset(route);
    const preparedRoute = {
      ...route,
      geometry,
      normalizedGeometry,
      flattened,
      bounds,
      color,
      offset,
      signatures: flattened.map((line) => buildRouteSignature(line)),
    };

    if (route?.source === "freight") {
      freightPreparedRoutes.push(preparedRoute);
    } else {
      preparedRoutes.push(preparedRoute);
    }

    appendRouteLinesToSnapIndex(route, flattened, color);
  });

  // Always include freight geometry in snap indexes, even when freight lines are hidden.
  const renderedFreightIds = new Set(
    visibleRoutes
      .filter((route) => `${route?.source || ""}`.toLowerCase() === "freight")
      .map((route) => `${route?.id || route?.name || route?.subdivision || ""}`)
  );

  allFreightRoutes
    .filter((route) => !renderedFreightIds.has(`${route?.id || route?.name || route?.subdivision || ""}`))
    .forEach((route) => {
      const preparedGeometry = getPreparedGeometryForRoute(route);
      const flattened = preparedGeometry?.flattened || [];
      if (flattened.length === 0) return;
      appendRouteLinesToSnapIndex(route, flattened, resolveRouteColor(route));
    });

  const displayRoutes = [
    ...buildSharedTrackDisplayRoutes(preparedRoutes),
    ...freightPreparedRoutes,
  ];
  displayRoutes.forEach((route) => {
    const flattened = route.flattened || [];
    if (flattened.length === 0 || !route.normalizedGeometry) return;
    const signatureParts = flattened.map((line) => buildRouteSignature(line));
    const sigKey = `${route.source || ""}|${route.name || ""}|${route.color || ""}|${signatureParts.join("||")}`;
    if (seen.has(sigKey)) return;
    seen.add(sigKey);

    const isFreight = route.source === "freight";
    const hostMetadata = isFreight ? null : inferHostFreightMetadata(route);
    const freightOwnerDisplay = [
      `${route.ownerCode || route.owner || ""}`.trim(),
      `${route.subdivision || ""}`.trim(),
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const passengerBaseLabel = `${route.label || route.name || ""}`.trim();
    const passengerDisplayLabel = hostMetadata?.hostFreight
      ? `${passengerBaseLabel} • ${hostMetadata.hostFreight}`.replace(/\s+/g, " ").trim()
      : passengerBaseLabel;
    features.push({
      type: "Feature",
      geometry: route.normalizedGeometry,
      properties: {
        color: route.color || "",
        name: route.name || "",
        label: isFreight ? (route.label || route.name || "") : passengerDisplayLabel,
        source: route.source || "",
        owner: route.owner || sources[route.source]?.label || route.source || "Rail",
        ownerDisplay: isFreight ? (freightOwnerDisplay || route.owner || "") : (hostMetadata?.hostFreight || ""),
        ownerCode: `${route.ownerCode || route.owner || ""}`.trim(),
        subdivision: route.subdivision || "",
        hostFreight: hostMetadata?.hostFreight || "",
        hostOperators: hostMetadata?.hostOperators || "",
        hostSubdivisions: hostMetadata?.hostSubdivisions || "",
        trainProtection: route.trainProtection || "",
        routeState: route.routeState || "present",
        usage: route.usage || "main",
        reference: route.reference || "",
        trackCount: route.trackCount ?? "",
        maxSpeedMph: route.maxSpeedMph ?? "",
        electrification: route.electrification || "no",
        gaugeMm: route.gaugeMm || 1435,
        trackClass: route.trackClass ?? "",
        reportingMarks: route.reportingMarks || route.ownerCode || "",
        infrastructureSource: route.infrastructureSource || "",
        openRailwayMapUrl: route.openRailwayMapUrl || "https://openrailwaymap.app",
        freightClass: route.freightClass || "",
        isFreight: isFreight ? 1 : 0,
        isHighlighted: 1,
        offset: Number.isFinite(route.offset) ? route.offset : 0,
      },
    });
  });

  state.routeGeometriesBySource = routeGeometriesBySource;
  state.routeGeometriesBySourceAndName = routeGeometriesBySourceAndName;
  state.routeColorsBySourceAndName = routeColorsBySourceAndName;
  state.routeGeometriesAll = routeGeometriesAll;
  state.freightRouteLineOwners = freightRouteLineOwners;
  state.routeDisplayLabelCache = new Map();

  // Keep source data fresh even when the layer is hidden.
  if (!state.map) return;
  if (state.map.getSource("routes")) {
    queueSourceDataUpdate("routes", { type: "FeatureCollection", features });
  }
  if (state.map.getSource("mile-markers")) {
    queueSourceDataUpdate("mile-markers", {
      type: "FeatureCollection",
      features: buildMileMarkerFeatures(displayRoutes),
    });
  }
  ["routes-glow", "routes-outline", "routes-line", "routes-label", "routes-hit", "freight-routes-outline"].forEach((layerId) => {
    if (!state.map?.getLayer(layerId)) return;
    try {
      state.map.moveLayer(layerId, state.map.getLayer("stations") ? "stations" : (state.map.getLayer("station-labels") ? "station-labels" : (state.map.getLayer("trains-badge") ? "trains-badge" : undefined)));
    } catch {
      // ignore ordering issues during style rebuilds
    }
  });
}

const MAINTENANCE_ALERT_PATTERNS = [
  /maintenance/i,
  /track work/i,
  /track repair/i,
  /track outage/i,
  /track closure/i,
  /work zone/i,
  /maintenance of way/i,
  /construction/i,
  /signal issue/i,
  /signal system/i,
  /switch issue/i,
  /switch problem/i,
  /interlocking/i,
  /slow order/i,
  /outage/i,
  /power issue/i,
  /catenary/i,
  /overhead wire/i,
  /right of way/i,
  /tie replacement/i,
  /rail replacement/i,
  /surfacing/i,
  /work crew/i,
  /maintenance crew/i,
  /signal maintenance/i,
  /track maintenance/i,
  /wire work/i,
  /bridge work/i,
  /bridge maintenance/i,
  /bridge strike/i,
  /inspection/i,
  /infrastructure/i,
  /capital work/i,
  /bus bridge/i,
  /single tracking/i,
  /single-tracking/i,
  /busing/i,
];

const RAIL_ISSUE_ALERT_PATTERNS = [
  /derail/i,
  /collision/i,
  /train crash/i,
  /grade crossing/i,
  /trespasser/i,
  /hazmat/i,
  /hazard/i,
  /washout/i,
  /landslide/i,
  /mudslide/i,
  /fire/i,
  /bridge strike/i,
  /police activity/i,
  /medical emergency/i,
  /fatal/i,
  /evacuat/i,
];

function matchesAlertPatterns(text, patterns) {
  const value = `${text || ""}`.trim();
  if (!value) return false;
  return patterns.some((pattern) => pattern.test(value));
}

function getIncidentText(train) {
  return [
    `${train.alertReason || ""}`.trim(),
    `${train.comments || ""}`.trim(),
    `${train.status || ""}`.trim(),
  ]
    .filter(Boolean)
    .join(" • ");
}

function getIncidentSummary(alertText) {
  const clean = `${alertText || ""}`.trim();
  if (!clean) return "Live railroad alert";
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

function offsetIncidentCoordinates(train, coords, kind) {
  if (!coords) return null;
  const key = `${kind}:${train.source || ""}:${train.id || ""}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }

  const baseHeading = Number(compassToDegrees(train.heading));
  const angleDeg = Number.isFinite(baseHeading)
    ? baseHeading + (kind === "maintenance" ? 90 : -90)
    : ((hash % 360) + (kind === "maintenance" ? 45 : 0));
  const distanceMeters = kind === "maintenance" ? 160 : 115;
  const angleRad = (angleDeg * Math.PI) / 180;
  const metersPerLatDeg = 111320;
  const metersPerLonDeg = Math.max(1, metersPerLatDeg * Math.cos((coords.lat * Math.PI) / 180));
  const dLat = (Math.sin(angleRad) * distanceMeters) / metersPerLatDeg;
  const dLon = (Math.cos(angleRad) * distanceMeters) / metersPerLonDeg;
  const next = { lat: coords.lat + dLat, lon: coords.lon + dLon };
  if (!isWithinBounds(next.lat, next.lon, train.source)) return coords;
  return next;
}

function buildMaintenanceIncidents(trains) {
  const pointIncidents = [];
  const lineFeatures = [];

  trains
    .filter((train) => {
      const text = getIncidentText(train);
      return matchesAlertPatterns(text, MAINTENANCE_ALERT_PATTERNS) || matchesAlertPatterns(text, RAIL_ISSUE_ALERT_PATTERNS);
    })
    .forEach((train) => {
      const incidentText = getIncidentText(train);
      const isRailIssue = matchesAlertPatterns(incidentText, RAIL_ISSUE_ALERT_PATTERNS);
      const summary = getIncidentSummary(incidentText);
      const byNameMap = state.routeGeometriesBySourceAndName.get(train.source);
      const routeName = `${train.route || ""}`.trim();
      const routeLines = routeName && byNameMap ? byNameMap.get(routeName) || [] : [];
      if (routeLines.length > 0) {
        routeLines.forEach((line, index) => {
          lineFeatures.push({
            type: "Feature",
            geometry: { type: "LineString", coordinates: line },
            properties: {
              id: `maintenance-line:${train.source}:${train.id}:${index}`,
              trainId: train.id,
              trainName: train.name || formatMarkerLabel(train),
              source: train.source,
              route: train.route || "--",
              summary,
              issueType: isRailIssue ? "rail-issue" : "maintenance",
            },
          });
        });
      }

      const coords = normalizeLngLat(train.lat, train.lon, train.source);
      const incidentCoords = offsetIncidentCoordinates(train, coords, "maintenance");
      if (incidentCoords) {
        pointIncidents.push({
          id: `maintenance:${train.source}:${train.id}`,
          source: train.source,
          trainId: train.id,
          trainName: train.name || formatMarkerLabel(train),
          route: train.route || "--",
          lat: incidentCoords.lat,
          lon: incidentCoords.lon,
          summary,
          issueType: isRailIssue ? "rail-issue" : "maintenance",
        });
      }
    });

  return { pointIncidents, lineFeatures };
}

function renderIncidentLayers() {
  if (!state.map) return;

  const allTrains = getAllTrains();
  const maintenance = buildMaintenanceIncidents(allTrains);
  state.maintenanceIncidents = maintenance.pointIncidents;

  const maintenancePointFeatures = state.maintenanceIncidents.map((incident) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [incident.lon, incident.lat] },
    properties: { ...incident },
  }));

  if (state.map.getSource("maintenance-incidents")) {
    queueSourceDataUpdate("maintenance-incidents", { type: "FeatureCollection", features: maintenancePointFeatures });
  }
  if (state.map.getSource("maintenance-lines")) {
    queueSourceDataUpdate("maintenance-lines", { type: "FeatureCollection", features: maintenance.lineFeatures });
  }

  const maintenanceVisibility = state.uiSettings.maintenanceVisible ? "visible" : "none";
  ["maintenance-line", "maintenance-point", "maintenance-point-hit"].forEach((layerId) => {
    if (state.map.getLayer(layerId)) state.map.setLayoutProperty(layerId, "visibility", maintenanceVisibility);
  });

  if (elements.toggleMaintenance) {
    elements.toggleMaintenance.dataset.active = String(Boolean(state.uiSettings.maintenanceVisible));
  }
}

function renderStations(stations) {
  const operatorSelection = `${state.uiSettings.freightOperatorHighlight || "all"}`.trim() || "all";
  const visibleStations = Array.isArray(stations)
    ? stations.filter((station) => {
        if (station?.source !== "freight_yard") return true;
        if (!state.freightVisible) return false;
        if (operatorSelection === "all") return true;
        return `${station.ownerCode || ""}`.trim() === operatorSelection;
      })
    : [];
  state.stations = stations;
  if (!state.map || !state.map.getSource("stations")) return;

  const stationFeatures = visibleStations
    .map((station) => {
      const coords = normalizeLngLat(station.lat, station.lon, station.source);
      if (!coords) return null;
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [coords.lon, coords.lat],
        },
        properties: {
          id: station.id,
          name: station.name || station.id || "",
          source: station.source || "",
          city: station.city || station.town || station.municipality || "",
          state: station.state || station.stateCode || station.province || station.region || "",
          subtitle: station.subtitle || "",
          color: station.color || "#ffffff",
        },
      };
    })
    .filter(Boolean);

  queueSourceDataUpdate("stations", { type: "FeatureCollection", features: stationFeatures });

  ["stations", "stations-hit", "station-labels"].forEach((layerId) => {
    if (!state.map?.getLayer(layerId)) return;
    try {
      state.map.moveLayer(layerId);
    } catch {
      // ignore ordering issues during style rebuilds
    }
  });

}

function getStationFeatureLookup(featureOrMeta) {
  const props = featureOrMeta?.properties || featureOrMeta?.feat?.properties || {};
  return {
    id: `${featureOrMeta?.id || props.id || ""}`,
    source: `${props.source || ""}`.trim().toLowerCase(),
  };
}

function findStationByFeature(featureOrMeta) {
  const lookup = getStationFeatureLookup(featureOrMeta);
  if (!lookup.id) return null;
  const stations = Array.isArray(state.stations) ? state.stations : [];
  return stations.find((row) => {
    if (`${row.id}` !== lookup.id) return false;
    if (!lookup.source) return true;
    return `${row.source || ""}`.trim().toLowerCase() === lookup.source;
  }) || stations.find((row) => `${row.id}` === lookup.id) || null;
}

function getSignalAspectColor(aspect) {
  const key = `${aspect || "UNKNOWN"}`.trim().toUpperCase();
  if (key === "GREEN") return "#22c55e";
  if (key === "YELLOW") return "#facc15";
  if (key === "RED") return "#ef4444";
  return "#94a3b8";
}

function getSignalAspectGlyph(aspect) {
  const key = `${aspect || "UNKNOWN"}`.trim().toUpperCase();
  if (key === "GREEN") return "🟢";
  if (key === "YELLOW") return "🟡";
  if (key === "RED") return "🔴";
  return "✓";
}

function renderSignals(signals) {
  state.signals = Array.isArray(signals) ? signals : [];
  state.signalIndex = new Map(state.signals.map((signal) => [`${signal.signal_id || ""}`.trim().toUpperCase(), signal]));
  if (!state.map || !state.map.getSource("signals")) return;

  const features = state.signals
    .map((signal) => {
      const coords = normalizeLngLat(signal.lat, signal.lon, "freight");
      if (!coords) return null;
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [coords.lon, coords.lat],
        },
        properties: {
          signal_id: signal.signal_id || "",
          aspect: signal.aspect || "UNKNOWN",
          aspectColor: getSignalAspectColor(signal.aspect),
          aspectGlyph: getSignalAspectGlyph(signal.aspect),
          rail_line: signal.rail_line || "",
          operator: signal.operator || signal.rail_line || "",
          source: signal.source || "ORT",
          milepost: signal.milepost ?? "",
          last_update: signal.last_update || "",
        },
      };
    })
    .filter(Boolean);

  queueSourceDataUpdate("signals", { type: "FeatureCollection", features });
}

function applySignalVisibility() {
  if (!state.map) return;
  const nextVisibility = state.signalVisible ? "visible" : "none";
  ["openrailwaymap-signals", "signals-glow", "signals-markers", "signals-glyphs", "signals-labels"].forEach((layerId) => {
    if (state.map.getLayer(layerId)) {
      state.map.setLayoutProperty(layerId, "visibility", nextVisibility);
    }
  });
}

function shouldUseRouteRasterTiles() {
  const config = state.config?.routeRasterTiles;
  const hasRasterConfig = Array.isArray(config?.urls) && config.urls.length > 0;
  // Prefer full vector quality on mobile to match desktop route rendering.
  if (state.isMobile || window.innerWidth <= 768) return false;
  return Boolean(state.lowTierDevice && hasRasterConfig);
}

function ensureRouteRasterLayer(map = state.map) {
  if (!map) return;
  const config = state.config?.routeRasterTiles;
  const urls = Array.isArray(config?.urls) ? config.urls.filter(Boolean) : [];
  if (urls.length === 0) return;

  if (!map.getSource("routes-raster")) {
    map.addSource("routes-raster", {
      type: "raster",
      tiles: urls,
      tileSize: Number.isFinite(Number(config?.tileSize)) ? Number(config.tileSize) : 256,
      minzoom: Number.isFinite(Number(config?.minzoom)) ? Number(config.minzoom) : 3,
      maxzoom: Number.isFinite(Number(config?.maxzoom)) ? Number(config.maxzoom) : 12,
      attribution: `${config?.attribution || ""}`.trim() || undefined,
    });
  }

  if (!map.getLayer("routes-raster")) {
    map.addLayer({
      id: "routes-raster",
      type: "raster",
      source: "routes-raster",
      paint: {
        "raster-opacity": document.body.classList.contains("light") ? 0.82 : 0.92,
        "raster-fade-duration": 120,
      },
      layout: {
        visibility: "none",
      },
    }, map.getLayer("stations") ? "stations" : undefined);
  }
}

function ensureRouteHitLayer(map = state.map) {
  if (!map || !map.getSource("routes") || map.getLayer("routes-hit")) return;
  map.addLayer({
    id: "routes-hit",
    type: "line",
    source: "routes",
    layout: {
      "line-cap": "round",
      "line-join": "round",
      visibility: "visible",
    },
    paint: {
      "line-color": "rgba(255,255,255,0)",
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        3, 18,
        7, 24,
        12, 30,
        16, 36
      ],
      "line-opacity": 0,
    },
  }, map.getLayer("stations") ? "stations" : undefined);
}

const OPENRAILWAYMAP_SOURCE_CONFIG = {
  standard: {
    sourceId: "orm-standard-low",
    url: `${OPENRAILWAYMAP_BASE_URL}/standard_railway_line_low`,
    sourceLayer: "standard_railway_line_low",
  },
  speed: {
    sourceId: "orm-speed-low",
    url: `${OPENRAILWAYMAP_BASE_URL}/speed_railway_line_low`,
    sourceLayer: "speed_railway_line_low",
  },
  "train-protection": {
    sourceId: "orm-train-protection-low",
    url: `${OPENRAILWAYMAP_BASE_URL}/signals_railway_line_low`,
    sourceLayer: "signals_railway_line_low",
  },
  electrification: {
    sourceId: "orm-electrification-low",
    url: `${OPENRAILWAYMAP_BASE_URL}/electrification_railway_line_low`,
    sourceLayer: "electrification_railway_line_low",
  },
  track: {
    sourceId: "orm-track-low",
    url: `${OPENRAILWAYMAP_BASE_URL}/track_railway_line_low`,
    sourceLayer: "track_railway_line_low",
  },
  operator: {
    sourceId: "orm-operator-low",
    url: `${OPENRAILWAYMAP_BASE_URL}/operator_railway_line_low`,
    sourceLayer: "operator_railway_line_low",
  },
};

const OPENRAILWAYMAP_DETAIL_SOURCE = {
  sourceId: "orm-standard-detail",
  url: `${OPENRAILWAYMAP_BASE_URL}/standard_railway_turntables,standard_railway_text_stations,standard_railway_grouped_stations,standard_railway_grouped_station_areas,standard_railway_symbols,standard_railway_switch_ref,standard_station_entrances,standard_railway_platforms,standard_railway_platform_edges,standard_railway_stop_positions`,
};

const OPENRAILWAYMAP_SIGNALS_SOURCE = {
  sourceId: "orm-signals",
  url: `${OPENRAILWAYMAP_BASE_URL}/signals_railway_signals,signals_signal_boxes`,
};

const OPENRAILWAYMAP_SYMBOL_MANIFEST_URL = "orm-symbols/manifest.json";
const OPENRAILWAYMAP_SYMBOL_ID_PREFIX = "orm-svg";

function drawOpenRailwayMapIcon(type, color = "#f97316", size = 48) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const cx = size / 2;
  const cy = size / 2;
  const roundedRect = (x, y, width, height, radius) => {
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, radius);
      return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  if (type === "stop") {
    ctx.fillStyle = `${color}33`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }
  if (type === "station") {
    ctx.fillStyle = `${color}30`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(cx - size * 0.18, cy - size * 0.18, size * 0.36, size * 0.36);
    return canvas;
  }
  if (type === "crossing") {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(size * 0.28, size * 0.28);
    ctx.lineTo(size * 0.72, size * 0.72);
    ctx.moveTo(size * 0.72, size * 0.28);
    ctx.lineTo(size * 0.28, size * 0.72);
    ctx.stroke();
    ctx.strokeStyle = "#b91c1c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(size * 0.28, size * 0.28);
    ctx.lineTo(size * 0.72, size * 0.72);
    ctx.moveTo(size * 0.72, size * 0.28);
    ctx.lineTo(size * 0.28, size * 0.72);
    ctx.stroke();
    return canvas;
  }
  if (type === "switch") {
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(size * 0.22, size * 0.70);
    ctx.lineTo(size * 0.78, size * 0.30);
    ctx.moveTo(size * 0.22, size * 0.70);
    ctx.lineTo(size * 0.78, size * 0.70);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(size * 0.22, size * 0.70);
    ctx.lineTo(size * 0.78, size * 0.30);
    ctx.moveTo(size * 0.22, size * 0.70);
    ctx.lineTo(size * 0.78, size * 0.70);
    ctx.stroke();
    return canvas;
  }
  if (type === "signal") {
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundedRect(size * 0.31, size * 0.18, size * 0.38, size * 0.52, size * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, size * 0.34, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(cx, size * 0.53, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, size * 0.70);
    ctx.lineTo(cx, size * 0.86);
    ctx.stroke();
    return canvas;
  }
  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  roundedRect(size * 0.22, size * 0.22, size * 0.56, size * 0.56, size * 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `900 ${Math.round(size * 0.26)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SB", cx, cy);
  return canvas;
}

function getOpenRailwayMapSymbolId(scope, name) {
  const safeScope = `${scope || "general"}`.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const safeName = `${name || "site"}`.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  return `${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-${safeScope}-${safeName}`;
}

function getOpenRailwayMapSymbolAliasId(scope, name) {
  const safeScope = `${scope || "general"}`.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const safeName = `${name || "site"}`.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-${safeScope}-${safeName}`;
}

function getOpenRailwayMapSymbolIdFromPath(pathValue) {
  const parts = `${pathValue || ""}`.split("/");
  const scope = parts[1] || "general";
  const filename = parts.at(-1) || "site.svg";
  return getOpenRailwayMapSymbolId(scope, filename.replace(/\.svg$/i, ""));
}

function resolveOpenRailwayMapImageExpression(scope = "general", fallback = "site") {
  return ["coalesce",
    ["image", ["concat", `${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-`, ["get", "feature"]]],
    ["image", ["concat", `${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-${scope}-`, ["get", "feature"]]],
    ["image", getOpenRailwayMapSymbolId(scope, fallback)],
  ];
}

function getOpenRailwayMapFeatureIconExpression() {
  return ["coalesce",
    ["image", ["concat", `${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-`, ["get", "feature"]]],
    ["image", ["match", ["get", "feature"],
      "general/level-crossing", getOpenRailwayMapSymbolId("general", "level-crossing"),
      "general/level-crossing-light", getOpenRailwayMapSymbolId("general", "level-crossing-light"),
      "general/level-crossing-barrier", getOpenRailwayMapSymbolId("general", "level-crossing-barrier"),
      "general/level-crossing-light-barrier", getOpenRailwayMapSymbolId("general", "level-crossing-light-barrier"),
      "general/crossing", getOpenRailwayMapSymbolId("general", "crossing"),
      "level_crossing", getOpenRailwayMapSymbolId("general", "level-crossing"),
      "crossing", getOpenRailwayMapSymbolId("general", "crossing"),
      "railway_crossing", getOpenRailwayMapSymbolId("general", "railway-crossing"),
      "halt", getOpenRailwayMapSymbolId("general", "halt"),
      "station", getOpenRailwayMapSymbolId("general", "station-normal"),
      "tram_stop", getOpenRailwayMapSymbolId("general", "tram_stop"),
      "junction", getOpenRailwayMapSymbolId("general", "junction"),
      "yard", getOpenRailwayMapSymbolId("general", "yard"),
      "turntable", getOpenRailwayMapSymbolId("general", "turntable"),
      "buffer_stop", getOpenRailwayMapSymbolId("general", "buffer_stop"),
      "defect_detector", getOpenRailwayMapSymbolId("general", "defect_detector"),
      "derail", getOpenRailwayMapSymbolId("general", "derail"),
      "crossover", getOpenRailwayMapSymbolId("general", "crossover"),
      "subway_entrance", getOpenRailwayMapSymbolId("general", "subway-entrance"),
      getOpenRailwayMapSymbolId("general", "site"),
    ]],
    ["image", "orm-icon-crossing"],
  ];
}

function getOpenRailwayMapSwitchIconExpression() {
  return ["coalesce",
    ["image", ["match", ["coalesce", ["get", "railway"], ["get", "type"], ""],
      "railway_crossing", getOpenRailwayMapSymbolId("general", "railway-crossing"),
      "double_slip", getOpenRailwayMapSymbolId("general", "switch-double-slip"),
      "single_slip", getOpenRailwayMapSymbolId("general", "switch-single-slip"),
      "three_way", getOpenRailwayMapSymbolId("general", "switch-three-way"),
      "wye", getOpenRailwayMapSymbolId("general", "switch-wye"),
      "abt", getOpenRailwayMapSymbolId("general", "switch-abt"),
      getOpenRailwayMapSymbolId("general", "switch-default"),
    ]],
    ["image", "orm-icon-switch"],
  ];
}

function getOpenRailwayMapSignalIconExpression() {
  return ["coalesce",
    ["image", ["concat", `${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-`, ["get", "feature0"]]],
    ["image", ["concat", `${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-`, ["get", "feature1"]]],
    ["image", ["concat", `${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-`, ["get", "feature2"]]],
    ["image", ["match", ["get", "feature0"],
      "main", getOpenRailwayMapSymbolId("us", "main"),
      "distant", getOpenRailwayMapSymbolId("us", "distant"),
      "us/main", getOpenRailwayMapSymbolId("us", "main"),
      "us/distant", getOpenRailwayMapSymbolId("us", "distant"),
      "ca/main", getOpenRailwayMapSymbolId("ca", "main"),
      "general/signal-unknown-main", getOpenRailwayMapSymbolId("general", "signal-unknown-main"),
      "general/signal-unknown-distant", getOpenRailwayMapSymbolId("general", "signal-unknown-distant"),
      "general/signal-unknown-combined", getOpenRailwayMapSymbolId("general", "signal-unknown-combined"),
      "combined", getOpenRailwayMapSymbolId("general", "signal-unknown-combined"),
      "minor", getOpenRailwayMapSymbolId("general", "signal-unknown-minor"),
      "minor_distant", getOpenRailwayMapSymbolId("general", "signal-unknown-minor_distant"),
      "speed_limit", getOpenRailwayMapSymbolId("general", "signal-unknown-speed_limit"),
      "speed_limit_distant", getOpenRailwayMapSymbolId("general", "signal-unknown-speed_limit_distant"),
      "crossing", getOpenRailwayMapSymbolId("general", "signal-unknown-crossing"),
      "crossing_distant", getOpenRailwayMapSymbolId("general", "signal-unknown-crossing_distant"),
      "departure", getOpenRailwayMapSymbolId("general", "signal-unknown-departure"),
      "shunting", getOpenRailwayMapSymbolId("general", "signal-unknown-shunting"),
      "stop", getOpenRailwayMapSymbolId("general", "signal-unknown-stop"),
      "stop_distant", getOpenRailwayMapSymbolId("general", "signal-unknown-stop_distant"),
      "switch", getOpenRailwayMapSymbolId("general", "signal-unknown-switch"),
      "whistle", getOpenRailwayMapSymbolId("general", "signal-unknown-whistle"),
      getOpenRailwayMapSymbolId("general", "signal-unknown"),
    ]],
    ["image", getOpenRailwayMapSymbolId("general", "signal-unknown")],
    ["image", "orm-icon-signal"],
  ];
}

async function loadOpenRailwayMapSvgSymbols(map = state.map) {
  const probeId = getOpenRailwayMapSymbolId("general", "level-crossing");
  if (!map || (state.openRailwayMapSvgSymbolsLoaded && map.hasImage?.(probeId)) || state.openRailwayMapSvgSymbolsLoading) return;
  state.openRailwayMapSvgSymbolsLoading = true;
  try {
    const response = await fetch(OPENRAILWAYMAP_SYMBOL_MANIFEST_URL, { cache: "force-cache" });
    if (!response.ok) throw new Error("ORM symbol manifest unavailable");
    const manifest = await response.json();
    const symbols = Array.isArray(manifest?.symbols) ? manifest.symbols : [];
    await Promise.allSettled(symbols.map(async (pathValue) => {
      const id = getOpenRailwayMapSymbolIdFromPath(pathValue);
      if (map.hasImage?.(id)) return;
      const image = new Image();
      image.decoding = "async";
      image.src = pathValue;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const addAlias = (aliasId) => {
        if (!aliasId || map.hasImage?.(aliasId)) return;
        map.addImage(aliasId, imageData, { pixelRatio: 2 });
      };
      addAlias(id);
      const parts = `${pathValue}`.split("/");
      const scope = parts[1] || "general";
      const base = (parts.at(-1) || "").replace(/\.svg$/i, "");
      const aliasId = getOpenRailwayMapSymbolAliasId(scope, base);
      addAlias(aliasId);
      addAlias(`${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-${scope}/${base}`);
      addAlias(`${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-${scope}/${base.replace(/_/g, "-")}`);
      addAlias(`${OPENRAILWAYMAP_SYMBOL_ID_PREFIX}-${scope}/${base.replace(/-/g, "_")}`);
    }));
    state.openRailwayMapSvgSymbolsLoaded = true;
  } catch (error) {
    console.warn("OpenRailwayMap SVG symbol load failed:", error);
  } finally {
    state.openRailwayMapSvgSymbolsLoading = false;
  }
}

function ensureOpenRailwayMapIconImages(map = state.map) {
  if (!map) return;
  [
    ["orm-icon-crossing", "crossing", "#ef4444"],
    ["orm-icon-stop", "stop", "#d946ef"],
    ["orm-icon-station", "station", "#d946ef"],
    ["orm-icon-switch", "switch", "#f472b6"],
    ["orm-icon-signal", "signal", "#22c55e"],
    ["orm-icon-signal-box", "signal-box", "#38bdf8"],
  ].forEach(([id, type, color]) => {
    if (map.hasImage?.(id)) return;
    const canvas = drawOpenRailwayMapIcon(type, color);
    const ctx = canvas.getContext?.("2d");
    const image = ctx?.getImageData
      ? ctx.getImageData(0, 0, canvas.width, canvas.height)
      : canvas;
    map.addImage(id, image, { pixelRatio: 2 });
  });
  loadOpenRailwayMapSvgSymbols(map).catch(() => null);
}

function getOpenRailwayMapStyleMode() {
  const style = `${state.uiSettings?.openRailwayMapStyle || defaultUiSettings.openRailwayMapStyle}`.trim();
  return OPENRAILWAYMAP_STYLES.has(style) ? style : defaultUiSettings.openRailwayMapStyle;
}

function getOpenRailwayMapColorExpression(mode) {
  if (mode === "speed") {
    return ["case",
      ["==", ["get", "maxspeed"], null], "#64748b",
      ["<", ["get", "maxspeed"], 40], "#38bdf8",
      ["<", ["get", "maxspeed"], 80], "#22c55e",
      ["<", ["get", "maxspeed"], 125], "#facc15",
      ["<", ["get", "maxspeed"], 200], "#f97316",
      "#ef4444",
    ];
  }
  if (mode === "train-protection") {
    return ["match", ["coalesce", ["get", "train_protection"], ["get", "train_protection_construction"], ""],
      "ptc", "#22c55e",
      "etcs", "#38bdf8",
      "etcs_1", "#38bdf8",
      "etcs_2", "#0ea5e9",
      "atc", "#a855f7",
      "aws", "#facc15",
      "tpws", "#f97316",
      "none", "#ef4444",
      "#94a3b8",
    ];
  }
  if (mode === "electrification") {
    return ["case",
      ["==", ["get", "electrification_state"], "no"], "#6b7280",
      ["==", ["get", "electrification_state"], "proposed"], "#facc15",
      ["==", ["get", "electrification_state"], "construction"], "#fb923c",
      ["==", ["get", "voltage"], 25000], "#ef4444",
      ["==", ["get", "voltage"], 15000], "#22c55e",
      ["==", ["get", "voltage"], 3000], "#2563eb",
      ["==", ["get", "frequency"], 0], "#0ea5e9",
      "#64748b",
    ];
  }
  if (mode === "track") {
    return ["case",
      ["!=", ["get", "track_class"], null],
      ["match", ["to-string", ["get", "track_class"]],
        "1", "#94a3b8",
        "2", "#38bdf8",
        "3", "#22c55e",
        "4", "#facc15",
        "5", "#f97316",
        "6", "#ef4444",
        "#a855f7",
      ],
      ["==", ["get", "gauge0"], "1435"], "#38bdf8",
      ["!=", ["get", "gauge0"], null], "#a855f7",
      "#64748b",
    ];
  }
  if (mode === "operator") {
    return ["coalesce", ["get", "operator_color"], "#f97316"];
  }
  return ["case",
    ["==", ["get", "highspeed"], true], "#ef4444",
    ["==", ["get", "usage"], "branch"], "#c4b600",
    ["in", ["get", "service"], ["literal", ["spur", "siding", "yard", "crossover"]]], "#87491d",
    ["in", ["get", "usage"], ["literal", ["industrial", "military"]]], "#87491d",
    ["in", ["get", "state"], ["literal", ["construction", "proposed"]]], "#facc15",
    ["in", ["get", "state"], ["literal", ["disused", "abandoned", "razed"]]], "#8b7b72",
    "#f97316",
  ];
}

function getOpenRailwayMapLineFilter() {
  return ["all",
    ["!=", ["get", "feature"], "ferry"],
    ["!=", ["get", "feature"], "platform"],
  ];
}

function getOpenRailwayMapFutureFilter() {
  return ["all",
    getOpenRailwayMapLineFilter(),
    ["any",
      ["in", ["get", "state"], ["literal", ["proposed", "construction", "planned"]]],
      ["!=", ["get", "future_usage"], null],
      ["!=", ["get", "future_operator"], null],
      ["!=", ["get", "future_ref"], null],
    ],
  ];
}

function getOpenRailwayMapDashExpression() {
  return ["match", ["get", "state"],
    "construction", ["literal", [2.5, 2.5]],
    "proposed", ["literal", [2, 4]],
    "disused", ["literal", [6, 4]],
    "abandoned", ["literal", [2, 6]],
    "razed", ["literal", [1, 8]],
    ["literal", [1, 0]],
  ];
}

function ensureOpenRailwayMapFreightLayers(map = state.map) {
  if (!FEATURE_OPENRAILWAYMAP_VECTOR_FREIGHT || !map) return;
  ensureOpenRailwayMapIconImages(map);
  Object.values(OPENRAILWAYMAP_SOURCE_CONFIG).forEach((config) => {
    if (!map.getSource(config.sourceId)) {
      map.addSource(config.sourceId, { type: "vector", url: config.url, promoteId: "id" });
    }
  });
  if (!map.getSource("orm-high")) {
    map.addSource("orm-high", {
      type: "vector",
      url: `${OPENRAILWAYMAP_BASE_URL}/railway_line_high,railway_text_km`,
      promoteId: "id",
    });
  }
  if (!map.getSource(OPENRAILWAYMAP_DETAIL_SOURCE.sourceId)) {
    map.addSource(OPENRAILWAYMAP_DETAIL_SOURCE.sourceId, {
      type: "vector",
      url: OPENRAILWAYMAP_DETAIL_SOURCE.url,
      promoteId: "id",
    });
  }
  if (!map.getSource(OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId)) {
    map.addSource(OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId, {
      type: "vector",
      url: OPENRAILWAYMAP_SIGNALS_SOURCE.url,
      promoteId: "id",
    });
  }

  const beforeLayer = map.getLayer("stations") ? "stations" : (map.getLayer("trains-badge") ? "trains-badge" : undefined);
  Object.entries(OPENRAILWAYMAP_SOURCE_CONFIG).forEach(([mode, config]) => {
    const color = getOpenRailwayMapColorExpression(mode);
    const ids = {
      lowOutline: `orm-${mode}-low-outline`,
      lowLine: `orm-${mode}-low-line`,
      lowHit: `orm-${mode}-low-hit`,
      highOutline: `orm-${mode}-high-outline`,
      highLine: `orm-${mode}-high-line`,
    };
    if (!map.getLayer(ids.lowOutline)) {
      map.addLayer({
        id: ids.lowOutline,
        type: "line",
        source: config.sourceId,
        "source-layer": config.sourceLayer,
        maxzoom: 7,
        filter: getOpenRailwayMapLineFilter(),
        layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
        paint: {
          "line-color": "rgba(8, 10, 14, 0.92)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.4, 7, 4.5],
          "line-opacity": 0.9,
        },
      }, beforeLayer);
    }
    if (!map.getLayer(ids.lowLine)) {
      map.addLayer({
        id: ids.lowLine,
        type: "line",
        source: config.sourceId,
        "source-layer": config.sourceLayer,
        maxzoom: 7,
        filter: getOpenRailwayMapLineFilter(),
        layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
        paint: {
          "line-color": color,
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 7, 3],
          "line-opacity": 0.96,
        },
      }, beforeLayer);
    }
    if (!map.getLayer(ids.lowHit)) {
      map.addLayer({
        id: ids.lowHit,
        type: "line",
        source: config.sourceId,
        "source-layer": config.sourceLayer,
        maxzoom: 7,
        filter: getOpenRailwayMapLineFilter(),
        layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
        paint: { "line-color": "rgba(255,255,255,0)", "line-width": 28, "line-opacity": 0 },
      }, beforeLayer);
    }
    if (!map.getLayer(ids.highOutline)) {
      map.addLayer({
        id: ids.highOutline,
        type: "line",
        source: "orm-high",
        "source-layer": "railway_line_high",
        minzoom: 7,
        filter: getOpenRailwayMapLineFilter(),
        layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
        paint: {
          "line-color": "rgba(8, 10, 14, 0.94)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 4.5, 12, 6.4, 16, 8.8],
          "line-opacity": 0.9,
        },
      }, beforeLayer);
    }
    if (!map.getLayer(ids.highLine)) {
      map.addLayer({
        id: ids.highLine,
        type: "line",
        source: "orm-high",
        "source-layer": "railway_line_high",
        minzoom: 7,
        filter: getOpenRailwayMapLineFilter(),
        layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
        paint: {
          "line-color": color,
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 3, 12, 4.5, 16, 6.5],
          "line-opacity": 0.96,
        },
      }, beforeLayer);
    }
  });

  if (!map.getLayer("orm-high-hit")) {
    map.addLayer({
      id: "orm-high-hit",
      type: "line",
      source: "orm-high",
      "source-layer": "railway_line_high",
      minzoom: 7,
      filter: getOpenRailwayMapLineFilter(),
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      paint: { "line-color": "rgba(255,255,255,0)", "line-width": 32, "line-opacity": 0 },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-high-label")) {
    map.addLayer({
      id: "orm-high-label",
      type: "symbol",
      source: "orm-high",
      "source-layer": "railway_line_high",
      minzoom: 9,
      filter: getOpenRailwayMapLineFilter(),
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 620,
        "text-field": ["coalesce", ["get", "name"], ["get", "ref"], ["get", "operator"], ""],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 14, 12.5],
        "text-letter-spacing": 0,
        "text-rotation-alignment": "map",
        "text-keep-upright": true,
        visibility: "none",
      },
      paint: {
        "text-color": document.body.classList.contains("light") ? "#111827" : "#f8fafc",
        "text-halo-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.96)" : "rgba(8,12,20,0.96)",
        "text-halo-width": 1.8,
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-future-low-line")) {
    map.addLayer({
      id: "orm-future-low-line",
      type: "line",
      source: OPENRAILWAYMAP_SOURCE_CONFIG.standard.sourceId,
      "source-layer": OPENRAILWAYMAP_SOURCE_CONFIG.standard.sourceLayer,
      maxzoom: 7,
      filter: getOpenRailwayMapFutureFilter(),
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      paint: {
        "line-color": "#d946ef",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2, 7, 3.5],
        "line-opacity": 0.92,
        "line-dasharray": [2, 2],
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-future-high-line")) {
    map.addLayer({
      id: "orm-future-high-line",
      type: "line",
      source: "orm-high",
      "source-layer": "railway_line_high",
      minzoom: 7,
      filter: getOpenRailwayMapFutureFilter(),
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      paint: {
        "line-color": "#d946ef",
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 3.5, 12, 5, 16, 7],
        "line-opacity": 0.94,
        "line-dasharray": [2, 2],
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-future-high-label")) {
    map.addLayer({
      id: "orm-future-high-label",
      type: "symbol",
      source: "orm-high",
      "source-layer": "railway_line_high",
      minzoom: 9,
      filter: getOpenRailwayMapFutureFilter(),
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 560,
        "text-field": ["coalesce", ["get", "future_ref"], ["get", "future_operator"], ["get", "name"], ["get", "ref"], "Future rail"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10.5, 14, 12.5],
        "text-letter-spacing": 0,
        "text-rotation-alignment": "map",
        "text-keep-upright": true,
        visibility: "none",
      },
      paint: {
        "text-color": "#f0abfc",
        "text-halo-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.96)" : "rgba(8,12,20,0.96)",
        "text-halo-width": 1.8,
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-future-hit")) {
    map.addLayer({
      id: "orm-future-hit",
      type: "line",
      source: "orm-high",
      "source-layer": "railway_line_high",
      minzoom: 7,
      filter: getOpenRailwayMapFutureFilter(),
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      paint: { "line-color": "rgba(255,255,255,0)", "line-width": 32, "line-opacity": 0 },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-station-areas-fill")) {
    map.addLayer({
      id: "orm-station-areas-fill",
      type: "fill",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_grouped_station_areas",
      minzoom: 11,
      filter: ["!=", ["get", "feature"], "yard"],
      layout: { visibility: "none" },
      paint: {
        "fill-color": "#d946ef",
        "fill-opacity": document.body.classList.contains("light") ? 0.15 : 0.22,
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-station-areas-outline")) {
    map.addLayer({
      id: "orm-station-areas-outline",
      type: "line",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_grouped_station_areas",
      minzoom: 11,
      filter: ["!=", ["get", "feature"], "yard"],
      layout: { "line-cap": "round", "line-join": "round", visibility: "none" },
      paint: {
        "line-color": "#d946ef",
        "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1, 16, 2],
        "line-opacity": 0.64,
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-station-stops")) {
    map.addLayer({
      id: "orm-station-stops",
      type: "symbol",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_text_stations",
      minzoom: 11,
      filter: ["!=", ["get", "feature"], "yard"],
      layout: {
        "icon-image": ["coalesce", ["image", getOpenRailwayMapSymbolId("general", "station-normal")], ["image", "orm-icon-station"]],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.34, 16, 0.72],
        "icon-allow-overlap": false,
        "text-field": ["coalesce", ["get", "localized_name"], ["get", "name"], ["get", "label"], ""],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 12.5],
        "text-letter-spacing": 0,
        "text-offset": [0, 1.25],
        "text-optional": true,
        visibility: "none",
      },
      paint: {
        "text-color": "#f5b6e8",
        "text-halo-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.96)" : "rgba(8,12,20,0.96)",
        "text-halo-width": 1.8,
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-station-stops-hit")) {
    map.addLayer({
      id: "orm-station-stops-hit",
      type: "circle",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_text_stations",
      minzoom: 11,
      filter: ["!=", ["get", "feature"], "yard"],
      layout: { visibility: "none" },
      paint: { "circle-color": "#ffffff", "circle-radius": 18, "circle-opacity": 0 },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-rail-symbols")) {
    if (!map.getLayer("orm-rail-symbols-halo")) {
      map.addLayer({
        id: "orm-rail-symbols-halo",
        type: "circle",
        source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
        "source-layer": "standard_railway_symbols",
        minzoom: 12,
        layout: { visibility: "none" },
        paint: {
          "circle-color": ["match", ["coalesce", ["get", "feature"], ""],
            "general/level-crossing-light-barrier", "#ef4444",
            "general/level-crossing-light", "#f97316",
            "general/level-crossing-barrier", "#facc15",
            "general/level-crossing", "#38bdf8",
            "general/crossing", "#ef4444",
            "level_crossing", "#38bdf8",
            "crossing", "#ef4444",
            "#a855f7",
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 6, 16, 10],
          "circle-opacity": document.body.classList.contains("light") ? 0.22 : 0.32,
          "circle-stroke-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.9)" : "rgba(8,12,20,0.92)",
          "circle-stroke-width": 1,
        },
      }, beforeLayer);
    }
    map.addLayer({
      id: "orm-rail-symbols",
      type: "symbol",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_symbols",
      minzoom: 12,
      layout: {
        "icon-image": getOpenRailwayMapFeatureIconExpression(),
        "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.36, 16, 0.68],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        visibility: "none",
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-rail-symbols-text")) {
    map.addLayer({
      id: "orm-rail-symbols-text",
      type: "symbol",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_symbols",
      minzoom: 12,
      layout: {
        "text-field": ["coalesce", ["get", "ref"], ""],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 12, 10, 16, 12],
        "text-letter-spacing": 0,
        "text-allow-overlap": true,
        visibility: "none",
      },
      paint: {
        "text-color": document.body.classList.contains("light") ? "#111827" : "#f8fafc",
        "text-halo-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.96)" : "rgba(8,12,20,0.96)",
        "text-halo-width": 1.4,
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-rail-symbols-hit")) {
    map.addLayer({
      id: "orm-rail-symbols-hit",
      type: "circle",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_symbols",
      minzoom: 12,
      layout: { visibility: "none" },
      paint: { "circle-color": "#ffffff", "circle-radius": 16, "circle-opacity": 0 },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-stop-positions")) {
    map.addLayer({
      id: "orm-stop-positions",
      type: "symbol",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_stop_positions",
      minzoom: 14,
      layout: {
        "icon-image": ["coalesce", ["image", getOpenRailwayMapSymbolId("general", "halt")], ["image", "orm-icon-stop"]],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.32, 17, 0.62],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        visibility: "none",
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-stop-positions-hit")) {
    map.addLayer({
      id: "orm-stop-positions-hit",
      type: "circle",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_stop_positions",
      minzoom: 14,
      layout: { visibility: "none" },
      paint: { "circle-color": "#ffffff", "circle-radius": 16, "circle-opacity": 0 },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-switches")) {
    map.addLayer({
      id: "orm-switches",
      type: "symbol",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_switch_ref",
      minzoom: 13,
      layout: {
        "icon-image": getOpenRailwayMapSwitchIconExpression(),
        "icon-size": ["interpolate", ["linear"], ["zoom"], 13, 0.36, 17, 0.68],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        visibility: "none",
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-switches-hit")) {
    map.addLayer({
      id: "orm-switches-hit",
      type: "circle",
      source: OPENRAILWAYMAP_DETAIL_SOURCE.sourceId,
      "source-layer": "standard_railway_switch_ref",
      minzoom: 13,
      layout: { visibility: "none" },
      paint: { "circle-color": "#ffffff", "circle-radius": 16, "circle-opacity": 0 },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-signals")) {
    if (!map.getLayer("orm-signals-halo")) {
      map.addLayer({
        id: "orm-signals-halo",
        type: "circle",
        source: OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId,
        "source-layer": "signals_railway_signals",
        minzoom: 12,
        layout: { visibility: "none" },
        paint: {
          "circle-color": ["case",
            ["==", ["get", "deactivated0"], true], "#64748b",
            ["in", ["get", "feature0"], ["literal", ["general/signal-unknown-distant", "distant", "us/distant", "speed_limit", "speed_limit_distant"]]], "#facc15",
            ["in", ["get", "feature0"], ["literal", ["general/signal-unknown-main", "main", "us/main", "ca/main", "combined", "minor"]]], "#ef4444",
            "#22c55e",
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 6, 17, 10],
          "circle-opacity": document.body.classList.contains("light") ? 0.2 : 0.3,
          "circle-stroke-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.9)" : "rgba(8,12,20,0.92)",
          "circle-stroke-width": 1,
        },
      }, beforeLayer);
    }
    map.addLayer({
      id: "orm-signals",
      type: "symbol",
      source: OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId,
      "source-layer": "signals_railway_signals",
      minzoom: 12,
      layout: {
        "icon-image": getOpenRailwayMapSignalIconExpression(),
        "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.34, 17, 0.66],
        "icon-rotate": ["coalesce", ["get", "azimuth"], 0],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        visibility: "none",
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-signals-aspect")) {
    map.addLayer({
      id: "orm-signals-aspect",
      type: "circle",
      source: OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId,
      "source-layer": "signals_railway_signals",
      minzoom: 13,
      layout: { visibility: "none" },
      paint: {
        "circle-color": ["case",
          ["==", ["get", "deactivated0"], true], "#64748b",
          ["in", ["get", "feature0"], ["literal", ["distant", "speed_limit", "speed_limit_distant"]]], "#facc15",
          ["in", ["get", "feature0"], ["literal", ["main", "combined", "minor"]]], "#ef4444",
          "#22c55e",
        ],
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 2, 17, 3.5],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 0.8,
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-signals-text")) {
    map.addLayer({
      id: "orm-signals-text",
      type: "symbol",
      source: OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId,
      "source-layer": "signals_railway_signals",
      minzoom: 14,
      layout: {
        "text-field": ["coalesce", ["get", "ref"], ["get", "caption"], ""],
        "text-font": ["Noto Sans Regular"],
        "text-size": 10,
        "text-letter-spacing": 0,
        "text-offset": [0, 0.9],
        "text-allow-overlap": false,
        visibility: "none",
      },
      paint: {
        "text-color": document.body.classList.contains("light") ? "#111827" : "#f8fafc",
        "text-halo-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.96)" : "rgba(8,12,20,0.96)",
        "text-halo-width": 1.5,
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-signals-hit")) {
    map.addLayer({
      id: "orm-signals-hit",
      type: "circle",
      source: OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId,
      "source-layer": "signals_railway_signals",
      minzoom: 12,
      layout: { visibility: "none" },
      paint: { "circle-color": "#ffffff", "circle-radius": 16, "circle-opacity": 0 },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-signal-boxes")) {
    map.addLayer({
      id: "orm-signal-boxes",
      type: "symbol",
      source: OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId,
      "source-layer": "signals_signal_boxes",
      minzoom: 10,
      layout: {
        "icon-image": ["coalesce", ["image", getOpenRailwayMapSymbolId("general", "site")], ["image", "orm-icon-signal-box"]],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.38, 15, 0.72],
        "icon-allow-overlap": false,
        visibility: "none",
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-signal-boxes-label")) {
    map.addLayer({
      id: "orm-signal-boxes-label",
      type: "symbol",
      source: OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId,
      "source-layer": "signals_signal_boxes",
      minzoom: 12,
      layout: {
        "text-field": ["coalesce", ["get", "name"], ["get", "ref"], "Signal box"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 10.5,
        "text-letter-spacing": 0,
        "text-offset": [0, 1.1],
        "text-allow-overlap": false,
        visibility: "none",
      },
      paint: {
        "text-color": document.body.classList.contains("light") ? "#111827" : "#f8fafc",
        "text-halo-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.96)" : "rgba(8,12,20,0.96)",
        "text-halo-width": 1.5,
      },
    }, beforeLayer);
  }
  if (!map.getLayer("orm-signal-boxes-hit")) {
    map.addLayer({
      id: "orm-signal-boxes-hit",
      type: "circle",
      source: OPENRAILWAYMAP_SIGNALS_SOURCE.sourceId,
      "source-layer": "signals_signal_boxes",
      minzoom: 10,
      layout: { visibility: "none" },
      paint: { "circle-color": "#ffffff", "circle-radius": 18, "circle-opacity": 0 },
    }, beforeLayer);
  }
}

function getOpenRailwayMapLayerIds() {
  const ids = [];
  OPENRAILWAYMAP_STYLES.forEach((mode) => {
    ids.push(
      `orm-${mode}-low-outline`,
      `orm-${mode}-low-line`,
      `orm-${mode}-low-hit`,
      `orm-${mode}-high-outline`,
      `orm-${mode}-high-line`,
    );
  });
  ids.push("orm-high-hit", "orm-high-label");
  ids.push(...getOpenRailwayMapDetailLayerIds(), ...getOpenRailwayMapDetailHitLayerIds());
  return ids;
}

function getOpenRailwayMapRouteHitLayerIds() {
  const ids = ["orm-high-hit"];
  OPENRAILWAYMAP_STYLES.forEach((mode) => {
    ids.push(`orm-${mode}-low-hit`);
  });
  return ids;
}

function getOpenRailwayMapDetailLayerIds() {
  return [
    "orm-station-areas-fill",
    "orm-station-areas-outline",
    "orm-station-stops",
    "orm-rail-symbols-halo",
    "orm-rail-symbols",
    "orm-rail-symbols-text",
    "orm-stop-positions",
    "orm-switches",
    "orm-signals-halo",
    "orm-signals",
    "orm-signals-aspect",
    "orm-signals-text",
    "orm-signal-boxes",
    "orm-signal-boxes-label",
  ];
}

function getOpenRailwayMapDetailHitLayerIds() {
  return [
    "orm-station-stops-hit",
    "orm-rail-symbols-hit",
    "orm-stop-positions-hit",
    "orm-switches-hit",
    "orm-signals-hit",
    "orm-signal-boxes-hit",
  ];
}

function getOpenRailwayMapSignalLayerIds() {
  return [
    "orm-signals-halo",
    "orm-signals",
    "orm-signals-aspect",
    "orm-signals-text",
    "orm-signals-hit",
    "orm-signal-boxes",
    "orm-signal-boxes-label",
    "orm-signal-boxes-hit",
  ];
}

function getOpenRailwayMapFutureLayerIds() {
  return [
    "orm-future-low-line",
    "orm-future-high-line",
    "orm-future-high-label",
    "orm-future-hit",
  ];
}

function applyOpenRailwayMapVisibility() {
  if (!state.map || !FEATURE_OPENRAILWAYMAP_VECTOR_FREIGHT) return;
  ensureOpenRailwayMapFreightLayers(state.map);
  const activeMode = getOpenRailwayMapStyleMode();
  const visible = state.freightVisible ? "visible" : "none";
  OPENRAILWAYMAP_STYLES.forEach((mode) => {
    const modeVisibility = mode === activeMode ? visible : "none";
    [`orm-${mode}-low-outline`, `orm-${mode}-low-line`, `orm-${mode}-low-hit`, `orm-${mode}-high-outline`, `orm-${mode}-high-line`].forEach((layerId) => {
      if (state.map.getLayer(layerId)) state.map.setLayoutProperty(layerId, "visibility", modeVisibility);
    });
  });
  ["orm-high-hit", "orm-high-label"].forEach((layerId) => {
    if (state.map.getLayer(layerId)) state.map.setLayoutProperty(layerId, "visibility", visible);
  });
  const detailVisible = state.freightVisible || state.signalVisible ? "visible" : "none";
  [...getOpenRailwayMapDetailLayerIds(), ...getOpenRailwayMapDetailHitLayerIds()].forEach((layerId) => {
    if (state.map.getLayer(layerId)) state.map.setLayoutProperty(layerId, "visibility", detailVisible);
  });
  const signalVisible = state.signalVisible ? "visible" : "none";
  getOpenRailwayMapSignalLayerIds().forEach((layerId) => {
    if (state.map.getLayer(layerId)) state.map.setLayoutProperty(layerId, "visibility", signalVisible);
  });
  applyOpenRailwayMapFutureVisibility();
}

function applyOpenRailwayMapFutureVisibility() {
  if (!state.map || !FEATURE_OPENRAILWAYMAP_VECTOR_FREIGHT) return;
  const visible = state.proposedLinesVisible ? "visible" : "none";
  getOpenRailwayMapFutureLayerIds().forEach((layerId) => {
    if (state.map.getLayer(layerId)) state.map.setLayoutProperty(layerId, "visibility", visible);
  });
}

function bindOpenRailwayMapEvents(map = state.map) {
  if (!map) return;
  if (!state.openRailwayMapBoundLayerIds) state.openRailwayMapBoundLayerIds = new Set();
  [...getOpenRailwayMapLayerIds(), ...getOpenRailwayMapFutureLayerIds()]
    .filter((layerId) => layerId.includes("-hit"))
    .forEach((layerId) => {
      if (!map.getLayer(layerId) || state.openRailwayMapBoundLayerIds.has(layerId)) return;
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", layerId, getOpenRailwayMapDetailHitLayerIds().includes(layerId) ? openOpenRailwayMapFeaturePopup : openOpenRailwayMapPopup);
      state.openRailwayMapBoundLayerIds.add(layerId);
    });
  state.openRailwayMapEventsBound = state.openRailwayMapBoundLayerIds.size > 0;
}

function upsertSignal(signal) {
  const signalId = `${signal?.signal_id || ""}`.trim().toUpperCase();
  if (!signalId) return;
  const nextSignals = Array.isArray(state.signals) ? [...state.signals] : [];
  const index = nextSignals.findIndex((entry) => `${entry?.signal_id || ""}`.trim().toUpperCase() === signalId);
  if (index >= 0) {
    nextSignals[index] = { ...nextSignals[index], ...signal, signal_id: signalId };
  } else {
    nextSignals.push({ ...signal, signal_id: signalId });
  }
  renderSignals(nextSignals);
}

function setSignalVisible(visible) {
  state.signalVisible = Boolean(visible);
  state.uiSettings.signalVisible = state.signalVisible;
  applySignalVisibility();
  applyOpenRailwayMapVisibility();
  if (state.signalVisible) {
    scheduleVisibleSignalFetch();
  } else {
    renderSignals([]);
  }
}

function applyRouteVisibility() {
  if (!state.map) return;
  const useRouteRaster = shouldUseRouteRasterTiles();
  const inInteractionMode = Boolean(state.mapInteractionActive);
  const decorativeRouteLayers = new Set([
    "routes-glow",
    "routes-outline",
    "routes-label",
    "routes-hit",
    "freight-routes-glow",
    "freight-routes-outline",
    "freight-routes-label",
  ]);
  ["routes-glow", "routes-outline", "routes-line", "routes-label", "routes-hit", "freight-routes-glow", "freight-routes-outline", "freight-routes-line", "freight-routes-label"].forEach((layerId) => {
    if (state.map.getLayer(layerId)) {
      const routeVisibility = state.routesVisible ? "visible" : "none";
      const freightVisibility = state.freightVisible && !FEATURE_OPENRAILWAYMAP_VECTOR_FREIGHT ? "visible" : "none";
      let nextVisibility = layerId.startsWith("freight-") ? freightVisibility : routeVisibility;
      if (layerId === "routes-hit") {
        nextVisibility = state.routesVisible || state.freightVisible ? "visible" : "none";
      }
      if ((useRouteRaster || inInteractionMode) && decorativeRouteLayers.has(layerId)) {
        nextVisibility = "none";
      }
      state.map.setLayoutProperty(layerId, "visibility", nextVisibility);
    }
  });
  if (state.map.getLayer("routes-raster")) {
    state.map.setLayoutProperty(
      "routes-raster",
      "visibility",
      useRouteRaster && state.routesVisible && !state.freightVisible ? "visible" : "none"
    );
  }
  applyOpenRailwayMapVisibility();
}

function getProposedLineColor(type = "") {
  const value = `${type}`.toLowerCase();
  if (value.includes("high-speed")) return "#f59e0b";
  if (value.includes("light rail") || value.includes("metro")) return "#a855f7";
  if (value.includes("commuter")) return "#38bdf8";
  return "#22c55e";
}

function buildProposedRailFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: proposedRailLines
      .filter((line) => Array.isArray(line.coordinates) && line.coordinates.length >= 2)
      .map((line) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: line.coordinates },
        properties: {
          id: line.id,
          name: line.name,
          type: line.type,
          status: line.status,
          sponsor: line.sponsor,
          states: line.states,
          summary: line.summary,
          sourceUrl: line.sourceUrl,
          color: getProposedLineColor(line.type),
        },
      })),
  };
}

function buildProposedRailPopupHtml(props = {}) {
  const sourceUrl = `${props.sourceUrl || ""}`.trim();
  return `
    <div class="proposed-rail-popup">
      <span class="proposed-rail-popup__kicker">${escapeHtml(props.type || "Proposed rail")}</span>
      <strong>${escapeHtml(props.name || "Proposed rail line")}</strong>
      <div class="proposed-rail-popup__meta">${escapeHtml(props.status || "Planning")} • ${escapeHtml(props.states || "")}</div>
      <p>${escapeHtml(props.summary || "")}</p>
      <div class="proposed-rail-popup__grid">
        <span>Sponsor</span><b>${escapeHtml(props.sponsor || "Project sponsor")}</b>
      </div>
      ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Open project source</a>` : ""}
    </div>
  `;
}

function cleanOpenRailwayMapValue(value) {
  if (Array.isArray(value)) {
    return value.map(cleanOpenRailwayMapValue).filter(Boolean).join(", ");
  }
  let text = `${value ?? ""}`.trim();
  if (!text || text === "null" || text === "undefined") return "";
  text = text.replace(/^\{|\}$/g, "");
  text = text.replace(/^\[|\]$/g, "");
  text = text.replace(/^"|"$/g, "");
  text = text.replace(/","/g, ", ");
  text = text.replace(/"/g, "");
  text = text.replace(/\s*,\s*/g, ", ");
  return text.trim();
}

function formatFreightPopupValue(value, fallback = "--") {
  const text = cleanOpenRailwayMapValue(value);
  return text || fallback;
}

function formatFreightSpeedMph(value) {
  const text = cleanOpenRailwayMapValue(value);
  if (!text) return "";
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return text;
  return `${Math.round(numeric)}`;
}

function buildFreightRoutePopupHtml(props = {}) {
  const owner = formatFreightPopupValue(props.owner || props.operator || props.primary_operator, "Freight railroad");
  const ownerCode = formatFreightPopupValue(props.ownerCode || props.reportingMarks || props.primary_operator || props.operator, "");
  const subdivision = formatFreightPopupValue(props.subdivision || props.name || props.ref || props.track_ref, "Railway");
  const reference = formatFreightPopupValue(props.reference || props.ref || props.track_ref, ownerCode || "--");
  const osmId = `${props.osm_id || ""}`.trim();
  const sourceUrl = osmId
    ? `https://www.openstreetmap.org/way/${encodeURIComponent(osmId)}`
    : `${props.openRailwayMapUrl || "https://openrailwaymap.app"}`.trim();
  const speed = formatFreightSpeedMph(props.maxSpeedMph ?? props.maxspeed);
  const trackCount = formatFreightPopupValue(props.trackCount, "");
  const trackClass = formatFreightPopupValue(props.trackClass ?? props.track_class, "");
  const gauge = formatFreightPopupValue(props.gaugeMm || props.gauges || props.gauge0, "1435");
  const voltage = formatFreightPopupValue(props.voltage, "");
  const frequency = formatFreightPopupValue(props.frequency, "");
  const trainProtection = formatFreightPopupValue(props.trainProtection || props.train_protection, "");
  const electrification = props.electrification || props.electrification_state
    || (voltage ? `${voltage} V${frequency ? ` / ${frequency} Hz` : ""}` : "no");
  const classLabel = `${props.freightClass || ""}` === "shortline" ? "Shortline / regional" : `${props.freightClass || ""}` === "class1" ? "Class I freight" : "Freight route";
  return `
    <div class="freight-route-popup">
      <div class="freight-route-popup__kicker">Railway infrastructure</div>
      <strong>${escapeHtml(ownerCode ? `${ownerCode} ${subdivision}` : subdivision)}</strong>
      <span class="freight-route-popup__sub">${escapeHtml(owner)}${classLabel ? ` • ${escapeHtml(classLabel)}` : ""}</span>
      <div class="freight-route-popup__chips">
        <span><b>State:</b> ${escapeHtml(formatFreightPopupValue(props.routeState || props.state, "present"))}</span>
        <span><b>Usage:</b> ${escapeHtml(formatFreightPopupValue(props.usage, "main"))}</span>
        <span><b>Reference:</b> ${escapeHtml(reference)}</span>
        ${trackCount ? `<span><b>Track:</b> ${escapeHtml(trackCount)}</span>` : ""}
        ${speed ? `<span><b>Speed:</b> ${escapeHtml(speed)} mph</span>` : ""}
        ${trainProtection ? `<span><b>Train protection:</b> ${escapeHtml(trainProtection)}</span>` : ""}
        <span><b>Electrification:</b> ${escapeHtml(formatFreightPopupValue(electrification, "no"))}</span>
        <span><b>Gauge:</b> ${escapeHtml(gauge)}</span>
        ${trackClass ? `<span><b>Track class:</b> ${escapeHtml(trackClass)}</span>` : ""}
        ${ownerCode ? `<span><b>Reporting marks:</b> ${escapeHtml(ownerCode)}</span>` : ""}
        <span><b>Operator:</b> ${escapeHtml(owner)}</span>
      </div>
      <div class="freight-route-popup__source">
        <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${osmId ? "Open OSM" : "Open ORM"}</a>
      </div>
    </div>
  `;
}

function buildOpenRailwayMapFeaturePopupHtml(props = {}) {
  const feature = formatFreightPopupValue(props.feature || props.railway || props.type, "Rail feature");
  const name = formatFreightPopupValue(props.localized_name || props.name || props.label || props.caption || props.ref, feature);
  const operator = cleanOpenRailwayMapValue(props.operator || props.operator_name || props.owner || props.primary_operator);
  const ref = cleanOpenRailwayMapValue(props.ref || props.track_ref || props.id);
  const osmId = `${props.osm_id || ""}`.trim();
  const sourceUrl = osmId
    ? `https://www.openstreetmap.org/way/${encodeURIComponent(osmId)}`
    : `${OPENRAILWAYMAP_BASE_URL}`.trim();
  return `
    <div class="freight-route-popup">
      <div class="freight-route-popup__kicker">${escapeHtml(feature)}</div>
      <strong>${escapeHtml(name)}</strong>
      ${operator ? `<span class="freight-route-popup__sub">${escapeHtml(operator)}</span>` : ""}
      <div class="freight-route-popup__chips">
        ${ref ? `<span><b>Reference:</b> ${escapeHtml(ref)}</span>` : ""}
        ${props.state ? `<span><b>State:</b> ${escapeHtml(formatFreightPopupValue(props.state, "present"))}</span>` : ""}
        ${props.station ? `<span><b>Station:</b> ${escapeHtml(formatFreightPopupValue(props.station, ""))}</span>` : ""}
        ${props.direction_both !== undefined ? `<span><b>Direction:</b> ${props.direction_both ? "Both" : "One way"}</span>` : ""}
        ${props.deactivated0 !== undefined ? `<span><b>Status:</b> ${props.deactivated0 ? "Deactivated" : "Active"}</span>` : ""}
        ${operator ? `<span><b>Operator:</b> ${escapeHtml(operator)}</span>` : ""}
      </div>
      <div class="freight-route-popup__source">
        <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${osmId ? "Open OSM" : "Open ORM"}</a>
      </div>
    </div>
  `;
}

function openFreightRoutePopup(event) {
  const feature = event.features?.find((row) => Number(row?.properties?.isFreight) === 1) || event.features?.[0];
  if (!feature || Number(feature.properties?.isFreight) !== 1) return;
  state.routePopup?.remove?.();
  state.routePopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "360px" })
    .setLngLat(event.lngLat)
    .setHTML(buildFreightRoutePopupHtml(feature.properties || {}))
    .addTo(state.map);
}

function openOpenRailwayMapPopup(event) {
  if (!state.map) return;
  const detailHitLayers = getOpenRailwayMapDetailHitLayerIds().filter((layerId) => state.map.getLayer(layerId));
  if (detailHitLayers.length) {
    const markerFeatures = state.map.queryRenderedFeatures(event.point, { layers: detailHitLayers });
    if (markerFeatures.some((row) => row?.properties)) return;
  }
  const hitLayers = getOpenRailwayMapRouteHitLayerIds().filter((layerId) => state.map.getLayer(layerId));
  const features = state.map.queryRenderedFeatures(event.point, { layers: hitLayers });
  const feature = features.find((row) => row?.properties) || event.features?.[0];
  if (!feature) return;
  state.routePopup?.remove?.();
  state.routePopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "360px" })
    .setLngLat(event.lngLat)
    .setHTML(buildFreightRoutePopupHtml(feature.properties || {}))
    .addTo(state.map);
}

function openOpenRailwayMapFeaturePopup(event) {
  if (!state.map) return;
  const hitLayers = getOpenRailwayMapDetailHitLayerIds().filter((layerId) => state.map.getLayer(layerId));
  const features = state.map.queryRenderedFeatures(event.point, { layers: hitLayers });
  const feature = features.find((row) => row?.properties) || event.features?.[0];
  if (!feature) return;
  state.routePopup?.remove?.();
  state.routePopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14, maxWidth: "360px" })
    .setLngLat(event.lngLat)
    .setHTML(buildOpenRailwayMapFeaturePopupHtml(feature.properties || {}))
    .addTo(state.map);
}

function openProposedRailPopup(event) {
  const feature = event?.features?.[0];
  if (!state.map || !feature) return;
  state.proposedRailPopup?.remove?.();
  state.proposedRailPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 12, maxWidth: "360px" })
    .setLngLat(event.lngLat)
    .setHTML(buildProposedRailPopupHtml(feature.properties || {}))
    .addTo(state.map);
}

function ensureProposedRailLayers() {
  const map = state.map;
  if (!map) return;
  if (FEATURE_OPENRAILWAYMAP_VECTOR_FREIGHT) {
    ensureOpenRailwayMapFreightLayers(map);
    bindOpenRailwayMapEvents(map);
  }
  if (!map.getSource("proposed-rail-lines")) {
    map.addSource("proposed-rail-lines", {
      type: "geojson",
      data: buildProposedRailFeatureCollection(),
    });
  } else {
    queueSourceDataUpdate("proposed-rail-lines", buildProposedRailFeatureCollection());
  }

  if (!map.getLayer("proposed-rail-glow")) {
    map.addLayer({
      id: "proposed-rail-glow",
      type: "line",
      source: "proposed-rail-lines",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 5, 7, 7, 12, 10],
        "line-opacity": 0.16,
        "line-blur": 5,
      },
    }, map.getLayer("trains-badge") ? "trains-badge" : undefined);
  }
  if (!map.getLayer("proposed-rail-line")) {
    map.addLayer({
      id: "proposed-rail-line",
      type: "line",
      source: "proposed-rail-lines",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.2, 7, 3.4, 12, 5.6],
        "line-opacity": 0.92,
        "line-dasharray": [1.3, 1.1],
      },
    }, map.getLayer("trains-badge") ? "trains-badge" : undefined);
  }
  if (!map.getLayer("proposed-rail-label")) {
    map.addLayer({
      id: "proposed-rail-label",
      type: "symbol",
      source: "proposed-rail-lines",
      minzoom: 5,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 720,
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10.5, 10, 12.5, 14, 14],
        "text-letter-spacing": 0.02,
        "text-rotation-alignment": "map",
        "text-keep-upright": true,
      },
      paint: {
        "text-color": ["get", "color"],
        "text-halo-color": document.body.classList.contains("light") ? "rgba(255,255,255,0.98)" : "rgba(5,8,14,0.96)",
        "text-halo-width": 2,
      },
    }, map.getLayer("trains-badge") ? "trains-badge" : undefined);
  }
  if (!map.getLayer("proposed-rail-hit")) {
    map.addLayer({
      id: "proposed-rail-hit",
      type: "line",
      source: "proposed-rail-lines",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 14, 7, 18, 12, 24],
        "line-opacity": 0,
      },
    });
  }

  if (!state.proposedRailEventsBound) {
    map.on("mouseenter", "proposed-rail-hit", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "proposed-rail-hit", () => { map.getCanvas().style.cursor = ""; });
    map.on("click", "proposed-rail-hit", openProposedRailPopup);
    state.proposedRailEventsBound = true;
  }
  applyProposedRailVisibility();
}

function applyProposedRailVisibility() {
  if (!state.map) return;
  const visibility = state.proposedLinesVisible ? "visible" : "none";
  ["proposed-rail-glow", "proposed-rail-line", "proposed-rail-label", "proposed-rail-hit"].forEach((layerId) => {
    if (state.map.getLayer(layerId)) {
      state.map.setLayoutProperty(layerId, "visibility", visibility);
    }
  });
  applyOpenRailwayMapFutureVisibility();
}

function setProposedLinesVisible(visible) {
  state.proposedLinesVisible = Boolean(visible);
  state.uiSettings.proposedLinesVisible = state.proposedLinesVisible;
  if (elements.settingProposedLinesVisible) {
    elements.settingProposedLinesVisible.checked = state.proposedLinesVisible;
  }
  ensureProposedRailLayers();
  applyProposedRailVisibility();
}

function applyStationVisibility() {
  if (!state.map) return;
  ["stations", "stations-hit", "station-labels"].forEach((layerId) => {
    if (state.map.getLayer(layerId)) {
      state.map.setLayoutProperty(layerId, "visibility", state.stationsVisible ? "visible" : "none");
    }
  });
}

function setMapInteractionPerformanceMode(active) {
  const next = Boolean(active);
  if (state.mapInteractionActive === next) return;
  state.mapInteractionActive = next;

  if (!state.map) return;
  applyRouteVisibility();

  if (state.map.getLayer("trains-label")) {
    state.map.setLayoutProperty("trains-label", "visibility", next ? "none" : "visible");
  }
  if (next) {
    if (state.map.getLayer("trains-speed-label")) {
      state.map.setLayoutProperty("trains-speed-label", "visibility", "none");
    }
  } else {
    setTrainSpeedLabelsVisible(state.uiSettings.predictedMovementVisible);
  }
}

function setRoutesVisible(visible) {
  state.routesVisible = Boolean(visible);
  state.uiSettings.routesVisible = state.routesVisible;
  if (elements.settingRoutesVisible) {
    elements.settingRoutesVisible.checked = state.routesVisible;
  }
  applyRouteVisibility();
}

function setFreightVisible(visible) {
  state.freightVisible = Boolean(visible);
  state.uiSettings.freightVisible = state.freightVisible;
  if (elements.settingFreightVisible) {
    elements.settingFreightVisible.checked = state.freightVisible;
  }

  if (state.freightVisible && !FEATURE_OPENRAILWAYMAP_VECTOR_FREIGHT && !state.freightRoutesLoaded) {
    loadFreightRoutesDeferred().catch((error) => {
      console.warn("Freight routes load failed:", error);
    });
  }

  renderRoutes([...(state.routes || []), ...(state.commuterRoutes || []), ...(state.freightRoutes || [])]);
  applyRouteVisibility();
  applySignalVisibility();
}

function setFreightOperatorHighlight(value) {
  const nextStyle = OPENRAILWAYMAP_STYLES.has(`${value || ""}`.trim())
    ? `${value}`.trim()
    : defaultUiSettings.openRailwayMapStyle;
  state.uiSettings.openRailwayMapStyle = nextStyle;
  state.uiSettings.freightOperatorHighlight = "all";
  if (elements.settingFreightOperatorHighlight) {
    elements.settingFreightOperatorHighlight.value = nextStyle;
  }
  applySignalVisibility();
  applyOpenRailwayMapVisibility();
}

function rebuildFreightOperatorOptions() {
  if (!elements.settingFreightOperatorHighlight) return;
  const options = [
    { value: "standard", label: "Infrastructure" },
    { value: "speed", label: "Speed" },
    { value: "train-protection", label: "Train protection" },
    { value: "electrification", label: "Electrification" },
    { value: "track", label: "Track" },
    { value: "operator", label: "Operator" },
  ];
  const previous = `${state.uiSettings.openRailwayMapStyle || defaultUiSettings.openRailwayMapStyle}`.trim();
  const markup = options
    .map((entry) => `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`)
    .join("");
  elements.settingFreightOperatorHighlight.innerHTML = markup;
  elements.settingFreightOperatorHighlight.value = options.some((entry) => entry.value === previous)
    ? previous
    : defaultUiSettings.openRailwayMapStyle;
}

function setStationsVisible(visible) {
  state.stationsVisible = Boolean(visible);
  state.uiSettings.stationsVisible = state.stationsVisible;
  if (elements.settingStationsVisible) {
    elements.settingStationsVisible.checked = state.stationsVisible;
  }
  if (elements.toggleStations) {
    elements.toggleStations.setAttribute("data-active", String(state.stationsVisible));
  }
  applyStationVisibility();
}

function setHeritageVisible(visible) {
  state.showHeritage = Boolean(visible);
  state.uiSettings.heritageVisible = state.showHeritage;
  if (elements.settingHeritageVisible) {
    elements.settingHeritageVisible.checked = state.showHeritage;
  }
  if (elements.toggleHeritage) {
    elements.toggleHeritage.dataset.active = String(state.showHeritage);
  }
  renderSightings();
}

function setSpecialInterestVisible(visible) {
  state.showSI = Boolean(visible);
  state.uiSettings.specialInterestVisible = state.showSI;
  if (elements.settingSpecialInterestVisible) {
    elements.settingSpecialInterestVisible.checked = state.showSI;
  }
  if (elements.toggleSpecialInterest) {
    elements.toggleSpecialInterest.dataset.active = String(state.showSI);
  }
  renderSightings();
}

function getVisibleTrainsForZoom(trains) {
  if (!state.map || !Array.isArray(trains) || trains.length === 0) return trains;
  const bounds = state.map.getBounds();
  const zoom = Number(state.map.getZoom?.() || 0);
  const paddedBounds = bounds?.toArray
    ? bounds.toArray()
    : null;
  const viewportFiltered = paddedBounds
    ? trains.filter((train) => {
      const lat = Number(train.lat);
      const lon = Number(train.lon);
      const key = `${train.source}:${train.id}`;
      const selectedKey = state.selectedTrain
        ? `${state.selectedTrain.source}:${state.selectedTrain.id}`
        : "";
      if (key === selectedKey) return true;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
      const [[west, south], [east, north]] = paddedBounds;
      const latSpan = Math.max(0, north - south);
      const lonSpan = Math.max(0, east - west);
      const highZoom = zoom >= 10;
      const midZoom = zoom >= 8 && zoom < 10;
      const latPad = highZoom
        ? Math.max(0.008, latSpan * 0.06)
        : midZoom
          ? Math.max(0.025, latSpan * 0.12)
          : Math.max(0.08, latSpan * 0.22);
      const lonPad = highZoom
        ? Math.max(0.008, lonSpan * 0.06)
        : midZoom
          ? Math.max(0.025, lonSpan * 0.12)
          : Math.max(0.08, lonSpan * 0.22);
      return lat >= south - latPad && lat <= north + latPad && lon >= west - lonPad && lon <= east + lonPad;
    })
    : trains;
  if (viewportFiltered.length === 0) return state.selectedTrain ? [state.selectedTrain] : [];

  if (zoom >= 9) return viewportFiltered;

  const alwaysVisible = [];
  const bucketedCandidates = [];

  viewportFiltered.forEach((train) => {
    const sourceKey = `${train?.source || ""}`.trim().toLowerCase();
    const fullVisibilityZoom = Number(SOURCE_FULL_VISIBILITY_ZOOM.get(sourceKey));
    const sourceShouldBeFullyVisible = Number.isFinite(fullVisibilityZoom) && zoom >= fullVisibilityZoom;
    if (LOW_ZOOM_ALWAYS_VISIBLE_SOURCES.has(sourceKey) || sourceShouldBeFullyVisible) {
      alwaysVisible.push(train);
    } else {
      bucketedCandidates.push(train);
    }
  });

  const cellSize =
    zoom < 4 ? 5.2 :
      zoom < 5 ? 3.2 :
        zoom < 6 ? 1.9 :
          zoom < 7 ? 1.1 :
            zoom < 8 ? 0.55 : 0.24;

  const selectedKey = state.selectedTrain
    ? `${state.selectedTrain.source}:${state.selectedTrain.id}`
    : "";
  const buckets = new Map();

  bucketedCandidates.forEach((train) => {
    const lat = Number(train.lat);
    const lon = Number(train.lon);
    const key = `${train.source}:${train.id}`;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      buckets.set(`fallback:${key}`, train);
      return;
    }

    const bucketKey = `${Math.floor(lat / cellSize)}:${Math.floor(lon / cellSize)}`;
    const existing = buckets.get(bucketKey);
    if (!existing) {
      buckets.set(bucketKey, train);
      return;
    }

    const trainPriority =
      (key === selectedKey ? 1000 : 0) +
      (train.realTime ? 100 : 0) +
      (Number.isFinite(Number(train.delayMinutes)) ? Math.min(Math.abs(Number(train.delayMinutes)), 60) : 0);
    const existingKey = `${existing.source}:${existing.id}`;
    const existingPriority =
      (existingKey === selectedKey ? 1000 : 0) +
      (existing.realTime ? 100 : 0) +
      (Number.isFinite(Number(existing.delayMinutes)) ? Math.min(Math.abs(Number(existing.delayMinutes)), 60) : 0);

    if (trainPriority > existingPriority) {
      buckets.set(bucketKey, train);
    }
  });

  const visible = [...alwaysVisible, ...Array.from(buckets.values())];
  if (selectedKey && !visible.some((train) => `${train.source}:${train.id}` === selectedKey)) {
    const selectedTrain = viewportFiltered.find((train) => `${train.source}:${train.id}` === selectedKey) ||
      trains.find((train) => `${train.source}:${train.id}` === selectedKey);
    if (selectedTrain) visible.push(selectedTrain);
  }
  return visible;
}

function renderTrains(trains) {
  const renderableTrains = Array.isArray(trains) ? trains.filter(shouldRenderTrain) : [];
  applyRouteColorsToTrains(renderableTrains);
  ensureTrainLayers();
  const displayTrains = state.uiSettings.trainHistoryVisible
    ? buildHistoryPlaybackTrains(renderableTrains, state.historyPlaybackTimestamp)
    : renderableTrains;
  applyRouteColorsToTrains(displayTrains);
  updateTrainSource(getVisibleTrainsForZoom(displayTrains));
  renderQuickLookBoard(renderableTrains);

  state.trainIndex = new Map(renderableTrains.map((train) => [`${train.source}:${train.id}`, train]));
  updateTrainHistoryLayers(renderableTrains);
  syncSelectedTrainDetail();

  const list = elements.list;
  if (!list) return;

  if (sidebarManager?.state?.isMobile && !sidebarManager?.state?.isSidebarOpen) {
    state.needsTrainsRender = true;
    return;
  }

  // Add all trains to the render queue for chunked processing
  state.renderQueue = [...renderableTrains];
  state.renderExistingCards = new Map();
  Array.from(list.children).forEach((child) => {
    if (child.dataset && child.dataset.id) {
      state.renderExistingCards.set(child.dataset.id, child);
    }
  });
  processRenderQueue();
}

function refreshTrainMarkersForViewport() {
  const baseTrains = state.trainIndex && state.trainIndex.size > 0
    ? Array.from(state.trainIndex.values())
    : (Array.isArray(getAllTrains()) ? applyFilters(getAllTrains()).filter(shouldRenderTrain) : []);
  applyRouteColorsToTrains(baseTrains);
  ensureTrainLayers();
  const displayTrains = state.uiSettings.trainHistoryVisible
    ? buildHistoryPlaybackTrains(baseTrains, state.historyPlaybackTimestamp)
    : baseTrains;
  applyRouteColorsToTrains(displayTrains);
  updateTrainSource(getVisibleTrainsForZoom(displayTrains));
}

function scheduleTrainViewportRefresh(delayMs = 0) {
  if (state.trainViewportRefreshTimer) {
    clearTimeout(state.trainViewportRefreshTimer);
  }
  state.trainViewportRefreshTimer = setTimeout(() => {
    state.trainViewportRefreshTimer = null;
    refreshTrainMarkersForViewport();
  }, Math.max(0, Number(delayMs) || 0));
}

function processRenderQueue() {
  if (state.isRendering || state.renderQueue.length === 0) {
    if (state.renderQueue.length === 0) cleanupStaleCards();
    return;
  }
  state.isRendering = true;

  const list = elements.list;
  if (!list) {
     state.isRendering = false;
     return;
  }

  const CHUNK_SIZE = state.lowTierDevice
    ? 6
    : ((state.isMobile || window.innerWidth <= 768) ? 12 : 40);
  const chunk = state.renderQueue.splice(0, CHUNK_SIZE);

  const existingCards = state.renderExistingCards || new Map();

  chunk.forEach((train) => {
    const id = `${train.source}:${train.id}`;
    let card = existingCards.get(id);
    const isNew = !card;

    if (isNew) {
      card = document.createElement("div");
      card.className = "train-card";
      card.dataset.id = id;

      card.addEventListener("click", () => {
        const currentTrain = state.trainIndex.get(id);
        if (!currentTrain) return;
        state.trainPopup?.remove?.();
        state.trainPopup = null;
        const coords = normalizeLngLat(currentTrain.lat, currentTrain.lon, currentTrain.source);
        if (coords && state.map) {
          state.map.flyTo({
            center: [coords.lon, coords.lat],
            zoom: Math.max(state.map.getZoom?.() || 0, 8),
            duration: 900,
          });
        }
        selectTrain(currentTrain);
      });
    }

    const trainColor = getTrainDisplayColor(train);
    card.style.setProperty("--line-color", train.lineColor || trainColor);
    card.style.setProperty("--name-color", trainColor);
    const isSaved = state.savedTrains.has(id);
    const liveClass = train.realTime ? "live" : "scheduled";
    const speedNumber = Number(train.speed);
    const speedText = Number.isFinite(speedNumber) && speedNumber > 0 ? `${Math.round(speedNumber)} mph` : "--";
    const nextStopText = train.nextStop || "Upcoming stop unavailable";
    const etaDisplay = formatServiceTime(train.actual || train.eta || "");

    const routeLabel = getRouteDisplayLabel(train);
    const contentHash = `${train.delayMinutes}:${train.status}:${train.nextStop}:${train.eta}:${routeLabel}:${formatUpdatedTimestamp(train.lastUpdated)}`;
    if (card.dataset.hash !== contentHash) {
      card.dataset.hash = contentHash;
      card.innerHTML = `
        <div class="train-card-upcoming">
          <span>Upcoming stop</span>
          <strong>${escapeHtml(nextStopText)}</strong>
          <em>${escapeHtml(etaDisplay || "--")}</em>
        </div>
        <div class="train-card-head">
          <span class="train-card-id">${escapeHtml(formatMarkerLabel(train))}</span>
          <div class="train-card-title-wrap">
            <h3 class="train-card-title">${escapeHtml(train.name)}</h3>
            <p class="train-card-sub">${escapeHtml(sources[train.source]?.label || train.source)} • ${escapeHtml(routeLabel)}</p>
          </div>
        </div>
        <div class="train-kpis">
          <div class="kpi"><span>Next</span><strong>${escapeHtml(train.nextStop || "--")}</strong></div>
          <div class="kpi"><span>ETA</span><strong>${escapeHtml(etaDisplay)}</strong></div>
          <div class="kpi"><span>Sched</span><strong>${escapeHtml(formatServiceTime(train.scheduled || ""))}</strong></div>
          <div class="kpi"><span>Speed</span><strong>${escapeHtml(speedText)}</strong></div>
        </div>
        <div class="train-meta">
          <span class="badge ${delayClass(train.delayMinutes, train.status)}">${escapeHtml(delayLabel(train.delayMinutes, train.status))}</span>
          <span class="status-indicator ${liveClass}">${escapeHtml(formatStatusLabel(train))}</span>
          <span class="meta-updated">${escapeHtml(formatUpdatedTimestamp(train.lastUpdated))}</span>
        </div>
        <button class="save-btn" data-id="${id}">
          ${isSaved ? "Saved" : "Save"}
        </button>
      `;

      card.querySelector(".save-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        if (state.savedTrains.has(id)) {
          state.savedTrains.delete(id);
        } else {
          state.savedTrains.add(id);
        }
        persistSaved();
        state.needsTrainsRender = true;
      });
    }

    if (isNew) {
      list.appendChild(card);
    }
  });

  state.isRendering = false;
  if (state.renderQueue.length > 0) {
    requestAnimationFrame(processRenderQueue);
  } else {
    cleanupStaleCards();
  }
}

function renderQuickLookBoard(trains) {
  const board = elements.quickLookBoard;
  if (!board) return;

  if (!state.uiSettings?.compactCards) {
    board.hidden = true;
    board.innerHTML = "";
    return;
  }

  board.hidden = false;

  if (!Array.isArray(trains) || trains.length === 0) {
    board.innerHTML = "";
    return;
  }

  const grouped = new Map();
  trains.forEach((train) => {
    const key = `${train.source || "unknown"}`;
    const current = grouped.get(key) || {
      key,
      label: sources[train.source]?.label || train.source || "Unknown",
      count: 0,
      onTime: 0,
      late: 0,
      veryLate: 0,
      extreme: 0,
    };
    current.count += 1;
    const delayMinutes = Number(train.delayMinutes);
    if (!Number.isFinite(delayMinutes) || delayMinutes <= 5) current.onTime += 1;
    else if (delayMinutes <= 15) current.late += 1;
    else if (delayMinutes <= 60) current.veryLate += 1;
    else current.extreme += 1;
    grouped.set(key, current);
  });

  const nowLabel = new Intl.DateTimeFormat([], withPreferredTimeZone({
    hour: "numeric",
    minute: "2-digit",
  })).format(new Date());

  const cards = Array.from(grouped.values())
    .sort((a, b) => b.count - a.count)
    .map((group) => `
      <article class="quick-look-card">
        <div class="quick-look-card-head">
          <h3>Quick Look: <span>${escapeHtml(group.label)}</span></h3>
          <p>${escapeHtml(nowLabel)}</p>
        </div>
        <div class="quick-look-primary">
          <strong>${group.count}</strong>
          <span>Active trains</span>
        </div>
        <div class="quick-look-breakdown">
          <div><strong>${group.onTime}</strong><span class="quick-look-dot on-time"></span><span>On time</span></div>
          <div><strong>${group.late}</strong><span class="quick-look-dot late"></span><span>Late</span></div>
          <div><strong>${group.veryLate}</strong><span class="quick-look-dot very-late"></span><span>Very late</span></div>
          <div><strong>${group.extreme}</strong><span class="quick-look-dot extreme"></span><span>Extremely late</span></div>
        </div>
      </article>
    `)
    .join("");

  board.innerHTML = cards;
}

function cleanupStaleCards() {
  const list = elements.list;
  if (!list) return;
  const allIds = new Set(state.trainIndex.keys());
  Array.from(list.children).forEach((child) => {
    const id = child.dataset?.id;
    if (id && !allIds.has(id)) {
      child.remove();
    }
  });

  if (state.trainIndex.size === 0) {
    list.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "train-list-empty";
    if (!state.backendReachable) {
      empty.textContent = "Checking connection...";
    } else {
      empty.textContent = "No trains match your search or filters.";
    }
    list.appendChild(empty);
  }
  state.renderExistingCards = null;
}


function getAllTrains() {
  const base = [...state.trains, ...state.commuterTrains];
  const bigBoyLat = Number(state.bigBoyStatus?.lat);
  const bigBoyLon = Number(state.bigBoyStatus?.lon);
  if (!Number.isFinite(bigBoyLat) || !Number.isFinite(bigBoyLon)) return base;

  const bigBoyVirtualTrain = {
    id: "UP4014",
    source: "up-steam",
    trainNum: "4014",
    name: "UP4014 Big Boy",
    route: "Union Pacific Steam Tour",
    nextStop: [state.bigBoyStatus?.city, state.bigBoyStatus?.state].filter(Boolean).join(", "),
    status: state.bigBoyStatus?.movement || "stopped",
    lat: bigBoyLat,
    lon: bigBoyLon,
    speed: Number(state.bigBoyStatus?.speed) || 0,
    heading: Number.isFinite(Number(state.bigBoyStatus?.heading)) ? Number(state.bigBoyStatus?.heading) : null,
    realTime: true,
    confidence: "realtime",
    lastUpdated: state.bigBoyStatus?.updated || new Date().toISOString(),
    lineColor: "#facc15",
    lineTextColor: "#111827",
    delayMinutes: 0,
  };

  return [...base, bigBoyVirtualTrain];
}

function closeTransientSurfaces() {
  elements.detailModal?.classList.remove("active");
  elements.serviceAlertModal?.classList.remove("active");
  elements.serviceNoticesModal?.classList.remove("active");
  elements.settingsModal?.classList.remove("active");
  elements.toolHelpModal?.classList.remove("active");
  elements.sightingModal?.classList.remove("active");
  elements.accountSidebar?.classList.remove("account-sidebar-open");
  elements.downloadModal?.classList.remove("active");
  closeGalleryPhotoDetail();
  elements.galleryModal?.classList.remove("active");
}

function setAppView(view = "map") {
  const currentView = document.body.dataset.appView || "map";
  const nextView = ["map", "live", "log", "alerts", "settings", "gallery"].includes(view) ? view : "map";
  if (nextView === "gallery" && currentView !== "gallery") {
    state.previousAppViewBeforeGallery = currentView;
  }
  document.body.dataset.appView = nextView;

  document.querySelectorAll(".bottom-nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === nextView);
  });
  document.querySelectorAll(".topbar-nav-item[data-view]").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === nextView);
  });

  if (nextView !== "log") {
    closeTransientSurfaces();
  }

  if (nextView === "map") {
    sidebarManager?.closeSidebar?.();
    requestAnimationFrame(() => state.map?.resize?.());
    return;
  }

  if (nextView === "live") {
    sidebarManager?.openSidebar?.();
    elements.search?.focus?.();
    return;
  }

  if (nextView === "alerts") {
    sidebarManager?.closeSidebar?.();
    openServiceNoticesModal().catch(() => {
      if (!elements.serviceNoticesPanel) return;
      elements.serviceNoticesPanel.innerHTML = buildServiceNoticesModalHtml([]);
    });
    requestAnimationFrame(() => state.map?.resize?.());
    return;
  }

  if (nextView === "settings") {
    sidebarManager?.closeSidebar?.();
    openSettingsModal();
    requestAnimationFrame(() => state.map?.resize?.());
    return;
  }

  if (nextView === "gallery") {
    sidebarManager?.closeSidebar?.();
    openGalleryModal();
    requestAnimationFrame(() => state.map?.resize?.());
  }
}

function queueSourceDataUpdate(sourceId, data) {
  if (!sourceId) return;
  state.pendingSourceData.set(sourceId, data);
  if (state.sourceUpdateFrameId != null) return;
  
  // Stagger updates: only process one source per frame to stay under 50ms
  state.sourceUpdateFrameId = requestAnimationFrame(() => {
    state.sourceUpdateFrameId = null;
    if (state.pendingSourceData.size === 0) return;

    const [id, payload] = state.pendingSourceData.entries().next().value;
    state.pendingSourceData.delete(id);

    try {
      const source = state.map?.getSource(id);
      if (source && typeof source.setData === "function") {
        source.setData(payload);
      }
    } catch (error) {
      console.warn(`Failed to update map source ${id}:`, error);
    }

    // If more sources pending, schedule next frame
    if (state.pendingSourceData.size > 0) {
      queueSourceDataUpdate("continue", null); 
    }
  });
}

function updateTrainSource(trains) {
  if (!state.map || !state.map.getSource("trains")) return;
  ensureTrainLayers();
  const features = [];
  (Array.isArray(trains) ? trains : []).forEach((train) => {
    if (`${train?.source || ""}`.trim().toLowerCase() === "up-steam") return;
    try {
      const feature = buildTrainFeature(train);
      if (feature) features.push(feature);
    } catch (error) {
      console.warn("Failed to build train feature:", train?.source, train?.id, error);
    }
  });
  ensureTrainBadgeImages(features);
  const payload = { type: "FeatureCollection", features };
  try {
    const source = state.map.getSource("trains");
    if (source && typeof source.setData === "function") {
      source.setData(payload);
    } else {
      queueSourceDataUpdate("trains", payload);
    }
  } catch (error) {
    console.warn("Direct train source update failed, retrying queued update:", error);
    queueSourceDataUpdate("trains", payload);
  }

  if (state.trainMarkers.size > 0) {
    Array.from(state.trainMarkers.values()).forEach((entry) => entry.marker?.remove?.());
    state.trainMarkers.clear();
    state.trainMarkerSnapCache.clear();
  }
}

function normalizeConsistCar(rawCar) {
  if (!rawCar) return null;
  if (typeof rawCar === "string") {
    const label = rawCar.trim();
    if (!label) return null;
    return { type: "car", label, short: label.slice(0, 10) };
  }
  const label = `${rawCar.label || rawCar.name || rawCar.type || rawCar.kind || rawCar.carType || ""}`.trim();
  if (!label) return null;
  const type = `${rawCar.type || rawCar.kind || rawCar.category || "car"}`.trim().toLowerCase();
  const short = `${rawCar.short || rawCar.code || label}`.trim().slice(0, 10);
  return { type, label, short };
}

function getRealTrainConsist(train) {
  const candidates = [
    train?.consist,
    train?.cars,
    train?.equipment,
    train?.composition,
    train?.trainset,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length === 0) continue;
    const normalized = candidate.map(normalizeConsistCar).filter(Boolean);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
}

function getVerifiedConsistProfilesForTrain(train) {
  const routeNeedles = [
    `${train.route || ""}`.trim().toLowerCase(),
    `${train.name || ""}`.trim().toLowerCase(),
  ].filter(Boolean);

  return (state.consistProfiles || []).filter((profile) => {
    if (`${profile.source || ""}`.trim().toLowerCase() !== `${train.source || ""}`.trim().toLowerCase()) {
      return false;
    }
    const profileRoutes = Array.isArray(profile.routes)
      ? profile.routes.map((route) => `${route}`.trim().toLowerCase()).filter(Boolean)
      : [];
    if (profileRoutes.length === 0) {
      return true;
    }
    return routeNeedles.some((needle) => profileRoutes.includes(needle));
  });
}

function buildTrainDiagramHtml(train) {
  const consist = getRealTrainConsist(train);
  if (consist.length === 0) {
    const verifiedProfiles = getVerifiedConsistProfilesForTrain(train);
    if (verifiedProfiles.length > 0) {
      const profileMarkup = verifiedProfiles
        .map((profile) => {
          const equipmentMarkup = (Array.isArray(profile.equipment) ? profile.equipment : [])
            .map((item) => `<span class="train-diagram-chip">${escapeHtml(item)}</span>`)
            .join("");
          const sourceMeta = [profile.sourceLabel, profile.sourceDate].filter(Boolean).join(" • ");
          const sourceLink = profile.sourceUrl
            ? `<a class="train-diagram-source" href="${escapeHtml(profile.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source</a>`
            : "";
          return `
            <div class="train-diagram-profile">
              <div class="train-diagram-profile-head">
                <div>
                  <strong>${escapeHtml(profile.title || "Verified Equipment")}</strong>
                  <div class="train-diagram-subtitle">${escapeHtml(profile.subtitle || "")}</div>
                </div>
                <span class="train-diagram-title">Verified</span>
              </div>
              <div class="train-diagram-chip-row">${equipmentMarkup}</div>
              <div class="train-diagram-meta">
                <span>${escapeHtml(sourceMeta || "Source-backed profile")}</span>
                ${sourceLink}
              </div>
              <div class="train-diagram-note">${escapeHtml(profile.notes || "Exact daily consist order is not published for this train in this source.")}</div>
            </div>
          `;
        })
        .join("");

      return `
        <section class="train-diagram-panel">
          <div class="train-diagram-head">
            <div>
              <div class="stops-title">Train Equipment</div>
              <div class="train-diagram-subtitle">Verified source-backed equipment for this service</div>
            </div>
          </div>
          ${profileMarkup}
        </section>
      `;
    }

    return `
      <section class="train-diagram-panel train-diagram-panel--empty">
        <div class="train-diagram-head">
          <div>
            <div class="stops-title">Train Diagram</div>
            <div class="train-diagram-subtitle">Live consist data is not published for this train yet.</div>
          </div>
          <span class="train-diagram-title">Unavailable</span>
        </div>
        <div class="train-diagram-note">OpenRailTracker will only show this section when the source provides real equipment or consist data.</div>
      </section>
    `;
  }

  const carsMarkup = consist
    .map(
      (car) => `
        <div class="train-diagram-car train-diagram-car--${escapeHtml(car.type)}" title="${escapeHtml(car.label)}">
          <span class="train-diagram-short">${escapeHtml(car.short)}</span>
          <span class="train-diagram-label">${escapeHtml(car.label)}</span>
        </div>
      `
    )
    .join("");

  return `
    <section class="train-diagram-panel">
      <div class="train-diagram-head">
        <div>
          <div class="stops-title">Train Diagram</div>
          <div class="train-diagram-subtitle">Live consist and equipment layout</div>
        </div>
        <span class="train-diagram-title">Live Data</span>
      </div>
      <div class="train-diagram-track">
        <div class="train-diagram-line" aria-hidden="true"></div>
        <div class="train-diagram-cars">${carsMarkup}</div>
      </div>
    </section>
  `;
}

function getPopupSafeInsets() {
  const insets = { top: 16, right: 16, bottom: 16, left: 16 };
  const sidebarEl = document.getElementById("sidebar");
  if (!sidebarEl || sidebarEl.classList.contains("sidebar-collapsed")) {
    return insets;
  }

  // Cache rect to avoid repeated getBoundingClientRect (Forced Reflow)
  if (!state.sidebarRect || Date.now() - (state.sidebarRectTime || 0) > 2000) {
    state.sidebarRect = sidebarEl.getBoundingClientRect();
    state.sidebarRectTime = Date.now();
  }
  const rect = state.sidebarRect;
  const dock = sidebarEl.dataset.dock || "left";
  if (dock === "left") {
    insets.left = Math.max(insets.left, rect.right + 16);
  } else if (dock === "right") {
    insets.right = Math.max(insets.right, window.innerWidth - rect.left + 16);
  } else if (dock === "bottom") {
    insets.bottom = Math.max(insets.bottom, window.innerHeight - rect.top + 16);
  }
  return insets;
}

function nudgePopupIntoView(popup) {
  if (!state.map || !popup) return;
  requestAnimationFrame(() => {
    const popupEl = popup.getElement();
    if (!popupEl) return;
    const rect = popupEl.getBoundingClientRect();
    const insets = getPopupSafeInsets();
    let dx = 0;
    let dy = 0;

    if (rect.left < insets.left) dx = insets.left - rect.left;
    if (rect.right > window.innerWidth - insets.right) dx = (window.innerWidth - insets.right) - rect.right;
    if (rect.top < insets.top) dy = insets.top - rect.top;
    if (rect.bottom > window.innerHeight - insets.bottom) dy = (window.innerHeight - insets.bottom) - rect.bottom;

    if (dx === 0 && dy === 0) return;

    const point = state.map.project(popup.getLngLat());
    const nextLngLat = state.map.unproject([point.x - dx, point.y - dy]);
    popup.setLngLat(nextLngLat);
  });
}

function buildServiceAlertModalHtml(train) {
  const alertEntries = collectServiceAlertEntries(train);
  const currentAlert = `${alertEntries[0]?.text || ""}`.trim();
  const severity = getServiceAlertSeverity(train, alertEntries);
  const severityLabel = getServiceAlertSeverityLabel(severity);
  const currentFirstSeen = train.alertFirstSeenAt ? formatServiceTime(train.alertFirstSeenAt) : "";
  const currentLastSeen = train.alertLastSeenAt ? formatServiceTime(train.alertLastSeenAt) : "";
  const currentMarkup = currentAlert
    ? `
      <section class="service-alert-section">
        <article class="service-alert-entry service-alert-entry--active service-alert-entry--${severity}">
          <div class="service-alert-entry-title">${escapeHtml(train.name || "Train")}</div>
          <div class="service-alert-entry-body">${escapeHtml(currentAlert)}</div>
          <div class="service-alert-entry-meta">${
            currentFirstSeen
              ? `First seen ${escapeHtml(currentFirstSeen)}${currentLastSeen ? ` • Last seen ${escapeHtml(currentLastSeen)}` : ""}`
              : `Updated ${escapeHtml(formatUpdatedTimestamp(train.lastUpdated))}`
          }</div>
        </article>
      </section>
    `
    : `
      <section class="service-alert-section">
        <div class="service-alert-empty">No active service alert for this train right now.</div>
      </section>
    `;
  const sourceLabel = escapeHtml(sources[train.source]?.label || train.source || "Operator");
  const marker = escapeHtml(formatMarkerLabel(train));
  const historyEntries = alertEntries.slice(1);
  const historyMarkup =
    historyEntries.length > 0
      ? `
      <section class="service-alert-history">
        ${historyEntries
          .map(
            (entry) => `
          <article class="service-alert-entry service-alert-entry--${severity}">
            <div class="service-alert-entry-title">${escapeHtml(entry.source || "Reported")}</div>
            <div class="service-alert-entry-body">${escapeHtml(entry.text)}</div>
            <div class="service-alert-entry-meta">${
              entry.timestamp ? `Updated ${escapeHtml(formatUpdatedTimestamp(entry.timestamp))}` : ""
            }</div>
          </article>
        `,
          )
          .join("")}
      </section>
    `
      : "";

  return `
    <div class="service-alert-shell">
      <div class="detail-head service-alert-head">
        <div class="service-alert-headline">
          <span>${sourceLabel} • ${marker} • ${severityLabel} Alert</span>
          <h3>${escapeHtml(train.name || "Train")}</h3>
          <p>${escapeHtml(currentAlert || "No alert detail provided.")}${historyEntries.length > 0 ? ` ${escapeHtml(`(+${historyEntries.length} more update${historyEntries.length > 1 ? "s" : ""})`)}` : ""}</p>
        </div>
      </div>
      ${currentMarkup}
      ${historyMarkup}
    </div>
  `;
}

function buildServiceNoticesModalHtml(notices = []) {
  const entries = Array.isArray(notices) ? notices : [];
  const headerCopy = entries.length > 0
    ? `${entries.length} active notices reported today.`
    : "No service notices reported today.";

  const bodyMarkup = entries.length > 0
    ? `
      <section class="service-alert-history">
        ${entries.map((entry) => {
          const operatorKey = `${entry?.operator || ""}`.toLowerCase();
          const sourceLabel = sources[operatorKey]?.label || entry?.name || operatorKey || "Reported";
          const publishedAt = entry?.publishedAt || entry?.timestamp || "";
          const publishedText = publishedAt ? formatUpdatedTimestamp(publishedAt) : "";
          const url = `${entry?.url || ""}`.trim();
          return `
            <article class="service-alert-entry service-alert-entry--active">
              <div class="service-alert-entry-title">${escapeHtml(sourceLabel)}</div>
              <div class="service-alert-entry-body">${escapeHtml(entry?.text || "")}</div>
              <div class="service-alert-entry-meta">
                ${publishedText ? `Updated ${escapeHtml(publishedText)}` : ""}
                ${url ? ` • <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </section>
    `
    : `
      <section class="service-alert-section">
        <div class="service-alert-empty">No active system-wide service notices right now.</div>
      </section>
    `;

  return `
    <div class="service-alert-shell">
      <div class="detail-head service-alert-head">
        <div class="service-alert-headline">
          <span>System Notices</span>
          <h3>Service Notices</h3>
          <p>${escapeHtml(headerCopy)}</p>
        </div>
      </div>
      ${bodyMarkup}
    </div>
  `;
}

async function openServiceNoticesModal() {
  if (!elements.serviceNoticesPanel || !elements.serviceNoticesModal) return;

  elements.serviceNoticesPanel.innerHTML = `
    <div class="service-alert-shell">
      <div class="detail-head service-alert-head">
        <div class="service-alert-headline">
          <span>System Notices</span>
          <h3>Service Notices</h3>
          <p>Loading current notices…</p>
        </div>
      </div>
      <section class="service-alert-section">
        <div class="service-alert-empty">Fetching the latest service notices for today.</div>
      </section>
    </div>
  `;
  elements.serviceNoticesModal.classList.add("active");

  const payload = await safeFetchJson("/api/service-notices", { notices: [] });
  const notices = Array.isArray(payload?.notices) ? payload.notices : [];
  elements.serviceNoticesPanel.innerHTML = buildServiceNoticesModalHtml(notices);
}

function getTrainStopsCacheKey(train) {
  return `${train?.source || ""}:${train?.id || ""}`;
}

function getTrainBookingUrl(train) {
  const source = `${train?.source || ""}`.toLowerCase();
  if (source === "amtrak") return "https://www.amtrak.com/home.html";
  if (source === "via") return "https://reservia.viarail.ca/";
  if (source === "brightline") return "https://www.gobrightline.com/";
  if (source === "metra") return "https://metra.com/";
  if (source === "njt") return "https://www.njtransit.com/";
  if (source === "mta" || source === "lirr" || source === "mta_mnr") return "https://new.mta.info/";
  if (source === "septa") return "https://www.septa.org/";
  if (source === "mbta") return "https://www.mbta.com/";
  if (source === "dart") return "https://www.dart.org/";
  if (source === "marta") return "https://www.itsmarta.com/";
  if (source === "rtd") return "https://www.rtd-denver.com/";
  if (source === "vta") return "https://www.vta.org/";
  if (source === "caltrain") return "https://www.caltrain.com/";
  if (source === "bart") return "https://www.bart.gov/";
  if (source === "ace") return "https://acerail.com/";
  if (source === "coaster" || source === "sprinter") return "https://gonctd.com/";
  if (source === "dcta") return "https://www.dcta.net/";
  return "";
}

const bookingServices = [
  { id: "amtrak", label: "Amtrak", color: "#1f4fa3", textColor: "#ffffff", url: "https://www.amtrak.com/home.html" },
  { id: "via", label: "VIA Rail", color: "#f6c343", textColor: "#111827", url: "https://reservia.viarail.ca/" },
  { id: "brightline", label: "Brightline", color: "#ffd21f", textColor: "#111827", url: "https://www.gobrightline.com/" },
  { id: "metra", label: "Metra", color: "#1f5fbf", textColor: "#ffffff", url: "https://metra.com/" },
  { id: "njt", label: "NJ Transit", color: "#ef4444", textColor: "#ffffff", url: "https://www.njtransit.com/" },
  { id: "mta", label: "MTA", color: "#2563eb", textColor: "#ffffff", url: "https://new.mta.info/" },
  { id: "lirr", label: "LIRR", color: "#2563eb", textColor: "#ffffff", url: "https://new.mta.info/" },
  { id: "mta_mnr", label: "Metro-North", color: "#1d4ed8", textColor: "#ffffff", url: "https://new.mta.info/" },
  { id: "septa", label: "SEPTA", color: "#7c3aed", textColor: "#ffffff", url: "https://www.septa.org/" },
  { id: "mbta", label: "MBTA", color: "#7c3aed", textColor: "#ffffff", url: "https://www.mbta.com/" },
  { id: "dart", label: "DART", color: "#16a34a", textColor: "#ffffff", url: "https://www.dart.org/" },
  { id: "marta", label: "MARTA", color: "#2563eb", textColor: "#ffffff", url: "https://www.itsmarta.com/" },
  { id: "rtd", label: "RTD", color: "#0ea5e9", textColor: "#ffffff", url: "https://www.rtd-denver.com/" },
  { id: "vta", label: "VTA", color: "#10b981", textColor: "#062c22", url: "https://www.vta.org/" },
  { id: "caltrain", label: "Caltrain", color: "#ef4444", textColor: "#ffffff", url: "https://www.caltrain.com/" },
  { id: "bart", label: "BART", color: "#2563eb", textColor: "#ffffff", url: "https://www.bart.gov/" },
  { id: "ace", label: "ACE", color: "#7c3aed", textColor: "#ffffff", url: "https://acerail.com/" },
  { id: "coaster", label: "COASTER", color: "#00AB9B", textColor: "#ffffff", url: "https://gonctd.com/" },
  { id: "sprinter", label: "SPRINTER", color: "#00AB9B", textColor: "#ffffff", url: "https://gonctd.com/" },
  { id: "dcta", label: "DCTA", color: "#059669", textColor: "#ffffff", url: "https://www.dcta.net/" },
];

function buildBookingModalHtml() {
  const buttons = bookingServices.map((service) => `
    <button class="booking-service-btn" data-booking-url="${escapeHtml(service.url)}"
      style="--booking-bg:${service.color}; --booking-fg:${service.textColor};">
      ${escapeHtml(service.label)}
    </button>
  `).join("");

  return `
    <div class="service-alert-shell">
      <div class="detail-head service-alert-head">
        <div class="detail-brand">
          <div>
            <h3>Book Train Tickets</h3>
            <p>Select a service to continue to its official booking page.</p>
          </div>
        </div>
      </div>
      <section class="service-alert-section">
        <div class="booking-grid">${buttons}</div>
      </section>
    </div>
  `;
}

function openBookingModal() {
  if (!elements.bookingPanel || !elements.bookingModal) return;
  elements.bookingPanel.innerHTML = buildBookingModalHtml();
  elements.bookingModal.classList.add("active");
  elements.bookingPanel.querySelectorAll(".booking-service-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.getAttribute("data-booking-url");
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  });
}

function renderTrainStopsPanelMarkup(stops) {
  if (!Array.isArray(stops) || stops.length === 0) {
    return `<p class="empty-state">No upcoming stops available for this train yet.</p>`;
  }

  return stops
    .map((row) => {
      const eta = Number.isFinite(Number(row.etaMinutes)) ? formatMinutesAsDuration(Math.max(0, Number(row.etaMinutes))) : "--";
      const confirmedTrack = row.platform || row.track || "";
      const predictedTrack = row.predictedTrack || "";
      const platform = confirmedTrack || predictedTrack || "--";
      const platformLabel = row.platform ? "Platform" : "Track";
      const trackClass = row.trackStatus === "predicted" && !confirmedTrack ? "stop-platform stop-platform--predicted" : "stop-platform";
      const trackSuffix = row.trackStatus === "predicted" && !confirmedTrack ? " (Predicted)" : "";
      const d = Number(row.delayMinutes);
      const cls = Number.isFinite(d) ? (d > 0 ? "late" : d < 0 ? "early" : "ontime") : "";
      const stopStatus = Number.isFinite(d)
        ? (d > 0 ? `Departed ${Math.abs(Math.round(d))} min late.` : d < 0 ? `Departed ${Math.abs(Math.round(d))} min early.` : "On time.")
        : "Status pending.";
      const stopName = row.stationName || row.stopName || row.stationId || row.stopId || "Stop";
      return `
        <div class="stop-row">
          <div class="stop-time-col">
            <span class="stop-time stop-time--scheduled">${formatServiceTime(row.scheduled || "")}</span>
            <span class="stop-time stop-time--actual">${formatServiceTime(row.actual || row.scheduled || "")}</span>
          </div>
          <div class="stop-main">
            <span class="stop-name">${stopName}</span>
            <span class="${trackClass}">${platformLabel} ${platform}${trackSuffix}</span>
            <span class="stop-status-text">${stopStatus}</span>
          </div>
          <span class="stop-eta ${cls}">${eta}</span>
        </div>
      `;
    })
    .join("");
}

function bearingDegrees(fromLat, fromLon, toLat, toLon) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(toLon - fromLon)) * Math.cos(toRad(toLat));
  const x = Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat))
    - Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(toRad(toLon - fromLon));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function normalizeHeadingDegrees(train) {
  const raw = Number(train?.headingDegrees);
  if (Number.isFinite(raw)) return ((raw % 360) + 360) % 360;
  const fromHeading = compassToDegrees(train?.heading);
  if (Number.isFinite(fromHeading)) return ((fromHeading % 360) + 360) % 360;
  return null;
}

function getUpcomingFreightYards(train, limit = 6) {
  const trainLat = Number(train?.lat);
  const trainLon = Number(train?.lon);
  if (!Number.isFinite(trainLat) || !Number.isFinite(trainLon)) return [];

  const heading = normalizeHeadingDegrees(train);
  const speed = Number(train?.speed);
  const ownerCode = `${train?.ownerCode || normalizeRailroadMarkerCode(train?.railroad || train?.agency || "") || ""}`.trim().toUpperCase();
  const subdivisionNeedle = normalizeRouteName(train?.subdivision || train?.routeName || train?.route || "");

  const yards = (Array.isArray(state.stations) ? state.stations : [])
    .filter((station) => `${station?.source || ""}`.toLowerCase() === "freight_yard")
    .filter((station) => {
      if (!ownerCode) return true;
      return `${station?.ownerCode || ""}`.trim().toUpperCase() === ownerCode;
    })
    .map((station) => {
      const lat = Number(station?.lat);
      const lon = Number(station?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const distance = haversineMiles({ lat: trainLat, lon: trainLon }, { lat, lon });
      const bearing = bearingDegrees(trainLat, trainLon, lat, lon);
      const angleDelta = Number.isFinite(heading)
        ? Math.min(Math.abs(bearing - heading), 360 - Math.abs(bearing - heading))
        : null;
      const ahead = angleDelta == null ? true : angleDelta <= 95;
      const subtitle = `${station?.subtitle || ""}`.toLowerCase();
      const lineMatch = subdivisionNeedle ? normalizeRouteName(subtitle).includes(subdivisionNeedle) : false;
      const etaMinutes = Number.isFinite(speed) && speed > 0 ? Math.round((distance / speed) * 60) : null;
      return {
        stationName: station?.name || "Freight Yard",
        platform: station?.ownerCode || "",
        scheduled: station?.subtitle || "",
        etaMinutes,
        score: (lineMatch ? 1000 : 0) + (ahead ? 300 : 0) - (distance * 10),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return yards;
}

function normalizeSpecToken(value) {
  return `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpecModelCanonical(value) {
  return normalizeSpecToken(value).replace(/\s+/g, "");
}

async function loadLocomotiveSpecsCatalog() {
  if (state.locomotiveSpecsLoaded) return state.locomotiveSpecsCatalog;
  try {
    const response = await fetch("data/locomotive-specs.json", { cache: "no-store" });
    const payload = response.ok ? await response.json() : { entries: [] };
    state.locomotiveSpecsCatalog = Array.isArray(payload?.entries) ? payload.entries : [];
  } catch {
    state.locomotiveSpecsCatalog = [];
  }
  state.locomotiveSpecsLoaded = true;
  return state.locomotiveSpecsCatalog;
}

function scoreLocomotiveSpecMatch(train, entry) {
  const model = normalizeSpecToken(train?.model);
  const modelCanonical = normalizeSpecModelCanonical(train?.model);
  const owner = normalizeSpecToken(train?.ownerCode || train?.railroad || train?.agency);
  const trainText = normalizeSpecToken(train?.trainNumber || train?.name || train?.id);
  const entryModel = normalizeSpecToken(entry?.model);
  const entryModelCanonical = normalizeSpecModelCanonical(entry?.model);
  const aliases = Array.isArray(entry?.aliases) ? entry.aliases.map(normalizeSpecToken).filter(Boolean) : [];
  const aliasCanonicals = aliases.map((alias) => normalizeSpecModelCanonical(alias));
  const builder = normalizeSpecToken(entry?.builder);
  const hints = Array.isArray(entry?.operatorHints) ? entry.operatorHints.map(normalizeSpecToken) : [];

  let score = 0;
  if (modelCanonical && entryModelCanonical) {
    if (modelCanonical === entryModelCanonical) score += 140;
    else if (aliasCanonicals.includes(modelCanonical)) score += 130;
    else if (
      modelCanonical.includes(entryModelCanonical)
      || entryModelCanonical.includes(modelCanonical)
      || aliasCanonicals.some((alias) => alias && (modelCanonical.includes(alias) || alias.includes(modelCanonical)))
    ) {
      score += 95;
    }
  }
  if (owner && hints.some((hint) => hint && (owner.includes(hint) || hint.includes(owner)))) score += 35;
  if (trainText && (trainText.includes(entryModel) || aliases.some((alias) => alias && trainText.includes(alias)))) score += 25;
  if (builder && model && model.includes(builder)) score += 8;
  return score;
}

function renderLocomotiveSpecsList(entries, title = "Locomotive Specs Database") {
  if (!elements.locoSpecsList) return;
  if (elements.locoSpecsTitle) elements.locoSpecsTitle.textContent = title;

  if (!Array.isArray(entries) || entries.length === 0) {
    elements.locoSpecsList.innerHTML = `<p class="empty-state">No matching locomotive specs found.</p>`;
    return;
  }

  elements.locoSpecsList.innerHTML = entries
    .map((entry) => {
      const hp = Number.isFinite(Number(entry?.powerHp)) ? `${Math.round(Number(entry.powerHp))} hp` : "--";
      const hints = Array.isArray(entry?.operatorHints) ? entry.operatorHints.slice(0, 6).join(" • ") : "";
      const primary = Array.isArray(entry?.primaryOperators) ? entry.primaryOperators.slice(0, 4).join(" • ") : "";
      const referenceImage = `${entry?.referenceImage || ""}`.trim();
      return `
        <article class="credits-entry">
          <div class="credits-entry-head">
            <span class="credits-entry-title">${escapeHtml(entry?.model || "Unknown Model")}</span>
            <span class="credits-entry-meta">${escapeHtml(entry?.builder || "Unknown Builder")}</span>
          </div>
          ${referenceImage ? `
            <div class="spec-reference-wrap">
              <img class="spec-reference-image" src="${escapeHtml(referenceImage)}" alt="${escapeHtml(entry?.model || "Locomotive model")} reference image" loading="lazy" referrerpolicy="no-referrer" />
              <p class="credits-entry-note">This is a reference image.</p>
            </div>
          ` : ""}
          <p class="credits-entry-copy">Type: ${escapeHtml(entry?.type || "--")} • Power: ${escapeHtml(hp)}</p>
          ${primary ? `<p class="credits-entry-copy">Primarily used by: ${escapeHtml(primary)}</p>` : ""}
          ${hints ? `<p class="credits-entry-copy">Operators: ${escapeHtml(hints)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function filterLocomotiveSpecs(entries, query) {
  const q = normalizeSpecToken(query);
  if (!q) return entries;
  return (entries || []).filter((entry) => {
    const parts = [
      entry?.model,
      entry?.builder,
      entry?.type,
      ...(Array.isArray(entry?.aliases) ? entry.aliases : []),
      ...(Array.isArray(entry?.primaryOperators) ? entry.primaryOperators : []),
      ...(Array.isArray(entry?.operatorHints) ? entry.operatorHints : []),
    ].map(normalizeSpecToken);
    return parts.some((part) => part.includes(q));
  });
}

async function openLocomotiveSpecs(train) {
  const catalog = await loadLocomotiveSpecsCatalog();
  const model = normalizeSpecToken(train?.model);
  if (!model) {
    renderLocomotiveSpecsList([], "No model provided");
    if (elements.locoSpecsList) {
      elements.locoSpecsList.innerHTML = `<p class="empty-state">Add a locomotive model in the freight upload form (ex: SD70ACe) to view model-specific specs.</p>`;
    }
    if (elements.locoSpecsSearch) elements.locoSpecsSearch.value = "";
    elements.locoSpecsModal?.classList.add("active");
    return;
  }

  const scored = (catalog || [])
    .map((entry) => ({ entry, score: scoreLocomotiveSpecMatch(train, entry) }))
    .sort((a, b) => b.score - a.score);

  const matches = scored.filter((row) => row.score >= 70).map((row) => row.entry);
  const displayEntries = matches.slice(0, 20);

  renderLocomotiveSpecsList(displayEntries, `${train?.model || "Model"} Specs`);
  if (displayEntries.length === 0 && elements.locoSpecsList) {
    elements.locoSpecsList.innerHTML = `<p class="empty-state">No database specs found for model: ${escapeHtml(train?.model || "Unknown")}</p>`;
  }
  if (elements.locoSpecsSearch) elements.locoSpecsSearch.value = "";
  elements.locoSpecsModal?.classList.add("active");
}

function openServiceAlertModal(train) {
  if (!train || !elements.serviceAlertPanel || !elements.serviceAlertModal) return;
  elements.serviceAlertPanel.innerHTML = buildServiceAlertModalHtml(train);
  elements.serviceAlertModal.classList.add("active");
}

function openFaresPanel(train, rootElement = elements.trainDetail) {
  const detailRoot = rootElement || elements.trainDetail;
  const stopsTitle = detailRoot?.querySelector(".detail-primary-section .stops-title");
  const stopsPanel = detailRoot?.querySelector("#train-stops-panel");
  if (!stopsTitle || !stopsPanel) return;

  state.faresPanelActive = true;
  const originalTitle = stopsTitle.textContent;
  const originalContent = stopsPanel.innerHTML;

  stopsTitle.innerHTML = `<button class="btn-back-link" id="btn-fare-back">← Back</button> Fares & Pricing`;
  stopsPanel.innerHTML = `<div class="stops-loading"><span class="mini-spinner"></span><span>Fetching current fares…</span></div>`;

  const source = encodeURIComponent(train.source || "");
  const id = encodeURIComponent(train.id || "");
  const route = encodeURIComponent(train.route || train.routeName || "");
  const name = encodeURIComponent(train.name || "");

  fetch(apiUrl(`/api/fares/${source}/${id}?route=${route}&name=${name}`))
    .then(r => r.json())
    .then(payload => {
      const fares = Array.isArray(payload?.fares) ? payload.fares : [];
      let html = `<div class="fares-container">`;
      if (fares.length === 0) {
        html += `<p class="empty-state">No fare information found for this agency.</p>`;
      } else {
        html += fares.map(fare => `
          <div class="fare-row">
            <div class="fare-info">
              <span class="fare-type">${escapeHtml(fare.type)}</span>
              <span class="fare-note">Adult Standard</span>
            </div>
            <div class="fare-right">
              <div class="fare-price">
                <span class="fare-currency">${escapeHtml(fare.currency)}</span>
                <span class="fare-amount">${escapeHtml(fare.price)}</span>
              </div>
            </div>
          </div>
        `).join("");
      }
      html += `</div>`;
      html += `<div class="fare-disclaimer">Prices are estimates and may vary by zone or booking class. Verify on official operator website.</div>`;
      stopsPanel.innerHTML = html;
    })
    .catch(() => {
      stopsPanel.innerHTML = `<p class="empty-state">Failed to load fares.</p>`;
    })
    .finally(() => {
      detailRoot?.querySelector("#btn-fare-back")?.addEventListener("click", () => {
        state.faresPanelActive = false;
        stopsTitle.textContent = originalTitle;
        stopsPanel.innerHTML = originalContent;
      });
    });
}

function isDetailSheetMobileLayout() {
  return window.matchMedia?.("(max-width: 768px)")?.matches || window.innerWidth <= 768;
}

function setDetailSheetState(nextState = "peek") {
  if (!elements.detailModal) return;
  const normalized = isDetailSheetMobileLayout()
    ? (nextState === "expanded" ? "expanded" : "peek")
    : "expanded";
  state.detailSheetState = normalized;
  elements.detailModal.dataset.sheetState = normalized;
}

function syncDetailPanelLayout() {
  if (!elements.detailModal) return;
  const isMobileLayout = isDetailSheetMobileLayout();
  elements.detailModal.classList.toggle("detail-modal--mobile-sheet", isMobileLayout);
  elements.detailModal.classList.toggle("detail-modal--desktop-drawer", !isMobileLayout);
  if (isMobileLayout) {
    setSidebarTrainDetailOpen(false);
    if (!elements.detailModal.dataset.sheetState) {
      setDetailSheetState("peek");
    }
  } else {
    setDetailSheetState("expanded");
  }
}

function openDetailPanel(options = {}) {
  const { expanded = false } = options;
  if (!elements.detailModal) return;
  syncDetailPanelLayout();
  setDetailSheetState(expanded ? "expanded" : "peek");
  elements.detailModal.classList.add("active");
}

function closeDetailPanel() {
  if (!elements.detailModal) return;
  elements.detailModal.classList.remove("active");
  state.detailLastSignature = "";
  state.followSelectedTrainOnMap = false;
  state.detailSheetTouchStartY = null;
  state.detailSheetTouchLastY = null;
  state.detailSheetSwipeEligible = false;
}

function setSidebarTrainDetailOpen(open) {
  const shouldOpen = Boolean(open);
  elements.sidebarTrainDetailWrap?.toggleAttribute("hidden", !shouldOpen);
  elements.sidebarTrainDetailWrap?.classList.toggle("active", shouldOpen);
  elements.list?.classList.toggle("sidebar-list-hidden", shouldOpen);
  if (elements.closeSidebarTrainDetail) {
    elements.closeSidebarTrainDetail.style.display = shouldOpen ? "inline-flex" : "none";
  }
}

function clearSelectedTrainDetail() {
  state.selectedTrain = null;
  state.followSelectedTrainOnMap = false;
  state.selectedTrainFollowLastMs = 0;
  state.detailLastSignature = "";
  state.trainPopup?.remove?.();
  state.trainPopup = null;
  closeDetailPanel();
  setSidebarTrainDetailOpen(false);
  if (elements.sidebarTrainDetail) {
    elements.sidebarTrainDetail.innerHTML = "";
  }
}

function selectTrain(train) {
  state.photoSelectionToken += 1;
  const token = state.photoSelectionToken;
  state.trainPopup?.remove();
  state.trainPopup = null;
  state.followSelectedTrainOnMap = false;
  state.selectedTrainFollowLastMs = 0;
  state.selectedTrain = train;
  state.detailLastSyncAt = Date.now();
  state.detailLastSignature = [
    `${train?.source || ""}`,
    `${train?.id || ""}`,
    `${train?.nextStop || ""}`,
    `${train?.route || ""}`,
    `${normalizeStatus(train?.status)}`,
    `${resolveDelayMinutes(train?.delayMinutes, train?.status) ?? ""}`,
    `${Number.isFinite(Number(train?.speed)) ? Math.round((Number(train.speed) || 0) / 5) : ""}`,
    `${train?.actual || ""}`,
    `${train?.eta || ""}`,
    `${train?.scheduled || ""}`,
    `${Boolean(train?.realTime) ? 1 : 0}`,
  ].join("|");
  const trainStopsCacheKey = getTrainStopsCacheKey(train);
  const cachedStops = state.trainStopsCache.get(trainStopsCacheKey);
  const fallbackStops = Array.isArray(train.upcomingStops) && train.upcomingStops.length > 0
    ? train.upcomingStops
    : null;
  const isFreightCommunity = `${train?.source || ""}`.trim().toLowerCase() === "freight-community";
  const fallbackYards = isFreightCommunity ? getUpcomingFreightYards(train) : null;
  const statusBadge = `<span class="badge ${delayClass(train.delayMinutes, train.status)}">${delayLabel(train.delayMinutes, train.status)}</span>`;
  const alertText = getServiceAlertText(train);
  const hasAlert = Boolean(alertText);
  const alertEntries = collectServiceAlertEntries(train);
  const alertCount = alertEntries.length;
  const alertSeverity = getServiceAlertSeverity(train, alertEntries);
  const alertSeverityLabel = getServiceAlertSeverityLabel(alertSeverity);
  const primaryAlertEntry = alertEntries[0] || null;
  const primaryAlertMeta = primaryAlertEntry ? formatAlertSeenMeta(primaryAlertEntry, train) : "";
  const speedInfo = getTrainSpeedDisplayInfo(train);
  const speedTagText = speedInfo.isPredicted
    ? `${speedInfo.text} • Move`
    : speedInfo.text;
  const routeLabel = getRouteDisplayLabel(train);
  const useSidebarDetail = !isDetailSheetMobileLayout() && Boolean(elements.sidebarTrainDetail);
  const detailRoot = useSidebarDetail ? elements.sidebarTrainDetail : elements.trainDetail;
  const previewStops = Array.isArray(cachedStops?.stops) && cachedStops.stops.length > 0
    ? cachedStops.stops
    : Array.isArray(fallbackStops) && fallbackStops.length > 0
      ? fallbackStops
      : [];
  const routeStart = previewStops[0]?.stationName || previewStops[0]?.stopName || "";
  const routeEnd = previewStops.length > 1
    ? (previewStops[previewStops.length - 1]?.stationName || previewStops[previewStops.length - 1]?.stopName || "")
    : "";
  const locationText =
    train.lat != null && train.lon != null
      ? `${train.lat.toFixed(4)}, ${train.lon.toFixed(4)}`
      : "--";
  detailRoot.innerHTML = `
    <div class="detail-head">
      <div class="detail-brand detail-brand--stack">
        <div class="detail-brand-copy">
          <h3>${train.name}</h3>
          <p class="detail-brand-meta">${sources[train.source]?.label || train.source} • ${routeLabel}</p>
          ${routeStart || routeEnd ? `<p class="detail-endpoint-line">${escapeHtml(routeStart || "--")} <span>»</span> ${escapeHtml(routeEnd || "--")}</p>` : ""}
        </div>
        <div class="detail-tags detail-tags--header">
          ${statusBadge}
          <span class="badge badge-speed">Speed ${escapeHtml(speedTagText)}</span>
          <span class="status-indicator ${train.realTime ? "live" : "scheduled"}">${formatStatusLabel(
      train
    )}</span>
        </div>
      </div>
    </div>
    ${hasAlert ? `
      <section class="train-card-alert train-card-alert--${alertSeverity}">
        <span class="train-card-alert-kicker">${escapeHtml(alertSeverityLabel)} Alert${alertCount > 1 ? ` • ${alertCount} reports` : ""}</span>
        <span class="train-card-alert-text">${escapeHtml(alertText)}</span>
        ${primaryAlertMeta ? `<span class="train-card-alert-meta">${escapeHtml(primaryAlertMeta)}</span>` : ""}
      </section>
    ` : ""}
    <section class="detail-primary-section">
      <div class="stops-title">${isFreightCommunity ? "Upcoming Yards" : "Upcoming Stops"}</div>
      <div id="train-stops-panel" class="train-stops-panel">
        ${cachedStops
      ? renderTrainStopsPanelMarkup(cachedStops.stops)
      : fallbackYards && fallbackYards.length > 0
        ? renderTrainStopsPanelMarkup(fallbackYards)
      : fallbackStops
        ? renderTrainStopsPanelMarkup(fallbackStops)
        : `<div class="stops-loading"><span class="mini-spinner"></span><span>${isFreightCommunity ? "Loading nearby yards…" : "Loading upcoming stops…"}</span></div>`}
      </div>
    </section>
    <p class="detail-sync-note">Updated ${formatUpdatedTimestamp(train.lastUpdated)}</p>
    ${state.uiSettings?.predictedMovementVisible && isPredictiveMovementEligibleTrain(train) ? `
      <div class="detail-actions-row detail-actions-row--primary">
        <button id="btn-track-train" class="btn-secondary ${isTrainCurrentlyTracked(train) ? "active" : ""}">${isTrainCurrentlyTracked(train) ? "Tracking" : "Track"}</button>
      </div>
    ` : ""}
    <details class="technical-info-panel">
      <summary>More Details</summary>
      <div class="detail-grid technical-info-grid">
        <div><span>ID</span><strong>${train.id}</strong></div>
        <div><span>Heading</span><strong>${train.heading ?? "--"}</strong></div>
        <div><span>Scheduled</span><strong>${formatServiceTime(train.scheduled || "")}</strong></div>
        <div><span>Location</span><strong>${locationText}</strong></div>
        <div><span>Source</span><strong>${sources[train.source]?.label || train.source || "--"}</strong></div>
        <div><span>Realtime</span><strong>${train.realTime ? "Live" : "Scheduled"}</strong></div>
      </div>
    </details>
  `;
  const stopsPanel = detailRoot.querySelector("#train-stops-panel");
  const source = encodeURIComponent(train.source || "");
  const id = encodeURIComponent(train.id || "");
  const shouldRefreshStops = !isFreightCommunity && (!cachedStops || (Date.now() - cachedStops.fetchedAt) > 30_000);
  if (shouldRefreshStops) {
    fetch(apiUrl(`/api/train-stops/${source}/${id}`))
      .then((response) => {
        if (!response.ok) throw new Error("Stops unavailable");
        return response.json();
      })
      .then((payload) => {
        if (token !== state.photoSelectionToken || !stopsPanel) return;
        const stops = Array.isArray(payload?.stops) ? payload.stops : [];
        if (stops.length > 0) {
          state.trainStopsCache.set(trainStopsCacheKey, { fetchedAt: Date.now(), stops });
          stopsPanel.innerHTML = renderTrainStopsPanelMarkup(stops);
        } else if (fallbackStops) {
          stopsPanel.innerHTML = renderTrainStopsPanelMarkup(fallbackStops);
        } else {
          state.trainStopsCache.set(trainStopsCacheKey, { fetchedAt: Date.now(), stops });
          stopsPanel.innerHTML = renderTrainStopsPanelMarkup(stops);
        }
      })
      .catch(() => {
        if (token !== state.photoSelectionToken || !stopsPanel) return;
        if (cachedStops) {
          stopsPanel.innerHTML = renderTrainStopsPanelMarkup(cachedStops.stops);
          return;
        }
        if (fallbackYards) {
          stopsPanel.innerHTML = renderTrainStopsPanelMarkup(fallbackYards);
          return;
        }
        if (fallbackStops) {
          stopsPanel.innerHTML = renderTrainStopsPanelMarkup(fallbackStops);
          return;
        }
        stopsPanel.innerHTML = `<p class="empty-state">Unable to load upcoming stops right now.</p>`;
      });
  }

  detailRoot.querySelector("#btn-view-specs")?.addEventListener("click", () => {
    openLocomotiveSpecs(train);
  });
  detailRoot.querySelector("#btn-track-train")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const nextTracked = !isTrainCurrentlyTracked(train);
    const enabled = setTrainTracking(train, nextTracked);
    if (enabled) {
      button.classList.add("active");
      button.textContent = "Tracking";
    } else {
      button.classList.remove("active");
      button.textContent = "Track";
    }
  });

  // Future Connections button
  detailRoot.querySelector("#btn-future-connections")?.addEventListener("click", () => {
    const panel = document.createElement("div");
    panel.className = "train-future-connections-panel";
    panel.innerHTML = `
      <div class="future-connections-title">Future Connections (Upcoming Lines)</div>
      <div class="future-connections-list">
        <div class="future-connection-item">
          <span class="fc-name">California High-Speed Rail</span>
          <span class="fc-status">Under Construction</span>
          <span class="fc-route">San Francisco → Los Angeles → San Diego</span>
        </div>
        <div class="future-connection-item">
          <span class="fc-name">OKC RTA Streetcar</span>
          <span class="fc-status">Planned</span>
          <span class="fc-route">Oklahoma City Downtown Loop</span>
        </div>
        <div class="future-connection-item">
          <span class="fc-name">Brightline Texas</span>
          <span class="fc-status">Under Construction</span>
          <span class="fc-route">Dallas → Fort Worth → San Antonio</span>
        </div>
        <div class="future-connection-item">
          <span class="fc-name">Texas Central</span>
          <span class="fc-status">Planned</span>
          <span class="fc-route">Dallas → Houston</span>
        </div>
        <div class="future-connection-item">
          <span class="fc-name">HARTA T-REX</span>
          <span class="fc-status">Planned</span>
          <span class="fc-route">Austin → San Antonio</span>
        </div>
        <div class="future-connection-item">
          <span class="fc-name">Florida Gulf Coast</span>
          <span class="fc-status">Planned</span>
          <span class="fc-route">Tampa → Orlando → Jacksonville</span>
        </div>
        <div class="future-connection-item">
          <span class="fc-name">Seattle-Tacoma Streetcar</span>
          <span class="fc-status">Under Construction</span>
          <span class="fc-route">Seattle → Tacoma → Puyallup</span>
        </div>
        <div class="future-connection-item">
          <span class="fc-name">Los Angeles Metro Rail Extensions</span>
          <span class="fc-status">Under Construction</span>
          <span class="fc-route">Crenshaw → Westside → Westwood</span>
        </div>
        <div class="future-connection-item">
          <span class="fc-name">Chicago Hub Network</span>
          <span class="fc-status">Planned</span>
          <span class="fc-route">Multiple high-speed corridors</span>
        </div>
        <div class="future-connection-item">
          <span class="fc-name">Nevada Rail</span>
          <span class="fc-status">Planned</span>
          <span class="fc-route">Las Vegas → Los Angeles</span>
        </div>
      </div>
    `;

    // Add to train detail modal
    const existingPanel = detailRoot.querySelector(".train-future-connections-panel");
    if (existingPanel) existingPanel.remove();
    detailRoot.appendChild(panel);

    // Auto-scroll to panel
    setTimeout(() => {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  });
  elements.board.style.display = "none";
  if (useSidebarDetail) {
    closeDetailPanel();
    setSidebarTrainDetailOpen(true);
    elements.trainDetail.style.display = "none";
  } else {
    setSidebarTrainDetailOpen(false);
    openDetailPanel();
    elements.trainDetail.style.display = "block";
  }
}

function deriveStationArrivalsFromLive(station) {
  const needle = `${station?.name || ""}`.trim().toLowerCase();
  const stationIdNeedle = normalizeStationStopId(station?.id || "");
  const sourceNeedle = `${station?.source || ""}`.trim().toLowerCase();
  if (!needle && !stationIdNeedle) return [];

  const normalizeStationName = (value) => `${value || ""}`.trim().toLowerCase();

  return getAllTrains()
    .map((train) => {
      if (sourceNeedle && `${train.source || ""}`.trim().toLowerCase() !== sourceNeedle) return null;
      const upcoming = Array.isArray(train.upcomingStops) ? train.upcomingStops : [];
      const matchedUpcoming = upcoming.find((stop) => {
        const stopId = normalizeStationStopId(stop?.stopId || stop?.id || "");
        const stopName = normalizeStationName(stop?.stopName || stop?.name || stop?.stationName || "");
        return (stationIdNeedle && stopId === stationIdNeedle) || (needle && stopName === needle);
      });
      if (!matchedUpcoming) return null;
      const scheduledArrival = matchedUpcoming.scheduledArrival || matchedUpcoming.arrivalScheduled || matchedUpcoming.arrival || "";
      const scheduledDeparture = matchedUpcoming.scheduledDeparture || matchedUpcoming.departureScheduled || matchedUpcoming.departure || "";
      const actualArrival = matchedUpcoming.actualArrival || matchedUpcoming.arrivalActual || matchedUpcoming.actual || "";
      const actualDeparture = matchedUpcoming.actualDeparture || matchedUpcoming.departureActual || matchedUpcoming.actual || "";
      if (!scheduledArrival && !scheduledDeparture && !actualArrival && !actualDeparture) return null;

      return {
        trainId: formatMarkerLabel(train),
        route: train.route || train.name || "--",
        scheduled: scheduledArrival || scheduledDeparture || "--",
        actual: actualArrival || actualDeparture || "",
        scheduledArrival: scheduledArrival || "--",
        scheduledDeparture: scheduledDeparture || "--",
        actualArrival: actualArrival || "",
        actualDeparture: actualDeparture || "",
        status: train.status || "en-route",
        source: train.source,
        delayMinutes: Number.isFinite(Number(train.delayMinutes)) ? Number(train.delayMinutes) : (matchedUpcoming?.delayMinutes ?? null),
        _rank: Number.isFinite(Number(resolveDelayMinutes(train.delayMinutes, train.status)))
          ? Number(resolveDelayMinutes(train.delayMinutes, train.status))
          : 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTs = Date.parse(a.actual || a.scheduled || "");
      const bTs = Date.parse(b.actual || b.scheduled || "");
      if (Number.isFinite(aTs) && Number.isFinite(bTs)) return aTs - bTs;
      return Number(a._rank || 0) - Number(b._rank || 0);
    })
    .slice(0, 40);
}

function resolveStationArrivalDelayMinutes(row = {}) {
  if (Number.isFinite(Number(row.delayMinutes))) return Math.round(Number(row.delayMinutes));
  const actualMs = Date.parse(`${row.actualArrival || row.actualDeparture || row.actual || ""}`);
  const scheduledMs = Date.parse(`${row.scheduledArrival || row.scheduledDeparture || row.scheduled || ""}`);
  if (Number.isFinite(actualMs) && Number.isFinite(scheduledMs)) {
    return Math.round((actualMs - scheduledMs) / 60000);
  }
  const status = `${row.status || ""}`.toLowerCase();
  if (status.includes("late") || status.includes("delay")) {
    const digits = status.match(/(-?\d{1,3})/);
    if (digits) return Math.abs(Number(digits[1]));
    return 5;
  }
  if (status.includes("early")) {
    const digits = status.match(/(-?\d{1,3})/);
    if (digits) return -Math.abs(Number(digits[1]));
    return -2;
  }
  return 0;
}

function getStationArrivalTone(row = {}) {
  const status = `${row.status || ""}`.toLowerCase();
  const delay = resolveStationArrivalDelayMinutes(row);
  if (status.includes("cancel")) return "canceled";
  if (delay >= 6 || status.includes("late") || status.includes("delay")) return "late";
  if (delay <= -2 || status.includes("early")) return "early";
  return "on-time";
}

function formatStationArrivalStatus(row = {}) {
  const tone = getStationArrivalTone(row);
  const delay = resolveStationArrivalDelayMinutes(row);
  if (tone === "canceled") return "Canceled";
  if (tone === "late") return `Late ${Math.max(1, Math.abs(delay))}m`;
  if (tone === "early") return `Early ${Math.max(1, Math.abs(delay))}m`;
  const status = `${row.status || ""}`.trim();
  if (/arriv|board|depart|approach/i.test(status)) return status;
  return "On time";
}

function getStationArrivalDisplayTime(row = {}) {
  return row.actualArrival || row.scheduledArrival || row.actual || row.scheduled || "";
}

function getStationDepartureDisplayTime(row = {}) {
  return row.actualDeparture || row.scheduledDeparture || row.actual || row.scheduled || "";
}

function getStationPrimarySortTime(row = {}) {
  return getStationArrivalDisplayTime(row) || getStationDepartureDisplayTime(row) || "";
}

function getStationTownState(station = {}, payloadStation = null) {
  const source = payloadStation || {};
  const town = station.city || station.town || station.municipality || source.city || source.town || source.municipality || "";
  const region = station.state || station.stateCode || station.province || station.region || source.state || source.stateCode || source.province || source.region || "";
  return [town, region].filter(Boolean).join(", ");
}

async function selectStation(station) {
  state.followSelectedTrainOnMap = false;
  state.selectedTrain = null;
  state.detailLastSignature = "";
  state.selectedStation = station;
  const useSidebarDetail = !isDetailSheetMobileLayout() && Boolean(elements.sidebarTrainDetail);
  const detailRoot = useSidebarDetail ? elements.sidebarTrainDetail : elements.board;
  if (elements.sidebarTrainDetail && !useSidebarDetail) {
    elements.sidebarTrainDetail.innerHTML = "";
  }
  let payload = { station: null, arrivals: [] };
  try {
    const lookupUrl = new URL(apiUrl(`/api/stations/${encodeURIComponent(station.id)}`), window.location.origin);
    if (station?.source) lookupUrl.searchParams.set("source", station.source);
    const response = await fetch(lookupUrl.toString());
    payload = await response.json();
  } catch {
    payload = { station: null, arrivals: [] };
  }
  const stationSource = payload.station?.source || station.source;
  const stationTownState = getStationTownState(station, payload.station);
  const stationSourceLabel = sources[stationSource]?.label || stationSource || "Rail";

  const header = `
    <div class="detail-head">
      <div class="detail-brand">
        <div>
          <h3>${escapeHtml(station.name || payload.station?.name || station.id || "Station")}</h3>
          <p>${escapeHtml([stationTownState, stationSourceLabel].filter(Boolean).join(" • "))}</p>
        </div>
      </div>
    </div>
  `;
  const apiArrivals = Array.isArray(payload.arrivals)
    ? payload.arrivals.filter((row) => row && (getStationArrivalDisplayTime(row) || getStationDepartureDisplayTime(row)))
    : [];
  const liveFallback = deriveStationArrivalsFromLive(station);
  const mergedArrivals = [...apiArrivals, ...liveFallback]
    .filter((row) => row && (row.trainId || row.route))
    .reduce((acc, row) => {
      const key = `${row.trainId || ""}|${row.route || ""}|${row.scheduledArrival || row.scheduled || ""}|${row.scheduledDeparture || ""}`;
      if (!acc.some((x) => `${x.trainId || ""}|${x.route || ""}|${x.scheduledArrival || x.scheduled || ""}|${x.scheduledDeparture || ""}` === key)) {
        acc.push(row);
      }
      return acc;
    }, [])
    .sort((a, b) => {
      const aTs = Date.parse(`${getStationPrimarySortTime(a)}`);
      const bTs = Date.parse(`${getStationPrimarySortTime(b)}`);
      if (Number.isFinite(aTs) && Number.isFinite(bTs)) return aTs - bTs;
      return Number(resolveStationArrivalDelayMinutes(a)) - Number(resolveStationArrivalDelayMinutes(b));
    })
    .slice(0, 40);

  if (mergedArrivals.length === 0) {
    detailRoot.innerHTML = `${header}<p class="empty-state">No upcoming arrivals.</p>`;
    elements.trainDetail.style.display = "none";
    if (useSidebarDetail) {
      elements.board.style.display = "none";
      closeDetailPanel();
      setSidebarTrainDetailOpen(true);
    } else {
      setSidebarTrainDetailOpen(false);
      elements.board.style.display = "block";
      openDetailPanel();
    }
    return;
  }

  // Group arrivals by operator source
  const groupedBySource = mergedArrivals.reduce((acc, row) => {
    const src = row.source || "unknown";
    if (!acc[src]) acc[src] = [];
    acc[src].push(row);
    return acc;
  }, {});

  // Sort sources for consistent display: Amtrak first, then commuter rail, then freight/other
  const sourceOrder = ["amtrak", "metra", "acealtitude", "caltrain", "dart", "coaster", "sprinter", "brightline", "freight-community"];
  const sortedSources = Object.keys(groupedBySource).sort((a, b) => {
    const aIdx = sourceOrder.indexOf(a);
    const bIdx = sourceOrder.indexOf(b);
    return (aIdx >= 0 ? aIdx : 999) - (bIdx >= 0 ? bIdx : 999);
  });

  const sections = sortedSources
    .map((src) => {
      const label = sources[src]?.label || src;
      const rows = groupedBySource[src]
        .map((row) => {
          const tone = getStationArrivalTone(row);
          const arrivalTime = formatServiceTime(getStationArrivalDisplayTime(row));
          const departureTime = formatServiceTime(getStationDepartureDisplayTime(row));
          return `
          <div class="station-arrival-row tone-${tone}">
            <div class="station-arrival-main">
              <span class="station-arrival-id">${escapeHtml(`${row.trainId || "--"}`)}</span>
              <span class="station-arrival-route">${escapeHtml(`${row.route || "--"}`)}</span>
            </div>
            <div class="station-arrival-meta">
              <span class="station-arrival-times">
                <span class="station-arrival-time station-arrival-time--${tone}">Arr ${escapeHtml(arrivalTime || "--")}</span>
                <span class="station-arrival-time station-arrival-time--${tone}">Dep ${escapeHtml(departureTime || "--")}</span>
              </span>
              <span class="station-arrival-status station-arrival-status--${tone}">${escapeHtml(formatStationArrivalStatus(row))}</span>
            </div>
          </div>`;
        })
        .join("");
      return `
        <div class="station-arrival-section">
          <div class="station-arrival-section-header">${escapeHtml(label)}</div>
          <div class="station-arrival-rows">${rows}</div>
        </div>`;
    })
    .join("");

  detailRoot.innerHTML = `${header}<div class="station-arrivals-list">${sections}</div>`;
  elements.trainDetail.style.display = "none";
  if (useSidebarDetail) {
    elements.board.style.display = "none";
    closeDetailPanel();
    setSidebarTrainDetailOpen(true);
  } else {
    setSidebarTrainDetailOpen(false);
    elements.board.style.display = "block";
    openDetailPanel();
  }
}

function applyFilters(trains) {
  const query = elements.search.value.trim().toLowerCase();
  return trains.filter((train) => {
    const matchesSearch =
      !query ||
      `${train.name || ""}`.toLowerCase().includes(query) ||
      `${train.id || ""}`.toLowerCase().includes(query) ||
      `${sources[train.source]?.label || train.source || ""}`.toLowerCase().includes(query) ||
      `${train.route || ""}`.toLowerCase().includes(query) ||
      `${train.nextStop || ""}`.toLowerCase().includes(query);
    const sourceValue = elements.source?.value || "all";
    const statusValue = elements.status?.value || "all";
    const matchesSource = sourceValue === "all" || train.source === sourceValue;
    const matchesStatus = statusValue === "all" || train.status === statusValue;
    const matchesQuickMode =
      state.quickMode === "all"
        ? true
        : state.quickMode === "live"
          ? Boolean(train.realTime)
          : (train.delayMinutes ?? 0) > 5;
    const matchesSaved = !state.showSavedOnly || state.savedTrains.has(`${train.source}:${train.id}`);
    return matchesSearch && matchesSource && matchesStatus && matchesQuickMode && matchesSaved;
  });
}

async function safeFetchJson(url, fallback) {
  const isTrains = url === "/api/trains";
  const fetchOpts = {
    cache: "no-store",
    signal:
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(isTrains ? 120_000 : 60_000)
        : undefined,
  };
  try {
    const response = await fetch(apiUrl(url), fetchOpts);
    if (!response.ok) {
      if (response.status === 404 && url.startsWith("/api/mileposts/viewport")) {
        return { ...(fallback || {}), __missing: true };
      }
      if (response.status === 404 && url.startsWith("/api/commuter")) {
        state.commuterAvailable = false;
      }
      if (isTrains) {
        let detail = `${response.status}`;
        try {
          const body = await response.json();
          if (body?.error) detail = `${body.error} (${response.status})`;
        } catch {
          /* ignore */
        }
        state.dataLoadHint = `Train data request failed (${detail}). Check Render logs; cold starts need a long first load.`;
      }
      return fallback;
    }
    const data = await response.json();
    if (isTrains) {
      state.dataLoadHint = null;
    }
    return data;
  } catch (err) {
    if (url.startsWith("/api/commuter")) {
      state.commuterAvailable = false;
    }
    if (isTrains) {
      const name = err?.name === "TimeoutError" ? "timed out (server may be waking up — wait and tap Refresh)" : (err?.message || "network error");
      state.dataLoadHint = `Could not load trains: ${name}.`;
    }
    return fallback;
  }
}

function scheduleVisibleSignalFetch() {
  if (!state.map || !state.signalVisible) return;
  if (state.signalViewportTimer) {
    clearTimeout(state.signalViewportTimer);
  }
  state.signalViewportTimer = setTimeout(() => {
    state.signalViewportTimer = null;
    fetchVisibleSignals().catch((error) => {
      console.warn("Visible signal refresh failed:", error);
    });
  }, 180);
}

async function fetchVisibleSignals() {
  if (!state.map || !state.signalVisible) return;
  const bounds = state.map.getBounds?.();
  if (!bounds) return;
  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ].join(",");
  const payload = await safeFetchJson(`/api/signals/viewport?bbox=${encodeURIComponent(bbox)}`, { signals: [] });
  const nextSignals = Array.isArray(payload?.signals) ? payload.signals : [];
  renderSignals(nextSignals);
  applySignalVisibility();
}

// Sync indicator state
let lastSyncTime = null;
let syncStatus = "synced"; // "synced", "out-of-sync", "refreshing"

function updateSyncStatus(status) {
  syncStatus = status;
  lastSyncTime = Date.now();
  if (status === "synced") {
    updateTimestamp(); // flash the dot
  }
  // No longer set text on the pill for refreshing/out-of-sync — dot handles it
}

function hideInitialLoader() {
  if (elements.initialLoader && !elements.initialLoader.classList.contains("fade-out")) {
    if (initialLoaderTimeoutId) {
      clearTimeout(initialLoaderTimeoutId);
      initialLoaderTimeoutId = null;
    }
    elements.initialLoader.classList.add("fade-out");
    setTimeout(() => {
      if (elements.initialLoader) {
        elements.initialLoader.remove();
        elements.initialLoader = null;
      }
    }, 800);
  }
}

const INITIAL_LOADER_TIMEOUT_MS = 12000;
let initialLoaderTimeoutId = null;

function scheduleInitialLoaderFallback(message = "Data is taking longer than expected") {
  if (!elements.initialLoader) return;
  if (initialLoaderTimeoutId) clearTimeout(initialLoaderTimeoutId);
  initialLoaderTimeoutId = setTimeout(() => {
    if (!elements.initialLoader) return;
    const loaderMessage = elements.initialLoader.querySelector("p");
    const loaderSubtext = elements.initialLoader.querySelector(".loader-subtext");
    if (loaderMessage) loaderMessage.textContent = message;
    if (loaderSubtext) loaderSubtext.textContent = "Check the API or refresh if the backend is waking up.";
    hideInitialLoader();
    if (elements.lastUpdated) {
      elements.lastUpdated.textContent = "Data delayed — check backend";
      elements.lastUpdated.classList.add("updating");
    }
  }, INITIAL_LOADER_TIMEOUT_MS);
}

function renderAllRoutes() {
  renderRoutes([...(state.routes || []), ...(state.commuterRoutes || []), ...(state.freightRoutes || [])]);
  applyRouteVisibility();
}

function renderAllStations() {
  renderStations([...(state.stations || []), ...(state.commuterStations || [])]);
  applyStationVisibility();
}

function applyRoutesPayload(payload, targetKey) {
  const nextRoutes = Array.isArray(payload?.routes) ? payload.routes : [];
  if (nextRoutes.length > 0 || !Array.isArray(state[targetKey]) || state[targetKey].length === 0) {
    state[targetKey] = nextRoutes;
    safeSetLocalStorage(`ort-cached-${targetKey}`, {
      updatedAt: payload?.updatedAt || new Date().toISOString(),
      routes: nextRoutes,
    });
    renderAllRoutes();
  }
}

async function fetchRoutesPayloadWithFallback(url, fallback = { routes: [] }) {
  const first = await safeFetchJson(url, fallback);
  const firstRoutes = Array.isArray(first?.routes) ? first.routes : [];
  if (firstRoutes.length > 0) return first;

  const separator = url.includes("?") ? "&" : "?";
  const forced = await safeFetchJson(`${url}${separator}force=true`, fallback);
  const forcedRoutes = Array.isArray(forced?.routes) ? forced.routes : [];
  if (forcedRoutes.length > 0) return forced;

  // final retry for transient platform/network issues
  const retry = await safeFetchJson(url, fallback);
  return retry;
}

async function fetchWithRetry(url, fallback, retries = 1) {
  let last = fallback;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const result = await safeFetchJson(url, fallback);
    last = result;
    if (result && !result.__missing) {
      return result;
    }
  }
  return last;
}

function applyStationsPayload(payload, targetKey) {
  const nextStations = Array.isArray(payload?.stations) ? payload.stations : [];
  if (nextStations.length > 0 || !Array.isArray(state[targetKey]) || state[targetKey].length === 0) {
    state[targetKey] = nextStations;
    renderAllStations();
  }
}

function applyTrainPayload(trainsPayload, commuterPayload, freightPayload) {
  const nextTrains = Array.isArray(trainsPayload?.trains) ? trainsPayload.trains : [];
  const nextCommuterTrains = Array.isArray(commuterPayload?.trains) ? commuterPayload.trains : [];
  const hasFreightPayload = freightPayload && Array.isArray(freightPayload?.trains);
  const nextFreightCommunityTrains = hasFreightPayload ? freightPayload.trains : [];

  if (nextTrains.length > 0 || state.trains.length === 0) state.trains = nextTrains;
  if (nextCommuterTrains.length > 0 || state.commuterTrains.length === 0) state.commuterTrains = nextCommuterTrains;
  if (hasFreightPayload && nextFreightCommunityTrains.length > 0) {
    state.freightCommunityTrains = nextFreightCommunityTrains;
  }

  const allTrains = getAllTrains();
  syncTrainMovementSnapshots(allTrains);
  recordAlertHistory(allTrains);
  renderTrains(applyFilters(allTrains));
  if (state.uiSettings.predictedMovementVisible) {
    applyTrainMovementMode(allTrains);
  }
  hideInitialLoader();

  if (elements.departureBoardModal?.classList.contains("active")) {
    renderDepartureBoard();
  }

  safeSetLocalStorage("ort-cached-trains", {
    updatedAt: trainsPayload?.updatedAt || new Date().toISOString(),
    trains: state.trains,
  });
  safeSetLocalStorage("ort-cached-commuter", {
    updatedAt: commuterPayload?.updatedAt || trainsPayload?.updatedAt || new Date().toISOString(),
    trains: state.commuterTrains,
  });
  if (hasFreightPayload && state.freightCommunityTrains.length > 0) {
    safeSetLocalStorage("ort-cached-freight-community", {
      updatedAt: freightPayload?.updatedAt || trainsPayload?.updatedAt || new Date().toISOString(),
      trains: state.freightCommunityTrains,
    });
    if (freightPayload?.updatedAt) {
      state.lastFreightRefreshAt = Date.now();
    }
  }

  state.lastUpdateTime =
    trainsPayload?.updatedAt ||
    commuterPayload?.updatedAt ||
    new Date().toISOString();

  return allTrains;
}

async function refreshData(options = {}) {
  const includeStatic = Boolean(options.includeStatic);
  const forceFreight = Boolean(options.forceFreight);
  const freightOnly = Boolean(options.freightOnly);
  if (state.pageHidden) return;
  if (state.backendReachable === false) {
    if (elements.lastUpdated) {
      elements.lastUpdated.textContent = "Backend unreachable — fix API URL";
      elements.lastUpdated.classList.add("updating");
    }
    return;
  }

  if (freightOnly) {
    try {
      const freightPayload = await safeFetchJson("/api/freight/trains", { trains: [], updatedAt: null });
      applyTrainPayload(
        { trains: state.trains, updatedAt: state.lastUpdateTime },
        { trains: state.commuterTrains, updatedAt: state.lastUpdateTime },
        freightPayload
      );
    } catch (error) {
      console.warn("Freight refresh error:", error);
    }
    return;
  }

  updateSyncStatus("refreshing");

  const shouldRefreshFreightCommunity =
    forceFreight
    || includeStatic
    ||
    !Array.isArray(state.freightCommunityTrains)
    || state.freightCommunityTrains.length === 0
    || (Date.now() - Number(state.lastFreightRefreshAt || 0)) >= FREIGHT_COMMUNITY_REFRESH_MS;

  try {
    const bigBoyPromise = refreshBigBoyOverlay().catch((bigBoyError) => {
      console.warn("Big Boy refresh failed:", bigBoyError);
    });

    if (includeStatic) {
      const passengerRoutesPromise = fetchRoutesPayloadWithFallback("/api/routes?passengerOnly=true", { routes: [] });
      const commuterRoutesPromise = fetchWithRetry("/api/commuter/routes", { routes: [] }, 2);
      const stationsPromise = safeFetchJson("/api/stations", { stations: [] });
      const commuterStationsPromise = safeFetchJson("/api/commuter/stations", { stations: [] });
      const trainsPromise = safeFetchJson("/api/trains", { trains: [], updatedAt: null });
      const commuterTrainsPromise = safeFetchJson("/api/commuter/trains", { trains: [], updatedAt: null });
      const freightTrainsPromise = shouldRefreshFreightCommunity
        ? safeFetchJson("/api/freight/trains", { trains: [], updatedAt: null })
        : Promise.resolve(null);
      const sightingsPromise = loadSightings().catch((sightingsError) => {
        console.warn("Sightings refresh failed:", sightingsError);
      });

      passengerRoutesPromise.then((payload) => {
        applyRoutesPayload(payload, "routes");
        hideInitialLoader();
      });
      commuterRoutesPromise.then((payload) => applyRoutesPayload(payload, "commuterRoutes"));
      stationsPromise.then((payload) => applyStationsPayload(payload, "stations"));
      commuterStationsPromise.then((payload) => applyStationsPayload(payload, "commuterStations"));

      const [trainsPayload, commuterPayload, freightPayload] = await Promise.all([
        trainsPromise,
        commuterTrainsPromise,
        freightTrainsPromise,
      ]);
      applyTrainPayload(trainsPayload, commuterPayload, freightPayload);
      applySignalVisibility();
      scheduleVisibleSignalFetch();

      await Promise.allSettled([
        passengerRoutesPromise,
        commuterRoutesPromise,
        stationsPromise,
        commuterStationsPromise,
        sightingsPromise,
        state.freightVisible && !FEATURE_OPENRAILWAYMAP_VECTOR_FREIGHT
          ? loadFreightRoutesDeferred().catch((freightError) => {
              console.warn("Freight routes refresh failed:", freightError);
            })
          : Promise.resolve(),
      ]);
      // Keep Big Boy overlay fetch non-blocking for core train/map refresh performance.
      void bigBoyPromise;
    } else {
      const [trainsPayload, commuterPayload, freightPayload] = await Promise.all([
        safeFetchJson("/api/trains", { trains: [], updatedAt: null }),
        safeFetchJson("/api/commuter/trains", { trains: [], updatedAt: null }),
        shouldRefreshFreightCommunity
          ? safeFetchJson("/api/freight/trains", { trains: [], updatedAt: null })
          : Promise.resolve(null),
      ]);
      applyTrainPayload(trainsPayload, commuterPayload, freightPayload);
      void bigBoyPromise;
    }

    updateSyncStatus("synced");
    hideInitialLoader();
  } catch (error) {
    updateSyncStatus("out-of-sync");
    console.warn("refreshData error:", error);
    renderTrains(applyFilters(getAllTrains()));
    if (state.uiSettings.predictedMovementVisible) {
      applyTrainMovementMode(getAllTrains());
    }
  }
}

async function loadFreightRoutesDeferred() {
  if (state.freightRoutesLoaded) {
    return state.freightRoutes;
  }

  if (state.freightRoutesLoadingPromise) {
    return state.freightRoutesLoadingPromise;
  }

  state.freightRoutesLoadingPromise = (async () => {
    let payload = await safeFetchJson("/api/routes?freightOnly=true", { routes: [] });
    let nextFreightRoutes = Array.isArray(payload?.routes) ? payload.routes : [];

    if (nextFreightRoutes.length === 0) {
      const now = Date.now();
      const canForceRefresh = now >= Number(state.freightRoutesForceRetryAt || 0);
      if (canForceRefresh) {
        state.freightRoutesForceRetryAt = now + (10 * 60 * 1000); // 10 min backoff
        payload = await safeFetchJson("/api/routes?freightOnly=true&force=true", { routes: [] });
        nextFreightRoutes = Array.isArray(payload?.routes) ? payload.routes : [];
      }
    }

    if (nextFreightRoutes.length > 0) {
      state.freightRoutes = nextFreightRoutes;
      state.freightRoutesLoaded = true;
      renderAllRoutes();
      return state.freightRoutes;
    }

    // Keep prior in-memory routes if available and avoid marking "loaded" on empty payload.
    state.freightRoutesLoaded = Array.isArray(state.freightRoutes) && state.freightRoutes.length > 0;
    return state.freightRoutes;
  })()
    .finally(() => {
      state.freightRoutesLoadingPromise = null;
    });

  return state.freightRoutesLoadingPromise;
}

const WS_RECONNECT_DELAY_MS = 5000;

function initWebSocket() {
  if (IS_IOS_SAFARI) return;
  if (state.pageHidden) return;
  // Clear any existing reconnect timer
  if (state.wsReconnectTimer) {
    clearTimeout(state.wsReconnectTimer);
    state.wsReconnectTimer = null;
  }
  try {
    state.webSocket?.close?.();
  } catch {
    // ignore stale socket close failures
  }
  const socket = new WebSocket(wsUrl("/ws"));
  state.webSocket = socket;

  socket.addEventListener("message", (event) => {
    if (state.pageHidden) return;
    try {
      const message = JSON.parse(event.data);
      if (message.type === "trains" || message.type === "commuter") {
        const typeKey = message.type === "trains" ? "trains" : "commuterTrains";
        const updatedAt = message.payload?.updatedAt || "";
        const count = Array.isArray(message.payload?.trains) ? message.payload.trains.length : 0;
        const signature = `${updatedAt}:${count}`;

        if (message.type === "trains" && signature === state.lastWsTrainsSignature) {
          return;
        }
        if (message.type === "commuter" && signature === state.lastWsCommuterSignature) {
          return;
        }

        if (message.type === "trains") state.lastWsTrainsSignature = signature;
        if (message.type === "commuter") state.lastWsCommuterSignature = signature;

        state[typeKey] = message.payload.trains || [];
        state.trainDataDirty = true;
        
        // Use a flag for throttled render instead of immediate heavy rendering
        state.needsTrainsRender = true;
        state.lastUpdateTime = message.payload.updatedAt || new Date().toISOString();
        
        // Fast UI updates remain (immediate timestamp/loader hiding)
        hideInitialLoader();
        updateTimestamp();

        // Cache for instant load next time
        const cacheKey = message.type === "trains" ? "ort-cached-trains" : "ort-cached-commuter";
        safeSetLocalStorage(cacheKey, {
          updatedAt: state.lastUpdateTime,
          trains: state[typeKey]
        });
        return;
      }

      if (message.type === "signals_snapshot") {
        renderSignals(Array.isArray(message.payload) ? message.payload : []);
        return;
      }

      if (message.type === "signal_update") {
        upsertSignal({
          signal_id: message.signal_id,
          aspect: message.aspect,
          last_update: message.timestamp,
          lat: message.lat,
          lon: message.lon,
          rail_line: message.rail_line,
          milepost: message.milepost,
        });
      }
    } catch (e) {
      console.warn("WS Message Parse Error:", e);
    }
  });

  // Background UI Reconciliation Loop (Throttle: 1.5Hz - 2Hz for heavy tasks)
  if (!state.uiUpdateInterval) {
    state.uiUpdateInterval = setInterval(() => {
      if (state.needsTrainsRender && !state.pageHidden && !state.isRendering) {
        state.needsTrainsRender = false;
        const allTrains = getAllTrains();
        if (state.trainDataDirty) {
          syncTrainMovementSnapshots(allTrains);
          if (state.uiSettings.predictedMovementVisible) {
            applyTrainMovementMode(allTrains);
          }
          state.trainDataDirty = false;
        }
        renderTrains(applyFilters(allTrains));
        if (elements.departureBoardModal?.classList.contains("active")) {
          renderDepartureBoard();
        }
      }
    }, state.lowTierDevice ? 2000 : (state.isMobile ? 1500 : 1000));
  }

  // Non-critical background tasks (10s interval)
  if (!state.alertHistoryInterval) {
    state.alertHistoryInterval = setInterval(() => {
      if (!state.pageHidden) {
        const allTrains = getAllTrains();
        recordAlertHistory(allTrains);
      }
    }, state.lowTierDevice ? 15000 : 10000);
  }

  const scheduleReconnect = () => {
    if (state.pageHidden) return; // don't reconnect while page is hidden
    if (state.wsReconnectTimer) return; // already scheduled
    state.wsReconnectTimer = setTimeout(() => {
      state.wsReconnectTimer = null;
      if (!state.pageHidden && state.backendReachable) {
        initWebSocket();
      }
    }, WS_RECONNECT_DELAY_MS);
  };

  socket.addEventListener("close", () => {
    if (state.webSocket === socket) {
      state.webSocket = null;
    }
    scheduleReconnect();
    // Trigger a fresh HTTP fetch after reconnect to avoid showing stale cached data
    if (!state.pageHidden) refreshData().catch(() => null);
  });

  socket.addEventListener("error", () => {
    try {
      socket.close();
    } catch {
      // ignore close failures
    }
    scheduleReconnect();
  });
}

function attachEvents() {
  if (!FEATURE_RAILCAMS_ENABLED) {
    state.railcamsVisible = false;
    closeAllRailcamWindows();
    closeRailcamChoicePopup();
    elements.railcamModal?.classList.remove("active");
    elements.railcamBetaModal?.classList.remove("active");
    if (elements.toggleRailcams) {
      elements.toggleRailcams.style.display = "none";
      elements.toggleRailcams.setAttribute("aria-hidden", "true");
    }
  }

  if (IS_IOS_SAFARI) {
    let lastTapAt = 0;
    let lastTapButton = null;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      if (!target) return;
      const now = Date.now();
      if (lastTapButton === target && now - lastTapAt < 180) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      lastTapButton = target;
      lastTapAt = now;
    }, { capture: true });
  }

  elements.toggleLandmarks?.setAttribute("data-active", String(state.landmarksVisible));

  [elements.search, elements.source, elements.status].filter(Boolean).forEach((input) => {
    input.addEventListener("input", () => renderTrains(applyFilters(getAllTrains())));
    input.addEventListener("change", () => renderTrains(applyFilters(getAllTrains())));
  });

  elements.refresh.addEventListener("click", () => {
    const now = Date.now();
    const cooldownRemainingMs = state.lastManualRefreshAt + MANUAL_REFRESH_COOLDOWN_MS - now;
    if (cooldownRemainingMs > 0) {
      if (elements.lastUpdated) {
        elements.lastUpdated.textContent = "Data is refreshed. Please try again later.";
        elements.lastUpdated.classList.remove("updating");
      }
      elements.refresh.style.opacity = "0.82";
      elements.refresh.style.transform = "scale(0.98)";
      setTimeout(() => {
        elements.refresh.style.opacity = "1";
        elements.refresh.style.transform = "scale(1)";
      }, 220);
      return;
    }

    state.lastManualRefreshAt = now;
    elements.refresh.style.opacity = "0.6";
    elements.refresh.style.transform = "scale(0.95)";
    refreshData({ includeStatic: false, forceFreight: true }).finally(() => {
      setTimeout(() => {
        elements.refresh.style.opacity = "1";
        elements.refresh.style.transform = "scale(1)";
      }, 300);
    });
  });

  const isTypingContext = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  };

  elements.historyPlaybackScrubber?.addEventListener("input", () => {
    const value = Number(elements.historyPlaybackScrubber?.value);
    if (Number.isFinite(value)) {
      setHistoryPlaybackTimestamp(value);
    }
  });

  elements.historyPlaybackToggle?.addEventListener("click", () => {
    if (state.historyPlaybackPlaying) {
      stopHistoryPlayback();
      return;
    }
    const bounds = getTrainHistoryBounds();
    if (!bounds) return;
    if (!Number.isFinite(Number(state.historyPlaybackTimestamp))) {
      state.historyPlaybackTimestamp = bounds.max;
    }
    setHistoryPlaybackPlaying(true);
  });

  elements.historyPlaybackLive?.addEventListener("click", () => {
    const bounds = getTrainHistoryBounds();
    if (!bounds) return;
    setHistoryPlaybackTimestamp(bounds.max);
  });

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat || isTypingContext(event.target)) return;
    if (!state.uiSettings.trainHistoryVisible || !getTrainHistoryBounds()) return;
    event.preventDefault();
    if (state.historyPlaybackPlaying) {
      stopHistoryPlayback();
    } else {
      if (!Number.isFinite(Number(state.historyPlaybackTimestamp))) {
        const bounds = getTrainHistoryBounds();
        if (bounds) state.historyPlaybackTimestamp = bounds.max;
      }
      setHistoryPlaybackPlaying(true);
    }
  });

  const setSearchPanelOpen = (open) => {
    elements.floatingSearch?.classList.toggle("active", open);
    elements.toggleSearch?.setAttribute("data-active", String(open));
    if (!open) {
      elements.filterPanel?.classList.remove("active");
      elements.toggleFilters?.classList.remove("active");
    }
  };

  setSearchPanelOpen(Boolean(state.uiSettings.searchOpenDefault));

  elements.toggleSearch?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !elements.floatingSearch.classList.contains("active");
    setSearchPanelOpen(open);
    if (open) elements.search?.focus();
  });

  // dq-toggle events completely removed

  elements.toggleStations?.addEventListener("click", () => {
    setStationsVisible(!state.stationsVisible);
    persistUiSettings();
  });

  elements.toggleLandmarks?.addEventListener("click", () => {
    state.landmarksVisible = !state.landmarksVisible;
    elements.toggleLandmarks.setAttribute("data-active", String(state.landmarksVisible));
    if (state.map) {
      ensureLandmarkLayers();
      renderLandmarks();
    }
  });

  elements.toggle3d?.addEventListener("click", () => {
    if (!state.map) return;
    const is3d = state.map.getPitch() > 0;
    if (is3d) {
      // Exit 3D
      state.map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
      remove3dBuildingsLayer();
      elements.toggle3d.setAttribute("data-active", "false");
    } else {
      // Enter 3D — if current style is raster, switch to vector dark style first.
      const hasVectorSource = Object.values(state.map.getStyle()?.sources || {}).some((source) => source?.type === "vector");

      const finishEnter3d = () => {
        const targetZoom = Math.max(14.8, state.map.getZoom());
        state.map.easeTo({ pitch: 60, zoom: targetZoom, duration: 700 });
        const buildingsAdded = add3dBuildingsLayer();
        elements.toggle3d.setAttribute("data-active", buildingsAdded ? "true" : "false");
      };

      if (!hasVectorSource) {
        switchMapStyle("overture");
        state.map.once("styledata", finishEnter3d);
      } else {
        finishEnter3d();
      }
    }
  });

  elements.toggleHeritage?.addEventListener("click", () => {
    setHeritageVisible(!state.showHeritage);
    persistUiSettings();
  });

  elements.toggleSpecialInterest?.addEventListener("click", () => {
    setSpecialInterestVisible(!state.showSI);
    persistUiSettings();
  });

  elements.btnUploadFind?.addEventListener("click", () => {
    openSightingModal("heritage");
  });

  elements.openSchedules?.addEventListener("click", () => {
    openSightingModal("freight");
  });

  elements.closeSightingModal?.addEventListener("click", closeSightingModal);
  elements.sightingModal?.addEventListener("click", (event) => {
    if (event.target === elements.sightingModal) closeSightingModal();
  });
  elements.sightingUseLocation?.addEventListener("click", async () => {
    if (state.locationEnabled && state.userLocation) {
      clearUserLocation();
      if (elements.sightingStatus) elements.sightingStatus.textContent = "Using typed or selected location only.";
      return;
    }
    const loc = await locateMe();
    if (!loc) {
      if (elements.sightingStatus) elements.sightingStatus.textContent = "Location unavailable.";
      return;
    }
    if (elements.sightingStatus) {
      elements.sightingStatus.textContent = `Using location ${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`;
    }
  });
  elements.sightingTakePhoto?.addEventListener("click", () => {
    if (!elements.sightingMedia) return;
    elements.sightingMedia.dataset.autoAnalyze = "1";
    elements.sightingMedia.setAttribute("accept", "image/*");
    elements.sightingMedia.setAttribute("capture", "environment");
    elements.sightingMedia.click();
  });
  elements.sightingMedia?.addEventListener("change", () => {
    if (!elements.sightingMedia) return;
    const file = elements.sightingMedia.files?.[0];
    if (!file) return;
    const shouldAutoAnalyze = elements.sightingMedia.dataset.autoAnalyze === "1";
    elements.sightingMedia.dataset.autoAnalyze = "0";
    if (!shouldAutoAnalyze || state.uploadMenuMode !== "freight") return;
    analyzeFreightPhotoAutofill().catch(() => null);
  });
  elements.sightingAnalyzePhoto?.addEventListener("click", () => {
    analyzeFreightPhotoAutofill().catch(() => null);
  });
  elements.sightingState?.addEventListener("change", () => {
    const selectedState = `${elements.sightingState?.value || ""}`.trim();
    populateSightingCities(selectedState);
  });
  document.querySelectorAll('input[name="sightingTypeRadio"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input instanceof HTMLInputElement && input.checked) {
        updateSightingFormForType(input.value);
      }
    });
  });
  elements.sightingForm?.addEventListener("submit", submitSightingUpload);

  // New UI controls
  elements.toggleFilters?.addEventListener("click", () => {
    if (!elements.floatingSearch.classList.contains("active")) {
      setSearchPanelOpen(true);
    }
    const isActive = elements.filterPanel.classList.toggle("active");
    elements.toggleFilters.classList.toggle("active", isActive);
    elements.toggleFilters.setAttribute("data-active", String(isActive));
  });

  document.addEventListener("click", (event) => {
    if (!elements.toggleSearch) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const insideSearch = elements.floatingSearch?.contains(target);
    const insideFilters = elements.filterPanel?.contains(target);
    const clickedToggle = elements.toggleSearch?.contains(target) || elements.toggleFilters?.contains(target);
    if (!insideSearch && !insideFilters && !clickedToggle && !state.uiSettings.searchOpenDefault) {
      setSearchPanelOpen(false);
    }
  });

  const setDrawerOpen = (open) => {
    if (sidebarManager) {
      if (open) {
        sidebarManager.openSidebar();
      } else {
        sidebarManager.closeSidebar();
      }
      return;
    }
    elements.floatingList?.classList.toggle("open", open);
    if (!elements.toggleList) return;
    elements.toggleList.classList.toggle("attached-open", open);
    elements.toggleList.setAttribute("aria-expanded", String(open));
    elements.toggleList.title = open ? "Close live trains" : "Open live trains";
  };

  setDrawerOpen(true);
  syncDetailPanelLayout();

  elements.toggleList?.addEventListener("click", () => {
    if (sidebarManager) return;
    const open = !elements.floatingList?.classList.contains("open");
    setDrawerOpen(open);
  });

  elements.closeModal.addEventListener("click", () => {
    closeDetailPanel();
  });

  elements.closeSidebarTrainDetail?.addEventListener("click", () => {
    clearSelectedTrainDetail();
  });

  elements.closeClusterModal?.addEventListener("click", () => {
    elements.clusterModal?.classList.remove("active");
  });

  elements.clusterTabTrains?.addEventListener("click", () => {
    elements.clusterTabTrains.classList.add("active");
    elements.clusterTabStations.classList.remove("active");
    elements.clusterPaneTrains.classList.add("active");
    elements.clusterPaneStations.classList.remove("active");
  });

  elements.clusterTabStations?.addEventListener("click", () => {
    elements.clusterTabStations.classList.add("active");
    elements.clusterTabTrains.classList.remove("active");
    elements.clusterPaneStations.classList.add("active");
    elements.clusterPaneTrains.classList.remove("active");
  });

  elements.closeMaintenanceModal?.addEventListener("click", () => {
    elements.maintenanceModal?.classList.remove("active");
  });

  elements.maintenanceModal?.addEventListener("click", (event) => {
    if (event.target === elements.maintenanceModal) {
      elements.maintenanceModal.classList.remove("active");
    }
  });

  elements.closeServiceNoticesModal?.addEventListener("click", () => {
    elements.serviceNoticesModal?.classList.remove("active");
  });

  elements.serviceNoticesModal?.addEventListener("click", (event) => {
    if (event.target === elements.serviceNoticesModal) {
      elements.serviceNoticesModal.classList.remove("active");
    }
  });

  elements.toggleRailcams?.addEventListener("click", () => {
    if (!FEATURE_RAILCAMS_ENABLED) return;
    const nextVisible = !state.railcamsVisible;
    setRailcamsVisible(nextVisible, { openWindow: nextVisible });
    if (nextVisible) {
      maybeOpenRailcamBetaModal();
    }
  });

  elements.toggleMaintenance?.addEventListener("click", () => {
    state.uiSettings.maintenanceVisible = !state.uiSettings.maintenanceVisible;
    persistUiSettings();
    renderIncidentLayers();
  });

  elements.toggleSettings?.addEventListener("click", () => {
    openSettingsModal();
  });

  elements.openToolHelpModal?.addEventListener("click", () => {
    elements.toolHelpModal?.classList.add("active");
  });

  elements.closeToolHelpModal?.addEventListener("click", () => {
    elements.toolHelpModal?.classList.remove("active");
  });

  elements.toolHelpModal?.addEventListener("click", (event) => {
    if (event.target === elements.toolHelpModal) {
      elements.toolHelpModal.classList.remove("active");
    }
  });

  elements.openBooking?.addEventListener("click", () => {
    openBookingModal();
  });

  elements.openServiceNotices?.addEventListener("click", () => {
    openServiceNoticesModal().catch(() => {
      if (!elements.serviceNoticesPanel || !elements.serviceNoticesModal) return;
      elements.serviceNoticesPanel.innerHTML = buildServiceNoticesModalHtml([]);
      elements.serviceNoticesModal.classList.add("active");
    });
  });

  elements.closeDepartureBoardModal?.addEventListener("click", () => {
    elements.departureBoardModal?.classList.remove("active");
  });

  elements.departureBoardModal?.addEventListener("click", (event) => {
    if (event.target === elements.departureBoardModal) {
      elements.departureBoardModal.classList.remove("active");
    }
  });

  elements.departureBoardSource?.addEventListener("change", () => {
    renderDepartureBoard();
  });

  elements.closeLocoSpecsModal?.addEventListener("click", () => {
    elements.locoSpecsModal?.classList.remove("active");
  });
  elements.locoSpecsModal?.addEventListener("click", (event) => {
    if (event.target === elements.locoSpecsModal) {
      elements.locoSpecsModal.classList.remove("active");
    }
  });
  elements.locoSpecsSearch?.addEventListener("input", () => {
    const filtered = filterLocomotiveSpecs(state.locomotiveSpecsCatalog || [], elements.locoSpecsSearch?.value || "");
    renderLocomotiveSpecsList(filtered, elements.locoSpecsTitle?.textContent || "Locomotive Specs Database");
  });

  [elements.railcamSearch, elements.railcamState].filter(Boolean).forEach((input) => {
    input.addEventListener("input", renderRailcams);
    input.addEventListener("change", renderRailcams);
  });

  elements.closeRailcamModal?.addEventListener("click", () => {
    elements.railcamModal?.classList.remove("active");
  });

  elements.railcamWindowHost?.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-railcam-close]");
    if (closeButton) {
      event.preventDefault();
      event.stopPropagation();
      closeRailcamWindow(closeButton.getAttribute("data-railcam-close") || "");
      return;
    }
    const mapButton = event.target.closest("[data-railcam-map]");
    if (mapButton) {
      const cam = railcamById.get(mapButton.getAttribute("data-railcam-map") || "");
      if (cam) centerMapOnRailcam(cam);
      return;
    }
    const activateButton = event.target.closest("[data-railcam-activate]");
    if (!activateButton) return;
    const frame = activateButton.closest(".railcam-player-frame, .railcam-floating-player-frame");
    setRailcamFrameInteractive(frame, true);
  });

  elements.railcamWindowHost?.addEventListener("pointerdown", (event) => {
    const windowNode = event.target.closest("[data-railcam-window-id]");
    if (!windowNode) return;
    const windowId = windowNode.getAttribute("data-railcam-window-id") || "";
    bringRailcamWindowToFront(windowId);
    if (event.target.closest("button, a, iframe, [data-railcam-activate]")) return;
    const handle = event.target.closest("[data-railcam-drag-handle]");
    if (!handle || event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = windowNode.offsetLeft;
    const startTop = windowNode.offsetTop;
    windowNode.setPointerCapture?.(event.pointerId);
    const move = (moveEvent) => {
      setRailcamWindowPosition(windowId, startLeft + moveEvent.clientX - startX, startTop + moveEvent.clientY - startY);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
  });

  elements.railcamList?.addEventListener("click", (event) => {
    const watchButton = event.target.closest("[data-railcam-watch]");
    const mapButton = event.target.closest("[data-railcam-map]");
    const card = event.target.closest("[data-railcam-id]");
    const camId = watchButton?.getAttribute("data-railcam-watch")
      || mapButton?.getAttribute("data-railcam-map")
      || card?.getAttribute("data-railcam-id");
    if (!camId) return;
    const cam = railcamById.get(camId);
    if (!cam) return;

    state.activeRailcamId = cam.id;
    renderRailcams();

    if (mapButton) {
      centerMapOnRailcam(cam);
      setRailcamsVisible(true);
      return;
    }

    if (watchButton || card) {
      openRailcamWindow(cam);
    }
  });

  elements.railcamMeta?.addEventListener("click", (event) => {
    const popoutButton = event.target.closest("[data-railcam-popout]");
    const mapButton = event.target.closest("[data-railcam-map]");
    const embedButton = event.target.closest("[data-railcam-embed]");
    if (popoutButton) {
      const cam = railcamById.get(popoutButton.getAttribute("data-railcam-popout") || "");
      if (!cam) return;
      openRailcamWindow(cam);
      return;
    }
    if (embedButton) {
      const cam = railcamById.get(embedButton.getAttribute("data-railcam-embed") || "");
      if (!cam) return;
      renderRailcamPlayer(cam);
      if (elements.railcamModal) {
        elements.railcamModal.classList.add("active");
      }
      return;
    }
    if (!mapButton) return;
    const cam = railcamById.get(mapButton.getAttribute("data-railcam-map") || "");
    if (!cam) return;
    centerMapOnRailcam(cam);
    syncRailcamMarkers();
  });

  elements.closeSettingsModal?.addEventListener("click", () => {
    if (document.body.dataset.appView === "settings") {
      setAppView("map");
    } else {
      closeSettingsModal();
    }
  });

  elements.openCreditsModal?.addEventListener("click", () => {
    renderCreditsModal();
    elements.creditsModal?.classList.add("active");
  });

  elements.openAboutModal?.addEventListener("click", () => {
    elements.aboutModal?.classList.add("active");
  });

  elements.closeAboutModal?.addEventListener("click", () => {
    elements.aboutModal?.classList.remove("active");
  });

  elements.aboutModal?.addEventListener("click", (event) => {
    if (event.target === elements.aboutModal) {
      elements.aboutModal.classList.remove("active");
    }
  });

  const openPrivacyPanel = () => {
    elements.privacyModal?.classList.add("active");
  };

  elements.openPrivacyModal?.addEventListener("click", openPrivacyPanel);
  elements.accountOpenPrivacy?.addEventListener("click", openPrivacyPanel);

  elements.closePrivacyModal?.addEventListener("click", () => {
    elements.privacyModal?.classList.remove("active");
  });

  elements.privacyModal?.addEventListener("click", (event) => {
    if (event.target === elements.privacyModal) {
      elements.privacyModal.classList.remove("active");
    }
  });

  elements.closeCreditsModal?.addEventListener("click", () => {
    elements.creditsModal?.classList.remove("active");
  });

  elements.creditsModal?.addEventListener("click", (event) => {
    if (event.target === elements.creditsModal) {
      elements.creditsModal.classList.remove("active");
    }
  });

  elements.openGalleryModal?.addEventListener("click", () => {
    setAppView("gallery");
  });
  elements.closeGalleryModal?.addEventListener("click", closeGalleryModal);
  elements.backGallery?.addEventListener("click", () => {
    closeGalleryModal();
  });
  elements.galleryUploadToggle?.addEventListener("click", () => setGalleryUploadOpen(true));
  elements.galleryUploadClose?.addEventListener("click", () => setGalleryUploadOpen(false));
  elements.galleryModal?.addEventListener("click", (event) => {
    if (event.target === elements.galleryModal) closeGalleryModal();
  });
  elements.galleryGrid?.addEventListener("click", (event) => {
    const card = event.target?.closest?.("[data-gallery-photo-id]");
    if (!card) return;
    openGalleryPhotoDetail(card.dataset.galleryPhotoId);
  });
  elements.galleryPhotoDetail?.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-close-gallery-photo]")) {
      closeGalleryPhotoDetail();
    }
  });
  elements.gallerySearch?.addEventListener("input", renderGallery);
  elements.galleryRailroadFilter?.addEventListener("change", renderGallery);
  elements.galleryDescription?.addEventListener("input", updateGalleryDescriptionCount);
  elements.galleryUploadForm?.addEventListener("submit", submitGalleryUpload);

  // Hide download button in Electron - check immediately and with a small delay for safety
  if (elements.openDownloadModal) {
    if (typeof window.ORT_IS_ELECTRON !== "undefined" && window.ORT_IS_ELECTRON) {
      elements.openDownloadModal.style.display = "none";
      elements.openDownloadModal.style.visibility = "hidden";
      elements.openDownloadModal.style.pointerEvents = "none";
    } else {
      elements.openDownloadModal.addEventListener("click", openDownloadModal);
    }
  }
  // Double-check after a short delay to ensure Electron flag is set
  setTimeout(() => {
    if (window.ORT_IS_ELECTRON && elements.openDownloadModal) {
      elements.openDownloadModal.style.display = "none";
      elements.openDownloadModal.style.visibility = "hidden";
      elements.openDownloadModal.style.pointerEvents = "none";
    }
  }, 100);
  elements.closeDownloadModal?.addEventListener("click", closeDownloadModal);
  elements.downloadModal?.addEventListener("click", (event) => {
    if (event.target === elements.downloadModal) closeDownloadModal();
  });
  elements.downloadMacIntel?.addEventListener("click", () => {
    openDownloadLink(`/downloads/OpenRailTracker-${APP_VERSION}-mac-x64.dmg`);
  });
  elements.downloadMacSilicon?.addEventListener("click", () => {
    openDownloadLink(`/downloads/OpenRailTracker-${APP_VERSION}-mac-arm64.dmg`);
  });
  elements.downloadWindows?.addEventListener("click", () => {
    openDownloadLink(`/downloads/OpenRailTracker-${APP_VERSION}-win-x64.exe`);
  });
  elements.downloadLinuxAppImage?.addEventListener("click", () => {
    openDownloadLink(`/downloads/OpenRailTracker-${APP_VERSION}-linux-x86_64.AppImage`);
  });
  elements.downloadLinuxDeb?.addEventListener("click", () => {
    openDownloadLink(`/downloads/OpenRailTracker-${APP_VERSION}-linux-amd64.deb`);
  });

  elements.saveSettings?.addEventListener("click", () => {
    const newMode = "standard";
    const wasFreightVisible = Boolean(state.freightVisible);
    const refreshSeconds = 180;
    const previousMapStyle = state.uiSettings.mapStyle || defaultUiSettings.mapStyle;
    state.uiSettings.trackingMode = newMode;
    state.uiSettings.predictedMovementVisible = FEATURE_TRAIN_MOVEMENT_ENABLED
      ? Boolean(elements.settingPredictedMovement?.checked)
      : false;
    state.uiSettings.refreshSeconds = 180;
    state.uiSettings.openListDefault = true;
    state.uiSettings.searchOpenDefault = Boolean(elements.settingSearchOpenDefault?.checked);
    state.uiSettings.compactCards = Boolean(elements.settingCompactCards?.checked);
    state.uiSettings.simpleInfoMode = Boolean(elements.settingSimpleInfo?.checked);
    state.uiSettings.mapStyle = "overture";
    state.uiSettings.timeZone = normalizeTimeZoneSetting(elements.settingTimeZone?.value || "browser");
    const previousTheme = state.uiSettings.themeMode;
    const previousLightMap = isLightMapTheme(previousTheme);
    state.uiSettings.themeMode = normalizeThemeMode(elements.settingThemeMode?.value);
    state.uiSettings.speedLimitsVisible = Boolean(elements.settingSpeedLimitsVisible?.checked);
    state.uiSettings.speedDotsVisible = Boolean(elements.settingSpeedDotsVisible?.checked);
    state.uiSettings.trainHistoryVisible = Boolean(elements.settingTrainHistoryVisible?.checked);
    state.uiSettings.mileMarkersVisible = false;
    state.uiSettings.routesVisible = Boolean(elements.settingRoutesVisible?.checked);
    state.uiSettings.proposedLinesVisible = Boolean(elements.settingProposedLinesVisible?.checked);
    state.uiSettings.freightVisible = Boolean(elements.settingFreightVisible?.checked);
    state.uiSettings.openRailwayMapStyle = OPENRAILWAYMAP_STYLES.has(`${elements.settingFreightOperatorHighlight?.value || ""}`.trim())
      ? `${elements.settingFreightOperatorHighlight.value}`.trim()
      : defaultUiSettings.openRailwayMapStyle;
    state.uiSettings.railcamsVisible = FEATURE_RAILCAMS_ENABLED && Boolean(elements.settingRailcamsVisible?.checked);
    state.uiSettings.freightOperatorHighlight = "all";
    state.uiSettings.stationsVisible = Boolean(elements.settingStationsVisible?.checked);
    state.uiSettings.heritageVisible = Boolean(elements.settingHeritageVisible?.checked);
    state.uiSettings.specialInterestVisible = Boolean(elements.settingSpecialInterestVisible?.checked);
    state.uiSettings.maintenanceVisible = Boolean(elements.settingMaintenanceVisible?.checked);

    if (!wasFreightVisible && state.uiSettings.freightVisible) {
      showFreightPerformanceNotice();
    }

    persistUiSettings();
    applyUiSettingsToDom();

    applyStoredTheme();
    try {
      safeSetLocalStorage("ort-theme", state.uiSettings.themeMode);
    } catch {
      // ignore storage failures
    }

    const themeChanged = previousTheme !== state.uiSettings.themeMode;
    const lightMapChanged = previousLightMap !== isLightMapTheme(state.uiSettings.themeMode);
    const mapStyleChanged = previousMapStyle !== state.uiSettings.mapStyle;
    state.mapStyle = state.uiSettings.mapStyle;
    setSpeedLimitsVisible(state.uiSettings.speedLimitsVisible);
    setSpeedDotsVisible(state.uiSettings.speedDotsVisible);
    setTrainHistoryVisible(state.uiSettings.trainHistoryVisible);
    setMileMarkersVisible(state.uiSettings.mileMarkersVisible);
    setRoutesVisible(state.uiSettings.routesVisible);
    setProposedLinesVisible(state.uiSettings.proposedLinesVisible);
    setFreightVisible(state.uiSettings.freightVisible);
    setRailcamsVisible(state.uiSettings.railcamsVisible);
    if (!state.uiSettings.railcamVisionEnabled) stopRailcamVision();
    renderRailcamWindows();
    setSignalVisible(state.uiSettings.signalVisible);
    setFreightOperatorHighlight(state.uiSettings.openRailwayMapStyle);
    setStationsVisible(state.uiSettings.stationsVisible);
    setHeritageVisible(state.uiSettings.heritageVisible);
    setSpecialInterestVisible(state.uiSettings.specialInterestVisible);
    renderIncidentLayers();

    elements.floatingSearch?.classList.toggle("active", state.uiSettings.searchOpenDefault);
    elements.toggleSearch?.setAttribute("data-active", String(state.uiSettings.searchOpenDefault));
    if (!state.uiSettings.searchOpenDefault) {
      elements.filterPanel?.classList.remove("active");
      elements.toggleFilters?.classList.remove("active");
      elements.toggleFilters?.setAttribute("data-active", "false");
    }

    renderTrains(applyFilters(getAllTrains()));
    applyTrainMovementMode(getAllTrains());
    if (elements.departureBoardModal?.classList.contains("active")) {
      renderDepartureBoard();
    }
    scheduleRefresh();

    if (lightMapChanged && state.map) {
      switchMapStyle(state.uiSettings.mapStyle);
    } else if (themeChanged && state.map) {
      // Repaint station labels and any theme-sensitive layers without full style reload
      updateThemeSensitiveLayers();
    }

    if (mapStyleChanged && state.map && !lightMapChanged) {
      switchMapStyle(state.uiSettings.mapStyle);
    }
  });

  elements.settingThemeMode?.addEventListener("change", () => {
    const previousLightMap = isLightMapTheme(state.uiSettings.themeMode);
    state.uiSettings.themeMode = normalizeThemeMode(elements.settingThemeMode.value);
    persistUiSettings();
    applyStoredTheme();
    safeSetLocalStorage("ort-theme", state.uiSettings.themeMode);
    if (state.map) {
      if (previousLightMap !== isLightMapTheme(state.uiSettings.themeMode)) {
        switchMapStyle(state.uiSettings.mapStyle);
      } else {
        updateThemeSensitiveLayers();
      }
    }
  });

  elements.settingFreightOperatorHighlight?.addEventListener("change", () => {
    setFreightOperatorHighlight(elements.settingFreightOperatorHighlight.value);
    persistUiSettings();
  });

  elements.settingProposedLinesVisible?.addEventListener("change", () => {
    setProposedLinesVisible(Boolean(elements.settingProposedLinesVisible.checked));
    persistUiSettings();
  });

  elements.settingFreightVisible?.addEventListener("change", () => {
    setFreightVisible(Boolean(elements.settingFreightVisible.checked));
    persistUiSettings();
  });

  let settingsAutoSaveTimer = null;
  const scheduleSettingsAutoSave = () => {
    if (!elements.settingsModal?.classList.contains("active")) return;
    window.clearTimeout(settingsAutoSaveTimer);
    settingsAutoSaveTimer = window.setTimeout(() => {
      elements.saveSettings?.click();
    }, 120);
  };
  [
    elements.settingRefreshInterval,
    elements.settingPredictedMovement,
    elements.settingTimeZone,
    elements.settingRoutesVisible,
    elements.settingProposedLinesVisible,
    elements.settingFreightVisible,
    elements.settingFreightOperatorHighlight,
    elements.settingRailcamsVisible,
    elements.settingStationsVisible,
    elements.settingMaintenanceVisible,
    elements.settingHeritageVisible,
    elements.settingSpecialInterestVisible,
    elements.settingSpeedDotsVisible,
    elements.settingTrainHistoryVisible,
    elements.settingSearchOpenDefault,
  ].filter(Boolean).forEach((control) => {
    control.addEventListener("change", scheduleSettingsAutoSave);
  });

  elements.detailModal.addEventListener("click", (e) => {
    if (e.target === elements.detailModal) {
      closeDetailPanel();
    }
  });

  elements.detailModal?.addEventListener("touchstart", (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest(".modal-content")) return;
    state.detailInteractionUntil = Date.now() + 900;
    const canStartSwipe = Boolean(event.target.closest(".detail-sheet-grabber, .detail-head"));
    const touch = event.touches?.[0];
    if (
      isDetailSheetMobileLayout()
      && elements.detailModal?.classList.contains("active")
      && canStartSwipe
      && touch
    ) {
      state.detailSheetSwipeEligible = true;
      state.detailSheetTouchStartY = touch.clientY;
      state.detailSheetTouchLastY = touch.clientY;
    } else {
      state.detailSheetSwipeEligible = false;
      state.detailSheetTouchStartY = null;
      state.detailSheetTouchLastY = null;
    }
  }, { passive: true });

  elements.detailModal?.addEventListener("touchmove", (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest(".modal-content")) return;
    state.detailInteractionUntil = Date.now() + 900;
    if (!state.detailSheetSwipeEligible) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    state.detailSheetTouchLastY = touch.clientY;
  }, { passive: true });

  elements.detailModal?.addEventListener("touchend", (event) => {
    if (!state.detailSheetSwipeEligible || !isDetailSheetMobileLayout()) {
      state.detailSheetTouchStartY = null;
      state.detailSheetTouchLastY = null;
      state.detailSheetSwipeEligible = false;
      return;
    }
    if (!elements.detailModal?.classList.contains("active")) {
      state.detailSheetTouchStartY = null;
      state.detailSheetTouchLastY = null;
      state.detailSheetSwipeEligible = false;
      return;
    }
    const startY = Number(state.detailSheetTouchStartY);
    const changedTouchY = event.changedTouches?.[0]?.clientY;
    const endY = Number.isFinite(changedTouchY)
      ? Number(changedTouchY)
      : Number(state.detailSheetTouchLastY);
    if (Number.isFinite(startY) && Number.isFinite(endY)) {
      const deltaY = endY - startY;
      const currentState = `${elements.detailModal?.dataset?.sheetState || "peek"}`;
      if (deltaY <= -36) {
        setDetailSheetState("expanded");
      } else if (deltaY >= 54) {
        if (currentState === "expanded") {
          setDetailSheetState("peek");
        } else {
          closeDetailPanel();
        }
      }
    }
    state.detailSheetTouchStartY = null;
    state.detailSheetTouchLastY = null;
    state.detailSheetSwipeEligible = false;
  }, { passive: true });

  elements.detailModal?.addEventListener("wheel", (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest(".modal-content")) return;
    state.detailInteractionUntil = Date.now() + 900;
  }, { passive: true });

  elements.closeServiceAlertModal?.addEventListener("click", () => {
    elements.serviceAlertModal?.classList.remove("active");
  });

  elements.closeBookingModal?.addEventListener("click", () => {
    elements.bookingModal?.classList.remove("active");
  });

  elements.serviceAlertModal?.addEventListener("click", (e) => {
    if (e.target === elements.serviceAlertModal) {
      elements.serviceAlertModal.classList.remove("active");
    }
  });

  elements.bookingModal?.addEventListener("click", (e) => {
    if (e.target === elements.bookingModal) {
      elements.bookingModal.classList.remove("active");
    }
  });

  elements.railcamModal?.addEventListener("click", (e) => {
    const activateButton = e.target.closest("[data-railcam-activate]");
    if (activateButton) {
      const frame = activateButton.closest(".railcam-player-frame, .railcam-floating-player-frame");
      setRailcamFrameInteractive(frame, true);
      return;
    }
    if (e.target === elements.railcamModal) {
      elements.railcamModal.classList.remove("active");
    }
  });

  elements.railcamModal?.addEventListener("pointerleave", (event) => {
    const frame = event.target.closest?.(".railcam-player-frame");
    if (!frame) return;
    setRailcamFrameInteractive(frame, false);
  }, true);

  window.addEventListener("resize", () => {
    state.lowTierDevice = isLowTierDevice();
    enforceRailcamWindowLimit();
    if (state.railcamWindows.length > 0) {
      closeAllRailcamWindows();
    }
    syncDetailPanelLayout();
    if (elements.detailModal?.classList.contains("active") && !isDetailSheetMobileLayout()) {
      setDetailSheetState("expanded");
    }
  });

  document.addEventListener("visibilitychange", async () => {
    state.pageHidden = document.hidden;
    if (state.pageHidden) {
      if (state.refreshTimer) {
        clearInterval(state.refreshTimer);
        state.refreshTimer = null;
      }
      try {
        state.webSocket?.close?.();
      } catch {
        // ignore close failures
      }
      state.webSocket = null;
      return;
    }

    // Allow immediate manual refresh after app resume.
    state.lastManualRefreshAt = 0;

    await refreshData({ includeStatic: false, forceFreight: true });
    if (state.backendReachable && !IS_IOS_SAFARI) {
      initWebSocket();
    }
    scheduleRefresh();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && accountSidebarManager?.isOpen) {
      accountSidebarManager.close();
      return;
    }
    if (event.key !== "Escape" || state.railcamWindows.length === 0) return;
    closeAllRailcamWindows();
  });

  elements.closeReleaseModal?.addEventListener("click", dismissReleaseModal);
  elements.releaseGotIt?.addEventListener("click", dismissReleaseModal);
  elements.mapVersionPill?.addEventListener("click", () => {
    renderReleaseNotesPanel();
    elements.releaseModal?.classList.add("active");
  });
  elements.releaseModal?.addEventListener("click", (event) => {
    if (event.target === elements.releaseModal) {
      dismissReleaseModal();
    }
  });

  elements.closeDesktopWelcomeModal?.addEventListener("click", dismissDesktopWelcomeModal);
  elements.desktopWelcomeCta?.addEventListener("click", dismissDesktopWelcomeModal);
  elements.desktopWelcomeModal?.addEventListener("click", (event) => {
    if (event.target === elements.desktopWelcomeModal) {
      dismissDesktopWelcomeModal();
    }
  });

  elements.closeRailcamBetaModal?.addEventListener("click", dismissRailcamBetaModal);
  elements.railcamBetaGotIt?.addEventListener("click", dismissRailcamBetaModal);
  elements.railcamBetaModal?.addEventListener("click", (event) => {
    if (event.target === elements.railcamBetaModal) {
      dismissRailcamBetaModal();
    }
  });

  elements.settingsModal?.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal && document.body.dataset.appView !== "settings") {
      if (document.body.dataset.appView === "settings") {
        setAppView("map");
      } else {
        closeSettingsModal();
      }
    }
  });

  elements.toggleSaved?.addEventListener("click", () => {
    state.showSavedOnly = !state.showSavedOnly;
    elements.toggleSaved.setAttribute("data-active", String(state.showSavedOnly));
    renderTrains(applyFilters(getAllTrains()));
  });

  elements.btnLocate?.addEventListener("click", toggleUserLocation);
  elements.btnFitTrains?.addEventListener("click", fitToTrains);

  // Future Connections button
  elements.toggleFutureConnections?.addEventListener("click", () => {
    const isActive = elements.toggleFutureConnections.getAttribute("data-active") === "true";
    if (isActive) {
      // Close the panel if already open
      const existingPanel = elements.trainDetail?.querySelector(".train-future-connections-panel");
      if (existingPanel) existingPanel.remove();
      elements.toggleFutureConnections.setAttribute("data-active", "false");
    } else {
      // Open the panel
      elements.toggleFutureConnections.setAttribute("data-active", "true");
      const panel = document.createElement("div");
      panel.className = "train-future-connections-panel";
      panel.innerHTML = `
        <div class="future-connections-title">Future Connections (Upcoming Lines)</div>
        <div class="future-connections-list">
          <div class="future-connection-item">
            <span class="fc-name">California High-Speed Rail</span>
            <span class="fc-status">Under Construction</span>
            <span class="fc-route">San Francisco → Los Angeles → San Diego</span>
          </div>
          <div class="future-connection-item">
            <span class="fc-name">OKC RTA Streetcar</span>
            <span class="fc-status">Planned</span>
            <span class="fc-route">Oklahoma City Downtown Loop</span>
          </div>
          <div class="future-connection-item">
            <span class="fc-name">Brightline Texas</span>
            <span class="fc-status">Under Construction</span>
            <span class="fc-route">Dallas → Fort Worth → San Antonio</span>
          </div>
          <div class="future-connection-item">
            <span class="fc-name">Texas Central</span>
            <span class="fc-status">Planned</span>
            <span class="fc-route">Dallas → Houston</span>
          </div>
          <div class="future-connection-item">
            <span class="fc-name">HARTA T-REX</span>
            <span class="fc-status">Planned</span>
            <span class="fc-route">Austin → San Antonio</span>
          </div>
          <div class="future-connection-item">
            <span class="fc-name">Florida Gulf Coast</span>
            <span class="fc-status">Planned</span>
            <span class="fc-route">Tampa → Orlando → Jacksonville</span>
          </div>
          <div class="future-connection-item">
            <span class="fc-name">Seattle-Tacoma Streetcar</span>
            <span class="fc-status">Under Construction</span>
            <span class="fc-route">Seattle → Tacoma → Puyallup</span>
          </div>
          <div class="future-connection-item">
            <span class="fc-name">Los Angeles Metro Rail Extensions</span>
            <span class="fc-status">Under Construction</span>
            <span class="fc-route">Crenshaw → Westside → Westwood</span>
          </div>
          <div class="future-connection-item">
            <span class="fc-name">Chicago Hub Network</span>
            <span class="fc-status">Planned</span>
            <span class="fc-route">Multiple high-speed corridors</span>
          </div>
          <div class="future-connection-item">
            <span class="fc-name">Nevada Rail</span>
            <span class="fc-status">Planned</span>
            <span class="fc-route">Las Vegas → Los Angeles</span>
          </div>
        </div>
      `;
      elements.trainDetail.appendChild(panel);
      // Auto-scroll to panel
      setTimeout(() => {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  });

  elements.quickLive?.addEventListener("click", () => {
    setQuickMode(state.quickMode === "live" ? "all" : "live");
  });

  elements.quickDelay?.addEventListener("click", () => {
    setQuickMode(state.quickMode === "delayed" ? "all" : "delayed");
  });

  elements.quickReset?.addEventListener("click", () => {
    state.quickMode = "all";
    if (elements.search) elements.search.value = "";
    if (elements.source) elements.source.value = "all";
    if (elements.status) elements.status.value = "all";
    setQuickMode("all");
  });

  document.querySelectorAll(".bottom-nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      setAppView(button.dataset.view || "map");
    });
  });

  elements.btnUploadFindTop?.addEventListener("click", () => {
    setAppView("log");
    openSightingModal("heritage");
  });

  elements.bottomNavLive?.addEventListener("click", () => {
    setAppView("live");
  });

  elements.bottomNavAlerts?.addEventListener("click", () => {
    setAppView("alerts");
  });

  elements.bottomNavSettings?.addEventListener("click", () => {
    setAppView("settings");
  });

  elements.mobileOpenServiceNotices?.addEventListener("click", () => {
    setAppView("alerts");
  });

  elements.mobileOpenSettingsModal?.addEventListener("click", () => {
    setAppView("settings");
  });

  elements.mobileOpenToolHelp?.addEventListener("click", () => {
    elements.toolHelpModal?.classList.add("active");
  });

  setAppView(window.matchMedia?.("(max-width: 768px)")?.matches ? "map" : "live");
}

async function checkBackendHealth() {
  try {
    const res = await fetch(apiUrl("/api/health"), { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function initApp() {
  loadUiSettings();
  state.uiSettings.speedLimitsVisible = Boolean(state.uiSettings.speedLimitsVisible);
  state.uiSettings.mileMarkersVisible = false;
  state.mapStyle = MAP_STYLE_CYCLE.includes(state.uiSettings.mapStyle)
    ? state.uiSettings.mapStyle
    : defaultUiSettings.mapStyle;
  applyStoredTheme();
  applyUiSettingsToDom();

  // IMMEDIATELY start map and UI setup
  initMap();
  window.addEventListener("beforeunload", persistMapView);
  attachEvents();
  renderContributions();
  renderCreditsModal();
  buildRailcamStateOptions();
  buildDepartureBoardSourceOptions();
  updateRailcamToggleUi();
  renderRailcams();
  renderRailcamPlayer(railcamById.get(state.activeRailcamId) || railcamCatalog[0] || null);
  buildSourceOptions();
  loadSaved();
  loadLocomotiveSpecsCatalog().catch(() => null);

  state.routesVisible = Boolean(state.uiSettings.routesVisible);
  state.proposedLinesVisible = Boolean(state.uiSettings.proposedLinesVisible);
  state.freightVisible = Boolean(state.uiSettings.freightVisible);
  state.railcamsVisible = FEATURE_RAILCAMS_ENABLED && Boolean(state.uiSettings.railcamsVisible);
  state.uiSettings.railcamVisionEnabled = FEATURE_RAILCAMS_ENABLED && FEATURE_RAILCAM_VISION_ENABLED && Boolean(state.uiSettings.railcamVisionEnabled);
  state.signalVisible = Boolean(state.uiSettings.signalVisible);
  state.uiSettings.openRailwayMapStyle = OPENRAILWAYMAP_STYLES.has(`${state.uiSettings.openRailwayMapStyle || ""}`.trim())
    ? `${state.uiSettings.openRailwayMapStyle}`.trim()
    : defaultUiSettings.openRailwayMapStyle;
  state.uiSettings.freightOperatorHighlight = "all";
  state.stationsVisible = Boolean(state.uiSettings.stationsVisible);
  state.showHeritage = Boolean(state.uiSettings.heritageVisible);
  state.showSI = Boolean(state.uiSettings.specialInterestVisible);

  // Mobile optimization: start with sidebar collapsed
  if (window.innerWidth <= 768 && elements.sidebar) {
    elements.sidebar.classList.add("sidebar-collapsed");
    if (elements.toggleSearch) elements.toggleSearch.setAttribute("data-active", "false");
  }

  // ONE-TIME PURGE OF OVERSIZED CACHES (to resolve current QuotaExceededErrors)
  const isPurged = localStorage.getItem("ort-quota-purge-v1");
  if (!isPurged) {
    localStorage.removeItem("ort-cached-routes");
    localStorage.removeItem("ort-cached-stations");
    localStorage.setItem("ort-quota-purge-v1", "done");
  }

  // LOAD CACHED DATA IMMEDIATELY
  try {
    const cachedTrains = JSON.parse(localStorage.getItem("ort-cached-trains") || "null");
    const cachedCommuter = JSON.parse(localStorage.getItem("ort-cached-commuter") || "null");
    const cachedFreightCommunity = JSON.parse(localStorage.getItem("ort-cached-freight-community") || "null");
    const cachedRoutes = JSON.parse(localStorage.getItem("ort-cached-routes") || "null");
    const cachedCommuterRoutes = JSON.parse(localStorage.getItem("ort-cached-commuterRoutes") || "null");
    const cachedFreightRoutes = JSON.parse(localStorage.getItem("ort-cached-freightRoutes") || "null");

    if (cachedRoutes?.routes || cachedCommuterRoutes?.routes || cachedFreightRoutes?.routes) {
      state.routes = Array.isArray(cachedRoutes?.routes) ? cachedRoutes.routes : state.routes;
      state.commuterRoutes = Array.isArray(cachedCommuterRoutes?.routes) ? cachedCommuterRoutes.routes : state.commuterRoutes;
      state.freightRoutes = Array.isArray(cachedFreightRoutes?.routes) ? cachedFreightRoutes.routes : state.freightRoutes;
      if (state.freightRoutes.length > 0) {
        state.freightRoutesLoaded = true;
      }
      renderAllRoutes();
    }

    if (cachedTrains || cachedCommuter || cachedFreightCommunity) {
      state.trains = cachedTrains?.trains || [];
      state.commuterTrains = cachedCommuter?.trains || [];
      state.freightCommunityTrains = cachedFreightCommunity?.trains || [];
      const cachedFreightUpdatedAtMs = Date.parse(`${cachedFreightCommunity?.updatedAt || ""}`);
      if (Number.isFinite(cachedFreightUpdatedAtMs)) {
        state.lastFreightRefreshAt = cachedFreightUpdatedAtMs;
      }
      renderTrains(applyFilters(getAllTrains()));
      state.lastUpdateTime = (cachedTrains || cachedCommuter || cachedFreightCommunity)?.updatedAt || new Date().toISOString();
      updateTimestamp();
    }
  } catch (e) {
    console.warn("Cache load failed:", e);
  }

  scheduleInitialLoaderFallback();

  // START BACKGROUND ASYNC OPS
  (async () => {
    state.backendReachable = await checkBackendHealth();
    if (state.backendReachable) {
      if (!IS_IOS_SAFARI) {
        initWebSocket();
      }

      if (state.freightVisible && !FEATURE_OPENRAILWAYMAP_VECTOR_FREIGHT) {
        loadFreightRoutesDeferred().catch(() => null);
      }

      refreshData({ includeStatic: true, forceFreight: false }).catch(() => null);
      scheduleRefresh();
      scheduleFreightRefresh();

      try {
        const configRes = await fetch(apiUrl("/api/config"), { cache: "no-store" });
        if (configRes.ok) {
          state.config = await configRes.json();
          ensureRouteRasterLayer(state.map);
          applyRouteVisibility();
          renderCreditsModal();
          renderContributions();
        }
      } catch { }

      loadVerifiedConsistProfiles().catch(() => null);
    } else if (elements.lastUpdated) {
      elements.lastUpdated.textContent = "Backend unreachable";
      elements.lastUpdated.classList.add("updating");
      scheduleInitialLoaderFallback("Backend unreachable — showing offline mode");
      hideInitialLoader();
    }
  })();

  renderReleaseNotesPanel();
  maybeOpenDesktopWelcomeModal();
  maybeOpenReleaseModal();

  // Beta modal dismiss
  document.getElementById("alg-beta-got-it")?.addEventListener("click", () => {
    sessionStorage.setItem("alg-beta-dismissed", "1");
  });

  document.getElementById("alg-beta-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "alg-beta-modal") {
      sessionStorage.setItem("alg-beta-dismissed", "1");
      e.target.classList.remove("active");
    }
  });

  // Live hide/show interval row when tracking mode changes in settings
  elements.settingTrackingMode?.addEventListener("change", () => {
    if (elements.settingIntervalRow) {
      elements.settingIntervalRow.style.display = "none";
    }
  });

  applyTrainMovementMode(getAllTrains());
}

initApp();
