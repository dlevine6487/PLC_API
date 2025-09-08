const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { SiemensPLC_API, getLastApiCall } = require('../api/siemens-plc.js');
const fileParsers = require('../utils/file-parsers.js');

function registerIpcHandlers(context) {

    // --- File and Session Handlers ---
    ipcMain.handle('dialog:open-file', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(context.mainWindow, {
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
                console.error(`Error parsing file ${path.basename(filePath)}:`, e);
                return { success: false, error: `Failed to parse ${path.basename(filePath)}.` };
            }
        }
        context.tagConfig = newConfig;
        await fs.writeFile(context.SESSION_FILE_PATH, JSON.stringify(context.tagConfig, null, 2));
        return { success: true, config: context.tagConfig, warnings: allWarnings };
    });

    ipcMain.handle('clear-session', async () => {
        try {
            await fs.unlink(context.SESSION_FILE_PATH);
            console.log('[Main] Session file deleted.');
            context.tagConfig = {};
            context.liveValues = {};
            if (context.plcApiInstance && context.plcApiInstance.sessionId) {
                await context.plcApiInstance.logout();
            }
            context.stopPolling();
            context.plcApiInstance = null;
            context.activePollingTags = [];
            return { success: true };
        } catch (error) {
            if (error.code === 'ENOENT') {
                return { success: true };
            }
            console.error('[Main] Error clearing session:', error);
            return { success: false, error: error.message };
        }
    });

    // --- PLC Communication Handlers ---
    ipcMain.handle('plc:connect', async (event, ip) => {
        try {
            context.plcApiInstance = await SiemensPLC_API.create(ip, context.plcConfig.username, context.plcConfig.password);
            const result = await context.plcApiInstance.login();
            if (result.success) {
                const pollRate = 1000;
                context.startPolling(pollRate);
                return { success: true, ip: context.plcApiInstance.config.plcIp, sessionId: context.plcApiInstance.sessionId };
            } else {
                return { success: false, ip, error: result.error };
            }
        } catch (error) {
            console.error(`[Main] Failed to initialize PLC connection: ${error.message}`);
            return { success: false, ip, error: error.message };
        }
    });

    ipcMain.handle('plc:disconnect', async () => {
        context.stopPolling();
        if (context.plcApiInstance) await context.plcApiInstance.logout();
        context.plcApiInstance = null;
        return { success: true };
    });

    ipcMain.handle('plc:write', async (event, { tagName, value, type }) => {
        console.log(`[IPC] Received 'plc:write' for tag: ${tagName} with value: ${value} of type: ${type}`);
        if (!context.plcApiInstance) {
            return { success: false, error: 'PLC not connected.' };
        }

        let typedValue;
        try {
            // Find the authoritative type from the loaded config
            const allTags = Object.values(context.tagConfig).flatMap(source => source.tags || []);
            const tagObject = allTags.find(t => t.fullTagName === tagName);
            const authoritativeType = (tagObject?.type || type || '').toLowerCase();

            if (authoritativeType.includes('bool')) {
                const lowerVal = String(value).toLowerCase();
                if (!['true', 'false', '1', '0'].includes(lowerVal)) {
                    throw new Error('Invalid value for Bool. Use true, false, 1, or 0.');
                }
                typedValue = (lowerVal === 'true' || lowerVal === '1');
            } else if (authoritativeType.includes('int')) { // Covers int, sint, dint, etc.
                typedValue = parseInt(value, 10);
                if (isNaN(typedValue) || String(typedValue) !== String(value).trim()) {
                    throw new Error('Invalid value for an Integer type.');
                }
            } else if (authoritativeType.includes('real')) { // Covers real/float
                typedValue = parseFloat(value);
                if (isNaN(typedValue)) {
                    throw new Error('Invalid value for a Real/float type.');
                }
            } else {
                // For string types or others we don't explicitly handle, pass the raw string.
                typedValue = value;
            }
        } catch (e) {
            console.error(`[IPC VALIDATION] Write failed for tag ${tagName}:`, e.message);
            return { success: false, error: e.message };
        }

        const result = await context.plcApiInstance.writeVariable(tagName, typedValue);
        if (result.success) {
            console.log(`[IPC] Write successful for tag: ${tagName}`);
            context.pollMainData(); // Immediately poll for the new value
        } else {
            console.error(`[IPC ERROR] Write failed for tag ${tagName}:`, result.error);
        }
        return result;
    });

    ipcMain.on('plc:set-poll-rate', (event, rate) => {
        if (context.plcApiInstance?.sessionId) {
            context.startPolling(rate);
        }
    });

    // --- Database and Logging Handlers ---
    ipcMain.handle('db:log-tag', (event, { tagName, value, dataType }) => {
        console.log(`[IPC] Received 'db:log-tag' for tag: ${tagName}`);
        try {
            const stmt = context.db.prepare('INSERT INTO history (tagName, value, timestamp, dataType, quality) VALUES (?, ?, ?, ?, ?)');
            stmt.run(tagName, String(value), new Date().toISOString(), dataType, 'GOOD');
            console.log(`[DB] Successfully logged tag: ${tagName}`);
            return { success: true };
        } catch (error) {
            console.error("[DB ERROR] Database log error:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('db:clear-history', () => {
        try {
            context.db.prepare('DELETE FROM history').run();
            return { success: true };
        } catch (error) {
            console.error("Database clear error:", error);
            return { success: false, error: error.message };
        }
    });

    // --- UI State and Viewer Handlers ---
    ipcMain.handle('trending:set-state', (event, { tagName, isTrending }) => {
        console.log(`[IPC] Received 'trending:set-state' for tag: ${tagName}, trending: ${isTrending}`);
        if (isTrending) {
            if (!context.plottedTags.includes(tagName)) context.plottedTags.push(tagName);
        } else {
            context.plottedTags = context.plottedTags.filter(t => t !== tagName);
        }
        const graphWin = context.viewerWindows.graph;
        if (graphWin && !graphWin.isDestroyed()) {
            graphWin.webContents.send('graph:update-plotted-tags', { tagName });
        }
        return { success: true, plottedTags: context.plottedTags };
    });

    ipcMain.handle('trending:clear-all', () => {
        context.plottedTags = [];
        const graphWin = context.viewerWindows.graph;
        if (graphWin && !graphWin.isDestroyed()) {
            graphWin.webContents.send('graph:clear-all-tags');
        }
        return { success: true };
    });

    ipcMain.handle('alarms:ack-all', () => {
        context.mockAlarms.forEach(alarm => alarm.acknowledgement = { state: 'acknowledged' });
        const alarmWin = context.viewerWindows.alarms;
        if (alarmWin && !alarmWin.isDestroyed()) {
            alarmWin.webContents.send('alarms-update', { entries: context.mockAlarms });
        }
        return { success: true };
    });

    ipcMain.on('open-viewer', (event, viewerName) => {
        if (context.viewerWindows[viewerName] && !context.viewerWindows[viewerName].isDestroyed()) {
            context.viewerWindows[viewerName].focus();
            return;
        }
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            parent: context.mainWindow,
            webPreferences: {
                preload: path.join(__dirname, `../views/${viewerName}/preload.js`),
                contextIsolation: true,
                nodeIntegration: false
            }
        });
        win.loadFile(path.join(__dirname, `../views/${viewerName}/index.html`));
        win.on('closed', () => { delete context.viewerWindows[viewerName]; });
        context.viewerWindows[viewerName] = win;
    });

    // --- Debugging and State Getters ---
    ipcMain.handle('debug:get-last-api-call', () => {
        return getLastApiCall();
    });

    ipcMain.handle('debug:export-api-call', async (event, data) => {
        try {
            const { canceled, filePath } = await dialog.showSaveDialog(context.mainWindow, {
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
            console.error('Failed to export API debug data:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-app-config', () => context.tagConfig);
    ipcMain.handle('get-live-values', () => context.liveValues);
    ipcMain.handle('get-plc-state', () => ({
        connected: !!context.plcApiInstance?.sessionId,
        ip: context.plcApiInstance?.config.plcIp || '',
        sessionId: context.plcApiInstance?.sessionId || '',
        lastUsedIp: context.plcApiInstance?.config.plcIp || context.DEFAULT_PLC_IP
    }));
}

module.exports = { registerIpcHandlers };
