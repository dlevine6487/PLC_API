import * as D from './ui-modules/dom-elements.js';
import * as U from './ui-modules/ui-updater.js';
import { initializeEventHandlers, initializeTagStates as initializeTags } from './ui-modules/event-handler.js';
import { showToast } from './ui-modules/toast-notification.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        appConfig: {},
        plcState: { connected: false, ip: '', sessionId: '', lastUsedIp: '192.168.0.1' },
        liveValues: {},
        currentActionTag: {},
        tagStates: {}
    };

    // --- INITIALIZATION ---
    function initializeApp() {
        // Initial state from backend
        window.api.getPlcState().then(initialState => {
            state.plcState = initialState;
            D.connectModalIpInput.value = state.plcState.lastUsedIp;
            U.updateConnectionStatusUI(state.plcState);
        });

        // Initialize event handlers, passing them the state object
        initializeEventHandlers(state);

        // Setup IPC listeners from the main process
        setupIpcListeners();
    }

    function setupIpcListeners() {
        window.api.onDataUpdate((data) => {
            state.appConfig = data.config || state.appConfig;
            state.liveValues = data.liveValues || {};
            state.plcState = data.plcState || { connected: false };
            U.renderAll(state.appConfig, state.liveValues, state.plcState);
        });

        window.api.onSessionLoaded(config => {
            state.appConfig = config;
            state.tagStates = initializeTags(); // Re-initialize tag states
            U.renderAll(state.appConfig, state.liveValues, state.plcState);
            U.transitionToDashboard();
        });
    }

    initializeApp();
});