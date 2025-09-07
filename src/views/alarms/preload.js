const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('alarmsApi', {
  onAlarmsUpdate: (callback) => ipcRenderer.on('alarms-update', (event, data) => callback(data)),
  acknowledgeAlarm: (alarmId) => ipcRenderer.invoke('plc:acknowledge-alarm', alarmId),
  exportData: (viewerName, data, format) => ipcRenderer.invoke('viewer:export-data', { viewerName, data, format }),
});