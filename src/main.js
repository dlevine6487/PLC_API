const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const https = require('https');
const path = require('path');
const { SiemensPLC_API, initializeApi, getLastApiCall } = require('./api/siemens-plc.js');
const fs = require('fs/promises');
const xml2js = require('xml2js');
const Database = require('better-sqlite3');
let fetch;

// --- User Configuration Constants ---
const DEFAULT_PLC_IP = '192.168.0.1';
const PLC_CONFIG_PATH = path.join(app.getPath('userData'), 'plc-config.json');
const SESSION_FILE_PATH = path.join(app.getPath('userData'), 'session.json');

// --- Centralized State Management ---
let mainWindow;
let plcApiInstance = null;
let plcConfig = {};
let tagConfig = {};
let liveValues = {};
let pollTimer = null;
const viewerWindows = {};
let plottedTags = [];
let mockAlarms = [];
let activePollingTags = [];
let pollingErrorCount = 0;
const MAX_POLLING_ERRORS = 5;

// --- Database Setup ---
const db = new Database(path.join(app.getPath('userData'), 'history.db'));
db.exec(`
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tagName TEXT NOT NULL,
        value TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        dataType TEXT NOT NULL,
        quality TEXT NOT NULL
    );
`);

const fileParsers = require('./utils/file-parsers.js');


async function loadOrCreatePlcConfig() {
    try {
        await fs.access(PLC_CONFIG_PATH);
        const configData = await fs.readFile(PLC_CONFIG_PATH, 'utf8');
        console.log('[Main] Loaded PLC config from file.');
        return JSON.parse(configData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('[Main] plc-config.json not found. Creating with default credentials.');
            const defaultConfig = { username: "Siemens", password: "Siemens123!" };
            await fs.writeFile(PLC_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        } else {
            console.error('[Main] Error loading PLC config:', error);
            return { username: "Siemens", password: "Siemens123!" }; // Fallback
        }
    }
}

// --- Main Application Lifecycle & Window Management ---
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'views/main/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    mainWindow.loadFile(path.join(__dirname, 'views/main/index.html'));
    mainWindow.on('closed', () => { mainWindow = null; });
}

async function loadSavedSession() {
    try {
        await fs.access(SESSION_FILE_PATH);
        const sessionData = await fs.readFile(SESSION_FILE_PATH, 'utf8');
        const savedConfig = JSON.parse(sessionData);
        if (Object.keys(savedConfig).length > 0) {
            console.log('[Main] Found and loaded saved session.');
            tagConfig = savedConfig;
            return true;
        }
    } catch (error) {
        console.log('[Main] No saved session found or error loading it.');
    }
    return false;
}

const { registerIpcHandlers } = require('./main-process/ipc-handlers.js');

app.whenReady().then(async () => {
    fetch = (await import('node-fetch')).default;
    initializeApi(fetch); // Initialize the PLC API module with fetch
    plcConfig = await loadOrCreatePlcConfig();
    createMainWindow();

    // Register all IPC handlers
    registerIpcHandlers({
        // State variables
        get mainWindow() { return mainWindow; },
        get plcApiInstance() { return plcApiInstance; },
        set plcApiInstance(val) { plcApiInstance = val; },
        get plcConfig() { return plcConfig; },
        get tagConfig() { return tagConfig; },
        set tagConfig(val) { tagConfig = val; },
        get liveValues() { return liveValues; },
        set liveValues(val) { liveValues = val; },
        get viewerWindows() { return viewerWindows; },
        get plottedTags() { return plottedTags; },
        set plottedTags(val) { plottedTags = val; },
        get mockAlarms() { return mockAlarms; },
        get activePollingTags() { return activePollingTags; },
        set activePollingTags(val) { activePollingTags = val; },
        // Constants and utils
        db,
        SESSION_FILE_PATH,
        DEFAULT_PLC_IP,
        // Functions
        startPolling,
        stopPolling,
        pollMainData,
    });

    const menu = Menu.buildFromTemplate([ { label: 'File', submenu: [ { role: 'quit' } ] }, { label: 'View', submenu: [ { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' } ] } ]);
    Menu.setApplicationMenu(menu);

    mainWindow.webContents.on('did-finish-load', async () => {
        const sessionLoaded = await loadSavedSession();
        if (sessionLoaded) {
            activePollingTags = Object.values(tagConfig).flatMap(source => source.tags || []).filter(tag => !tag.error);
            mainWindow.webContents.send('session-loaded', tagConfig);
        }
    });
});

app.on('before-quit', async () => {
    stopPolling();
    if (plcApiInstance) await plcApiInstance.logout();
    db.close();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// --- Backend Polling Loop ---
function startPolling(rate) {
    stopPolling();
    console.log(`[Main] Starting polling at ${rate}ms.`);
    pollingErrorCount = 0; // Reset counter on new polling start
    activePollingTags = Object.values(tagConfig).flatMap(source => source.tags || []).filter(tag => !tag.error);
    pollTimer = setInterval(pollMainData, rate);
}
function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
        console.log('[Main] Polling stopped.');
    }
}
async function pollMainData() {
    if (!plcApiInstance || !plcApiInstance.sessionId || activePollingTags.length === 0) return;
    try {
        const responses = await plcApiInstance.readMultipleVariables(activePollingTags);
        pollingErrorCount = 0; // Reset counter on successful poll.

        if (responses && Array.isArray(responses)) {
            responses.forEach(response => {
                const tagName = response.id;
                if (response.error) {
                    if (response.error.message === 'Address does not exist') {
                        console.warn(`[PLC API] Tag does not exist on PLC: ${tagName}. Removing from poll list.`);
                        liveValues[tagName] = { value: '-', quality: 'BAD_TAG' };
                        activePollingTags = activePollingTags.filter(t => t.fullTagName !== tagName);
                    } else {
                        liveValues[tagName] = { value: '-', quality: 'READ_ERROR' };
                    }
                } else if ('result' in response) {
                    const value = (response.result && typeof response.result === 'object' && 'value' in response.result)
                        ? response.result.value
                        : response.result;
                    liveValues[tagName] = { value: value, quality: 'GOOD' };
                }
            });
        } else if (responses === null && plcApiInstance.sessionId) {
             throw new Error("Invalid or null response from bulk read");
        }


        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('data-update', {
                config: tagConfig, liveValues,
                plcState: { connected: !!plcApiInstance.sessionId, ip: plcApiInstance.config.plcIp, sessionId: plcApiInstance.sessionId }
            });
        }
    } catch (error) {
        pollingErrorCount++;
        console.warn(`[Main] Polling attempt ${pollingErrorCount}/${MAX_POLLING_ERRORS} failed. Error: ${error.message}`);
        if (pollingErrorCount >= MAX_POLLING_ERRORS) {
            console.error(`[Main] CRITICAL POLLING ERROR: Reached max retries (${MAX_POLLING_ERRORS}). Disconnecting.`);
            stopPolling();
            if (plcApiInstance) plcApiInstance.sessionId = null;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('data-update', {
                    config: tagConfig, liveValues: {},
                    plcState: { connected: false, ip: plcApiInstance?.config.plcIp, error: 'Connection Lost' }
                });
            }
            pollingErrorCount = 0; // Reset after disconnect
        }
    }
}


// IPC Handlers are now in a separate module