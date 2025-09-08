document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let appConfig = {};
    let plcState = { connected: false, ip: '', sessionId: '', lastUsedIp: '192.168.0.1' };
    let liveValues = {};
    let currentActionTag = {};
    let tagStates = {}; 

    // --- DOM ELEMENT SELECTORS ---
    const dropZone = document.getElementById('drop-zone');
    const splashLoadFilesBtn = document.getElementById('splash-load-files-btn');
    const appContainer = document.getElementById('app-container');
    const connectBtn = document.getElementById('connect-btn');
    const loadFilesBtn = document.getElementById('load-files-btn');
    const pollRateSelect = document.getElementById('poll-rate-select');
    const activeTagsCountEl = document.getElementById('active-tags-count');
    const sourcesCountEl = document.getElementById('sources-count');
    const pollingRateDisplayEl = document.getElementById('polling-rate-display');
    const allTagsTableBody = document.querySelector('#all-tags-table tbody');
    const lookupTableBody = document.querySelector('#lookup-table tbody');
    const lookupSelect = document.getElementById('lookup-select');
    const connStatusIndicator = document.getElementById('connection-status-indicator');
    const connStatusText = document.getElementById('connection-status-text');
    const statusIpEl = document.getElementById('status-ip');
    const statusSessionEl = document.getElementById('status-session');
    const connectModal = document.getElementById('connect-modal');
    const connectModalIpInput = document.getElementById('connect-modal-ip-input');
    const connectModalConfirmBtn = document.getElementById('connect-modal-confirm-btn');
    const connectModalCancelBtn = document.getElementById('connect-modal-cancel-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const clearTrendsBtn = document.getElementById('clear-trends-btn');
    const ackAllAlarmsBtn = document.getElementById('ack-all-alarms-btn');
    const tagActionsModal = document.getElementById('tag-actions-modal');
    const actionsModalTagName = document.getElementById('actions-modal-tag-name');
    const actionsModalWriteSection = document.getElementById('actions-modal-write-section');
    const actionsModalReadOnlyNotice = document.getElementById('actions-modal-readonly-notice');
    const actionsModalLogBtn = document.getElementById('actions-modal-log-btn');
    const actionsModalTrendBtn = document.getElementById('actions-modal-trend-btn');
    const actionsModalCloseBtn = document.getElementById('actions-modal-close-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const toastContainer = document.getElementById('toast-container');

    // --- INITIALIZATION & EVENT LISTENERS ---
    function initializeApp() {
        window.api.getPlcState().then(initialState => {
            plcState = initialState;
            connectModalIpInput.value = plcState.lastUsedIp;
            updateConnectionStatusUI();
        });
        setupEventListeners();
    }

    async function handleLoadNewFiles() {
        await window.api.clearSession();
        window.location.reload();
    }

    function setupEventListeners() {
        dropZone.addEventListener('drop', handleFileDrop);
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('dragover'); });
        splashLoadFilesBtn.addEventListener('click', handleLoadFilesClick);
        loadFilesBtn.addEventListener('click', handleLoadNewFiles);
        connectBtn.addEventListener('click', handleConnectionToggle);
        pollRateSelect.addEventListener('change', (e) => { window.api.setPollRate(parseInt(e.target.value, 10)); pollingRateDisplayEl.textContent = `${e.target.value / 1000}s`; });
        lookupSelect.addEventListener('change', renderAll);
        document.getElementById('view-alarms-btn').addEventListener('click', () => window.api.openViewer('alarms'));
        document.getElementById('view-diagnostics-btn').addEventListener('click', () => window.api.openViewer('diagnostics'));
        document.getElementById('view-syslog-btn').addEventListener('click', () => window.api.openViewer('syslog'));
        document.getElementById('view-history-btn').addEventListener('click', () => window.api.openViewer('history'));
        document.getElementById('view-debug-btn').addEventListener('click', () => window.api.openViewer('debug'));
        connectModalConfirmBtn.addEventListener('click', confirmConnection);
        connectModalCancelBtn.addEventListener('click', () => connectModal.classList.remove('active'));
        allTagsTableBody.addEventListener('click', handleTableButtonClick);
        lookupTableBody.addEventListener('click', handleTableButtonClick);
        clearHistoryBtn.addEventListener('click', handleClearHistory);
        clearTrendsBtn.addEventListener('click', handleClearTrends);
        ackAllAlarmsBtn.addEventListener('click', handleAckAllAlarms);
        tagActionsModal.addEventListener('click', handleTagActionsModalClick);
    }

    function handleTagActionsModalClick(event) {
        const target = event.target;
        if (target.matches('#actions-modal-close-btn')) {
            tagActionsModal.classList.remove('active');
        } else if (target.matches('#actions-modal-log-btn')) {
            toggleLogging();
        } else if (target.matches('#actions-modal-trend-btn')) {
            toggleTrending();
        } else if (target.matches('#actions-modal-confirm-write-btn')) {
            confirmWrite();
        }
    }

    window.api.onDataUpdate((data) => {
        appConfig = data.config || appConfig;
        liveValues = data.liveValues || {};
        plcState = data.plcState || { connected: false };
        renderAll();
    });

    window.api.onSessionLoaded(config => {
        appConfig = config;
        initializeTagStates();
        renderAll();
        transitionToDashboard();
    });


    // --- UI FEEDBACK HELPERS ---
    function showLoading() { loadingOverlay.classList.add('active'); }
    function hideLoading() { loadingOverlay.classList.remove('active'); }
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3000);
    }

    function flashTableCell(tagName) {
        const cells = document.querySelectorAll(`td[data-tag-name="${tagName}"]`);
        cells.forEach(cell => {
            cell.classList.add('flash');
            setTimeout(() => cell.classList.remove('flash'), 1000);
        });
    }

    // --- CORE LOGIC ---
    function initializeTagStates() {
        tagStates = {}; 
        Object.values(appConfig).forEach(source => {
            (source.tags || []).forEach(tag => {
                tagStates[tag.fullTagName] = { isLogging: false, isTrending: false };
            });
        });
    }

    async function handleFileDrop(event) {
        event.preventDefault(); event.stopPropagation();
        dropZone.classList.remove('dragover');
        const filePaths = Array.from(event.dataTransfer.files).map(f => f.path);
        if (filePaths.length > 0) await processFiles(filePaths);
    }

    async function handleLoadFilesClick() {
        const filePaths = await window.api.openFileDialog();
        if (filePaths.length > 0) await processFiles(filePaths);
    }

    async function processFiles(filePaths) {
        showLoading();
        try {
            if (plcState && plcState.connected) {
                await window.api.disconnectPlc();
                plcState = { connected: false, ip: '', sessionId: '', lastUsedIp: plcState.lastUsedIp };
            }
            appConfig = {}; liveValues = {};
            const result = await window.api.parseFiles(filePaths);
            if (result.success) {
                appConfig = result.config;
                initializeTagStates();
                renderAll();
                transitionToDashboard();
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
            hideLoading();
        }
    }

    function transitionToDashboard() {
        if (dropZone.style.display !== 'none') {
            dropZone.style.opacity = '0';
            setTimeout(() => {
                dropZone.style.display = 'none';
                appContainer.style.display = 'grid';
                appContainer.style.opacity = '1';
            }, 300);
        }
    }

    async function handleConnectionToggle() {
        if (plcState && plcState.connected) {
            await window.api.disconnectPlc();
            plcState.connected = false; plcState.sessionId = null; liveValues = {};
            renderAll();
        } else {
            connectModal.classList.add('active');
            connectModalIpInput.focus();
        }
    }

    async function confirmConnection() {
        const ip = connectModalIpInput.value.trim();
        if (!ip) return;
        connectModal.classList.remove('active');
        const result = await window.api.connectPlc(ip);
        if (!result.success) showToast(`Connection failed: ${result.error}`, 'error');
        else showToast('Connection successful!', 'success');
    }
    
    // --- TAG ACTIONS & QUICK ACTIONS ---
    function handleTableButtonClick(event) {
        const button = event.target.closest('.action-icon-btn');
        if (!button) return;

        const tagName = button.dataset.tagName;
        
        // ** FIX: Replaced the faulty loop with a more robust method **
        const allTags = Object.values(appConfig).flatMap(source => source.tags || []);
        const tagObject = allTags.find(t => t.fullTagName === tagName);

        if (tagObject) {
            openTagActionsModal(tagObject);
        } else {
            console.error(`[Renderer] CRITICAL: Could not find tag object for ${tagName}!`);
        }
    }

    function openTagActionsModal(tag) {
        currentActionTag = tag;
        actionsModalTagName.textContent = tag.fullTagName;

        if (tag.isReadOnly) {
            actionsModalWriteSection.style.display = 'none';
            actionsModalReadOnlyNotice.style.display = 'block';
        } else {
            document.getElementById('actions-modal-input').value = '';
            actionsModalWriteSection.style.display = 'block';
            actionsModalReadOnlyNotice.style.display = 'none';
        }

        updateTagActionButtons();
        tagActionsModal.classList.add('active');
    }

    function updateTagActionButtons() {
        if (!currentActionTag || !currentActionTag.fullTagName) return;
        const state = tagStates[currentActionTag.fullTagName];
        if (!state) return;

        actionsModalLogBtn.classList.toggle('active', state.isLogging);
        actionsModalLogBtn.textContent = state.isLogging ? 'Historical Logging Enabled' : 'Enable Historical Logging';
        actionsModalTrendBtn.classList.toggle('active', state.isTrending);
        actionsModalTrendBtn.textContent = state.isTrending ? 'Trending Enabled' : 'Enable Trending';
        actionsModalTrendBtn.disabled = !state.isLogging;
    }

    async function confirmWrite() {
        const { fullTagName, type } = currentActionTag;
        const rawValue = document.getElementById('actions-modal-input').value;

        // Backend now handles validation and conversion.
        const result = await window.api.writePlc({ tagName: fullTagName, value: rawValue, type });

        if (result.success) {
            showToast('Write Successful!', 'success');
            flashTableCell(fullTagName);
        } else {
            showToast(`Write failed: ${result.error}`, 'error');
        }
        tagActionsModal.classList.remove('active');
    }

    async function toggleLogging() {
        const tagName = currentActionTag.fullTagName;
        const state = tagStates[tagName];
        state.isLogging = !state.isLogging;
        if (state.isLogging) {
            const liveData = liveValues[tagName];
            await window.api.logTagToDb({ tagName, value: liveData?.value ?? 'N/A', dataType: currentActionTag.type });
            showToast(`Logging enabled for ${tagName}`, 'success');
        } else {
            state.isTrending = false; 
            await window.api.setTrendingState({ tagName, isTrending: false });
            showToast(`Logging disabled for ${tagName}`, 'success');
        }
        updateTagActionButtons();
    }

    async function toggleTrending() {
        const tagName = currentActionTag.fullTagName;
        const state = tagStates[tagName];
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
            Object.values(tagStates).forEach(state => state.isTrending = false);
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

    // --- UI RENDERING ---
    function renderAll() {
        const totalTags = Object.values(appConfig).reduce((sum, source) => sum + (source.tags?.length || 0), 0);
        const sourcesCount = Object.keys(appConfig).length;
        activeTagsCountEl.textContent = totalTags;
        sourcesCountEl.textContent = sourcesCount;
        renderAllTagsTable();
        renderLookupSelect();
        renderLookupTable();
        updateConnectionStatusUI();
    }

    const renderTagRow = (tag) => {
        const liveData = liveValues[tag.fullTagName];
        const value = liveData ? liveData.value : '-';
        const quality = tag.error ? 'UDT_NOT_SUPPORTED' : (liveData ? liveData.quality : 'UNKNOWN');
    
        let valueDisplay = String(value);
        let valueClass = '';
    
        if (quality !== 'GOOD') {
            valueDisplay = tag.error || quality;
            valueClass = 'quality-bad';
        }
    
        const actionsBtnHtml = `<button class="action-icon-btn" data-tag-name='${tag.fullTagName}' title="Tag Actions"><i class="fa-solid fa-pen-to-square"></i></button>`;
        
        return { valueDisplay, valueClass, actionsBtnHtml };
    };

    function renderAllTagsTable() {
        const fragment = document.createDocumentFragment();
        Object.entries(appConfig).forEach(([filename, source]) => {
            (source.tags || []).forEach(tag => {
                const { valueDisplay, valueClass, actionsBtnHtml } = renderTagRow(tag);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${filename}</td>
                    <td>${tag.name}</td>
                    <td class="${valueClass}" data-tag-name="${tag.fullTagName}">${valueDisplay}</td>
                    <td>${tag.type}</td>
                    <td>${actionsBtnHtml}</td>
                `;
                fragment.appendChild(row);
            });
        });
        allTagsTableBody.innerHTML = '';
        allTagsTableBody.appendChild(fragment);
    }
    
    function renderLookupSelect() {
        const allSources = Object.values(appConfig);
        const currentSelection = lookupSelect.value;
        if (allSources.length === 0) {
            lookupSelect.innerHTML = `<option disabled selected>No Sources Loaded</option>`;
            return;
        }
        lookupSelect.innerHTML = allSources.map(source => `<option value="${source.sourceName}">${source.sourceName}</option>`).join('');
        if (allSources.some(s => s.sourceName === currentSelection)) {
            lookupSelect.value = currentSelection;
        } else if (allSources.length > 0) {
            lookupSelect.value = allSources[0].sourceName;
        }
    }
    
    function renderLookupTable() {
        const selectedSourceName = lookupSelect.value;
        const source = Object.values(appConfig).find(s => s.sourceName === selectedSourceName);
        if (!source || !source.tags) {
            lookupTableBody.innerHTML = '';
            return;
        }
        const fragment = document.createDocumentFragment();
        source.tags.forEach(tag => {
            const { valueDisplay, valueClass, actionsBtnHtml } = renderTagRow(tag);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tag.name}</td>
                <td class="${valueClass}" data-tag-name="${tag.fullTagName}">${valueDisplay}</td>
                <td>${actionsBtnHtml}</td>
            `;
            fragment.appendChild(row);
        });
        lookupTableBody.innerHTML = '';
        lookupTableBody.appendChild(fragment);
    }

    function updateConnectionStatusUI() {
        const isConnected = plcState && plcState.connected;
        connStatusIndicator.classList.toggle('connected', isConnected);
        connStatusText.textContent = isConnected ? 'Connected' : (plcState.error || 'Disconnected');
        connectBtn.textContent = isConnected ? 'Disconnect' : 'Connect';
        connectBtn.classList.toggle('connected', isConnected);
        statusIpEl.textContent = isConnected ? plcState.ip : 'N/A';
        statusSessionEl.textContent = isConnected ? plcState.sessionId : 'N/A';
    }

    initializeApp();
});