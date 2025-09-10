// This module exports a function that, when called, queries the DOM for all necessary elements.
// This ensures that the DOM is fully loaded before any element is queried, preventing race conditions.

export function getDomElements() {
    return {
        dropZone: document.getElementById('drop-zone'),
        splashLoadFilesBtn: document.getElementById('splash-load-files-btn'),
        appContainer: document.getElementById('app-container'),
        connectBtn: document.getElementById('connect-btn'),
        loadFilesBtn: document.getElementById('load-files-btn'),
        pollRateSelect: document.getElementById('poll-rate-select'),
        activeTagsCountEl: document.getElementById('active-tags-count'),
        sourcesCountEl: document.getElementById('sources-count'),
        pollingRateDisplayEl: document.getElementById('polling-rate-display'),
        allTagsTableBody: document.querySelector('#all-tags-table tbody'),
        lookupTableBody: document.querySelector('#lookup-table tbody'),
        lookupSelect: document.getElementById('lookup-select'),
        connStatusIndicator: document.getElementById('connection-status-indicator'),
        connStatusText: document.getElementById('connection-status-text'),
        statusIpEl: document.getElementById('status-ip'),
        statusSessionEl: document.getElementById('status-session'),
        connectModal: document.getElementById('connect-modal'),
        connectModalIpInput: document.getElementById('connect-modal-ip-input'),
        connectModalConfirmBtn: document.getElementById('connect-modal-confirm-btn'),
        connectModalCancelBtn: document.getElementById('connect-modal-cancel-btn'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        clearTrendsBtn: document.getElementById('clear-trends-btn'),
        ackAllAlarmsBtn: document.getElementById('ack-all-alarms-btn'),
        tagActionsModal: document.getElementById('tag-actions-modal'),
        actionsModalTagName: document.getElementById('actions-modal-tag-name'),
        actionsModalWriteSection: document.getElementById('actions-modal-write-section'),
        actionsModalReadOnlyNotice: document.getElementById('actions-modal-readonly-notice'),
        actionsModalLogBtn: document.getElementById('actions-modal-log-btn'),
        actionsModalTrendBtn: document.getElementById('actions-modal-trend-btn'),
        actionsModalCloseBtn: document.getElementById('actions-modal-close-btn'),
        writeConfirmModal: document.getElementById('write-confirm-modal'),
        writeConfirmTagName: document.getElementById('write-confirm-tag-name'),
        writeConfirmTagValue: document.getElementById('write-confirm-tag-value'),
        writeConfirmCancelBtn: document.getElementById('write-confirm-cancel-btn'),
        writeConfirmConfirmBtn: document.getElementById('write-confirm-confirm-btn'),
        loadingOverlay: document.getElementById('loading-overlay'),
        toastContainer: document.getElementById('toast-container')
    };
}
