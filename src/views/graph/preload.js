const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('graphApi', {
  getPlottedTags: () => ipcRenderer.invoke('trending:get-plotted-tags'),
  getHistory: (tagNames, limit) => ipcRenderer.invoke('db:get-history', { tagNames, limit }),
  onPlottedTagsChanged: (callback) => ipcRenderer.on('graph:plotted-tags-changed', (event, data) => callback(data)),
  exportData: (data) => ipcRenderer.invoke('viewer:export-data', { viewerName: 'graph', data, format: 'csv' }),
});