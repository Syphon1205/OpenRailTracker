const sourceLabels = {
  amtrak: "Amtrak",
  brightline: "Brightline",
  via: "VIA Rail",
};

const sourceFiles = [
  { key: "amtrak", path: "data/amtrak.json" },
  { key: "brightline", path: "data/brightline.json" },
  { key: "via", path: "data/via.json" },
];

const elements = {
  list: document.getElementById("train-list"),
  map: document.getElementById("map"),
  search: document.getElementById("search"),
  source: document.getElementById("source"),
  status: document.getElementById("status"),
  refresh: document.getElementById("refresh"),
  lastUpdated: document.getElementById("last-updated"),
  trainCount: document.getElementById("train-count"),
  quickLive: document.getElementById("quick-live"),
  quickDelay: document.getElementById("quick-delay"),
  quickReset: document.getElementById("quick-reset"),
  quickLiveRatio: document.getElementById("quick-live-ratio"),
  toggleSearch: document.getElementById("toggle-search"),
  floatingSearch: document.querySelector(".floating-search"),
  toggleFilters: document.getElementById("toggle-filters"),
  filterPanel: document.getElementById("filter-panel"),
};

const mapState = {
  map: null,
  loaded: false,
  sourceAdded: false,
};

const state = {
  trains: [],
  filteredTrains: [],
  quickMode: "all",
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatValue(value, fallback = "--") {
  return value == null || value === "" ? fallback : value;
}

function statusLabel(status) {
  const normalized = `${status || "unknown"}`.trim().toLowerCase();
  if (!normalized) {
    return "Unknown";
  }
  return normalized
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeStatus(status) {
  const value = `${status || ""}`.trim().toLowerCase();
  if (!value) {
    return "en-route";
  }
  if (value === "on time" || value === "ontime") {
    return "on-time";
  }
  if (value === "delay") {
    return "delayed";
  }
  return value;
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTrain(raw, source) {
  return {
    id: `${raw?.id || raw?.trainId || raw?.number || "unknown"}`,
    name: `${raw?.name || raw?.line || "Unknown Train"}`,
    source,
    route: `${raw?.route || raw?.segment || ""}`,
    status: normalizeStatus(raw?.status),
    nextStop: `${raw?.nextStop || raw?.next_station || ""}`,
    eta: `${raw?.eta || raw?.arrival || ""}`,
    delay: `${raw?.delay || raw?.delayMinutes || ""}`,
    realTime: raw?.realTime ?? null,
    lat: parseNumber(raw?.lat ?? raw?.latitude),
    lon: parseNumber(raw?.lon ?? raw?.longitude),
  };
}

async function fetchJson(url, fallback) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return fallback;
    }
    return await response.json();
  } catch {
    return fallback;
  }
}

async function loadTrains() {
  const apiPayload = await fetchJson("api/trains", null);
  if (apiPayload?.trains && Array.isArray(apiPayload.trains)) {
    return apiPayload.trains.map((train) => normalizeTrain(train, train.source || "amtrak"));
  }

  const sourceLoads = sourceFiles.map(async ({ key, path }) => {
    const data = await fetchJson(path, []);
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => normalizeTrain(item, key));
  });

  const resolved = await Promise.all(sourceLoads);
  return resolved.flat();
}

function matchesFilter(train) {
  const query = (elements.search?.value || "").trim().toLowerCase();
  const sourceFilter = elements.source?.value || "all";
  const statusFilter = elements.status?.value || "all";

  const matchesSearch =
    !query ||
    train.name.toLowerCase().includes(query) ||
    train.id.toLowerCase().includes(query) ||
    train.route.toLowerCase().includes(query) ||
    train.nextStop.toLowerCase().includes(query);

  const matchesSource = sourceFilter === "all" || train.source === sourceFilter;
  const matchesStatus = statusFilter === "all" || train.status === statusFilter;
  const matchesQuickMode =
    state.quickMode === "all"
      ? true
      : state.quickMode === "live"
        ? Boolean(train.realTime)
        : train.status === "delayed" || `${train.delay}`.toLowerCase().includes("min");

  return matchesSearch && matchesSource && matchesStatus && matchesQuickMode;
}

function buildSourceOptions() {
  if (!elements.source) {
    return;
  }

  const keys = [...new Set(state.trains.map((train) => train.source).filter(Boolean))];
  const known = keys.filter((key) => sourceLabels[key]);
  const unknown = keys.filter((key) => !sourceLabels[key]).sort();
  const ordered = [...known, ...unknown];

  const existing = new Set(Array.from(elements.source.options).map((opt) => opt.value));
  ordered.forEach((key) => {
    if (key === "all" || existing.has(key)) {
      return;
    }
    const option = document.createElement("option");
    option.value = key;
    option.textContent = sourceLabels[key] || key.toUpperCase();
    elements.source.appendChild(option);
  });
}

function updateCount(total) {
  if (elements.trainCount) {
    const noun = total === 1 ? "train" : "trains";
    elements.trainCount.textContent = `${total} ${noun}`;
  }
}

function updateQuickRatio() {
  if (!elements.quickLiveRatio) {
    return;
  }
  const liveCount = state.filteredTrains.filter((train) => Boolean(train.realTime)).length;
  elements.quickLiveRatio.textContent = `${liveCount}/${state.filteredTrains.length}`;
}

function setQuickMode(mode) {
  state.quickMode = mode;
  elements.quickLive?.setAttribute("data-active", String(mode === "live"));
  elements.quickDelay?.setAttribute("data-active", String(mode === "delayed"));
}

function openSearch(isOpen) {
  elements.floatingSearch?.classList.toggle("active", isOpen);
  elements.toggleSearch?.setAttribute("data-active", String(isOpen));
  if (!isOpen) {
    elements.filterPanel?.classList.remove("active");
    elements.toggleFilters?.setAttribute("data-active", "false");
  }
}

function renderTrains() {
  if (!elements.list) {
    return;
  }

  elements.list.innerHTML = "";

  if (state.filteredTrains.length === 0) {
    elements.list.innerHTML = '<div class="train-card"><p>No trains match the current filters.</p></div>';
    updateMapFeatures([]);
    updateCount(0);
    updateQuickRatio();
    return;
  }

  state.filteredTrains.forEach((train) => {
    const card = document.createElement("article");
    card.className = "train-card";
    card.innerHTML = `
      <div>
        <span class="badge ${train.status}">${statusLabel(train.status)}</span>
      </div>
      <h3>${train.name}</h3>
      <div class="card-row"><span>Train ID</span><strong>${formatValue(train.id)}</strong></div>
      <div class="card-row"><span>Route</span><strong>${formatValue(train.route)}</strong></div>
      <div class="card-row"><span>Next stop</span><strong>${formatValue(train.nextStop)}</strong></div>
      <div class="card-row"><span>ETA</span><strong>${formatValue(train.eta)}</strong></div>
      <div class="card-row"><span>Delay</span><strong>${formatValue(train.delay)}</strong></div>
      <div class="card-row"><span>Realtime</span><strong>${
        train.realTime == null ? "--" : train.realTime ? "Yes" : "No"
      }</strong></div>
      <div class="card-row"><span>Source</span><strong>${sourceLabels[train.source] || train.source}</strong></div>
    `;

    card.addEventListener("click", () => {
      if (mapState.map && train.lat != null && train.lon != null) {
        mapState.map.flyTo({ center: [train.lon, train.lat], zoom: Math.max(mapState.map.getZoom(), 6) });
      }
    });

    elements.list.appendChild(card);
  });

  updateMapFeatures(state.filteredTrains);
  updateCount(state.filteredTrains.length);
  updateQuickRatio();
}

function trainToFeature(train) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [train.lon, train.lat],
    },
    properties: {
      id: `${train.source}:${train.id}`,
      name: train.name,
      status: train.status,
      route: train.route,
    },
  };
}

function updateMapFeatures(trains) {
  if (!mapState.map || !mapState.loaded) {
    return;
  }

  const features = trains
    .filter((train) => train.lat != null && train.lon != null)
    .map((train) => trainToFeature(train));

  if (!mapState.sourceAdded) {
    mapState.map.addSource("trains", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features,
      },
    });

    mapState.map.addLayer({
      id: "train-points",
      type: "circle",
      source: "trains",
      paint: {
        "circle-radius": 6,
        "circle-color": [
          "match",
          ["get", "status"],
          "delayed",
          "#ef4444",
          "on-time",
          "#22c55e",
          "#3b82f6",
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#0f172a",
      },
    });

    mapState.sourceAdded = true;
  } else {
    mapState.map.getSource("trains")?.setData({
      type: "FeatureCollection",
      features,
    });
  }

  if (features.length > 0) {
    const bounds = new maplibregl.LngLatBounds();
    features.forEach((feature) => bounds.extend(feature.geometry.coordinates));
    mapState.map.fitBounds(bounds, { padding: 60, maxZoom: 7, duration: 400 });
  }
}

function initMap() {
  if (!elements.map || mapState.map || typeof maplibregl === "undefined") {
    return;
  }

  mapState.map = new maplibregl.Map({
    container: elements.map,
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: [-98.35, 39.5],
    zoom: 3,
    minZoom: 2,
    maxZoom: 16,
    attributionControl: true,
  });

  mapState.map.addControl(new maplibregl.NavigationControl(), "bottom-right");
  mapState.map.on("load", () => {
    mapState.loaded = true;
    updateMapFeatures(state.filteredTrains);
  });
}

function applyFiltersAndRender() {
  state.filteredTrains = state.trains.filter((train) => matchesFilter(train));
  renderTrains();
}

async function refreshData() {
  elements.lastUpdated.textContent = "Last updated: loading...";
  const loadedTrains = await loadTrains();
  state.trains = loadedTrains;
  buildSourceOptions();
  applyFiltersAndRender();
  elements.lastUpdated.textContent = `Last updated: ${formatTime()}`;
}

function attachEvents() {
  [elements.search, elements.source, elements.status].filter(Boolean).forEach((input) => {
    input.addEventListener("input", applyFiltersAndRender);
    input.addEventListener("change", applyFiltersAndRender);
  });

  elements.refresh?.addEventListener("click", refreshData);

  elements.quickLive?.addEventListener("click", () => {
    setQuickMode(state.quickMode === "live" ? "all" : "live");
    applyFiltersAndRender();
  });

  elements.quickDelay?.addEventListener("click", () => {
    setQuickMode(state.quickMode === "delayed" ? "all" : "delayed");
    applyFiltersAndRender();
  });

  elements.quickReset?.addEventListener("click", () => {
    setQuickMode("all");
    if (elements.search) elements.search.value = "";
    if (elements.source) elements.source.value = "all";
    if (elements.status) elements.status.value = "all";
    applyFiltersAndRender();
  });

  elements.toggleSearch?.addEventListener("click", () => {
    const isOpen = elements.floatingSearch?.classList.contains("active");
    openSearch(!isOpen);
  });

  elements.toggleFilters?.addEventListener("click", () => {
    const willOpen = !elements.filterPanel?.classList.contains("active");
    elements.filterPanel?.classList.toggle("active", willOpen);
    elements.toggleFilters?.setAttribute("data-active", String(willOpen));
  });
}

initMap();
setQuickMode("all");
attachEvents();
refreshData();
setInterval(refreshData, 30_000);
