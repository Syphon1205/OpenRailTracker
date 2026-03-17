const sources = {
  amtrak: "Amtrak",
  brightline: "Brightline",
  via: "VIA Rail",
};

const elements = {
  list: document.getElementById("train-list"),
  map: document.getElementById("map"),
  search: document.getElementById("search"),
  source: document.getElementById("source"),
  status: document.getElementById("status"),
  refresh: document.getElementById("refresh"),
  lastUpdated: document.getElementById("last-updated"),
  summaryTotal: document.getElementById("summary-total"),
  summaryOnTime: document.getElementById("summary-ontime"),
  summaryDelayed: document.getElementById("summary-delayed"),
};

const mapState = {
  map: null,
  markers: new Map(),
  bounds: null,
};

const PMTILES_URL = "https://build.protomaps.com/20260207.pmtiles";

function initMap() {
  if (!elements.map || mapState.map) {
    return;
  }

  mapState.map = L.map(elements.map, {
    center: [39.5, -98.35],
    zoom: 4,
    minZoom: 3,
    maxZoom: 16,
  });

  let baseLayer = null;
  try {
    if (window.protomapsL?.leafletLayer) {
      baseLayer = window.protomapsL.leafletLayer({
        url: PMTILES_URL,
        theme: "dark",
        attribution: "&copy; OpenStreetMap contributors &copy; Protomaps",
      });
      baseLayer.addTo(mapState.map);
    }
  } catch (error) {
    baseLayer = null;
  }

  if (!baseLayer) {
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    }).addTo(mapState.map);
  }
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function loadTrains() {
  const response = await fetch("/api/trains");
  if (!response.ok) {
    throw new Error("Failed to load trains");
  }

  const payload = await response.json();
  return payload.trains || [];
}

function matchesFilter(train, filters) {
  const query = filters.search.trim().toLowerCase();
  const matchesSearch =
    !query ||
    train.name.toLowerCase().includes(query) ||
    train.id.toLowerCase().includes(query) ||
    train.route.toLowerCase().includes(query) ||
    train.nextStop.toLowerCase().includes(query);

  const matchesSource = filters.source === "all" || train.source === filters.source;
  const matchesStatus = filters.status === "all" || train.status === filters.status;

  return matchesSearch && matchesSource && matchesStatus;
}

function statusLabel(status) {
  return status
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function extractTrainNumber(train) {
  const raw = `${train.id || ""}`;
  const digits = raw.match(/\d+/g);
  return digits ? digits.join("") : raw || "--";
}

function buildMarkerLabel(train, indexBySource) {
  const prefixes = {
    amtrak: "A",
    brightline: "B",
    via: "v",
  };
  const prefix = prefixes[train.source] || "T";
  const number = extractTrainNumber(train);
  const index = indexBySource.get(train) ?? 0;
  return `${prefix}${number}(${index})`;
}

function formatValue(value, fallback = "--") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return value;
}

function renderSummary(trains) {
  elements.summaryTotal.textContent = trains.length;
  elements.summaryOnTime.textContent = trains.filter((train) => train.status === "on-time").length;
  elements.summaryDelayed.textContent = trains.filter((train) => train.status === "delayed").length;
}

function renderMarkers(trains, indexBySource) {
  if (!mapState.map) {
    return;
  }

  const nextMarkers = new Map();
  const bounds = [];

  trains.forEach((train) => {
    if (train.lat == null || train.lon == null) {
      return;
    }

    const key = `${train.source}-${train.id}`;
    const position = [train.lat, train.lon];
    bounds.push(position);

    const label = buildMarkerLabel(train, indexBySource);
    const icon = L.divIcon({
      className: `train-marker ${train.status}`,
      html: `<span>${label}</span>`,
      iconSize: [52, 28],
      iconAnchor: [26, 14],
      popupAnchor: [0, -16],
    });

    let marker = mapState.markers.get(key);
    if (!marker) {
      marker = L.marker(position, {
        title: `${train.name} (${train.id})`,
        icon,
      });
      marker.addTo(mapState.map);
    } else {
      marker.setLatLng(position);
      marker.setIcon(icon);
    }

    marker.bindPopup(
      `<strong>${train.name}</strong><br/>${train.route || ""}<br/>${statusLabel(
        train.status
      )}`
    );
    nextMarkers.set(key, marker);
  });

  mapState.markers.forEach((marker, key) => {
    if (!nextMarkers.has(key)) {
      marker.remove();
    }
  });

  mapState.markers = nextMarkers;
  if (bounds.length > 0) {
    mapState.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }
}

function renderTrains(trains) {
  elements.list.innerHTML = "";

  if (trains.length === 0) {
    elements.list.innerHTML = `<div class="train-card"><p>No trains match the current filters.</p></div>`;
    renderMarkers([], new Map());
    return;
  }

  const counts = new Map();
  const indexBySource = new Map();
  trains.forEach((train) => {
    const current = counts.get(train.source) || 0;
    const next = current + 1;
    counts.set(train.source, next);
    indexBySource.set(train, next);
  });

  trains.forEach((train) => {
    const card = document.createElement("article");
    card.className = "train-card";
    card.innerHTML = `
      <div>
        <span class="badge ${train.status}">${statusLabel(train.status)}</span>
      </div>
      <h3>${train.name}</h3>
      <div class="card-row"><span>Train ID</span><strong>${train.id}</strong></div>
      <div class="card-row"><span>Route</span><strong>${formatValue(train.route)}</strong></div>
      <div class="card-row"><span>Next stop</span><strong>${formatValue(train.nextStop)}</strong></div>
      <div class="card-row"><span>ETA</span><strong>${formatValue(train.eta)}</strong></div>
      <div class="card-row"><span>Delay</span><strong>${formatValue(train.delay)}</strong></div>
      <div class="card-row"><span>Realtime</span><strong>${
        train.realTime === null ? "--" : train.realTime ? "Yes" : "No"
      }</strong></div>
      <div class="card-row"><span>Source</span><strong>${sources[train.source]}</strong></div>
    `;

    card.addEventListener("click", () => {
      if (train.lat != null && train.lon != null && mapState.map) {
        mapState.map.setView([train.lat, train.lon], 7);
      }
    });

    elements.list.appendChild(card);
  });

  renderMarkers(trains, indexBySource);
}

async function refreshData() {
  try {
    const trains = await loadTrains();
    const filters = {
      search: elements.search.value,
      source: elements.source.value,
      status: elements.status.value,
    };

    const filtered = trains.filter((train) => matchesFilter(train, filters));
    renderSummary(trains);
    renderTrains(filtered);
    elements.lastUpdated.textContent = `Last updated: ${formatTime()}`;
  } catch (error) {
    renderSummary([]);
    renderTrains([]);
    elements.lastUpdated.textContent = "Last updated: error";
  }
}

function attachEvents() {
  [elements.search, elements.source, elements.status].forEach((input) => {
    input.addEventListener("input", refreshData);
    input.addEventListener("change", refreshData);
  });

  elements.refresh.addEventListener("click", refreshData);
}

initMap();
attachEvents();
refreshData();

setInterval(refreshData, 30_000);
