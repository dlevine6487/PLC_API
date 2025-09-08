const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const https = require('https');
const path = require('path');
const store = require('./state/store.js');
const { registerIpcHandlers } = require('./main-process/ipc-handlers.js');
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
// All state is now managed in src/state/store.js
let mainWindow; // Keep mainWindow as a top-level reference for now.
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
        width: 1600, height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'views/main/preload.js'),
            contextIsolation: true, nodeIntegration: false
        }
    });
    mainWindow.loadFile(path.join(__dirname, 'views/main/index.html'));
    mainWindow.on('closed', () => {
        mainWindow = null;
        store.setState({ mainWindow: null });
    });
    // Add mainWindow reference to the store so other modules can access it
    store.setState({ mainWindow });
}

async function loadSavedSession() {
    try {
        const { SESSION_FILE_PATH } = store.getState();
        const sessionData = await fs.readFile(SESSION_FILE_PATH, 'utf8');
        const savedConfig = JSON.parse(sessionData);
        if (Object.keys(savedConfig).length > 0) {
            store.setState({ tagConfig: savedConfig });
            return true;
        }
    } catch (error) {
        // It's okay if the file doesn't exist on first launch
    }
    return false;
}

// --- Backend Polling Loop ---
function startPolling(rate) {
    stopPolling();
    console.log(`[Main] Starting polling at ${rate}ms.`);
    const { tagConfig } = store.getState();
    const newActiveTags = Object.values(tagConfig).flatMap(source => source.tags || []).filter(tag => !tag.error);
    const newPollTimer = setInterval(pollMainData, rate);
    store.setState({ activePollingTags: newActiveTags, pollTimer: newPollTimer, pollingErrorCount: 0 });
}

function stopPolling() {
    const { pollTimer } = store.getState();
    if (pollTimer) {
        clearInterval(pollTimer);
        store.setState({ pollTimer: null });
        console.log('[Main] Polling stopped.');
    }
}

async function pollMainData() {
    const { plcApiInstance, activePollingTags } = store.getState();
    if (!plcApiInstance || !plcApiInstance.sessionId || activePollingTags.length === 0) return;

    try {
        const responses = await plcApiInstance.readMultipleVariables(activePollingTags);
        let currentLiveValues = { ...store.getState().liveValues };
        let currentActiveTags = [...activePollingTags];

        if (responses && Array.isArray(responses)) {
            responses.forEach(response => {
                const tagName = response.id;
                if (response.error) {
                    if (response.error.message === 'Address does not exist') {
                        console.warn(`[PLC API] Tag does not exist on PLC: ${tagName}. Removing from poll list.`);
                        currentLiveValues[tagName] = { value: '-', quality: 'BAD_TAG' };
                        currentActiveTags = currentActiveTags.filter(t => t.fullTagName !== tagName);
                    } else {
                        currentLiveValues[tagName] = { value: '-', quality: 'READ_ERROR' };
                    }
                } else if ('result' in response) {
                    const value = (response.result?.value !== undefined) ? response.result.value : response.result;
                    currentLiveValues[tagName] = { value, quality: 'GOOD' };
                }
            });
        } else if (responses === null && plcApiInstance.sessionId) {
            throw new Error("Invalid or null response from bulk read");
        }

        store.setState({
            liveValues: currentLiveValues,
            activePollingTags: currentActiveTags,
            pollingErrorCount: 0,
            plcState: { connected: true, ip: plcApiInstance.config.plcIp, sessionId: plcApiInstance.sessionId }
        });

    } catch (error) {
        let { pollingErrorCount } = store.getState();
        pollingErrorCount++;
        console.warn(`[Main] Polling attempt ${pollingErrorCount}/${MAX_POLLING_ERRORS} failed. Error: ${error.message}`);

        if (pollingErrorCount >= MAX_POLLING_ERRORS) {
            console.error(`[Main] CRITICAL: Reached max polling errors. Disconnecting.`);
            const currentPlcApi = store.getState().plcApiInstance;
            stopPolling();
            if (currentPlcApi) currentPlcApi.sessionId = null; // Invalidate session
            store.setState({
                liveValues: {},
                plcApiInstance: currentPlcApi,
                plcState: { connected: false, ip: currentPlcApi?.config.plcIp, error: 'Connection Lost' },
                pollingErrorCount: 0
            });
        } else {
            store.setState({ pollingErrorCount });
        }
    }
}


// --- Application Lifecycle ---
app.whenReady().then(async () => {
    // Initialize
    fetch = (await import('node-fetch')).default;
    initializeApi(fetch);
    const plcConfig = await loadOrCreatePlcConfig();

    // Set initial state in the store
    store.setState({
        plcApiInstance: null,
        plcConfig: plcConfig,
        tagConfig: {},
        liveValues: {},
        pollTimer: null,
        viewerWindows: {},
        plottedTags: [],
        mockAlarms: [],
        activePollingTags: [],
        pollingErrorCount: 0,
        db: db,
        SESSION_FILE_PATH: SESSION_FILE_PATH,
        DEFAULT_PLC_IP: DEFAULT_PLC_IP,
        mainWindow: null // will be set in createMainWindow
    });

    // Register IPC handlers, passing them the store and necessary functions
    registerIpcHandlers(store, { startPolling, stopPolling, pollMainData });

    // Create main window (which will also update the store with its reference)
    createMainWindow();

    // Setup Menu
    const menu = Menu.buildFromTemplate([
        { label: 'File', submenu: [{ role: 'quit' }] },
        { label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }] }
    ]);
    Menu.setApplicationMenu(menu);

    // Final setup after window loads
    mainWindow.webContents.on('did-finish-load', async () => {
        const sessionLoaded = await loadSavedSession();
        if (sessionLoaded) {
            const { tagConfig } = store.getState();
            const newActiveTags = Object.values(tagConfig).flatMap(source => source.tags || []).filter(tag => !tag.error);
            store.setState({ activePollingTags: newActiveTags });
            // The store will be responsible for notifying the renderer
        }
    });
});

app.on('before-quit', async () => {
    stopPolling();
    const { plcApiInstance } = store.getState();
    if (plcApiInstance) await plcApiInstance.logout();
    db.close();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});