const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // File Handling
    openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
    parseFiles: (filePaths) => ipcRenderer.invoke('parse-files', filePaths),
    clearSession: () => ipcRenderer.invoke('clear-session'),

    // PLC Communication
    connectPlc: (ip) => ipcRenderer.invoke('plc:connect', ip),
    disconnectPlc: () => ipcRenderer.invoke('plc:disconnect'),
    writePlc: (tagName, value) => ipcRenderer.invoke('plc:write', { tagName, value }),
    setPollRate: (rate) => ipcRenderer.send('plc:set-poll-rate', rate),

    // State & Data Getters
    getAppConfig: () => ipcRenderer.invoke('get-app-config'),
    getLiveValues: () => ipcRenderer.invoke('get-live-values'),
    getPlcState: () => ipcRenderer.invoke('get-plc-state'),

    // Window Management & Events
    openViewer: (viewerName) => ipcRenderer.send('open-viewer', viewerName),
    onDataUpdate: (callback) => ipcRenderer.on('data-update', (event, data) => callback(data)),
    onSessionLoaded: (callback) => ipcRenderer.on('session-loaded', (event, data) => callback(data)),

    // Tag and Quick Actions
    logTagToDb: (data) => ipcRenderer.invoke('db:log-tag', data),
    setTrendingState: (data) => ipcRenderer.invoke('trending:set-state', data),
    clearAllHistory: () => ipcRenderer.invoke('db:clear-history'),
    clearAllTrends: () => ipcRenderer.invoke('trending:clear-all'),
    acknowledgeAllAlarms: () => ipcRenderer.invoke('alarms:ack-all'),
});