import * as D from './dom-elements.js';
import * as U from './ui-updater.js';
import { showToast } from './toast-notification.js';

// This module will be initialized with the application's state.
let appState = {};

export function initializeEventHandlers(state) {
    appState = state;
    setupEventListeners();
}

// --- CORE LOGIC ---
export function initializeTagStates() {
    appState.tagStates = {};
    Object.values(appState.appConfig).forEach(source => {
        (source.tags || []).forEach(tag => {
            appState.tagStates[tag.fullTagName] = { isLogging: false, isTrending: false };
        });
    });
    return appState.tagStates;
}

async function handleFileDrop(event) {
    event.preventDefault(); event.stopPropagation();
    D.dropZone.classList.remove('dragover');
    const filePaths = Array.from(event.dataTransfer.files).map(f => f.path);
    if (filePaths.length > 0) await processFiles(filePaths);
}

async function handleLoadFilesClick() {
    const filePaths = await window.api.openFileDialog();
    if (filePaths.length > 0) await processFiles(filePaths);
}

async function processFiles(filePaths) {
    U.showLoading();
    try {
        if (appState.plcState && appState.plcState.connected) {
            await window.api.disconnectPlc();
            appState.plcState = { connected: false, ip: '', sessionId: '', lastUsedIp: appState.plcState.lastUsedIp };
        }
        appState.appConfig = {}; appState.liveValues = {};
        const result = await window.api.parseFiles(filePaths);
        if (result.success) {
            appState.appConfig = result.config;
            initializeTagStates();
            U.renderAll(appState.appConfig, appState.liveValues, appState.plcState);
            U.transitionToDashboard();
            if (result.warnings && result.warnings.length > 0) {
                showToast(`Import complete with warnings: ${result.warnings[0]}`, 'warning');
            }
        } else {
            showToast(`Error parsing files: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Critical error during file processing:', error);
        showToast(`A critical error occurred: ${error.message}`, 'error');
    } finally {
        U.hideLoading();
    }
}

async function handleConnectionToggle() {
    if (appState.plcState && appState.plcState.connected) {
        await window.api.disconnectPlc();
        appState.plcState.connected = false; appState.plcState.sessionId = null; appState.liveValues = {};
        U.renderAll(appState.appConfig, appState.liveValues, appState.plcState);
    } else {
        D.connectModal.classList.add('active');
        D.connectModalIpInput.focus();
    }
}

async function confirmConnection() {
    const ip = D.connectModalIpInput.value.trim();
    if (!ip) return;
    D.connectModal.classList.remove('active');
    const result = await window.api.connectPlc(ip);
    if (!result.success) showToast(`Connection failed: ${result.error}`, 'error');
    else showToast('Connection successful!', 'success');
}

// --- TAG ACTIONS & QUICK ACTIONS ---
function handleTableButtonClick(event) {
    const button = event.target.closest('.action-icon-btn');
    if (!button) return;

    const tagName = button.dataset.tagName;

    const allTags = Object.values(appState.appConfig).flatMap(source => source.tags || []);
    const tagObject = allTags.find(t => t.fullTagName === tagName);

    if (tagObject) {
        openTagActionsModal(tagObject);
    } else {
        console.error(`[Renderer] CRITICAL: Could not find tag object for ${tagName}!`);
    }
}

function openTagActionsModal(tag) {
    appState.currentActionTag = tag;
    D.actionsModalTagName.textContent = tag.fullTagName;

    if (tag.isReadOnly) {
        D.actionsModalWriteSection.style.display = 'none';
        D.actionsModalReadOnlyNotice.style.display = 'block';
    } else {
        document.getElementById('actions-modal-input').value = '';
        D.actionsModalWriteSection.style.display = 'block';
        D.actionsModalReadOnlyNotice.style.display = 'none';
    }

    updateTagActionButtons();
    D.tagActionsModal.classList.add('active');
}

function updateTagActionButtons() {
    if (!appState.currentActionTag || !appState.currentActionTag.fullTagName) return;
    const state = appState.tagStates[appState.currentActionTag.fullTagName];
    if (!state) return;

    D.actionsModalLogBtn.classList.toggle('active', state.isLogging);
    D.actionsModalLogBtn.textContent = state.isLogging ? 'Historical Logging Enabled' : 'Enable Historical Logging';
    D.actionsModalTrendBtn.classList.toggle('active', state.isTrending);
    D.actionsModalTrendBtn.textContent = state.isTrending ? 'Trending Enabled' : 'Enable Trending';
    D.actionsModalTrendBtn.disabled = !state.isLogging;
}

async function confirmWrite() {
    const { fullTagName, type } = appState.currentActionTag;
    const rawValue = document.getElementById('actions-modal-input').value;

    const result = await window.api.writePlc({ tagName: fullTagName, value: rawValue, type });

    if (result.success) {
        showToast('Write Successful!', 'success');
        U.flashTableCell(fullTagName);
    } else {
        showToast(`Write failed: ${result.error}`, 'error');
    }
    D.tagActionsModal.classList.remove('active');
}

async function toggleLogging() {
    const tagName = appState.currentActionTag.fullTagName;
    const state = appState.tagStates[tagName];
    state.isLogging = !state.isLogging;
    if (state.isLogging) {
        const liveData = appState.liveValues[tagName];
        await window.api.logTagToDb({ tagName, value: liveData?.value ?? 'N/A', dataType: appState.currentActionTag.type });
        showToast(`Logging enabled for ${tagName}`, 'success');
    } else {
        state.isTrending = false;
        await window.api.setTrendingState({ tagName, isTrending: false });
        showToast(`Logging disabled for ${tagName}`, 'success');
    }
    updateTagActionButtons();
}

async function toggleTrending() {
    const tagName = appState.currentActionTag.fullTagName;
    const state = appState.tagStates[tagName];
    state.isTrending = !state.isTrending;
    await window.api.setTrendingState({ tagName, isTrending: state.isTrending });
    showToast(`Trending ${state.isTrending ? 'enabled' : 'disabled'} for ${tagName}`, 'success');
    updateTagActionButtons();
}

async function handleClearHistory() {
    const result = await window.api.clearAllHistory();
    if (result.success) showToast('All historical logs have been cleared.', 'success');
    else showToast('Failed to clear history.', 'error');
}

async function handleClearTrends() {
    const result = await window.api.clearAllTrends();
    if (result.success) {
        Object.values(appState.tagStates).forEach(state => state.isTrending = false);
        showToast('All trends have been cleared.', 'success');
    } else {
        showToast('Failed to clear trends.', 'error');
    }
}

async function handleAckAllAlarms() {
    const result = await window.api.acknowledgeAllAlarms();
    if (result.success) showToast('All alarms acknowledged.', 'success');
    else showToast('Failed to acknowledge alarms.', 'error');
}

async function handleLoadNewFiles() {
    await window.api.clearSession();
    window.location.reload();
}

function handleTagActionsModalClick(event) {
    const target = event.target;
    if (target.matches('#actions-modal-close-btn')) {
        D.tagActionsModal.classList.remove('active');
    } else if (target.matches('#actions-modal-log-btn')) {
        toggleLogging();
    } else if (target.matches('#actions-modal-trend-btn')) {
        toggleTrending();
    } else if (target.matches('#actions-modal-confirm-write-btn')) {
        confirmWrite();
    }
}

function setupEventListeners() {
    D.dropZone.addEventListener('drop', handleFileDrop);
    D.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); D.dropZone.classList.add('dragover'); });
    D.dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); D.dropZone.classList.remove('dragover'); });
    D.splashLoadFilesBtn.addEventListener('click', handleLoadFilesClick);
    D.loadFilesBtn.addEventListener('click', handleLoadNewFiles);
    D.connectBtn.addEventListener('click', handleConnectionToggle);
    D.pollRateSelect.addEventListener('change', (e) => { window.api.setPollRate(parseInt(e.target.value, 10)); D.pollingRateDisplayEl.textContent = `${e.target.value / 1000}s`; });
    D.lookupSelect.addEventListener('change', () => U.renderAll(appState.appConfig, appState.liveValues, appState.plcState));
    document.getElementById('view-alarms-btn').addEventListener('click', () => window.api.openViewer('alarms'));
    document.getElementById('view-diagnostics-btn').addEventListener('click', () => window.api.openViewer('diagnostics'));
    document.getElementById('view-syslog-btn').addEventListener('click', () => window.api.openViewer('syslog'));
    document.getElementById('view-history-btn').addEventListener('click', () => window.api.openViewer('history'));
    document.getElementById('view-debug-btn').addEventListener('click', () => window.api.openViewer('debug'));
    D.connectModalConfirmBtn.addEventListener('click', confirmConnection);
    D.connectModalCancelBtn.addEventListener('click', () => D.connectModal.classList.remove('active'));
    D.allTagsTableBody.addEventListener('click', handleTableButtonClick);
    D.lookupTableBody.addEventListener('click', handleTableButtonClick);
    D.clearHistoryBtn.addEventListener('click', handleClearHistory);
    D.clearTrendsBtn.addEventListener('click', handleClearTrends);
    D.ackAllAlarmsBtn.addEventListener('click', handleAckAllAlarms);
    D.tagActionsModal.addEventListener('click', handleTagActionsModalClick);
}
