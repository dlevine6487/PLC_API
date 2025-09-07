const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  onLogUpdate: (callback) => ipcRenderer.on('log-update', (event, data) => callback(data)),
  exportLog: (viewerName, data, format) => ipcRenderer.invoke('viewer:export-data', { viewerName, data, format }),
});