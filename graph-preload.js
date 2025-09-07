const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('graphApi', {
  getHistory: (tagNames, limit) => ipcRenderer.invoke('db:get-history', { tagNames, limit }),
  onUpdatePlottedTags: (callback) => ipcRenderer.on('graph:update-plotted-tags', (event, data) => callback(data)),
  sendPlottedTagsState: (plottedTags) => ipcRenderer.send('graph:plotted-tags-state', plottedTags),
  exportData: (viewerName, data, format) => ipcRenderer.invoke('viewer:export-data', { viewerName, data, format }),
});