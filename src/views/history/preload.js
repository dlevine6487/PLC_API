const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('historyApi', {
  getHistory: (tagNames, limit) => ipcRenderer.invoke('db:get-history', { tagNames, limit }),
  getAllHistoricalTagNames: () => ipcRenderer.invoke('db:get-all-historical-tag-names'),
  exportData: (data) => ipcRenderer.invoke('viewer:export-data', { viewerName: 'history', data, format: 'csv' }),
});