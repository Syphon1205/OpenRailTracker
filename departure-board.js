const sourceLabels = {
  all: "All Railroads",
  amtrak: "Amtrak",
  brightline: "Brightline",
  via: "VIA Rail",
  metra: "Metra",
  mta: "MTA Metro-North",
  njt: "NJ Transit",
  septa: "SEPTA",
  mbta: "MBTA",
  lirr: "LIRR",
  bart: "BART",
  marta: "MARTA",
  dart: "DART",
};

const BOARD_API_BASE = (() => {
  const queryBase = new URLSearchParams(window.location.search).get("apiBase") || "";
  const globalBase = `${window.ORT_API_BASE || ""}`;
  const base = (queryBase || globalBase).trim();
  if (base) return base.replace(/\/+$/, "");
  if (window.location.hostname.endsWith("github.io")) return "https://openrailtracker.app";
  return "";
})();

function boardApiUrl(path) {
  if (!path || !path.startsWith("/")) return path;
  return `${BOARD_API_BASE}${path}`;
}

// Split-flap mode inspired by baspete/Split-Flap (MIT):
// https://github.com/baspete/Split-Flap

const el = {
  source: document.getElementById("board-source"),
  sort: document.getElementById("board-sort"),
  refresh: document.getElementById("refresh-board"),
  updated: document.getElementById("board-updated"),
  grid: document.getElementById("board-grid"),
};

const sourceFromQuery = new URLSearchParams(window.location.search).get("source") || "all";
const sortFromQuery = new URLSearchParams(window.location.search).get("sort") || "time";
const flapCache = new Map();
const flapTimers = new Set();
const CASCADE_CELL_MS = 6;
const FLIP_SETTLE_MS = 34;
const FLAP_DRUM = [
  " ",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
  ",",
  "?",
  "!",
  "/",
  "'",
  "+",
  "-",
  ":",
  "@",
  "#",
];

function rotateArray(values, count) {
  if (!Array.isArray(values) || !values.length) return values;
  const shift = ((count % values.length) + values.length) % values.length;
  return [...values.slice(shift), ...values.slice(0, shift)];
}

const splitFlapDisplay = {
  FullDrum() {
    return [...FLAP_DRUM];
  },
  CharDrum() {
    return [
      " ",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      ".",
      ",",
      "-",
      ":",
      "/",
    ];
  },
  NumDrum() {
    return [" ", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", ",", ":"];
  },
  drum(type) {
    if (type === "number") return this.NumDrum();
    if (type === "character") return this.CharDrum();
    return this.FullDrum();
  },
  initCell(cell, type) {
    const key = cell.dataset.flapKey;
    if (!key) return;
    const existing = flapCache.get(key);
    if (existing?.order?.length) return;
    flapCache.set(key, { order: this.drum(type), current: " " });
    this.show(cell, " ", false);
  },
  loadGroup(input, cells, type = "full", startDelay = 0, startIndex = 0) {
    const strLen = cells.length;
    const chars = `${input ?? ""}`.toUpperCase().split("");
    while (chars.length < strLen) chars.push(" ");
    chars.slice(0, strLen).forEach((char, i) => {
      const target = this.normalize(char, type);
      this.change(cells[i], target, type, startDelay, startIndex + i);
    });
    return startIndex + chars.slice(0, strLen).length;
  },
  normalize(char, type = "full") {
    const c = `${char ?? " "}`.toUpperCase().charAt(0) || " ";
    return this.drum(type).includes(c) ? c : " ";
  },
  change(cell, char, type = "full", startDelay = 0, cascadeIndex = 0) {
    const key = cell.dataset.flapKey;
    if (!key) return;
    this.initCell(cell, type);
    const state = flapCache.get(key);
    const values = [...state.order];
    const target = this.normalize(char, type);
    let index = values.indexOf(target);
    if (index < 0) index = values.indexOf(" ");
    const changed = state.current !== target;
    state.order = rotateArray(values, Math.max(0, index));
    state.current = target;
    flapCache.set(key, state);
    if (!changed) {
      this.show(cell, target, false);
      return;
    }

    const intermediate = values[Math.max(1, Math.min(index, values.length - 1))] || target;
    const launchDelay = startDelay + cascadeIndex * CASCADE_CELL_MS;
    const t1 = window.setTimeout(() => {
      this.show(cell, intermediate, true);
      const t2 = window.setTimeout(() => {
        this.show(cell, target, false);
        flapTimers.delete(t2);
      }, FLIP_SETTLE_MS);
      flapTimers.add(t2);
      flapTimers.delete(t1);
    }, launchDelay);
    flapTimers.add(t1);
  },
  show(cell, char, pulse = true) {
    const glyph = cell.querySelector(".flap-glyph");
    if (!glyph) return;
    glyph.textContent = char === " " ? "\u00A0" : char;
    if (!pulse) return;
    cell.classList.remove("flip-pulse");
    window.requestAnimationFrame(() => {
      cell.classList.add("flip-pulse");
      window.setTimeout(() => cell.classList.remove("flip-pulse"), 95);
    });
  },
};

function currentBoardStyle() {
  return "splitflap";
}

function updateQueryParam(name, value) {
  const params = new URLSearchParams(window.location.search);
  if (!value || value === "all") {
    params.delete(name);
  } else {
    params.set(name, value);
  }
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

function applyBoardStyle(style) {
  const normalized = "splitflap";
  document.body.dataset.boardStyle = normalized;
  updateQueryParam("style", "");
}

function parseMinutes(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const text = `${value}`.trim();
  const match = text.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return Number.POSITIVE_INFINITY;
  let h = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  const p = match[3]?.toUpperCase();
  if (p === "PM" && h < 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function displayTime(train) {
  return train.actual || train.eta || train.scheduled || "--:--";
}

function trainId(train) {
  const raw = `${train.trainNum || train.id || train.name || ""}`;
  const nums = raw.match(/\d+/g);
  const digits = nums?.length ? nums.join("").slice(0, 4) : "000";
  const prefix = (train.source || "t").slice(0, 1).toUpperCase();
  return `${prefix}${digits}`;
}

function statusKind(train) {
  const rawStatus = `${train.status || ""}`.toLowerCase();
  const delayMinutes = Number.parseInt(train.delayMinutes ?? train.delay ?? 0, 10);
  const isLate = Number.isFinite(delayMinutes)
    ? delayMinutes > 5
    : rawStatus.includes("late") || rawStatus.includes("delay");
  const isEarly = Number.isFinite(delayMinutes)
    ? delayMinutes < -1
    : rawStatus.includes("early");

  if (
    rawStatus.includes("arriv") ||
    rawStatus.includes("complete") ||
    rawStatus.includes("terminated") ||
    rawStatus.includes("finished")
  ) {
    return "arrived";
  }
  if (isEarly) return "early";
  if (isLate || rawStatus.includes("late") || rawStatus.includes("delay")) return "late";
  if (train.realTime) return "live";
  return "scheduled";
}

function statusText(train) {
  const kind = statusKind(train);
  if (kind === "arrived") return "Arrived";
  if (kind === "early") return "Early";
  if (kind === "late") return "Late";
  if (kind === "live") return "On Time";
  return "Scheduled";
}

function statusSortRank(train) {
  const kind = statusKind(train);
  if (kind === "late") return 0;
  if (kind === "early") return 1;
  if (kind === "live" || kind === "scheduled") return 2;
  if (kind === "arrived") return 3;
  return 4;
}

function escapeHtml(value) {
  return `${value ?? ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeKey(value) {
  return `${value ?? ""}`.replace(/[^a-z0-9_-]/gi, "_");
}

function normalizeFlapChar(value) {
  const char = `${value ?? " "}`.toUpperCase()[0] || " ";
  return FLAP_DRUM.includes(char) ? char : " ";
}

function clearFlapTimers() {
  flapTimers.forEach((id) => window.clearTimeout(id));
  flapTimers.clear();
}

function forceRenderSplitFlapTargets() {
  const cells = [...document.querySelectorAll(".flap-cell[data-flap-key][data-target]")];
  cells.forEach((cell) => {
    const key = cell.dataset.flapKey;
    const target = normalizeFlapChar(cell.dataset.target || " ");
    if (!key) return;
    const state = flapCache.get(key) || { order: splitFlapDisplay.FullDrum(), current: " " };
    state.current = target;
    flapCache.set(key, state);
    splitFlapDisplay.show(cell, target, false);
  });
}

function startBlinkClock() {
  let on = true;
  document.body.dataset.blink = "on";
  window.setInterval(() => {
    on = !on;
    document.body.dataset.blink = on ? "on" : "off";
  }, 550);
}

function animateSplitFlapBoard() {
  if (document.body.dataset.boardStyle !== "splitflap") return;
  const rows = [...document.querySelectorAll(".splitflap-row")].sort((a, b) => {
    const rowA = Number.parseInt(a.dataset.rowIndex || "0", 10);
    const rowB = Number.parseInt(b.dataset.rowIndex || "0", 10);
    if (rowA !== rowB) return rowA - rowB;
    const panelA = Number.parseInt(a.dataset.panelIndex || "0", 10);
    const panelB = Number.parseInt(b.dataset.panelIndex || "0", 10);
    return panelA - panelB;
  });

  let cascadeIndex = 0;
  rows.forEach((row) => {
    const groups = [...row.querySelectorAll(".splitflap-group[data-group-target]")];
    groups.forEach((group) => {
      const cells = [...group.querySelectorAll(".flap-cell[data-flap-key]")];
      const type = group.dataset.groupType || "full";
      const target = group.dataset.groupTarget || "";
      cells.forEach((cell) => splitFlapDisplay.initCell(cell, type));
      cascadeIndex = splitFlapDisplay.loadGroup(target, cells, type, 0, cascadeIndex);
    });
  });
  const settleDelay = cascadeIndex * CASCADE_CELL_MS + FLIP_SETTLE_MS + 80;
  const t = window.setTimeout(() => {
    forceRenderSplitFlapTargets();
    flapTimers.delete(t);
  }, settleDelay);
  flapTimers.add(t);
}

function splitFlapFieldMarkup(value, width, cacheKey, type = "full") {
  const normalized = `${value ?? ""}`.toUpperCase().padEnd(width, " ").slice(0, width);

  const cells = [...normalized]
    .map((char, i) => {
      const target = normalizeFlapChar(char);
      const key = `${cacheKey}-${i}`;
      const current = normalizeFlapChar(flapCache.get(key)?.current || " ");
      const safeCurrent = current === " " ? "&nbsp;" : escapeHtml(current);
      return `<span class="flap-cell" data-flap-key="${escapeHtml(key)}" data-target="${escapeHtml(target)}"><span class="flap-glyph">${safeCurrent}</span></span>`;
    })
    .join("");

  return `<span class="splitflap-group" data-group-type="${escapeHtml(type)}" data-group-target="${escapeHtml(normalized)}">${cells}</span>`;
}

function rowMarkup(train, rowIndex = 0, panelKey = "board", panelIndex = 0) {
  const kind = statusKind(train);
  const status = statusText(train);
  const destination = train.nextStop || train.route || "--";
  const splitflap = document.body.dataset.boardStyle === "splitflap";

  if (splitflap) {
    const keyBase = sanitizeKey(`${panelKey}-${rowIndex}-${train.id || train.name || trainId(train)}`);
    const greenOn = kind === "late" ? "" : "on";
    const redOn = kind === "late" ? "on blink-sync" : "";
    return `
      <div class="board-row splitflap-row" data-row-index="${rowIndex}" data-panel-index="${panelIndex}">
        <span class="time">${splitFlapFieldMarkup(displayTime(train), 5, `${keyBase}-time`, "number")}</span>
        <span class="train">${splitFlapFieldMarkup(trainId(train), 5, `${keyBase}-train`, "character")}</span>
        <span class="dest">${splitFlapFieldMarkup(destination, 18, `${keyBase}-dest`, "character")}</span>
        <span class="status ${kind}">
          <span class="splitflap-status-text">${splitFlapFieldMarkup(status, 9, `${keyBase}-status`, "character")}</span>
          <span class="splitflap-signals" aria-hidden="true"><i class="sig-green ${greenOn}"></i><i class="sig-red ${redOn}"></i></span>
        </span>
      </div>
    `;
  }

  return `
    <div class="board-row">
      <span class="time">${escapeHtml(displayTime(train))}</span>
      <span class="train">${escapeHtml(trainId(train))}</span>
      <span class="dest">${escapeHtml(destination)}</span>
      <span class="status ${kind}">${escapeHtml(status)}</span>
    </div>
  `;
}

function panelMarkup(title, trains, panelKey, panelIndex) {
  const splitflap = document.body.dataset.boardStyle === "splitflap";
  const rows = trains.length
    ? trains.map((train, idx) => rowMarkup(train, idx, panelKey, panelIndex)).join("")
    : '<div class="board-empty">No departures</div>';
  const live = trains.filter((t) => t.realTime).length;

  return `
    <article class="board-panel">
      <div class="board-row head">
        <span>${splitflap ? splitFlapFieldMarkup("TIME", 5, `${panelKey}-head-time`, "character") : "Time"}</span>
        <span>${splitflap ? splitFlapFieldMarkup("TRAIN", 5, `${panelKey}-head-train`, "character") : "Train"}</span>
        <span>${splitflap ? splitFlapFieldMarkup("CALLING AT", 18, `${panelKey}-head-dest`, "character") : "Calling at"}</span>
        <span>${splitflap ? splitFlapFieldMarkup("STATUS", 9, `${panelKey}-head-status`, "character") : "Status"}</span>
      </div>
      ${rows}
      <div class="board-meta">${escapeHtml(title)} • ${live}/${trains.length} live</div>
      <div class="board-operator">OpenRailTracker North America</div>
    </article>
  `;
}

function buildSourceOptions(trains) {
  const sources = [...new Set(trains.map((t) => t.source).filter(Boolean))].sort();
  el.source.innerHTML = '<option value="all">All Railroads</option>';
  sources.forEach((source) => {
    const option = document.createElement("option");
    option.value = source;
    option.textContent = sourceLabels[source] || source.toUpperCase();
    el.source.appendChild(option);
  });
  if ([...el.source.options].some((opt) => opt.value === sourceFromQuery)) {
    el.source.value = sourceFromQuery;
  }
  updateQueryParam("source", el.source.value);
  if (["time", "status"].includes(sortFromQuery)) {
    el.sort.value = sortFromQuery;
  }
  updateQueryParam("sort", el.sort.value || "time");
}

async function loadBoard() {
  const [mainRes, commuterRes] = await Promise.all([
    fetch(boardApiUrl("/api/trains")).then((r) => r.json()).catch(() => ({ trains: [] })),
    fetch(boardApiUrl("/api/commuter/trains")).then((r) => (r.ok ? r.json() : { trains: [] })).catch(() => ({ trains: [] })),
  ]);

  const all = [...(mainRes.trains || []), ...(commuterRes.trains || [])];
  if (el.source.options.length <= 1) {
    buildSourceOptions(all);
  }

  const src = el.source.value || "all";
  const sortMode = el.sort?.value || "time";
  const filtered = all.filter((t) => (src === "all" ? true : t.source === src));

  if (sortMode === "status") {
    filtered.sort((a, b) => {
      const rankDiff = statusSortRank(a) - statusSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      return parseMinutes(displayTime(a)) - parseMinutes(displayTime(b));
    });
  } else {
    filtered.sort((a, b) => parseMinutes(displayTime(a)) - parseMinutes(displayTime(b)));
  }

  const mid = Math.ceil(filtered.length / 2);
  const left = filtered.slice(0, mid);
  const right = filtered.slice(mid);

  const leftTitle = src === "all" ? "Board A" : sourceLabels[src] || src;
  const rightTitle = src === "all" ? "Board B" : `${sourceLabels[src] || src} (cont.)`;
  clearFlapTimers();
  el.grid.innerHTML = panelMarkup(leftTitle, left, "left", 0) + panelMarkup(rightTitle, right, "right", 1);
  animateSplitFlapBoard();
  el.updated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

el.refresh.addEventListener("click", () => loadBoard());
el.source.addEventListener("change", () => {
  updateQueryParam("source", el.source.value || "all");
  loadBoard();
});
el.sort?.addEventListener("change", () => {
  updateQueryParam("sort", el.sort.value || "time");
  loadBoard();
});

applyBoardStyle(currentBoardStyle());
startBlinkClock();
loadBoard();
setInterval(loadBoard, 15000);
