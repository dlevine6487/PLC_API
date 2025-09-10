const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { SiemensPLC_API, getLastApiCall } = require('../api/siemens-plc.js');
const fileParsers = require('../utils/file-parsers.js');

function registerIpcHandlers(store, { startPolling, stopPolling, pollMainData }) {

    // --- File and Session Handlers ---
    ipcMain.handle('dialog:open-file', async () => {
        const { mainWindow } = store.getState();
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: [{ name: 'TIA Portal Files', extensions: ['xml', 's7dcl'] }]
        });
        return canceled ? [] : filePaths;
    });

    ipcMain.handle('parse-files', async (event, filePaths) => {
        const newConfig = {};
        const allWarnings = [];

        for (const filePath of filePaths) {
            try {
                const fileName = path.basename(filePath);
                const fileContent = await fs.readFile(filePath, 'utf8');
                let result = null;

                if (path.extname(fileName).toLowerCase() === '.s7dcl') {
                    result = fileParsers.parseS7dcl(fileContent);
                } else if (path.extname(fileName).toLowerCase() === '.xml') {
                    if (fileContent.includes('<SW.Blocks.GlobalDB')) {
                        result = await fileParsers.parseGlobalDB(fileContent);
                    } else if (fileContent.includes('<SW.Tags.PlcTagTable')) {
                        result = await fileParsers.parsePlcTagTable(fileContent);
                    }
                }

                if (result) {
                    newConfig[fileName] = result;
                    if (result.warnings) {
                        allWarnings.push(...result.warnings);
                    }
                }
            } catch (e) {
                return { success: false, error: `Failed to parse ${path.basename(filePath)}.` };
            }
        }
        const { SESSION_FILE_PATH } = store.getState();
        store.setState({ tagConfig: newConfig });
        await fs.writeFile(SESSION_FILE_PATH, JSON.stringify(newConfig, null, 2));

        // After updating the central state, notify the renderer process so it can update the UI.
        // Get the window directly to avoid race conditions during app startup.
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('state-update', { tagConfig: newConfig });
        }

        return { success: true, config: newConfig, warnings: allWarnings };
    });

    ipcMain.handle('clear-session', async () => {
        try {
            const { SESSION_FILE_PATH, plcApiInstance } = store.getState();
            await fs.unlink(SESSION_FILE_PATH);
            if (plcApiInstance?.sessionId) {
                await plcApiInstance.logout();
            }
            stopPolling();
            store.setState({
                tagConfig: {},
                liveValues: {},
                plcApiInstance: null,
                activePollingTags: []
            });
            return { success: true };
        } catch (error) {
            if (error.code === 'ENOENT') return { success: true }; // File didn't exist, which is fine
            return { success: false, error: error.message };
        }
    });

    // --- PLC Communication Handlers ---
    ipcMain.handle('plc:connect', async (event, ip) => {
        const { plcConfig } = store.getState();
        try {
            const newPlcApiInstance = await SiemensPLC_API.create(ip, plcConfig.username, plcConfig.password);
            const result = await newPlcApiInstance.login();
            if (result.success) {
                store.setState({ plcApiInstance: newPlcApiInstance });
                startPolling(1000); // Start polling at 1s rate
                return { success: true, ip: newPlcApiInstance.config.plcIp, sessionId: newPlcApiInstance.sessionId };
            } else {
                return { success: false, ip, error: result.error };
            }
        } catch (error) {
            return { success: false, ip, error: error.message };
        }
    });

    ipcMain.handle('plc:disconnect', async () => {
        const { plcApiInstance } = store.getState();
        stopPolling();
        if (plcApiInstance) await plcApiInstance.logout();
        store.setState({ plcApiInstance: null, plcState: { connected: false } });
        return { success: true };
    });

    ipcMain.handle('plc:write', async (event, { tagName, value, type }) => {
        const { plcApiInstance, tagConfig } = store.getState();
        if (!plcApiInstance) return { success: false, error: 'PLC not connected.' };

        let typedValue;
        try {
            const allTags = Object.values(tagConfig).flatMap(source => source.tags || []);
            const tagObject = allTags.find(t => t.fullTagName === tagName);
            const authoritativeType = (tagObject?.type || type || '').toLowerCase();

            if (authoritativeType.includes('bool')) {
                const lowerVal = String(value).toLowerCase();
                if (!['true', 'false', '1', '0'].includes(lowerVal)) throw new Error('Invalid value for Bool.');
                typedValue = (lowerVal === 'true' || lowerVal === '1');
            } else if (authoritativeType.includes('int')) {
                typedValue = parseInt(value, 10);
                if (isNaN(typedValue) || String(typedValue) !== String(value).trim()) throw new Error('Invalid value for Integer.');
                typedValue = Number(typedValue);
            } else if (authoritativeType.includes('real')) {
                typedValue = parseFloat(value);
                if (isNaN(typedValue)) throw new Error('Invalid value for Real/float.');
            } else {
                typedValue = value;
            }
        } catch (e) {
            return { success: false, error: e.message };
        }

        const result = await plcApiInstance.writeVariable(tagName, typedValue);
        if (result.success) pollMainData(); // Immediately poll for the new value
        return result;
    });

    ipcMain.on('plc:set-poll-rate', (event, rate) => {
        const { plcApiInstance } = store.getState();
        if (plcApiInstance?.sessionId) {
            startPolling(rate);
        }
    });

    // --- Database and Logging Handlers ---
    ipcMain.handle('db:log-tag', (event, { tagName, value, dataType }) => {
        const { db } = store.getState();
        try {
            const stmt = db.prepare('INSERT INTO history (tagName, value, timestamp, dataType, quality) VALUES (?, ?, ?, ?, ?)');
            stmt.run(tagName, String(value), new Date().toISOString(), dataType, 'GOOD');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:clear-history', () => {
        const { db } = store.getState();
        try {
            db.prepare('DELETE FROM history').run();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // --- UI State and Viewer Handlers ---
    ipcMain.handle('trending:set-state', (event, { tagName, isTrending }) => {
        let { plottedTags, viewerWindows } = store.getState();
        if (isTrending) {
            if (!plottedTags.includes(tagName)) plottedTags.push(tagName);
        } else {
            plottedTags = plottedTags.filter(t => t !== tagName);
        }
        store.setState({ plottedTags });
        const graphWin = viewerWindows.graph;
        if (graphWin && !graphWin.isDestroyed()) {
            graphWin.webContents.send('graph:update-plotted-tags', { tagName });
        }
        return { success: true, plottedTags };
    });

    ipcMain.handle('trending:clear-all', () => {
        let { viewerWindows } = store.getState();
        store.setState({ plottedTags: [] });
        const graphWin = viewerWindows.graph;
        if (graphWin && !graphWin.isDestroyed()) {
            graphWin.webContents.send('graph:clear-all-tags');
        }
        return { success: true };
    });

    ipcMain.handle('alarms:ack-all', () => {
        let { mockAlarms, viewerWindows } = store.getState();
        mockAlarms.forEach(alarm => alarm.acknowledgement = { state: 'acknowledged' });
        store.setState({ mockAlarms });
        const alarmWin = viewerWindows.alarms;
        if (alarmWin && !alarmWin.isDestroyed()) {
            alarmWin.webContents.send('alarms-update', { entries: mockAlarms });
        }
        return { success: true };
    });

    ipcMain.on('open-viewer', (event, viewerName) => {
        let { viewerWindows, mainWindow } = store.getState();
        if (viewerWindows[viewerName] && !viewerWindows[viewerName].isDestroyed()) {
            viewerWindows[viewerName].focus();
            return;
        }
        const win = new BrowserWindow({
            width: 800, height: 600, parent: mainWindow,
            webPreferences: {
                preload: path.join(__dirname, `../views/${viewerName}/preload.js`),
                contextIsolation: true, nodeIntegration: false
            }
        });
        win.loadFile(path.join(__dirname, `../views/${viewerName}/index.html`));
        win.on('closed', () => {
            delete viewerWindows[viewerName];
            store.setState({ viewerWindows });
        });
        viewerWindows[viewerName] = win;
        store.setState({ viewerWindows });
    });

    // --- Debugging and State Getters ---
    ipcMain.handle('debug:get-last-api-call', () => getLastApiCall());

    ipcMain.handle('debug:export-api-call', async (event, data) => {
        const { mainWindow } = store.getState();
        try {
            const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
                title: 'Export API Call',
                defaultPath: `api-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
                filters: [{ name: 'JSON Files', extensions: ['json'] }]
            });

            if (!canceled && filePath) {
                await fs.writeFile(filePath, JSON.stringify(data, null, 2));
                return { success: true, path: filePath };
            }
            return { success: false, reason: 'Dialog canceled' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-app-config', () => store.getState().tagConfig);
    ipcMain.handle('get-live-values', () => store.getState().liveValues);
    ipcMain.handle('get-plc-state', () => {
        const { plcApiInstance, DEFAULT_PLC_IP } = store.getState();
        return {
            connected: !!plcApiInstance?.sessionId,
            ip: plcApiInstance?.config.plcIp || '',
            sessionId: plcApiInstance?.sessionId || '',
            lastUsedIp: plcApiInstance?.config.plcIp || DEFAULT_PLC_IP
        };
    });
}

module.exports = { registerIpcHandlers };
