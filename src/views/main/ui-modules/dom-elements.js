// This module exports a single object with getters for all DOM elements.
// This lazy-loading approach ensures that the DOM is fully loaded before
// any element is queried, preventing script-halting errors.

const D = {
    get dropZone() { return document.getElementById('drop-zone'); },
    get splashLoadFilesBtn() { return document.getElementById('splash-load-files-btn'); },
    get appContainer() { return document.getElementById('app-container'); },
    get connectBtn() { return document.getElementById('connect-btn'); },
    get loadFilesBtn() { return document.getElementById('load-files-btn'); },
    get pollRateSelect() { return document.getElementById('poll-rate-select'); },
    get activeTagsCountEl() { return document.getElementById('active-tags-count'); },
    get sourcesCountEl() { return document.getElementById('sources-count'); },
    get pollingRateDisplayEl() { return document.getElementById('polling-rate-display'); },
    get allTagsTableBody() { return document.querySelector('#all-tags-table tbody'); },
    get lookupTableBody() { return document.querySelector('#lookup-table tbody'); },
    get lookupSelect() { return document.getElementById('lookup-select'); },
    get connStatusIndicator() { return document.getElementById('connection-status-indicator'); },
    get connStatusText() { return document.getElementById('connection-status-text'); },
    get statusIpEl() { return document.getElementById('status-ip'); },
    get statusSessionEl() { return document.getElementById('status-session'); },
    get connectModal() { return document.getElementById('connect-modal'); },
    get connectModalIpInput() { return document.getElementById('connect-modal-ip-input'); },
    get connectModalConfirmBtn() { return document.getElementById('connect-modal-confirm-btn'); },
    get connectModalCancelBtn() { return document.getElementById('connect-modal-cancel-btn'); },
    get clearHistoryBtn() { return document.getElementById('clear-history-btn'); },
    get clearTrendsBtn() { return document.getElementById('clear-trends-btn'); },
    get ackAllAlarmsBtn() { return document.getElementById('ack-all-alarms-btn'); },
    get tagActionsModal() { return document.getElementById('tag-actions-modal'); },
    get actionsModalTagName() { return document.getElementById('actions-modal-tag-name'); },
    get actionsModalWriteSection() { return document.getElementById('actions-modal-write-section'); },
    get actionsModalReadOnlyNotice() { return document.getElementById('actions-modal-readonly-notice'); },
    get actionsModalLogBtn() { return document.getElementById('actions-modal-log-btn'); },
    get actionsModalTrendBtn() { return document.getElementById('actions-modal-trend-btn'); },
    get actionsModalCloseBtn() { return document.getElementById('actions-modal-close-btn'); },
    get writeConfirmModal() { return document.getElementById('write-confirm-modal'); },
    get writeConfirmTagName() { return document.getElementById('write-confirm-tag-name'); },
    get writeConfirmTagValue() { return document.getElementById('write-confirm-tag-value'); },
    get writeConfirmCancelBtn() { return document.getElementById('write-confirm-cancel-btn'); },
    get writeConfirmConfirmBtn() { return document.getElementById('write-confirm-confirm-btn'); },
    get loadingOverlay() { return document.getElementById('loading-overlay'); },
    get toastContainer() { return document.getElementById('toast-container'); }
};

export default D;
