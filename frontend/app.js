const sources = {
  amtrak: { label: "Amtrak", prefix: "A" },
  brightline: { label: "Brightline", prefix: "B" },
  via: { label: "VIA Rail", prefix: "V" },
  metra: { label: "Metra", prefix: "M" },
  mta: { label: "MTA Metro-North", prefix: "N" },
  njt: { label: "NJ Transit", prefix: "J" },
  septa: { label: "SEPTA", prefix: "S" },
  mbta: { label: "MBTA Commuter Rail", prefix: "B" },
  lirr: { label: "LIRR", prefix: "L" },
  bart: { label: "BART", prefix: "R" },
  marta: { label: "MARTA", prefix: "T" },
  dart: { label: "DART", prefix: "D" },
  metrolink: { label: "Metrolink", prefix: "K" },
  caltrain: { label: "Caltrain", prefix: "C" },
  vta: { label: "VTA", prefix: "V" },
  muni: { label: "MUNI", prefix: "M" },
  sfstreetcar: { label: "SF Streetcar", prefix: "S" },
  sounder: { label: "Sounder", prefix: "D" },
  sunrail: { label: "SunRail", prefix: "R" },
  trirail: { label: "Tri-Rail", prefix: "T" },
  vre: { label: "VRE", prefix: "V" },
  marc: { label: "MARC", prefix: "A" },
  ace: { label: "ACE", prefix: "A" },
  coaster: { label: "Coaster", prefix: "O" },
  smart: { label: "SMART", prefix: "S" },
  frontrunner: { label: "FrontRunner", prefix: "F" },
  capmetro: { label: "CapMetro Rail", prefix: "C" },
  arkansasMissouri: { label: "Arkansas & Missouri", prefix: "A" },
  branson: { label: "Branson Railroad", prefix: "B" },
};

const operatorColors = {
  brightline: "#facc15",
  amtrak: "#1f4fa3",
  amtraker: "#1f4fa3",
  via: "#f97316",
  njt: "#8b5cf6",
  mta: "#1e3a8a",
  metra: "#3b82f6",
  metrolink: "#0ea5e9",
  caltrain: "#ef4444",
  vta: "#f59e0b",
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
  ace: "#14b8a6",
  coaster: "#2563eb",
  smart: "#ef4444",
  frontrunner: "#22c55e",
  capmetro: "#e11d48",
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
  if (window.location.hostname.endsWith("github.io")) return "https://openrailtracker.app";
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

const commuterSources = new Set([
  "metra",
  "mta",
  "njt",
  "septa",
  "mbta",
  "lirr",
  "bart",
  "marta",
  "dart",
  "metrolink",
  "caltrain",
  "sounder",
  "sunrail",
  "trirail",
  "vre",
  "marc",
  "ace",
  "coaster",
  "smart",
  "frontrunner",
  "capmetro",
]);

const sourceLogoUrls = {
  njt: "logos/NJT_logo.svg",
  mta: "logos/MTA_NYC_logo.svg",
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
};

const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida",
  "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const featuredRailcams = [
  { name: "Chicago Union Station Area", state: "Illinois", url: "https://www.youtube.com/results?search_query=chicago+union+station+railcam+live" },
  { name: "Cajon Pass", state: "California", url: "https://www.youtube.com/results?search_query=cajon+pass+railcam+live" },
  { name: "Horseshoe Curve", state: "Pennsylvania", url: "https://www.youtube.com/results?search_query=horseshoe+curve+railcam+live" },
  { name: "Rochelle Railfan Park", state: "Illinois", url: "https://www.youtube.com/results?search_query=rochelle+railcam+live" },
  { name: "Folkston Funnel", state: "Georgia", url: "https://www.youtube.com/results?search_query=folkston+funnel+railcam+live" },
  { name: "Virtual Railfan Directory", state: "Multi-State", url: "https://virtualrailfan.com/cams/" },
];

const stateRailcamSearches = usStates.map((state) => ({
  name: `${state} Railcam Search`,
  state,
  url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${state} railcam live`)}`,
}));

const railcamFeeds = [...featuredRailcams, ...stateRailcamSearches];

const sightingStates = [...usStates, "District of Columbia", "Ontario", "Quebec", "British Columbia", "Alberta"];

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

const elements = {
  list: document.getElementById("train-list"),
  board: document.getElementById("station-board"),
  trainDetail: document.getElementById("train-detail"),
  floatingSearch: document.querySelector(".floating-search"),
  lastUpdated: document.getElementById("last-updated"),
  tooltip: document.getElementById("train-tooltip"),
  search: document.getElementById("search"),
  source: document.getElementById("source"),
  status: document.getElementById("status"),
  refresh: document.getElementById("refresh"),
  toggleSearch: document.getElementById("toggle-search"),
  toggleRoutes: document.getElementById("toggle-routes"),
  toggleStations: document.getElementById("toggle-stations"),
  toggleTheme: document.getElementById("toggle-theme"),
  toggleFreight: document.getElementById("toggle-freight"),
  toggleHeritage: document.getElementById("toggle-heritage"),
  toggleSpecialInterest: document.getElementById("toggle-special-interest"),
  toggleSaved: document.getElementById("toggle-saved"),
  trainCount: document.getElementById("train-count"),
  toggleFilters: document.getElementById("toggle-filters"),
  filterPanel: document.getElementById("filter-panel"),
  floatingList: document.getElementById("floating-list"),
  toggleList: document.getElementById("toggle-list"),
  closeList: document.getElementById("close-list"),
  detailModal: document.getElementById("detail-modal"),
  closeModal: document.getElementById("close-modal"),
  railcamModal: document.getElementById("railcam-modal"),
  closeRailcamModal: document.getElementById("close-railcam-modal"),
  railcamList: document.getElementById("railcam-list"),
  railcamSearch: document.getElementById("railcam-search"),
  railcamState: document.getElementById("railcam-state"),
  toggleRailcams: document.getElementById("toggle-railcams"),
  toggleSettings: document.getElementById("toggle-settings"),
  toggleDepartureBoard: document.getElementById("toggle-departure-board"),
  departureBoardModal: document.getElementById("departure-board-modal"),
  closeDepartureBoardModal: document.getElementById("close-departure-board-modal"),
  departureBoardRows: document.getElementById("departure-board-rows"),
  departureBoardSource: document.getElementById("departure-board-source"),
  quickLive: document.getElementById("quick-live"),
  quickDelay: document.getElementById("quick-delay"),
  quickReset: document.getElementById("quick-reset"),
  quickLiveRatio: document.getElementById("quick-live-ratio"),
  contribLinks: document.getElementById("contrib-links"),
  settingsModal: document.getElementById("settings-modal"),
  closeSettingsModal: document.getElementById("close-settings-modal"),
  saveSettings: document.getElementById("save-settings"),
  settingRefreshInterval: document.getElementById("setting-refresh-interval"),
  settingOpenListDefault: document.getElementById("setting-open-list-default"),
  settingSearchOpenDefault: document.getElementById("setting-search-open-default"),
  settingCompactCards: document.getElementById("setting-compact-cards"),
  settingMapStyle: document.getElementById("setting-map-style"),
  settingThemeMode: document.getElementById("setting-theme-mode"),
  settingFreightLines: document.getElementById("setting-freight-lines"),
  sightingModal: document.getElementById("sighting-modal"),
  closeSightingModal: document.getElementById("close-sighting-modal"),
  sightingModalTitle: document.getElementById("sighting-modal-title"),
  sightingForm: document.getElementById("sighting-form"),
  sightingType: document.getElementById("sighting-type"),
  sightingUploaderName: document.getElementById("sighting-uploader-name"),
  sightingState: document.getElementById("sighting-state"),
  sightingCity: document.getElementById("sighting-city"),
  sightingTrain: document.getElementById("sighting-train"),
  sightingRailroad: document.getElementById("sighting-railroad"),
  sightingLocation: document.getElementById("sighting-location"),
  sightingNotes: document.getElementById("sighting-notes"),
  sightingMedia: document.getElementById("sighting-media"),
  sightingUseLocation: document.getElementById("sighting-use-location"),
  sightingStatus: document.getElementById("sighting-status"),
  btnLocate: document.getElementById("btn-locate"),
  btnNearestCrossing: document.getElementById("btn-nearest-crossing"),
  btnFitTrains: document.getElementById("btn-fit-trains"),
  toggleLandmarks: document.getElementById("toggle-landmarks"),
  toggle3d: document.getElementById("toggle-3d"),
  toggleStyle: document.getElementById("toggle-style"),
};

const defaultUiSettings = {
  refreshSeconds: 10,
  openListDefault: true,
  searchOpenDefault: true,
  compactCards: false,
  mapStyle: "dark",
  themeMode: "dark",
  freightVisible: false,
};

const UI_SETTINGS_KEY = "ort-ui-settings-v2";

const state = {
  map: null,
  routesVisible: true,
  stationsVisible: true,
  trains: [],
  commuterTrains: [],
  stations: [],
  commuterStations: [],
  routes: [],
  commuterRoutes: [],
  routeLines: new Map(),
  routeGeometriesBySource: new Map(),
  routeGeometriesBySourceAndName: new Map(),
  routeGeometriesAll: [],
  trainIndex: new Map(),
  selectedStation: null,
  config: null,
  showSavedOnly: false,
  savedTrains: new Set(),
  selectedTrain: null,
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
  photoSelectionToken: 0,
  quickMode: "all",
  uiSettings: { ...defaultUiSettings },
  refreshTimer: null,
  /** Set when /api/trains fails or returns an error body; cleared on success with data. */
  dataLoadHint: null,
  locationMarker: null,
  userLocation: null,
  crossingMarker: null,
  nearestCrossing: null,
  sightings: [],
  sightingMarkers: new Map(),
  routePopup: null,
  mapStyle: "dark",       // dark | light | satellite | topo
  freightVisible: false,
  buildings3dVisible: false,
  trainLayerEventsBound: false,
  landmarksVisible: false,
  landmarkModelsEnabled: false,
  landmarkCustomLayerAdded: false,
  landmarkModelAssets: [],
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

function ensureTrainLayers() {
  const map = state.map;
  if (!map || !map.getSource("trains")) return;

  if (map.getLayer("trains-fill")) {
    map.removeLayer("trains-fill");
  }

  if (!map.getLayer("trains-delay")) {
    map.addLayer({
      id: "trains-delay",
      type: "circle",
      source: "trains",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 10.8, 8, 14.2, 14, 17.6],
        "circle-color": "rgba(0,0,0,0.38)",
        "circle-opacity": ["case", ["==", ["get", "realTime"], true], 0.9, 0.55],
      },
    });
  }

  if (!map.getLayer("trains-ring")) {
    map.addLayer({
      id: "trains-ring",
      type: "circle",
      source: "trains",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 9.4, 8, 12.6, 14, 15.8],
        "circle-color": ["coalesce", ["get", "lineColor"], "#0039a6"],
        "circle-stroke-color": "rgba(0,0,0,0.90)",
        "circle-stroke-width": 1.2,
        "circle-opacity": ["case", ["==", ["get", "realTime"], true], 1, 0.72],
      },
    });
  }

  if (!map.getLayer("trains-label")) {
    map.addLayer({
      id: "trains-label",
      type: "symbol",
      source: "trains",
      layout: {
        "text-field": ["coalesce", ["get", "markerText"], ""],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 3, 8.8, 10, 10.4, 14, 11.6],
        "text-line-height": 1,
        "text-letter-spacing": 0.02,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-optional": true,
      },
      paint: {
        "text-color": "#f5f5f5",
        "text-halo-color": "rgba(0,0,0,0.75)",
        "text-halo-width": 1.25,
      },
    });
  }

  if (!map.getLayer("trains-arrow")) {
    map.addLayer({
      id: "trains-arrow",
      type: "symbol",
      source: "trains",
      filter: ["==", ["get", "hasHeading"], true],
      layout: {
        "text-field": "▲",
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 3, 8.8, 10, 10.2, 14, 11.8],
        "text-offset": [0, -1.45],
        "text-rotate": ["coalesce", ["get", "headingDegrees"], 0],
        "text-rotation-alignment": "map",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-optional": true,
      },
      paint: {
        "text-color": "#f8fafc",
        "text-halo-color": "rgba(0,0,0,0.68)",
        "text-halo-width": 1,
      },
    });
  }

  if (!map.getLayer("trains-hit")) {
    map.addLayer({
      id: "trains-hit",
      type: "circle",
      source: "trains",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 14, 8, 18, 14, 24],
        "circle-opacity": 0,
      },
    });
  }

  // Bind once (handlers survive style changes; layers are recreated by id).
  if (!state.trainLayerEventsBound) {
    map.on("mouseenter", "trains-hit", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "trains-hit", () => {
      map.getCanvas().style.cursor = "";
      hideTrainTooltip();
    });
    map.on("mousemove", "trains-hit", (event) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;
      if (!id) return;
      const train = state.trainIndex.get(id);
      if (!train) return;
      const { clientX: x, clientY: y } = event.originalEvent;
      showTrainTooltip(train, x, y);
    });
    map.on("click", "trains-hit", (event) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;
      if (!id) return;
      const train = state.trainIndex.get(id);
      if (!train) return;
      selectTrain(train);
    });
    state.trainLayerEventsBound = true;
  }
}

function loadUiSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(UI_SETTINGS_KEY) || "{}");
    state.uiSettings = {
      refreshSeconds: [10, 20, 30, 60].includes(Number(raw.refreshSeconds))
        ? Number(raw.refreshSeconds)
        : defaultUiSettings.refreshSeconds,
      openListDefault: true,
      searchOpenDefault:
        typeof raw.searchOpenDefault === "boolean"
          ? raw.searchOpenDefault
          : defaultUiSettings.searchOpenDefault,
      compactCards:
        typeof raw.compactCards === "boolean"
          ? raw.compactCards
          : defaultUiSettings.compactCards,
      mapStyle: MAP_STYLE_CYCLE.includes(raw.mapStyle)
        ? raw.mapStyle
        : defaultUiSettings.mapStyle,
      themeMode: raw.themeMode === "light" || raw.themeMode === "dark"
        ? raw.themeMode
        : defaultUiSettings.themeMode,
      freightVisible:
        typeof raw.freightVisible === "boolean"
          ? raw.freightVisible
          : defaultUiSettings.freightVisible,
    };
  } catch {
    state.uiSettings = { ...defaultUiSettings };
  }
}

function persistUiSettings() {
  try {
    localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(state.uiSettings));
  } catch {
    // ignore storage failures
  }
}

function applyUiSettingsToDom() {
  document.body.classList.toggle("compact-cards", Boolean(state.uiSettings.compactCards));
  if (elements.settingRefreshInterval) {
    elements.settingRefreshInterval.value = String(state.uiSettings.refreshSeconds);
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
  if (elements.settingMapStyle) {
    elements.settingMapStyle.value = state.uiSettings.mapStyle || "dark";
  }
  if (elements.settingThemeMode) {
    elements.settingThemeMode.value = state.uiSettings.themeMode || "dark";
  }
  if (elements.settingFreightLines) {
    elements.settingFreightLines.checked = Boolean(state.uiSettings.freightVisible);
  }
}

function scheduleRefresh() {
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
  }
  const seconds = Number(state.uiSettings.refreshSeconds) || 10;
  state.refreshTimer = setInterval(refreshData, seconds * 1000);
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

async function locateMe() {
  try {
    const pos = await getCurrentLocation();
    const { longitude, latitude } = pos.coords;
    state.userLocation = { lon: longitude, lat: latitude };
    state.map?.flyTo({ center: [longitude, latitude], zoom: 10, duration: 1200 });
    if (!state.locationMarker) {
      const el = document.createElement("div");
      el.className = "location-dot";
      state.locationMarker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([longitude, latitude])
        .addTo(state.map);
    } else {
      state.locationMarker.setLngLat([longitude, latitude]);
    }
    return state.userLocation;
  } catch {
    return null;
  }
}

function fitToTrains() {
  if (!state.map) return;
  const allTrains = [...state.trains, ...state.commuterTrains];
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

function ensureFreightLayer() {
  if (!state.map) return;
  if (!state.map.getSource("freight-lines")) {
    state.map.addSource("freight-lines", {
      type: "raster",
      tiles: [
        "https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
        "https://b.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
        "https://c.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenRailwayMap / OpenStreetMap contributors",
      maxzoom: 19,
    });
  }
  if (!state.map.getLayer("freight-lines")) {
    state.map.addLayer({
      id: "freight-lines",
      type: "raster",
      source: "freight-lines",
      paint: {
        "raster-opacity": 0.55,
      },
    });
  }
}

function setFreightVisible(visible) {
  state.freightVisible = Boolean(visible);
  ensureFreightLayer();
  if (state.map?.getLayer("freight-lines")) {
    state.map.setLayoutProperty("freight-lines", "visibility", state.freightVisible ? "visible" : "none");
  }
  elements.toggleFreight?.setAttribute("data-active", String(state.freightVisible));
}

function ensureCrossingRouteLayer() {
  if (!state.map) return;
  if (!state.map.getSource("crossing-route")) {
    state.map.addSource("crossing-route", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!state.map.getLayer("crossing-route")) {
    state.map.addLayer({
      id: "crossing-route",
      type: "line",
      source: "crossing-route",
      paint: {
        "line-color": "#22c55e",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2, 10, 4, 14, 6],
        "line-dasharray": [1.2, 1.2],
        "line-opacity": 0.9,
      },
    });
  }
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

function openDirectionsToCrossing(crossing) {
  if (!crossing || !state.userLocation) return;
  const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${state.userLocation.lat},${state.userLocation.lon}`)}&destination=${encodeURIComponent(`${crossing.lat},${crossing.lon}`)}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function loadSightings() {
  const payload = await safeFetchJson("/api/sightings", { sightings: [] });
  state.sightings = Array.isArray(payload?.sightings) ? payload.sightings : [];
  renderSightings();
}

function renderSightings() {
  if (!state.map) return;
  const seen = new Set();

  state.sightings.forEach((sighting) => {
    const lat = Number(sighting.lat);
    const lon = Number(sighting.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const key = `${sighting.id}`;
    seen.add(key);
    let marker = state.sightingMarkers.get(key);

    if (!marker) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `sighting-marker ${sighting.type === "heritage" ? "heritage" : "special-interest"}`;
      el.textContent = sighting.type === "heritage" ? "H" : "SI";
      el.title = sighting.trainLabel || "Sighting";
      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lon, lat])
        .addTo(state.map);
      el.addEventListener("click", () => {
        const locationText = [sighting.city, sighting.state].filter(Boolean).join(", ");
        const media = sighting.mediaType?.startsWith("video/")
          ? `<video src="${sighting.mediaUrl}" controls playsinline class="sighting-media"></video>`
          : `<img src="${sighting.mediaUrl}" alt="Sighting" class="sighting-media" />`;
        const html = `
          <div class="route-popup-inner">
            <strong>${sighting.type === "heritage" ? "Heritage Unit" : "Special Interest"}</strong>
            <span>${sighting.trainLabel || "Unknown train"}${sighting.railroad ? ` • ${sighting.railroad}` : ""}</span>
            ${sighting.uploaderName ? `<span>Uploaded by: ${sighting.uploaderName}</span>` : ""}
            ${locationText ? `<span>${locationText}</span>` : ""}
            ${media}
            ${sighting.notes ? `<span>${sighting.notes}</span>` : ""}
          </div>
        `;
        new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "300px" })
          .setLngLat([lon, lat])
          .setHTML(html)
          .addTo(state.map);
      });
      marker = m;
      state.sightingMarkers.set(key, marker);
    } else {
      marker.setLngLat([lon, lat]);
    }
  });

  Array.from(state.sightingMarkers.entries()).forEach(([key, marker]) => {
    if (seen.has(key)) return;
    marker.remove();
    state.sightingMarkers.delete(key);
  });
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

function openSightingModal(type) {
  const normalized = type === "special-interest" ? "special-interest" : "heritage";
  elements.sightingForm?.reset();
  if (elements.sightingType) elements.sightingType.value = normalized;
  if (elements.sightingModalTitle) {
    elements.sightingModalTitle.textContent = normalized === "heritage"
      ? "Upload Heritage Unit"
      : "Upload Special Interest";
  }
  populateSightingStates();
  populateSightingCities("");
  if (elements.sightingStatus) elements.sightingStatus.textContent = "";
  elements.sightingModal?.classList.add("active");
}

function closeSightingModal() {
  elements.sightingModal?.classList.remove("active");
}

async function submitSightingUpload(event) {
  event.preventDefault();
  const type = elements.sightingType?.value || "heritage";
  const uploaderName = `${elements.sightingUploaderName?.value || ""}`.trim();
  const sightingState = `${elements.sightingState?.value || ""}`.trim();
  const sightingCity = `${elements.sightingCity?.value || ""}`.trim();
  const trainLabel = `${elements.sightingTrain?.value || ""}`.trim();
  const file = elements.sightingMedia?.files?.[0];
  if (!uploaderName || !sightingState || !sightingCity || !trainLabel || !file) {
    if (elements.sightingStatus) {
      elements.sightingStatus.textContent = "Uploader, state, city, train, and media are required.";
    }
    return;
  }

  if (elements.sightingStatus) elements.sightingStatus.textContent = "Uploading…";

  const payload = new FormData();
  payload.append("type", type);
  payload.append("uploaderName", uploaderName);
  payload.append("state", sightingState);
  payload.append("city", sightingCity);
  payload.append("trainLabel", trainLabel);
  payload.append("railroad", `${elements.sightingRailroad?.value || ""}`.trim());
  payload.append("locationText", `${elements.sightingLocation?.value || ""}`.trim());
  payload.append("notes", `${elements.sightingNotes?.value || ""}`.trim());
  payload.append("media", file);
  if (state.userLocation) {
    payload.append("lat", `${state.userLocation.lat}`);
    payload.append("lon", `${state.userLocation.lon}`);
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

async function findNearestCrossing() {
  const loc = await locateMe();
  if (!loc || !state.map) return;

  const query = `[out:json][timeout:15];(node["railway"="level_crossing"](around:12000,${loc.lat},${loc.lon}););out body;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  let payload;
  try {
    const response = await fetch(url);
    if (!response.ok) return;
    payload = await response.json();
  } catch {
    return;
  }

  const candidates = Array.isArray(payload?.elements)
    ? payload.elements
        .map((row) => ({
          id: row.id,
          lat: Number(row.lat),
          lon: Number(row.lon),
          name: row.tags?.name || "Rail crossing",
        }))
        .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon))
    : [];

  if (candidates.length === 0) return;

  const nearest = candidates
    .map((row) => ({ ...row, miles: haversineMiles({ lat: loc.lat, lon: loc.lon }, { lat: row.lat, lon: row.lon }) }))
    .sort((a, b) => a.miles - b.miles)[0];
  if (!nearest) return;
  state.nearestCrossing = nearest;

  if (!state.crossingMarker) {
    const el = document.createElement("div");
    el.className = "crossing-dot";
    state.crossingMarker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([nearest.lon, nearest.lat])
      .addTo(state.map);
  } else {
    state.crossingMarker.setLngLat([nearest.lon, nearest.lat]);
  }

  ensureCrossingRouteLayer();
  const route = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [loc.lon, loc.lat],
            [nearest.lon, nearest.lat],
          ],
        },
        properties: {},
      },
    ],
  };
  state.map.getSource("crossing-route")?.setData(route);

  const popupHtml = `<div class="route-popup-inner"><strong>Nearest Crossing</strong><span>${nearest.name} • ${nearest.miles.toFixed(2)} mi</span></div>`;
  new maplibregl.Popup({ closeButton: true, closeOnClick: true })
    .setLngLat([nearest.lon, nearest.lat])
    .setHTML(popupHtml)
    .addTo(state.map);

  state.map.fitBounds(
    [
      [Math.min(loc.lon, nearest.lon), Math.min(loc.lat, nearest.lat)],
      [Math.max(loc.lon, nearest.lon), Math.max(loc.lat, nearest.lat)],
    ],
    { padding: 70, duration: 800 }
  );
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "--";
  const now = Date.now();
  const diff = Math.floor((now - new Date(timestamp).getTime()) / 1000);
  
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function updateTimestamp() {
  if (state.lastUpdateTime && elements.lastUpdated) {
    const timeAgo = formatTimeAgo(state.lastUpdateTime);
    elements.lastUpdated.textContent = `Updated ${timeAgo}`;
    elements.lastUpdated.classList.remove("updating");
  }
}

function renderContributions() {
  if (!elements.contribLinks) return;
  if (state.backendReachable === false) {
    elements.contribLinks.replaceChildren();
    const hint = document.createElement("span");
    hint.className = "contrib-api-warning";
    const target = API_BASE || "your backend URL";
    hint.textContent = `Cannot reach API (${target}). GitHub Pages: set Actions secret ORT_API_BACKEND_URL to your Render https URL, redeploy “Deploy to GitHub Pages”, or add ?apiBase=YOUR_URL to this page.`;
    elements.contribLinks.appendChild(hint);
    return;
  }
  const contributions = Array.isArray(state.config?.contributions)
    ? state.config.contributions
    : [];
  if (contributions.length === 0) {
    elements.contribLinks.textContent = "Credits unavailable";
    return;
  }
  elements.contribLinks.innerHTML = contributions
    .map(
      (entry) =>
        `<a href="${entry.url}" target="_blank" rel="noopener noreferrer">${entry.name}</a>`
    )
    .join("<span>•</span>");
}

function setQuickMode(mode) {
  state.quickMode = mode;
  elements.quickLive?.setAttribute("data-active", String(mode === "live"));
  elements.quickDelay?.setAttribute("data-active", String(mode === "delayed"));
  renderTrains(applyFilters(getAllTrains()));
}

function renderQuickRatio(trains) {
  if (!elements.quickLiveRatio) return;
  const total = trains.length;
  const live = trains.filter((train) => Boolean(train.realTime)).length;
  elements.quickLiveRatio.textContent = `Live ${live}/${total}`;
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
  return train.actual || train.eta || train.scheduled || "--:--";
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
      return {
        time: displayTime,
        sortValue: parseBoardMinutes(displayTime),
        trainId: formatMarkerLabel(train),
        railroad: sources[train.source]?.label || train.source,
        destination: train.nextStop || train.route || "--",
        status: formatStatusLabel(train),
        track: train.platform || train.track || "--",
        live: Boolean(train.realTime),
      };
    })
    .sort((a, b) => a.sortValue - b.sortValue)
    .slice(0, 32);

  if (rows.length === 0) {
    elements.departureBoardRows.innerHTML = '<div class="departure-board-empty">No departures available</div>';
    return;
  }

  elements.departureBoardRows.innerHTML = rows
    .map(
      (row) => `
      <div class="departure-board-grid departure-board-row ${row.live ? "live" : "scheduled"}">
        <span class="flip-cell">${row.time}</span>
        <span class="flip-cell">${row.trainId}</span>
        <span class="flip-cell">${row.railroad}</span>
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
  const states = [...new Set(railcamFeeds.map((cam) => cam.state).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  elements.railcamState.innerHTML = '<option value="all">All states</option>';
  states.forEach((state) => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    elements.railcamState.appendChild(option);
  });
}

function renderRailcams() {
  if (!elements.railcamList) return;
  const search = `${elements.railcamSearch?.value || ""}`.trim().toLowerCase();
  const stateFilter = elements.railcamState?.value || "all";

  const filtered = railcamFeeds.filter((cam) => {
    const matchesState = stateFilter === "all" || cam.state === stateFilter;
    const haystack = `${cam.name} ${cam.state}`.toLowerCase();
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
      (state) => `
      <section class="railcam-group">
        <h4>${state}</h4>
        ${grouped[state]
          .map(
            (cam) => `
          <a class="railcam-link" href="${cam.url}" target="_blank" rel="noopener noreferrer">
            <span>${cam.name}</span>
            <span>Open</span>
          </a>
        `
          )
          .join("")}
      </section>
    `
    )
    .join("");
}

// Update timestamp every second
setInterval(updateTimestamp, 1000);

function getOperatorColor(source) {
  return operatorColors[source] || "#94a3b8";
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

function isCommuterTrain(train) {
  return commuterSources.has(train.source);
}

function getTrainDisplayColor(train) {
  if (isCommuterTrain(train) && train.lineColor) return train.lineColor;
  return getOperatorColor(train.source);
}

function getOperatorPrefix(source) {
  return sources[source]?.prefix || "T";
}

function formatStatusLabel(train) {
  if (train.realTime) return "Live";
  return train.confidence === "scheduled" ? "Scheduled" : "Estimated";
}

function getSourceMonogram(source) {
  const label = sources[source]?.label || source || "R";
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function getLogoMarkup(source) {
  const logo = sourceLogoUrls[source];
  if (logo) {
    return `<img class="detail-logo" src="${logo}" alt="${sources[source]?.label || source} logo" />`;
  }
  return `<span class="detail-logo-fallback" style="--logo-color:${getOperatorColor(source)}">${getSourceMonogram(
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
  localStorage.setItem("savedTrains", JSON.stringify(Array.from(state.savedTrains)));
}

function applyStoredTheme() {
  let lightMode = state.uiSettings?.themeMode === "light";
  try {
    if (!state.uiSettings?.themeMode) {
      lightMode = localStorage.getItem("ort-theme") === "light";
    }
  } catch {
    lightMode = state.uiSettings?.themeMode === "light";
  }

  document.body.classList.toggle("light", lightMode);
}

function openSettingsModal() {
  applyUiSettingsToDom();
  elements.settingsModal?.classList.add("active");
}

function closeSettingsModal() {
  elements.settingsModal?.classList.remove("active");
}

function getMapStyleUrl(styleName, protomapsKey) {
  switch (styleName) {
    case "light":
      return protomapsKey
        ? `https://api.protomaps.com/styles/v2/light.json?key=${protomapsKey}`
        : null;
    case "satellite":
      // ESRI World Imagery — free, no key needed
      return {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
            maxzoom: 18,
          },
        },
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#000" } },
          { id: "satellite", type: "raster", source: "satellite" },
        ],
      };
    case "topo":
      return {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          topo: {
            type: "raster",
            tiles: [
              "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
              "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
              "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "&copy; OpenTopoMap (CC-BY-SA)",
            maxzoom: 17,
          },
        },
        layers: [
          { id: "background", type: "background", paint: { "background-color": "#d4d4bf" } },
          { id: "topo", type: "raster", source: "topo" },
        ],
      };
    default: // dark
      return protomapsKey
        ? `https://api.protomaps.com/styles/v2/dark.json?key=${protomapsKey}`
        : null;
  }
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

// Style cycle order shown on the button label
const MAP_STYLE_CYCLE = ["dark", "light", "satellite", "topo"];
const MAP_STYLE_LABELS = { dark: "Dark", light: "Light", satellite: "SAT", topo: "Topo" };

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

function readdAppLayers() {
  // After a style change the map is reset; re-add all app sources and layers
  const map = state.map;
  if (!map) return;

  const isLightMode = document.body.classList.contains("light");

  if (!map.getSource("routes")) {
    map.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  if (!map.getLayer("routes-glow")) {
    map.addLayer({ id: "routes-glow", type: "line", source: "routes",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 6, "line-opacity": 0.12, "line-blur": 3 } });
  }
  if (!map.getLayer("routes-line")) {
    map.addLayer({ id: "routes-line", type: "line", source: "routes",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.2, 6, 2.0, 10, 2.8, 14, 4.0],
        "line-opacity": 0.88 } });
  }
  if (!map.getLayer("routes-label")) {
    map.addLayer({ id: "routes-label", type: "symbol", source: "routes", minzoom: 7,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 560,
        "text-field": ["coalesce", ["get", "owner"], ["get", "source"], "Rail"],
        "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 10, 12.5, 14, 14],
        "text-letter-spacing": 0.08,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-rotation-alignment": "map",
        "text-keep-upright": true,
      },
      paint: {
        "text-color": isLightMode ? "#111827" : "#f8fafc",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.98)" : "rgba(8,12,20,0.98)",
        "text-halo-width": 1.8,
      } });
  }
  if (!map.getLayer("routes-hit")) {
    map.addLayer({ id: "routes-hit", type: "line", source: "routes",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#000000", "line-opacity": 0,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 12, 8, 18, 14, 26] } });
  }

  if (!map.getSource("stations")) {
    map.addSource("stations", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  if (!map.getLayer("stations")) {
    map.addLayer({ id: "stations", type: "circle", source: "stations", minzoom: 7,
      paint: { "circle-radius": 4, "circle-color": ["get", "color"], "circle-opacity": 0.9,
        "circle-stroke-color": "rgba(0,0,0,0.5)", "circle-stroke-width": 1 } });
  }
  if (!map.getLayer("station-labels")) {
    map.addLayer({ id: "station-labels", type: "symbol", source: "stations", minzoom: 8.5,
      layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11,
        "text-anchor": "top", "text-offset": [0, 0.7], "text-optional": true, "text-max-width": 8 },
      paint: { "text-color": isLightMode ? "#1e293b" : "#e2e8f0",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.92)" : "rgba(10,10,10,0.92)",
        "text-halo-width": 1.5 } });
  }

  if (!map.getSource("trains")) {
    map.addSource("trains", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  }
  ensureTrainLayers();
  ensureLandmarkLayers();

  // Re-attach click listeners
  map.on("click", "stations", (event) => {
    const feature = event.features?.[0];
    const id = feature?.properties?.id;
    if (!id) return;
    const station = state.stations.find((row) => `${row.id}` === `${id}`);
    if (station) selectStation(station);
  });
  map.on("mouseenter", "stations", () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "stations", () => { map.getCanvas().style.cursor = ""; });
  map.on("mouseenter", "routes-hit", (e) => {
    map.getCanvas().style.cursor = "crosshair";
    const props = e.features?.[0]?.properties || {};
    const name = props.name || props.source || "Rail Route";
    const src = sources[props.source]?.label || props.source || "";
    const html = `<div class="route-popup-inner"><strong>${name}</strong>${src ? `<span>${src}</span>` : ""}</div>`;
    state.routePopup?.setLngLat(e.lngLat).setHTML(html).addTo(map);
  });
  map.on("mousemove", "routes-hit", (e) => { state.routePopup?.setLngLat(e.lngLat); });
  map.on("mouseleave", "routes-hit", () => { map.getCanvas().style.cursor = ""; state.routePopup?.remove(); });

  if (state.buildings3dVisible) add3dBuildingsLayer();

  // Re-render data
  renderRoutes([...(state.routes || []), ...(state.commuterRoutes || [])]);
  renderStations([...(state.stations || []), ...(state.commuterStations || [])]);
  renderLandmarks();
  renderTrains(applyFilters(getAllTrains()));
  renderSightings();
  setFreightVisible(state.freightVisible);
}

function switchMapStyle(styleName) {
  if (!state.map) return;
  const protomapsKey = state.config?.protomapsKey || "";
  const styleArg = getMapStyleUrl(styleName, protomapsKey);
  const style = styleArg || getRasterFallback(styleName);

  state.mapStyle = styleName;
  if (elements.toggleStyle) {
    const next = MAP_STYLE_CYCLE[(MAP_STYLE_CYCLE.indexOf(styleName) + 1) % MAP_STYLE_CYCLE.length];
    elements.toggleStyle.setAttribute("data-style", styleName);
    elements.toggleStyle.title = `Style: ${MAP_STYLE_LABELS[styleName]} → click for ${MAP_STYLE_LABELS[next]}`;
  }

  // Swap style then reattach app layers once idle
  state.map.setStyle(style);
  state.map.once("styledata", () => {
    readdAppLayers();
    setFreightVisible(state.freightVisible);
  });
}

function initMap() {
  const isLightMode = document.body.classList.contains("light");
  state.mapStyle = MAP_STYLE_CYCLE.includes(state.uiSettings?.mapStyle)
    ? state.uiSettings.mapStyle
    : (isLightMode ? "light" : "dark");

  const protomapsKey = state.config?.protomapsKey || "";
  const configuredLightStyle =
    state.config?.protomapsLightStyleUrl ||
    (typeof state.config?.protomapsStyleUrl === "string" && state.config.protomapsStyleUrl.includes("/dark.json")
      ? state.config.protomapsStyleUrl.replace("/dark.json", "/light.json")
      : null);
  const configuredDarkStyle =
    state.config?.protomapsStyleUrl ||
    (typeof state.config?.protomapsLightStyleUrl === "string" && state.config.protomapsLightStyleUrl.includes("/light.json")
      ? state.config.protomapsLightStyleUrl.replace("/light.json", "/dark.json")
      : null);
  const vectorStyle =
    state.mapStyle === "light"
      ? configuredLightStyle || (protomapsKey ? `https://api.protomaps.com/styles/v2/light.json?key=${protomapsKey}` : null)
      : configuredDarkStyle || (protomapsKey ? `https://api.protomaps.com/styles/v2/dark.json?key=${protomapsKey}` : null);
  const style =
    state.mapStyle === "dark" || state.mapStyle === "light"
      ? vectorStyle || getRasterFallback(state.mapStyle)
      : getMapStyleUrl(state.mapStyle, protomapsKey) || getRasterFallback("dark");

  state.map = new maplibregl.Map({
    container: "map",
    style,
    center: [-98.35, 39.5],
    zoom: 4,
    minZoom: 3,
    maxZoom: 18,
    renderWorldCopies: true,
    projection: "mercator",
    attributionControl: true,
    pitchWithRotate: true,
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
  state.map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "imperial" }), "bottom-left");

  // Sync toggle-style label to current style
  if (elements.toggleStyle) {
    const next = MAP_STYLE_CYCLE[(MAP_STYLE_CYCLE.indexOf(state.mapStyle) + 1) % MAP_STYLE_CYCLE.length];
    elements.toggleStyle.setAttribute("data-style", state.mapStyle);
    elements.toggleStyle.title = `Style: ${MAP_STYLE_LABELS[state.mapStyle]} → click for ${MAP_STYLE_LABELS[next]}`;
  }

  state.map.on("load", () => {
    state.map.addSource("routes", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    state.map.addLayer({
      id: "routes-glow",
      type: "line",
      source: "routes",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 6,
        "line-opacity": 0.12,
        "line-blur": 3,
      },
    });

    state.map.addLayer({
      id: "routes-line",
      type: "line",
      source: "routes",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          3, 1.2,
          6, 2.0,
          10, 2.8,
          14, 4.0
        ],
        "line-opacity": 0.88,
      },
    });

    state.map.addLayer({
      id: "routes-label",
      type: "symbol",
      source: "routes",
      minzoom: 7,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 560,
        "text-field": ["coalesce", ["get", "owner"], ["get", "source"], "Rail"],
        "text-font": ["Noto Sans Bold"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          6, 10,
          10, 12.5,
          14, 14
        ],
        "text-letter-spacing": 0.08,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-rotation-alignment": "map",
        "text-keep-upright": true,
      },
      paint: {
        "text-color": isLightMode ? "#111827" : "#f8fafc",
        "text-halo-color": isLightMode ? "rgba(255,255,255,0.98)" : "rgba(8,12,20,0.98)",
        "text-halo-width": 1.8,
      },
    });

    // Wide transparent hit target so route hover popups are easy to trigger
    state.map.addLayer({
      id: "routes-hit",
      type: "line",
      source: "routes",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#000000",
        "line-opacity": 0,
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          3, 12,
          8, 18,
          14, 26
        ],
      },
    });

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
        "circle-radius": 4,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.9,
        "circle-stroke-color": "rgba(0,0,0,0.5)",
        "circle-stroke-width": 1,
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

    state.map.addSource("trains", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    ensureTrainLayers();
    ensureLandmarkLayers();

    if (state.map.getLayer("background")) {
      state.map.setPaintProperty("background", "background-color", isLightMode ? "#eef2f6" : "#0b1220");
    }

    state.map.on("click", "stations", (event) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;
      if (!id) return;
      const station = state.stations.find((row) => `${row.id}` === `${id}`);
      if (station) selectStation(station);
    });

    state.map.on("mouseenter", "stations", () => {
      state.map.getCanvas().style.cursor = "pointer";
    });

    state.map.on("mouseleave", "stations", () => {
      state.map.getCanvas().style.cursor = "";
    });

    // Route line hover — show route name popup
    state.routePopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "route-popup",
      maxWidth: "240px",
      offset: 6,
    });

    state.map.on("mouseenter", "routes-hit", (e) => {
      state.map.getCanvas().style.cursor = "crosshair";
      const props = e.features?.[0]?.properties || {};
      const name = props.name || props.source || "Rail Route";
      const src = sources[props.source]?.label || props.source || "";
      const html = `<div class="route-popup-inner"><strong>${name}</strong>${src ? `<span>${src}</span>` : ""}</div>`;
      state.routePopup.setLngLat(e.lngLat).setHTML(html).addTo(state.map);
    });

    state.map.on("mousemove", "routes-hit", (e) => {
      state.routePopup.setLngLat(e.lngLat);
    });

    state.map.on("mouseleave", "routes-hit", () => {
      state.map.getCanvas().style.cursor = "";
      state.routePopup.remove();
    });

    renderRoutes([...(state.routes || []), ...(state.commuterRoutes || [])]);
    renderStations(state.stations || []);
    renderLandmarks();
    renderTrains(applyFilters(getAllTrains()));
    renderSightings();
    setFreightVisible(state.freightVisible);

    // Attempt to add 3D buildings if already in 3D mode (e.g. restored from session)
    if (state.buildings3dVisible) add3dBuildingsLayer();
  });

  state.map.on("error", (event) => {
    if (event?.error) {
      elements.lastUpdated.textContent = "Map tiles unavailable.";
    }
  });

  state.map.on("move", () => {
    if (state.hoveredTrain && state.hoveredMouseX != null) {
      showTrainTooltip(state.hoveredTrain, state.hoveredMouseX, state.hoveredMouseY);
    }
  });
}

function formatMarkerLabel(train) {
  const prefix = getOperatorPrefix(train.source);
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

function normalizeStatus(status) {
  return `${status || ""}`.trim().toLowerCase();
}

function inferDelayFromStatus(status) {
  const normalized = normalizeStatus(status);
  if (!normalized) return null;
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

function delayColor(delayMinutes, status) {
  const resolvedDelay = resolveDelayMinutes(delayMinutes, status);
  if (resolvedDelay == null || Number.isNaN(resolvedDelay)) return "#64748b";
  if (resolvedDelay < 0) return "#22c55e";
  if (resolvedDelay <= 5) return "#22c55e";
  if (resolvedDelay <= 15) return "#facc15";
  if (resolvedDelay <= 30) return "#fb923c";
  return "#ef4444";
}

function syncTrainMarkers(trains) {
  if (!state.map) return;

  const seen = new Set();

  trains.forEach((train) => {
    const coords = snapTrainToRoute(train, normalizeLngLat(train.lat, train.lon, train.source));
    if (!coords) return;

    const key = `${train.source}:${train.id}`;
    const label = formatMarkerLabel(train);
    // Subway bullet style: operator color = circle background, delay = ring color
    const bulletColor = train.lineColor || getTrainDisplayColor(train);
    const ringColor   = delayColor(train.delayMinutes, train.status);
    seen.add(key);

    let entry = state.trainMarkers.get(key);
    if (!entry) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "train-bullet-marker";

      const marker = new maplibregl.Marker({
        element,
        anchor: "center",
      })
        .setLngLat([coords.lon, coords.lat])
        .addTo(state.map);

      const entryRef = { marker, element, train };

      element.addEventListener("mouseenter", (e) => {
        showTrainTooltip(entryRef.train, e.clientX, e.clientY);
        state.map.getCanvas().style.cursor = "pointer";
      });

      element.addEventListener("mousemove", (e) => {
        showTrainTooltip(entryRef.train, e.clientX, e.clientY);
      });

      element.addEventListener("mouseleave", () => {
        hideTrainTooltip();
        state.map.getCanvas().style.cursor = "";
      });

      element.addEventListener("click", () => {
        selectTrain(entryRef.train);
      });

      entry = entryRef;
      state.trainMarkers.set(key, entry);
    }

    entry.train = train;
    const markerPrefix = label.slice(0, 1);
    const markerNumber = label.slice(1) || "000";
    const deg = compassToDegrees(train.heading);
    const arrowHtml =
      train.realTime && deg !== null
        ? `<span class="heading-arrow" style="transform:rotate(${deg}deg)" aria-hidden="true"></span>`
        : "";
    entry.element.innerHTML = `${arrowHtml}<span class="bullet-prefix">${markerPrefix}</span><span class="bullet-num">${markerNumber}</span>`;
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
  if (resolvedDelay < 0) return `${Math.abs(resolvedDelay)} min early`;
  if (resolvedDelay <= 0) {
    const normalized = normalizeStatus(status);
    if (normalized.includes("arriv")) return "Arrived";
    return "On time";
  }
  return `+${resolvedDelay} min late`;
}

const sourceBounds = {
  amtrak: { minLon: -130, maxLon: -60, minLat: 20, maxLat: 55 },
  amtraker: { minLon: -130, maxLon: -60, minLat: 20, maxLat: 55 },
  brightline: { minLon: -90, maxLon: -78, minLat: 24, maxLat: 33 },
  via: { minLon: -141, maxLon: -52, minLat: 38, maxLat: 84 },
  metra: { minLon: -90, maxLon: -86, minLat: 41, maxLat: 43.2 },
  mta: { minLon: -80, maxLon: -71, minLat: 40, maxLat: 44.5 },
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

// Find route geometry for a train by matching its normalized route label against
// route names in order: exact → prefix (route name is prefix of train route) → substring.
function findNamedLinesByPrefix(trainRouteName, byNameMap) {
  if (!trainRouteName || !byNameMap) return [];
  // 1. Exact match
  const exact = byNameMap.get(trainRouteName);
  if (exact && exact.length > 0) return exact;
  // 2. Prefix match: a route name is the start of the train route label
  //    e.g. "montauk branch jamaica" matches route "montauk branch"
  for (const [routeName, lines] of byNameMap) {
    if (routeName.length >= 3 && trainRouteName.startsWith(routeName + " ")) {
      if (lines.length > 0) return lines;
    }
  }
  // 3. Substring match: route name appears anywhere in the train route label
  //    e.g. "harlem grand central" matches route "harlem"
  for (const [routeName, lines] of byNameMap) {
    if (routeName.length >= 4 && trainRouteName.includes(routeName)) {
      if (lines.length > 0) return lines;
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
    return { lon: aLon, lat: aLat, distance2: dx * dx + dy * dy };
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

function snapTrainToRoute(train, coords) {
  if (!coords || state.routeGeometriesAll.length === 0) return coords;

  const sourceLines = state.routeGeometriesBySource.get(train.source) || [];
  const byNameMap = state.routeGeometriesBySourceAndName.get(train.source);
  const routeName = normalizeRouteName(train.route || train.name);
  const namedLines = findNamedLinesByPrefix(routeName, byNameMap);

  // Conservative snap only: never move a marker far from its live GPS point.
  // This completely prevents teleports into oceans/other regions.
  let best = null;
  let maxSnapDistance = 0.05; // ~5.5km

  if (namedLines.length > 0) {
    best = findClosestProjectionOnLines(coords, namedLines);
    maxSnapDistance = 0.08; // ~9km if we have a confident route-name match
  } else if (sourceLines.length > 0) {
    best = findClosestProjectionOnLines(coords, sourceLines);
  }

  if (!best) return coords;
  if (best.distance2 > maxSnapDistance * maxSnapDistance) return coords;
  return { lat: best.lat, lon: best.lon };
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

function showTrainTooltip(train, x, y) {
  if (!elements.tooltip || x == null) return;
  elements.tooltip.style.left = `${x}px`;
  elements.tooltip.style.top  = `${y}px`;
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
  
  elements.tooltip.innerHTML = `
    <strong style="color:${getTrainDisplayColor(train)}">${train.name}</strong> ${formatMarkerLabel(train)}<br />
    ${sources[train.source]?.label || train.source}<br />
    Route: ${train.route || "--"}<br />
    Next: ${train.nextStop || "--"}<br />
    ETA: ${etaText} · Sched: ${schedText}<br />
    Speed: ${speedText} · Heading: ${headingText}<br />
    ${delayLabel(train.delayMinutes, train.status)}
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

function renderRoutes(routes) {
  state.routes = routes;

  const seen = new Set();
  const features = [];
  const routeGeometriesBySource = new Map();
  const routeGeometriesBySourceAndName = new Map();
  const routeGeometriesAll = [];

  routes.forEach((route) => {
    // Support both new {geometry} format and old {polyline} fallback
    let geometry = route.geometry;
    if (!geometry && route.polyline && route.polyline.length > 0) {
      geometry = { type: "LineString", coordinates: route.polyline };
    }
    if (!geometry) return;

    const flattened = flattenGeometryToLines(geometry);
    if (flattened.length === 0) return;
    const normalizedGeometry =
      flattened.length === 1
        ? { type: "LineString", coordinates: flattened[0] }
        : { type: "MultiLineString", coordinates: flattened };

    const color = resolveRouteColor(route);
    const signatureParts = flattened.map((line) => buildRouteSignature(line));
    // Dedup by source/name/color + actual geometry signature (not by id, ids can collide)
    const sigKey = `${route.source || ""}|${route.name || ""}|${color}|${signatureParts.join("||")}`;  
    if (seen.has(sigKey)) return;
    seen.add(sigKey);

    features.push({
      type: "Feature",
      geometry: normalizedGeometry,
      properties: {
        color,
        name: route.name || "",
        source: route.source || "",
        owner: sources[route.source]?.label || route.source || "Rail",
      },
    });

    const sourceKey = route.source || "";
    if (sourceKey) {
      const sourceLines = routeGeometriesBySource.get(sourceKey) || [];
      sourceLines.push(...flattened);
      routeGeometriesBySource.set(sourceKey, sourceLines);

      routeGeometriesAll.push(...flattened);

      const routeName = normalizeRouteName(route.name);
      if (routeName) {
        let byName = routeGeometriesBySourceAndName.get(sourceKey);
        if (!byName) {
          byName = new Map();
          routeGeometriesBySourceAndName.set(sourceKey, byName);
        }
        const namedLines = byName.get(routeName) || [];
        namedLines.push(...flattened);
        byName.set(routeName, namedLines);
      }
    }
  });

  state.routeGeometriesBySource = routeGeometriesBySource;
  state.routeGeometriesBySourceAndName = routeGeometriesBySourceAndName;
  state.routeGeometriesAll = routeGeometriesAll;

  // Only push to map once the source is ready
  if (!state.map || !state.map.getSource("routes") || !state.routesVisible) return;
  state.map.getSource("routes").setData({ type: "FeatureCollection", features });
}

function renderStations(stations) {
  state.stations = stations;
  if (!state.map || !state.map.getSource("stations") || !state.stationsVisible) return;

  const stationFeatures = stations
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
          color: getOperatorColor(station.source),
        },
      };
    })
    .filter(Boolean);

  state.map.getSource("stations").setData({ type: "FeatureCollection", features: stationFeatures });
}

function renderTrains(trains) {
  elements.list.innerHTML = "";
  updateTrainSource(trains);
  renderQuickRatio(getAllTrains());
  state.trainIndex = new Map(trains.map((train) => [`${train.source}:${train.id}`, train]));
  
  const trainCount = document.getElementById("train-count");
  if (trainCount) trainCount.textContent = trains.length;

  trains.forEach((train) => {
    const card = document.createElement("div");
    card.className = "train-card";
    const trainColor = getTrainDisplayColor(train);
    card.style.setProperty("--line-color", train.lineColor || trainColor);
    card.style.setProperty("--name-color", trainColor);
    const isSaved = state.savedTrains.has(`${train.source}:${train.id}`);
    const liveClass = train.realTime ? "live" : "scheduled";
    const speedNumber = Number(train.speed);
    const speedText = Number.isFinite(speedNumber) && speedNumber > 0 ? `${Math.round(speedNumber)} mph` : "--";

    card.innerHTML = `
      <div class="train-card-head">
        <span class="train-card-id">${formatMarkerLabel(train)}</span>
        <div class="train-card-title-wrap">
          <h3 class="train-card-title">${train.name}</h3>
          <p class="train-card-sub">${sources[train.source]?.label || train.source} • ${train.route || "--"}</p>
        </div>
      </div>
      <div class="train-kpis">
        <div class="kpi"><span>Next</span><strong>${train.nextStop || "--"}</strong></div>
        <div class="kpi"><span>ETA</span><strong>${train.actual || train.eta || "--"}</strong></div>
        <div class="kpi"><span>Sched</span><strong>${train.scheduled || "--"}</strong></div>
        <div class="kpi"><span>Speed</span><strong>${speedText}</strong></div>
      </div>
      <div class="train-meta">
        <span class="badge ${delayClass(train.delayMinutes, train.status)}">${delayLabel(train.delayMinutes, train.status)}</span>
        <span class="status-indicator ${liveClass}">${formatStatusLabel(train)}</span>
        <span class="meta-updated">${formatTimeAgo(train.lastUpdated)}</span>
      </div>
      <button class="save-btn" data-id="${train.source}:${train.id}">
        ${isSaved ? "Saved" : "Save"}
      </button>
    `;
    card.querySelector(".save-btn").addEventListener("click", (event) => {
      event.stopPropagation();
      const key = `${train.source}:${train.id}`;
      if (state.savedTrains.has(key)) {
        state.savedTrains.delete(key);
      } else {
        state.savedTrains.add(key);
      }
      persistSaved();
      renderTrains(applyFilters(getAllTrains()));
    });
    card.addEventListener("click", () => {
      selectTrain(train);
      const coords = normalizeLngLat(train.lat, train.lon, train.source);
      if (coords && state.map) {
        state.map.flyTo({ center: [coords.lon, coords.lat], zoom: 6 });
      }
    });
    elements.list.appendChild(card);
  });

  if (trains.length === 0 && elements.list) {
    const full = getAllTrains();
    const empty = document.createElement("div");
    empty.className = "train-list-empty";
    if (full.length === 0) {
      empty.textContent =
        state.dataLoadHint ||
        "No trains in the feeds yet. After a cold start the server can take 1–2 minutes to reach all providers — tap Refresh. If this persists, open your Render service logs.";
    } else {
      empty.textContent =
        "No trains match your search or filters. Tap Reset in the quick strip or clear the search box.";
    }
    elements.list.appendChild(empty);
  }

  renderDelayQueue();
}

function getAllTrains() {
  return [...state.trains, ...state.commuterTrains];
}

function renderDelayQueue() {
  const body    = document.getElementById("dq-body");
  const countEl = document.getElementById("dq-count");
  const panel   = document.getElementById("delay-queue");
  if (!body) return;

  const delayed = getAllTrains()
    .filter((train) => {
      const d = resolveDelayMinutes(train.delayMinutes, train.status);
      return d != null && !Number.isNaN(d) && d > 5;
    })
    .sort((a, b) => {
      const da = resolveDelayMinutes(a.delayMinutes, a.status) ?? 0;
      const db = resolveDelayMinutes(b.delayMinutes, b.status) ?? 0;
      return db - da;
    })
    .slice(0, 8);

  if (countEl) {
    countEl.textContent = delayed.length;
    countEl.classList.toggle("has-delays", delayed.length > 0);
  }
  if (panel) panel.classList.toggle("has-delays", delayed.length > 0);

  if (delayed.length === 0) {
    body.innerHTML = `<div class="dq-empty">No active delays</div>`;
    return;
  }

  body.innerHTML = delayed
    .map((train) => {
      const d   = resolveDelayMinutes(train.delayMinutes, train.status);
      const cls = delayClass(train.delayMinutes, train.status);
      const lbl = formatMarkerLabel(train);
      const bg  = train.lineColor || getTrainDisplayColor(train);
      const op  = sources[train.source]?.label || train.source || "";
      const dest = train.nextStop || train.route || "--";
      const delayText = d < 0 ? `${Math.abs(d)}m early` : `+${d}m`;
      return `
        <div class="dq-item" data-id="${train.source}:${train.id}">
          <span class="dq-bullet" style="background:${bg}">${lbl}</span>
          <div class="dq-info">
            <span class="dq-name">${train.name || lbl}</span>
            <span class="dq-op">${op} · ${dest}</span>
          </div>
          <span class="dq-badge ${cls}">${delayText}</span>
        </div>`;
    })
    .join("");

  body.querySelectorAll(".dq-item").forEach((item) => {
    item.addEventListener("click", () => {
      const key   = item.dataset.id;
      const train = state.trainIndex?.get(key);
      if (!train) return;
      openDelayDetail(train);
    });
  });
}

function openDelayDetail(train) {
  const modal = document.getElementById("dq-detail-modal");
  const body  = document.getElementById("dq-detail-body");
  if (!modal || !body) return;

  const d     = resolveDelayMinutes(train.delayMinutes, train.status);
  const cls   = delayClass(train.delayMinutes, train.status);
  const lbl   = formatMarkerLabel(train);
  const bg    = train.lineColor || getTrainDisplayColor(train);
  const op    = sources[train.source]?.label || train.source || "";
  const delayText = d == null ? "Unknown" : d < 0 ? `${Math.abs(d)} min early` : `+${d} min late`;

  // --- Reason / comments ---
  const rawComments = `${train.comments || ""}`.trim();
  // Capitalize first letter and sanitise
  const reason = rawComments
    ? rawComments.charAt(0).toUpperCase() + rawComments.slice(1)
    : null;

  // Derive a human reason from status string when no comments exist
  const statusNorm = `${train.status || ""}`.trim().toLowerCase();
  let inferredReason = null;
  if (!reason) {
    if (statusNorm.includes("crew"))     inferredReason = "Late crew arrival";
    else if (statusNorm.includes("mechanical") || statusNorm.includes("equipment")) inferredReason = "Mechanical or equipment issue";
    else if (statusNorm.includes("weather"))   inferredReason = "Weather-related delay";
    else if (statusNorm.includes("traffic"))   inferredReason = "Track congestion / traffic";
    else if (statusNorm.includes("signal"))    inferredReason = "Signal delay";
    else if (statusNorm.includes("late") || statusNorm.includes("delay")) inferredReason = "Operational delay — specific reason not reported by carrier";
  }

  const displayReason  = reason || inferredReason;
  const noReasonClass  = displayReason ? "" : "no-reason";
  const reasonIcon     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  const reasonText     = displayReason || "No specific reason reported by the carrier.";

  // --- Timeline row ---
  const actualClass = d == null ? "" : d < 0 ? "early" : d > 0 ? "late" : "ontime";
  const scheduledDisplay = train.scheduled || "--";
  const actualDisplay    = train.actual || train.eta || "--";
  const dest = train.nextStop || train.route || "--";

  // --- Speed / heading ---
  const speedNum  = Number(train.speed);
  const speedText = Number.isFinite(speedNum) && speedNum > 0 ? `${Math.round(speedNum)} mph` : "--";
  const headingText = train.heading ?? "--";
  const updatedText = formatTimeAgo(train.lastUpdated);

  body.innerHTML = `
    <div class="dq-detail-hero">
      <span class="dq-detail-bullet" style="background:${bg}">${lbl}</span>
      <div class="dq-detail-heading">
        <h3>${train.name || lbl}</h3>
        <p>${op}${train.route ? " · " + train.route : ""}</p>
      </div>
      <span class="dq-detail-badge ${cls}">${delayText}</span>
    </div>

    <div class="dq-detail-section">
      <div class="dq-detail-section-title">Reason for Delay</div>
      <div class="dq-reason-box ${noReasonClass}">
        ${reasonIcon}
        <span>${reasonText}</span>
      </div>
    </div>

    <div class="dq-detail-section">
      <div class="dq-detail-section-title">Schedule</div>
      <div class="dq-timeline">
        <div class="dq-tl-row">
          <span class="dq-tl-label">Next Stop</span>
          <span class="dq-tl-stop">${dest}</span>
          <span class="dq-tl-sched">${scheduledDisplay}</span>
          <span class="dq-tl-actual ${actualClass}">${actualDisplay}</span>
        </div>
      </div>
    </div>

    <div class="dq-detail-section">
      <div class="dq-detail-section-title">Status</div>
      <div class="dq-kpis">
        <div class="dq-kpi"><span>Speed</span><strong>${speedText}</strong></div>
        <div class="dq-kpi"><span>Heading</span><strong>${headingText}</strong></div>
        <div class="dq-kpi"><span>Updated</span><strong>${updatedText}</strong></div>
      </div>
    </div>

    <div class="dq-detail-actions">
      <button class="btn-primary" id="dq-fly-btn">View on Map</button>
      <button class="btn-secondary" id="dq-full-btn">Full Details</button>
    </div>
  `;

  body.querySelector("#dq-fly-btn")?.addEventListener("click", () => {
    modal.classList.remove("active");
    const coords = normalizeLngLat(train.lat, train.lon, train.source);
    if (coords && state.map) state.map.flyTo({ center: [coords.lon, coords.lat], zoom: 7 });
  });

  body.querySelector("#dq-full-btn")?.addEventListener("click", () => {
    modal.classList.remove("active");
    selectTrain(train);
    const coords = normalizeLngLat(train.lat, train.lon, train.source);
    if (coords && state.map) state.map.flyTo({ center: [coords.lon, coords.lat], zoom: 6 });
  });

  modal.classList.add("active");
}

function updateTrainSource(trains) {
  if (!state.map || !state.map.getSource("trains")) return;
  clearDomTrainMarkers();
  ensureTrainLayers();
  const features = trains
    .map((train) => {
      const coords = snapTrainToRoute(train, normalizeLngLat(train.lat, train.lon, train.source));
      if (!coords) return null;
      const realTime = Boolean(train.realTime);
      const markerLabel = formatMarkerLabel(train);
      const markerText = markerLabel;
      const headingDegreesRaw = compassToDegrees(train.heading);
      const headingDegrees = Number.isFinite(Number(headingDegreesRaw)) ? Number(headingDegreesRaw) : 0;
      const hasHeading = headingDegreesRaw != null && realTime;
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [coords.lon, coords.lat],
        },
        properties: {
          id: `${train.source}:${train.id}`,
          label: markerLabel,
          markerText,
          delayMinutes: train.delayMinutes ?? 0,
          source: train.source,
          companyColor: train.lineColor || getOperatorColor(train.source),
          lineColor: train.lineColor || getTrainDisplayColor(train),
          delayColor: delayColor(train.delayMinutes, train.status),
          realTime,
          headingDegrees,
          hasHeading,
        },
      };
    })
    .filter(Boolean);
  state.map.getSource("trains").setData({ type: "FeatureCollection", features });
}

function selectTrain(train) {
  state.photoSelectionToken += 1;
  const token = state.photoSelectionToken;
  state.selectedTrain = train;
  const statusBadge = `<span class="badge ${delayClass(train.delayMinutes, train.status)}">${delayLabel(train.delayMinutes, train.status)}</span>`;
  const locationText =
    train.lat != null && train.lon != null
      ? `${train.lat.toFixed(4)}, ${train.lon.toFixed(4)}`
      : "--";
  elements.trainDetail.innerHTML = `
    <div class="detail-head">
      <div class="detail-brand">
        ${getLogoMarkup(train.source)}
        <div>
          <h3>${train.name}</h3>
          <p>${sources[train.source]?.label || train.source} • ${train.route || "--"}</p>
        </div>
      </div>
      <div class="detail-tags">
        ${statusBadge}
        <span class="status-indicator ${train.realTime ? "live" : "scheduled"}">${formatStatusLabel(
    train
  )}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div><span>Location</span><strong>${locationText}</strong></div>
      <div><span>Next Stop</span><strong>${train.nextStop || "--"}</strong></div>
      <div><span>Scheduled</span><strong>${train.scheduled || "--"}</strong></div>
      <div><span>Actual</span><strong>${train.actual || train.eta || "--"}</strong></div>
      <div><span>Speed</span><strong>${train.speed ?? "--"}</strong></div>
      <div><span>Heading</span><strong>${train.heading ?? "--"}</strong></div>
      <div><span>Updated</span><strong>${formatTimeAgo(train.lastUpdated)}</strong></div>
      <div><span>ID</span><strong>${train.id}</strong></div>
    </div>
    <div class="detail-actions-row">
      <button id="btn-see-stops" class="btn-secondary">See Stops</button>
      <button id="btn-open-crossing-nav" class="btn-secondary">Nearest Crossing</button>
    </div>
    <div id="train-stops-panel" class="train-stops-panel" style="display:none;"></div>
  `;
  elements.trainDetail.querySelector("#btn-see-stops")?.addEventListener("click", async () => {
    const panel = elements.trainDetail.querySelector("#train-stops-panel");
    if (!panel) return;
    panel.style.display = "block";
    panel.innerHTML = `<div class="stops-loading"><span class="mini-spinner"></span><span>Loading upcoming stops…</span></div>`;
    const source = encodeURIComponent(train.source || "");
    const id = encodeURIComponent(train.id || "");
    try {
      const response = await fetch(apiUrl(`/api/train-stops/${source}/${id}`));
      const payload = await response.json();
      const stops = Array.isArray(payload?.stops) ? payload.stops : [];
      if (stops.length === 0) {
        panel.innerHTML = `<p class="empty-state">No upcoming stops available for this train yet.</p>`;
        return;
      }
      panel.innerHTML = `
        <div class="stops-title">Upcoming Stops</div>
        ${stops
          .map((row) => {
            const eta = Number.isFinite(Number(row.etaMinutes)) ? `${Math.max(0, Number(row.etaMinutes))} min` : "--";
            const d = Number(row.delayMinutes);
            const cls = Number.isFinite(d) ? (d > 0 ? "late" : d < 0 ? "early" : "ontime") : "";
            return `
              <div class="stop-row">
                <span class="stop-name">${row.stationName || row.stationId || "Stop"}</span>
                <span class="stop-time">${row.actual || row.scheduled || "--"}</span>
                <span class="stop-eta ${cls}">${eta}</span>
              </div>
            `;
          })
          .join("")}
      `;
    } catch {
      panel.innerHTML = `<p class="empty-state">Unable to load upcoming stops right now.</p>`;
    }
  });
  elements.trainDetail.querySelector("#btn-open-crossing-nav")?.addEventListener("click", async () => {
    await findNearestCrossing();
    if (state.nearestCrossing) openDirectionsToCrossing(state.nearestCrossing);
  });
  elements.detailModal.classList.add("active");
  elements.board.style.display = "none";
  elements.trainDetail.style.display = "block";
}

function deriveStationArrivalsFromLive(station) {
  const needle = `${station?.name || ""}`.trim().toLowerCase();
  if (!needle) return [];
  return getAllTrains()
    .filter((train) => (`${train.nextStop || ""}`.trim().toLowerCase() === needle))
    .map((train) => ({
      trainId: train.trainNum || train.id || "--",
      route: train.route || train.name || "--",
      scheduled: train.scheduled || train.eta || "--",
      actual: train.actual || train.eta || "--",
      status: train.status || "en-route",
      source: train.source,
      _rank: Number.isFinite(Number(resolveDelayMinutes(train.delayMinutes, train.status)))
        ? Number(resolveDelayMinutes(train.delayMinutes, train.status))
        : 0,
    }))
    .slice(0, 12);
}

async function selectStation(station) {
  state.selectedStation = station;
  let payload = { station: null, arrivals: [] };
  try {
    const response = await fetch(apiUrl(`/api/stations/${station.id}`));
    payload = await response.json();
  } catch {
    payload = { station: null, arrivals: [] };
  }
  const stationSource = payload.station?.source || station.source;

  const header = `
    <div class="detail-head">
      <div class="detail-brand">
        ${getLogoMarkup(stationSource)}
        <div>
          <h3>${station.name}</h3>
          <p>${sources[stationSource]?.label || stationSource} • Station board</p>
        </div>
      </div>
    </div>
  `;
  const apiArrivals = Array.isArray(payload.arrivals) ? payload.arrivals : [];
  const liveFallback = deriveStationArrivalsFromLive(station);
  const mergedArrivals = [...apiArrivals, ...liveFallback]
    .filter((row) => row && (row.trainId || row.route))
    .reduce((acc, row) => {
      const key = `${row.trainId || ""}|${row.route || ""}|${row.scheduled || row.actual || ""}`;
      if (!acc.some((x) => `${x.trainId || ""}|${x.route || ""}|${x.scheduled || x.actual || ""}` === key)) {
        acc.push(row);
      }
      return acc;
    }, [])
    .slice(0, 12);

  if (mergedArrivals.length === 0) {
    elements.board.innerHTML = `${header}<p class="empty-state">No upcoming arrivals.</p>`;
    elements.board.style.display = "block";
    elements.trainDetail.style.display = "none";
    elements.detailModal.classList.add("active");
    return;
  }

  const rows = mergedArrivals
    .map(
      (row) => `
      <div class="board-row">
        <span>${row.trainId}</span>
        <span>${row.route}</span>
        <span>${row.actual || row.scheduled}</span>
        <span class="row-status">${row.status || "scheduled"}</span>
      </div>
    `
    )
    .join("");

  elements.board.innerHTML = `${header}${rows}`;
  elements.board.style.display = "block";
  elements.trainDetail.style.display = "none";
  elements.detailModal.classList.add("active");
}

function applyFilters(trains) {
  const query = elements.search.value.trim().toLowerCase();
  return trains.filter((train) => {
    const matchesSearch =
      !query ||
      `${train.name || ""}`.toLowerCase().includes(query) ||
      `${train.id || ""}`.toLowerCase().includes(query) ||
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

async function refreshData() {
  if (state.backendReachable === false) {
    if (elements.lastUpdated) {
      elements.lastUpdated.textContent = "Backend unreachable — fix API URL";
      elements.lastUpdated.classList.add("updating");
    }
    return;
  }
  try {
    const [trainsPayload, stationsPayload, routesPayload] = await Promise.all([
      safeFetchJson("/api/trains", { trains: [], updatedAt: null }),
      safeFetchJson("/api/stations", { stations: [], updatedAt: null }),
      safeFetchJson("/api/routes", { routes: [], updatedAt: null }),
    ]);

    const commuterTrainsPayload = state.commuterAvailable
      ? await safeFetchJson("/api/commuter/trains", { trains: [], updatedAt: null })
      : { trains: [], updatedAt: null };
    const commuterStationsPayload = state.commuterAvailable
      ? await safeFetchJson("/api/commuter/stations", { stations: [], updatedAt: null })
      : { stations: [], updatedAt: null };
    const commuterRoutesPayload = state.commuterAvailable
      ? await safeFetchJson("/api/commuter/routes", { routes: [], updatedAt: null })
      : { routes: [], updatedAt: null };

    state.trains = trainsPayload.trains || [];
    state.commuterTrains = commuterTrainsPayload.trains || [];
    state.stations = stationsPayload.stations || [];
    state.commuterStations = commuterStationsPayload.stations || [];
    state.routes = routesPayload.routes || [];
    state.commuterRoutes = commuterRoutesPayload.routes || [];

    const allRoutes = [...state.routes, ...state.commuterRoutes];
    const allStations = [...state.stations, ...state.commuterStations];
    const allTrains = [...state.trains, ...state.commuterTrains];

    renderRoutes(allRoutes);
    renderStations(allStations);
    renderTrains(applyFilters(allTrains));
    await loadSightings();
    if (elements.departureBoardModal?.classList.contains("active")) {
      renderDepartureBoard();
    }

    state.lastUpdateTime = trainsPayload.updatedAt || new Date().toISOString();
    updateTimestamp();
    elements.lastUpdated.classList.add("updating");
    if (allTrains.length === 0 && state.dataLoadHint && elements.lastUpdated) {
      elements.lastUpdated.textContent = "No trains loaded yet";
      elements.lastUpdated.classList.add("updating");
    }
  } catch (error) {
    elements.lastUpdated.textContent = "Update failed - retrying...";
    elements.lastUpdated.classList.add("updating");
    renderTrains(applyFilters(getAllTrains()));
  }
}

function initWebSocket() {
  const socket = new WebSocket(wsUrl("/ws"));

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "trains") {
      state.trains = message.payload.trains || [];
      const allTrains = [...state.trains, ...state.commuterTrains];
      renderTrains(applyFilters(allTrains));
      if (elements.departureBoardModal?.classList.contains("active")) {
        renderDepartureBoard();
      }
      state.lastUpdateTime = message.payload.updatedAt || new Date().toISOString();
      updateTimestamp();
    }
    if (message.type === "commuter") {
      state.commuterTrains = message.payload.trains || [];
      const allTrains = [...state.trains, ...state.commuterTrains];
      renderTrains(applyFilters(allTrains));
      if (elements.departureBoardModal?.classList.contains("active")) {
        renderDepartureBoard();
      }
      state.lastUpdateTime = message.payload.updatedAt || new Date().toISOString();
      updateTimestamp();
    }
  });
}

function attachEvents() {
  elements.toggleLandmarks?.setAttribute("data-active", String(state.landmarksVisible));

  [elements.search, elements.source, elements.status].filter(Boolean).forEach((input) => {
    input.addEventListener("input", () => renderTrains(applyFilters(getAllTrains())));
    input.addEventListener("change", () => renderTrains(applyFilters(getAllTrains())));
  });

  elements.refresh.addEventListener("click", () => {
    elements.refresh.style.opacity = "0.6";
    elements.refresh.style.transform = "scale(0.95)";
    refreshData().finally(() => {
      setTimeout(() => {
        elements.refresh.style.opacity = "1";
        elements.refresh.style.transform = "scale(1)";
      }, 300);
    });
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

  document.getElementById("dq-toggle")?.addEventListener("click", () => {
    const panel = document.getElementById("delay-queue");
    const btn   = document.getElementById("dq-toggle");
    if (!panel) return;
    const collapsed = panel.classList.toggle("collapsed");
    btn?.setAttribute("aria-expanded", String(!collapsed));
  });

  const dqDetailModal = document.getElementById("dq-detail-modal");
  document.getElementById("close-dq-detail-modal")?.addEventListener("click", () => {
    dqDetailModal?.classList.remove("active");
  });
  dqDetailModal?.addEventListener("click", (e) => {
    if (e.target === dqDetailModal) dqDetailModal.classList.remove("active");
  });

  elements.toggleRoutes?.addEventListener("click", () => {
    state.routesVisible = !state.routesVisible;
    elements.toggleRoutes.setAttribute("data-active", state.routesVisible);
    if (state.map && state.map.getLayer("routes-line")) {
      const visibility = state.routesVisible ? "visible" : "none";
      state.map.setLayoutProperty("routes-line", "visibility", visibility);
      state.map.setLayoutProperty("routes-glow", "visibility", visibility);
      if (state.map.getLayer("routes-label")) {
        state.map.setLayoutProperty("routes-label", "visibility", visibility);
      }
    }
  });

  elements.toggleStations?.addEventListener("click", () => {
    state.stationsVisible = !state.stationsVisible;
    elements.toggleStations.setAttribute("data-active", state.stationsVisible);
    if (state.map && state.map.getLayer("stations")) {
      const visibility = state.stationsVisible ? "visible" : "none";
      state.map.setLayoutProperty("stations", "visibility", visibility);
    }
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
        switchMapStyle("dark");
        state.map.once("styledata", finishEnter3d);
      } else {
        finishEnter3d();
      }
    }
  });

  elements.toggleFreight?.addEventListener("click", () => {
    const next = !state.freightVisible;
    setFreightVisible(next);
    state.uiSettings.freightVisible = next;
    persistUiSettings();
    applyUiSettingsToDom();
  });

  elements.btnNearestCrossing?.addEventListener("click", async () => {
    await findNearestCrossing();
    if (state.nearestCrossing) {
      openDirectionsToCrossing(state.nearestCrossing);
    }
  });

  elements.toggleHeritage?.addEventListener("click", () => {
    openSightingModal("heritage");
  });

  elements.toggleSpecialInterest?.addEventListener("click", () => {
    openSightingModal("special-interest");
  });

  elements.closeSightingModal?.addEventListener("click", closeSightingModal);
  elements.sightingModal?.addEventListener("click", (event) => {
    if (event.target === elements.sightingModal) closeSightingModal();
  });
  elements.sightingUseLocation?.addEventListener("click", async () => {
    const loc = await locateMe();
    if (!loc) {
      if (elements.sightingStatus) elements.sightingStatus.textContent = "Location unavailable.";
      return;
    }
    if (elements.sightingStatus) {
      elements.sightingStatus.textContent = `Using location ${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`;
    }
  });
  elements.sightingState?.addEventListener("change", () => {
    const selectedState = `${elements.sightingState?.value || ""}`.trim();
    populateSightingCities(selectedState);
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
    elements.floatingList?.classList.toggle("open", open);
    if (!elements.toggleList) return;
    elements.toggleList.classList.toggle("attached-open", open);
    elements.toggleList.setAttribute("aria-expanded", String(open));
    const icon = elements.toggleList.querySelector(".drawer-toggle-icon");
    if (icon) icon.textContent = open ? "‹" : "›";
    elements.toggleList.title = open ? "Close live trains" : "Open live trains";
  };

  setDrawerOpen(true);

  elements.toggleList?.addEventListener("click", () => {
    const open = !elements.floatingList?.classList.contains("open");
    setDrawerOpen(open);
  });

  elements.closeList?.addEventListener("click", () => {
    setDrawerOpen(false);
  });
  
  elements.closeModal.addEventListener("click", () => {
    elements.detailModal.classList.remove("active");
  });

  elements.toggleRailcams?.addEventListener("click", () => {
    renderRailcams();
    elements.railcamModal?.classList.add("active");
  });

  elements.toggleSettings?.addEventListener("click", () => {
    openSettingsModal();
  });

  elements.toggleDepartureBoard?.addEventListener("click", () => {
    const source = elements.source?.value || "all";
    window.open(`/departure-board.html?source=${encodeURIComponent(source)}`, "_blank", "noopener,noreferrer");
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

  [elements.railcamSearch, elements.railcamState].filter(Boolean).forEach((input) => {
    input.addEventListener("input", renderRailcams);
    input.addEventListener("change", renderRailcams);
  });

  elements.closeRailcamModal?.addEventListener("click", () => {
    elements.railcamModal?.classList.remove("active");
  });

  elements.closeSettingsModal?.addEventListener("click", () => {
    closeSettingsModal();
  });

  elements.saveSettings?.addEventListener("click", () => {
    const refreshSeconds = Number(elements.settingRefreshInterval?.value || 10);
    state.uiSettings.refreshSeconds = [10, 20, 30, 60].includes(refreshSeconds) ? refreshSeconds : 10;
    state.uiSettings.openListDefault = true;
    state.uiSettings.searchOpenDefault = Boolean(elements.settingSearchOpenDefault?.checked);
    state.uiSettings.compactCards = Boolean(elements.settingCompactCards?.checked);
    state.uiSettings.mapStyle = MAP_STYLE_CYCLE.includes(elements.settingMapStyle?.value)
      ? elements.settingMapStyle.value
      : state.uiSettings.mapStyle;
    state.uiSettings.themeMode = elements.settingThemeMode?.value === "light" ? "light" : "dark";
    state.uiSettings.freightVisible = Boolean(elements.settingFreightLines?.checked);

    const previousTheme = document.body.classList.contains("light") ? "light" : "dark";
    const previousMapStyle = state.mapStyle;

    persistUiSettings();
    applyUiSettingsToDom();

    document.body.classList.toggle("light", state.uiSettings.themeMode === "light");
    try {
      localStorage.setItem("ort-theme", state.uiSettings.themeMode);
    } catch {
      // ignore storage failures
    }

    const themeChanged = previousTheme !== state.uiSettings.themeMode;
    const styleChanged = previousMapStyle !== state.uiSettings.mapStyle;
    state.mapStyle = state.uiSettings.mapStyle;
    if (styleChanged && state.map) {
      switchMapStyle(state.mapStyle);
    }
    state.freightVisible = state.uiSettings.freightVisible;
    setFreightVisible(state.freightVisible);

    elements.floatingSearch?.classList.toggle("active", state.uiSettings.searchOpenDefault);
    elements.toggleSearch?.setAttribute("data-active", String(state.uiSettings.searchOpenDefault));
    if (!state.uiSettings.searchOpenDefault) {
      elements.filterPanel?.classList.remove("active");
      elements.toggleFilters?.classList.remove("active");
      elements.toggleFilters?.setAttribute("data-active", "false");
    }

    const listOpen = true;
    elements.floatingList?.classList.toggle("open", listOpen);
    elements.toggleList?.classList.toggle("attached-open", listOpen);
    elements.toggleList?.setAttribute("aria-expanded", String(listOpen));
    if (elements.toggleList) {
      const icon = elements.toggleList.querySelector(".drawer-toggle-icon");
      if (icon) icon.textContent = listOpen ? "‹" : "›";
      elements.toggleList.title = listOpen ? "Close live trains" : "Open live trains";
    }

    scheduleRefresh();
    closeSettingsModal();

    if (themeChanged && !styleChanged && state.map) {
      // Repaint station labels and any theme-sensitive layers
      switchMapStyle(state.mapStyle);
    }
  });
  
  elements.detailModal.addEventListener("click", (e) => {
    if (e.target === elements.detailModal) {
      elements.detailModal.classList.remove("active");
    }
  });

  elements.railcamModal?.addEventListener("click", (e) => {
    if (e.target === elements.railcamModal) {
      elements.railcamModal.classList.remove("active");
    }
  });

  elements.settingsModal?.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal) {
      closeSettingsModal();
    }
  });

  elements.toggleSaved?.addEventListener("click", () => {
    state.showSavedOnly = !state.showSavedOnly;
    elements.toggleSaved.setAttribute("data-active", String(state.showSavedOnly));
    renderTrains(applyFilters(getAllTrains()));
  });

  elements.btnLocate?.addEventListener("click", locateMe);
  elements.btnFitTrains?.addEventListener("click", fitToTrains);

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
  state.freightVisible = Boolean(state.uiSettings.freightVisible);
  state.mapStyle = MAP_STYLE_CYCLE.includes(state.uiSettings.mapStyle)
    ? state.uiSettings.mapStyle
    : state.mapStyle;
  applyStoredTheme();
  applyUiSettingsToDom();
  state.backendReachable = await checkBackendHealth();
  state.config = {};
  if (state.backendReachable) {
    try {
      const configRes = await fetch(apiUrl("/api/config"), { cache: "no-store" });
      if (configRes.ok) {
        state.config = await configRes.json();
      }
    } catch {
      state.config = {};
    }
  }
  if (!state.backendReachable && elements.lastUpdated) {
    elements.lastUpdated.textContent = "Backend unreachable — fix API URL";
    elements.lastUpdated.classList.add("updating");
  }
  renderContributions();
  buildRailcamStateOptions();
  buildDepartureBoardSourceOptions();
  renderRailcams();
  buildSourceOptions();
  loadSaved();
  initMap();
  attachEvents();
  await refreshData();
  // Map "load" can race with refreshData; if data arrived first, train layers were skipped.
  if (state.map && typeof state.map.loaded === "function" && state.map.loaded()) {
    renderTrains(applyFilters(getAllTrains()));
  }
  if (state.backendReachable) {
    initWebSocket();
    scheduleRefresh();
  }
}

initApp();
