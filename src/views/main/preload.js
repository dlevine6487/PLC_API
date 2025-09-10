const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // File Handling
    openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
    parseFiles: (filePaths) => ipcRenderer.invoke('parse-files', filePaths),
    clearSession: () => ipcRenderer.invoke('clear-session'),

    // PLC Communication
    connectPlc: (ip) => ipcRenderer.invoke('plc:connect', ip),
    disconnectPlc: () => ipcRenderer.invoke('plc:disconnect'),
    writePlc: (data) => ipcRenderer.invoke('plc:write', data),
    setPollRate: (rate) => ipcRenderer.send('plc:set-poll-rate', rate),

    // Window Management & Events
    openViewer: (viewerName) => ipcRenderer.send('open-viewer', viewerName),
    onStateUpdate: (callback) => ipcRenderer.on('state-update', (event, state) => callback(state)),

    // Tag and Quick Actions
    setLoggingState: (data) => ipcRenderer.invoke('logging:set-state', data),
    setTrendingState: (data) => ipcRenderer.invoke('trending:set-state', data),
    clearAllHistory: () => ipcRenderer.invoke('db:clear-history'),
    clearAllTrends: () => ipcRenderer.invoke('trending:clear-all'),
    acknowledgeAllAlarms: () => ipcRenderer.invoke('alarms:ack-all'),
});