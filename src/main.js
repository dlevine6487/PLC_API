const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const https = require('https');
const path = require('path');
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
let lastApiRequest = {};
let lastApiResponse = {};

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

// ====================================================================================
//  BACK-END PLC COMMUNICATION CLASS
// ====================================================================================
class SiemensPLC_API {
    constructor(plcIp, username, password) {
        this.config = { plcIp, username, password };
        this.sessionId = null;
        this.requestId = 1;
        this.agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
    }

    async _sendRequest(payload) {
        lastApiRequest = payload;
        const headers = { 'Content-Type': 'application/json' };
        if (this.sessionId) {
            headers['X-Auth-Token'] = this.sessionId;
        }
        try {
            const response = await fetch(`https://${this.config.plcIp}/api/jsonrpc`, {
                method: 'POST', headers, body: JSON.stringify(payload),
                agent: this.agent, timeout: 2000,
            });
            if (!response.ok) throw new Error(response.statusText);
            const responseJson = await response.json();
            lastApiResponse = responseJson;
            return responseJson;
        } catch (error) {
            console.error(`[PLC API] Fetch Error:`, error.message);
            this.sessionId = null;
            lastApiResponse = { error: error.message };
            throw error;
        }
    }

    async login() {
        const request = {
            jsonrpc: "2.0",
            method: "Api.Login",
            params: { user: this.config.username, password: this.config.password, "include_web_application_cookie": true },
            id: String(this.requestId++)
        };
        const response = await this._sendRequest(request);
        if (response?.result?.token) {
            this.sessionId = response.result.token;
            console.log("[PLC API] SUCCESS: Login successful.");
            return true;
        }
        console.error("[PLC API] ERROR: Login failed.", response?.error || 'No response');
        return false;
    }

    async readMultipleVariables(tagArray) {
        if (!this.sessionId || tagArray.length === 0) return null;
        const requests = tagArray.map(tag => ({
            jsonrpc: "2.0",
            method: "PlcProgram.Read",
            params: { "var": tag.fullTagName },
            id: tag.fullTagName
        }));
        try {
            return await this._sendRequest(requests);
        } catch (error) {
            console.error("[PLC API] Bulk read failed.", error.message);
            return null;
        }
    }

    async writeVariable(variableName, value) {
        if (!this.sessionId) return { success: false, error: "Not Connected" };
        const request = {
            jsonrpc: "2.0",
            method: "PlcProgram.Write",
            params: { "var": variableName, value },
            id: String(this.requestId++)
        };
        try {
            const response = await this._sendRequest(request);
            if (response.error) {
                return { success: false, error: response.error.message };
            }
            return { success: response.result === true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async logout() {
        if (!this.sessionId) return;
        const request = { jsonrpc: "2.0", method: "Api.Logout", id: String(this.requestId++) };
        try {
            await this._sendRequest(request);
        } catch (e) {
            console.error("Logout failed, but proceeding anyway.", e.message);
        } finally {
            this.sessionId = null;
            console.log("[PLC API] Logout complete.");
        }
    }
}

// ====================================================================================
//  FILE PARSING LOGIC
// ====================================================================================
async function parsePlcTagTable(content) {
    const parsedXml = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    const tagTable = parsedXml.Document?.['SW.Tags.PlcTagTable'];
    if (!tagTable) return null;

    const tagsNode = tagTable.ObjectList?.['SW.Tags.PlcTag'];
    const plcTags = tagsNode ? (Array.isArray(tagsNode) ? tagsNode : [tagsNode]) : [];
    
    const sourceTags = plcTags.map(t => ({ 
        name: t.AttributeList.Name, 
        fullTagName: `"${t.AttributeList.Name}"`, 
        type: t.AttributeList.DataTypeName,
        logicalAddress: t.AttributeList.LogicalAddress,
        isReadOnly: t.AttributeList.Accessibility === 'ReadOnly' 
    }));

    return { 
        type: 'TagTable', 
        sourceName: tagTable.AttributeList.Name || 'Default Tag Table', 
        tags: sourceTags.sort((a,b) => a.name.localeCompare(b.name)) 
    };
}

async function parseGlobalDB(content) {
    const parsedXml = await xml2js.parseStringPromise(content, { explicitArray: false, mergeAttrs: true });
    const dbNode = parsedXml.Document?.['SW.Blocks.GlobalDB'];
    if (!dbNode) return null;

    const dbName = dbNode.AttributeList.Name;
    const membersNode = dbNode.AttributeList.Interface?.Sections?.Section?.Member;
    const members = membersNode ? (Array.isArray(membersNode) ? membersNode : [membersNode]) : [];
    const warnings = [];
    
    const sourceTags = members.map(m => {
        const isUDT = m.Datatype.startsWith('"');
        if (isUDT) {
            warnings.push(`Skipped UDT "${m.Name}" of type ${m.Datatype} in ${dbName}.`);
        }
        return {
            name: m.Name,
            fullTagName: `"${dbName}"."${m.Name}"`,
            type: m.Datatype.replace(/"/g, ''),
            isReadOnly: false, 
            error: isUDT ? 'UDT_NOT_SUPPORTED' : null
        };
    }).filter(t => t); 

    return { 
        type: 'GlobalDB', 
        sourceName: dbName, 
        tags: sourceTags.sort((a,b) => a.name.localeCompare(b.name)),
        warnings
    };
}

function parseS7dcl(content) {
    const dbNameMatch = content.match(/DATA_BLOCK\s+"?([^"\s]+)"?/);
    if (!dbNameMatch) return null;
    const dbName = dbNameMatch[1];

    const varBlockMatch = content.match(/VAR([\s\S]*?)END_VAR/);
    if (!varBlockMatch) return { type: 'DataBlock', sourceName: dbName, tags: [] };

    const tags = [];
    const lines = varBlockMatch[1].trim().split('\n');
    for (const line of lines) {
        const declarationMatch = line.match(/^\s*(\w+)\s*:\s*(\w+)\s*;/);
        if (declarationMatch) {
            const [, name, type] = declarationMatch;
            tags.push({
                name,
                fullTagName: `"${dbName}"."${name}"`,
                type,
                isReadOnly: false
            });
        }
    }
    return { 
        type: 'DataBlock', 
        sourceName: dbName, 
        tags: tags.sort((a,b) => a.name.localeCompare(b.name)) 
    };
}


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

app.whenReady().then(async () => {
    fetch = (await import('node-fetch')).default;
    plcConfig = await loadOrCreatePlcConfig();
    createMainWindow();
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
        console.error(`[Main] CRITICAL POLLING ERROR: ${error.message}. Disconnecting.`);
        stopPolling();
        if (plcApiInstance) plcApiInstance.sessionId = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('data-update', {
                config: tagConfig, liveValues: {},
                plcState: { connected: false, ip: plcApiInstance?.config.plcIp, error: 'Connection Lost' }
            });
        }
    }
}


// --- IPC Handlers ---
ipcMain.handle('dialog:open-file', async () => {
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
                result = parseS7dcl(fileContent);
            } else if (path.extname(fileName).toLowerCase() === '.xml') {
                if (fileContent.includes('<SW.Blocks.GlobalDB')) {
                    result = await parseGlobalDB(fileContent);
                } else if (fileContent.includes('<SW.Tags.PlcTagTable')) {
                    result = await parsePlcTagTable(fileContent);
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
    tagConfig = newConfig;
    await fs.writeFile(SESSION_FILE_PATH, JSON.stringify(tagConfig, null, 2));
    return { success: true, config: tagConfig, warnings: allWarnings };
});


ipcMain.handle('clear-session', async () => {
    try {
        await fs.unlink(SESSION_FILE_PATH);
        console.log('[Main] Session file deleted.');
        tagConfig = {};
        liveValues = {};
        if (plcApiInstance && plcApiInstance.sessionId) {
            await plcApiInstance.logout();
        }
        stopPolling();
        plcApiInstance = null;
        activePollingTags = [];
        return { success: true };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { success: true };
        }
        console.error('[Main] Error clearing session:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('plc:connect', async (event, ip) => {
    plcApiInstance = new SiemensPLC_API(ip, plcConfig.username, plcConfig.password);
    const success = await plcApiInstance.login();
    if (success) {
        const pollRate = 1000;
        startPolling(pollRate);
    }
    return { success, ip: plcApiInstance?.config.plcIp, sessionId: plcApiInstance?.sessionId, error: success ? null : 'Login Failed' };
});

ipcMain.handle('plc:disconnect', async () => {
    stopPolling();
    if (plcApiInstance) await plcApiInstance.logout();
    plcApiInstance = null;
    return { success: true };
});

ipcMain.handle('plc:write', async (event, { tagName, value }) => {
    console.log(`[IPC] Received 'plc:write' for tag: ${tagName} with value: ${value}`);
    if (!plcApiInstance) {
        console.error('[IPC ERROR] Write failed: PLC not connected.');
        return { success: false, error: 'PLC not connected.' };
    }
    const result = await plcApiInstance.writeVariable(tagName, value);
    if (result.success) {
        console.log(`[IPC] Write successful for tag: ${tagName}`);
        pollMainData();
    } else {
        console.error(`[IPC ERROR] Write failed for tag ${tagName}:`, result.error);
    }
    return result;
});

ipcMain.on('plc:set-poll-rate', (event, rate) => {
    if (plcApiInstance?.sessionId) {
        startPolling(rate);
    }
});

ipcMain.handle('db:log-tag', (event, { tagName, value, dataType }) => {
    console.log(`[IPC] Received 'db:log-tag' for tag: ${tagName}`);
    try {
        const stmt = db.prepare('INSERT INTO history (tagName, value, timestamp, dataType, quality) VALUES (?, ?, ?, ?, ?)');
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
        db.prepare('DELETE FROM history').run();
        return { success: true };
    } catch (error) {
        console.error("Database clear error:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('trending:set-state', (event, { tagName, isTrending }) => {
    console.log(`[IPC] Received 'trending:set-state' for tag: ${tagName}, trending: ${isTrending}`);
    if (isTrending) {
        if (!plottedTags.includes(tagName)) plottedTags.push(tagName);
    } else {
        plottedTags = plottedTags.filter(t => t !== tagName);
    }
    const graphWin = viewerWindows.graph;
    if (graphWin && !graphWin.isDestroyed()) {
        graphWin.webContents.send('graph:update-plotted-tags', { tagName });
    }
    return { success: true, plottedTags };
});

ipcMain.handle('trending:clear-all', () => {
    plottedTags = [];
    const graphWin = viewerWindows.graph;
    if (graphWin && !graphWin.isDestroyed()) {
        graphWin.webContents.send('graph:clear-all-tags');
    }
    return { success: true };
});

ipcMain.handle('alarms:ack-all', () => {
    mockAlarms.forEach(alarm => alarm.acknowledgement = { state: 'acknowledged' });
    const alarmWin = viewerWindows.alarms;
    if (alarmWin && !alarmWin.isDestroyed()) {
        alarmWin.webContents.send('alarms-update', { entries: mockAlarms });
    }
    return { success: true };
});

ipcMain.on('open-viewer', (event, viewerName) => {
    if (viewerWindows[viewerName] && !viewerWindows[viewerName].isDestroyed()) {
        viewerWindows[viewerName].focus();
        return;
    }
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        parent: mainWindow,
        webPreferences: {
            preload: path.join(__dirname, `views/${viewerName}/preload.js`),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.loadFile(path.join(__dirname, `views/${viewerName}/index.html`));
    win.on('closed', () => { delete viewerWindows[viewerName]; });
    viewerWindows[viewerName] = win;
});

ipcMain.handle('debug:get-last-api-call', () => {
    return { request: lastApiRequest, response: lastApiResponse };
});

ipcMain.handle('debug:export-api-call', async (event, data) => {
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
        console.error('Failed to export API debug data:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-app-config', () => tagConfig);
ipcMain.handle('get-live-values', () => liveValues);
ipcMain.handle('get-plc-state', () => ({
    connected: !!plcApiInstance?.sessionId,
    ip: plcApiInstance?.config.plcIp || '',
    sessionId: plcApiInstance?.sessionId || '',
    lastUsedIp: plcApiInstance?.config.plcIp || DEFAULT_PLC_IP
}));