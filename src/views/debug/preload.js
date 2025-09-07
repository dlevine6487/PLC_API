const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('debugApi', {
  getLastApiCall: () => ipcRenderer.invoke('debug:get-last-api-call'),
  exportApiCall: (data) => ipcRenderer.invoke('debug:export-api-call', data)
});