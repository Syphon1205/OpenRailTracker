const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ortDesktop', {
  completeWelcome: () => ipcRenderer.invoke('welcome:complete'),
});
