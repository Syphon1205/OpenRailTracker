const { contextBridge, ipcRenderer } = require("electron");

const buildInfo = ipcRenderer.sendSync("ort-get-build-info-sync") || {};
const arch = `${buildInfo.arch || ""}`.toLowerCase();
const platform = `${buildInfo.platform || ""}`.toLowerCase();
const archLabel = arch === "arm64" ? "Silicon" : arch === "x64" ? "Intel" : (arch || "Desktop");
const platformLabel = platform === "darwin" ? "macOS" : (platform || "Desktop");
const versionId = buildInfo.version ? `${buildInfo.version}-${archLabel}` : "";

contextBridge.exposeInMainWorld("ORT_DESKTOP_BUILD", {
	...buildInfo,
	archLabel,
	platformLabel,
	displayLabel: archLabel,
	fullDisplayLabel: `${platformLabel} ${archLabel}`.trim(),
	versionId,
});
// Expose that we're running in Electron
contextBridge.exposeInMainWorld("ORT_IS_ELECTRON", true);