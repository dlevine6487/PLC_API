import * as D from './ui-modules/dom-elements.js';
import * as U from './ui-modules/ui-updater.js';
import { initializeEventHandlers } from './ui-modules/event-handler.js';
import { initializeDomElements } from './ui-modules/dom-elements.js';

document.addEventListener('DOMContentLoaded', () => {
    // This object holds the most recent state received from the main process.
    // It acts as a local cache for the UI to work with.
    let currentState = {};

    // A variable to track if the dashboard has been shown.
    let isDashboardVisible = false;

    // Initialize DOM elements and event handlers now that the DOM is ready.
    initializeDomElements();
    initializeEventHandlers(currentState);

    // Setup a single listener for all state updates from the main process.
    window.api.onStateUpdate(newState => {
        // Update the local state cache.
        currentState = newState;

        // When new state arrives, re-render everything.
        const { tagConfig, liveValues, plcState } = currentState;
        U.renderAll(tagConfig, liveValues, plcState);

        // Handle the initial transition from splash screen to dashboard.
        if (!isDashboardVisible && tagConfig && Object.keys(tagConfig).length > 0) {
            U.transitionToDashboard();
            isDashboardVisible = true;
        }

        // Pre-fill the connection modal IP from the last known state.
        const { DEFAULT_PLC_IP } = currentState;
        const lastUsedIp = plcState?.ip || DEFAULT_PLC_IP;
        D.connectModalIpInput.value = lastUsedIp;
    });
});