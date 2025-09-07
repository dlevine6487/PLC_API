const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('historyApi', {
  getHistory: (tagNames, limit) => ipcRenderer.invoke('db:get-history', { tagNames, limit }),
  getAllHistoricalTagNames: () => ipcRenderer.invoke('db:get-all-historical-tag-names'),
  setHistoryRetention: (minutes) => ipcRenderer.send('settings:set-history-retention', minutes),
  onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', (event, data) => callback(data)),
  exportData: (viewerName, data, format) => ipcRenderer.invoke('viewer:export-data', { viewerName, data, format }),
});