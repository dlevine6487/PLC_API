import { getDomElements } from './ui-modules/dom-elements.js';
import * as U from './ui-modules/ui-updater.js';
import { initializeEventHandlers } from './ui-modules/event-handler.js';

document.addEventListener('DOMContentLoaded', () => {
    // First, get all the DOM elements
    const D = getDomElements();

    // This object holds the most recent state received from the main process.
    // Initialize with a default structure to prevent errors from partial updates.
    let currentState = {
        tagConfig: {},
        liveValues: {},
        plcState: { connected: false, ip: null, sessionId: null }
    };

    // A variable to track if the dashboard has been shown.
    let isDashboardVisible = false;

    // Initialize UI and event handler modules with the DOM elements
    U.initializeUiUpdater(D);
    initializeEventHandlers(D, currentState);

    // Setup a single listener for all state updates from the main process.
    window.api.onStateUpdate(newState => {
        Object.assign(currentState, newState);

        const { tagConfig, liveValues, plcState } = currentState;
        U.renderAll(tagConfig, liveValues, plcState);

        if (!isDashboardVisible && tagConfig && Object.keys(tagConfig).length > 0) {
            U.transitionToDashboard();
            isDashboardVisible = true;
        }

        const { DEFAULT_PLC_IP } = currentState;
        const lastUsedIp = plcState?.ip || DEFAULT_PLC_IP;
        D.connectModalIpInput.value = lastUsedIp;
    });
});