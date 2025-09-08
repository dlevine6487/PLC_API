const https = require('https');
const path = require('path');
const fs = require('fs/promises');
const { app } = require('electron');

let fetch; // Will be set by the init function
let lastApiRequest = {};
let lastApiResponse = {};

class SiemensPLC_API {
    // Private constructor, use the static `create` method instead.
    constructor(plcIp, username, password, agent) {
        this.config = { plcIp, username, password };
        this.sessionId = null;
        this.requestId = 1;
        this.agent = agent;
    }

    static async create(plcIp, username, password) {
        const PLC_CERT_PATH = path.join(app.getPath('userData'), 'plc-cert.pem');
        let agent;
        try {
            const cert = await fs.readFile(PLC_CERT_PATH);
            console.log(`[PLC API] Custom certificate found at ${PLC_CERT_PATH}. Creating secure connection.`);
            agent = new https.Agent({ ca: cert, keepAlive: true });
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error(`[PLC API] SECURITY WARNING: Certificate file not found at ${PLC_CERT_PATH}.`);
                console.error('[PLC API] Communication with the PLC will be INSECURE. To secure the connection, please export the PLC\'s certificate and place it in the specified path.');
                agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });
            } else {
                console.error('[PLC API] A critical error occurred while loading the PLC certificate:', error);
                // Propagate error to prevent insecure connection on unexpected errors
                throw new Error('Failed to load PLC certificate. Please check file permissions and format.');
            }
        }
        return new SiemensPLC_API(plcIp, username, password, agent);
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
        try {
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
                return { success: true };
            }
            const errorMessage = response?.error?.message || "Unknown login error";
            console.error("[PLC API] ERROR: Login failed.", errorMessage);
            return { success: false, error: errorMessage };
        } catch (error) {
            console.error("[PLC API] CRITICAL ERROR: Login request failed.", error.message);
            return { success: false, error: error.message };
        }
    }

    async readMultipleVariables(tagArray) {
        if (!this.sessionId || tagArray.length === 0) return null;
        const requests = tagArray.map(tag => ({
            jsonrpc: "2.0",
            method: "PlcProgram.Read",
            params: { "var": tag.fullTagName },
            id: tag.fullTagName
        }));
        // Let the caller handle the exception directly.
        // The polling loop in main.js has a try/catch for this.
        return await this._sendRequest(requests);
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

function initializeApi(fetchInstance) {
    fetch = fetchInstance;
}

function getLastApiCall() {
    return { request: lastApiRequest, response: lastApiResponse };
}

module.exports = {
    SiemensPLC_API,
    initializeApi,
    getLastApiCall
};
