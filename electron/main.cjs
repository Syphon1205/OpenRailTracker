const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'backend')
  : path.join(ROOT, 'backend');
const APP_URL = process.env.ORT_APP_URL || 'http://localhost:3000';
const FIRST_BOOT_MARKER = 'first-boot-complete.json';

let backendProcess = null;
let mainWindow = null;
let welcomeWindow = null;

function getAppIconPath() {
  return path.join(__dirname, 'assets', 'app_icon.svg');
}

function createMainWindow() {
  const iconPath = getAppIconPath();
  const appIcon = nativeImage.createFromPath(iconPath);
  if (!appIcon.isEmpty() && process.platform === 'darwin') {
    app.dock.setIcon(appIcon);
  }

  mainWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    backgroundColor: '#0a0c12',
    title: 'OpenRailTracker',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createWelcomeWindow() {
  if (!mainWindow) return;
  welcomeWindow = new BrowserWindow({
    width: 720,
    height: 520,
    show: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: mainWindow,
    modal: true,
    title: 'Welcome to OpenRailTracker',
    backgroundColor: '#0b1020',
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  welcomeWindow.loadFile(path.join(__dirname, 'welcome.html'));
  welcomeWindow.on('closed', () => {
    welcomeWindow = null;
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  });
}

function npmExecutable() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function isPortOpenFromUrl(urlString, timeoutMs = 900) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return Promise.resolve(false);
  }

  const hostname = parsed.hostname || 'localhost';
  const port = Number(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80);

  return new Promise((resolve) => {
    const socket = net.createConnection({ host: hostname, port });
    let done = false;

    const finish = (value) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function startBackend() {
  if (backendProcess) return;

  const existingServer = await isPortOpenFromUrl(APP_URL);
  if (existingServer) {
    console.log(`[electron] Reusing existing backend at ${APP_URL}`);
    return;
  }

  if (app.isPackaged) {
    const backendEntry = path.join(BACKEND_DIR, 'server.js');
    backendProcess = spawn(process.execPath, [backendEntry], {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: 'inherit',
      shell: false,
    });
  } else {
    backendProcess = spawn(npmExecutable(), ['start'], {
      cwd: BACKEND_DIR,
      env: { ...process.env },
      stdio: 'inherit',
      shell: false,
    });
  }

  backendProcess.on('exit', () => {
    backendProcess = null;
  });
}

function stopBackend() {
  if (!backendProcess) return;
  backendProcess.kill();
  backendProcess = null;
}

function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
        } else if (Date.now() - started > timeoutMs) {
          reject(new Error(`Server not ready (status ${res.statusCode})`));
        } else {
          setTimeout(attempt, 400);
        }
      });
      req.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error('Timed out waiting for backend server'));
        } else {
          setTimeout(attempt, 400);
        }
      });
    };
    attempt();
  });
}

function firstBootFilePath() {
  return path.join(app.getPath('userData'), FIRST_BOOT_MARKER);
}

function hasCompletedFirstBoot() {
  try {
    return fs.existsSync(firstBootFilePath());
  } catch {
    return false;
  }
}

function markFirstBootComplete() {
  try {
    fs.mkdirSync(path.dirname(firstBootFilePath()), { recursive: true });
    fs.writeFileSync(firstBootFilePath(), JSON.stringify({ completedAt: new Date().toISOString() }, null, 2));
  } catch {
    // ignore
  }
}

ipcMain.handle('welcome:complete', () => {
  markFirstBootComplete();
  if (welcomeWindow) {
    welcomeWindow.close();
  }
  if (mainWindow && !mainWindow.isVisible()) {
    mainWindow.show();
  }
  return true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});

app.whenReady().then(async () => {
  createMainWindow();
  await startBackend();

  try {
    await waitForServer(APP_URL, 35000);
  } catch (error) {
    console.error(error);
  }

  mainWindow.webContents.once('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
    if (hasCompletedFirstBoot()) {
      // Nothing extra needed
    } else {
      createWelcomeWindow();
    }
  });
  mainWindow.loadURL(APP_URL);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});
