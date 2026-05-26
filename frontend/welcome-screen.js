/**
 * Welcome Screen Module for OpenRailTracker v1.0.0
 * Provides cinematic arrival experience for first-time users
 */

const WELCOME_MODAL_SHOWN_KEY = "ort-welcome-shown-v1-0-0";

// Detect if running in Electron desktop app
function isDesktopApp() {
  return typeof window !== "undefined" && window.ORT_IS_ELECTRON === true;
}

// Detect if running in web version
function isWebApp() {
  return !isDesktopApp();
}

// Check if welcome modal should be shown
function shouldShowWelcomeModal() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("welcome") === "1") return true;
  const shown = localStorage.getItem(WELCOME_MODAL_SHOWN_KEY) === "true";
  return !shown;
}

// Mark welcome as shown
function markWelcomeAsShown() {
  localStorage.setItem(WELCOME_MODAL_SHOWN_KEY, "true");
}

// Create welcome modal HTML
function createWelcomeModalHtml() {
  const downloadButtonsHtml = isWebApp() ? `
    <div class="welcome-download-section">
      <p class="welcome-download-subtitle">Get the desktop app for your platform:</p>
      <div class="welcome-download-buttons">
        <button id="welcome-download-macos-intel" class="welcome-download-btn welcome-download-btn-macos" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
          </svg>
          <span>macOS Intel</span>
        </button>
        <button id="welcome-download-macos-silicon" class="welcome-download-btn welcome-download-btn-macos" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
          </svg>
          <span>macOS Apple Silicon</span>
        </button>
        <button id="welcome-download-windows" class="welcome-download-btn welcome-download-btn-windows" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <line x1="15" y1="3" x2="15" y2="21"></line>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="3" y1="15" x2="21" y2="15"></line>
          </svg>
          <span>Windows</span>
        </button>
      </div>
    </div>
  ` : "";

  return `
    <div class="welcome-modal-overlay"></div>
    <div class="welcome-modal-container">
      <div class="welcome-modal-background">
        <canvas id="welcome-modal-map-canvas"></canvas>
        <div class="welcome-modal-blur"></div>
      </div>
      
      <div class="welcome-modal-glass-panel">
        <div class="welcome-panel-content">
          <div class="welcome-panel-header">
            <h1 class="welcome-panel-title">Welcome to OpenRailTracker</h1>
            <p class="welcome-panel-subtitle">Live rail operations across North America</p>
          </div>
          
          <div class="welcome-panel-features">
            <div class="welcome-feature">
              <span class="welcome-feature-icon">🚂</span>
              <span class="welcome-feature-text">Real-time train tracking</span>
            </div>
            <div class="welcome-feature">
              <span class="welcome-feature-icon">📍</span>
              <span class="welcome-feature-text">Live station status</span>
            </div>
            <div class="welcome-feature">
              <span class="welcome-feature-icon">📸</span>
              <span class="welcome-feature-text">Community railfan gallery</span>
            </div>
            <div class="welcome-feature">
              <span class="welcome-feature-icon">🎥</span>
              <span class="welcome-feature-text">Public railcam feeds</span>
            </div>
          </div>

          ${downloadButtonsHtml}

          <button id="welcome-enter-operations" class="welcome-enter-btn" type="button">
            Enter Operations
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="13 17 20 10 13 3"></polyline>
              <polyline points="20 10 4 10"></polyline>
            </svg>
          </button>

          <div class="welcome-panel-version">v1.0.0</div>
        </div>
      </div>
    </div>
  `;
}

// Initialize welcome modal
function initializeWelcomeModal() {
  if (!shouldShowWelcomeModal()) return;

  const modalHtml = createWelcomeModalHtml();
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = modalHtml;
  const modal = tempDiv.querySelector(".welcome-modal-container");
  
  document.body.insertBefore(modal, document.body.firstChild);

  // Setup event listeners
  const enterBtn = document.getElementById("welcome-enter-operations");
  if (enterBtn) {
    enterBtn.addEventListener("click", () => {
      closeWelcomeModal();
    });
  }

  // Download buttons for web version
  if (isWebApp()) {
    document.getElementById("welcome-download-macos-intel")?.addEventListener("click", () => {
      showDownloadDialog("macos-intel");
    });
    document.getElementById("welcome-download-macos-silicon")?.addEventListener("click", () => {
      showDownloadDialog("macos-silicon");
    });
    document.getElementById("welcome-download-windows")?.addEventListener("click", () => {
      showDownloadDialog("windows");
    });
  }

  markWelcomeAsShown();
  animateWelcomeEntrance();
}

// Close welcome modal with transition
function closeWelcomeModal() {
  const modal = document.querySelector(".welcome-modal-container");
  if (!modal) return;

  modal.classList.add("welcome-modal-exit");
  
  setTimeout(() => {
    modal.remove();
  }, 600);
}

// Animate welcome entrance
function animateWelcomeEntrance() {
  const modal = document.querySelector(".welcome-modal-container");
  if (!modal) return;

  modal.classList.add("welcome-modal-enter");
}

// Show download dialog
function showDownloadDialog(platform) {
  const urlMap = {
    "macos-intel": "https://github.com/Syphon1205/OpenRailTracker/releases/download/v1.0.0/OpenRailTracker-1.0.0-mac-x64.dmg",
    "macos-silicon": "https://github.com/Syphon1205/OpenRailTracker/releases/download/v1.0.0/OpenRailTracker-1.0.0-mac-arm64.dmg",
    "windows": "https://github.com/Syphon1205/OpenRailTracker/releases/download/v1.0.0/OpenRailTracker-1.0.0-win-x64.exe",
  };

  const url = urlMap[platform];
  if (url) {
    window.open(url, "_blank");
  }
}

// Export for use in app
if (typeof window !== "undefined") {
  window.ORT_WelcomeScreen = {
    init: initializeWelcomeModal,
    shouldShow: shouldShowWelcomeModal,
    markShown: markWelcomeAsShown,
    isDesktopApp,
    isWebApp,
  };
}
