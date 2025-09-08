import * as D from './dom-elements.js';

// --- UI Feedback Helpers ---
export function showLoading() { D.loadingOverlay.classList.add('active'); }
export function hideLoading() { D.loadingOverlay.classList.remove('active'); }

export function flashTableCell(tagName) {
    const cells = document.querySelectorAll(`td[data-tag-name="${tagName}"]`);
    cells.forEach(cell => {
        cell.classList.add('flash');
        setTimeout(() => cell.classList.remove('flash'), 1000);
    });
}

export function transitionToDashboard() {
    if (D.dropZone.style.display !== 'none') {
        D.dropZone.style.opacity = '0';
        setTimeout(() => {
            D.dropZone.style.display = 'none';
            D.appContainer.style.display = 'grid';
            D.appContainer.style.opacity = '1';
        }, 300);
    }
}

// --- UI Rendering ---
export function renderAll(appConfig, liveValues, plcState) {
    const totalTags = Object.values(appConfig).reduce((sum, source) => sum + (source.tags?.length || 0), 0);
    const sourcesCount = Object.keys(appConfig).length;
    D.activeTagsCountEl.textContent = totalTags;
    D.sourcesCountEl.textContent = sourcesCount;
    renderAllTagsTable(appConfig, liveValues);
    renderLookupSelect(appConfig);
    renderLookupTable(appConfig, liveValues);
    updateConnectionStatusUI(plcState);
}

const renderTagRow = (tag, liveValues) => {
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

function renderAllTagsTable(appConfig, liveValues) {
    const fragment = document.createDocumentFragment();
    Object.entries(appConfig).forEach(([filename, source]) => {
        (source.tags || []).forEach(tag => {
            const { valueDisplay, valueClass, actionsBtnHtml } = renderTagRow(tag, liveValues);
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
    D.allTagsTableBody.innerHTML = '';
    D.allTagsTableBody.appendChild(fragment);
}

function renderLookupSelect(appConfig) {
    const allSources = Object.values(appConfig);
    const currentSelection = D.lookupSelect.value;
    if (allSources.length === 0) {
        D.lookupSelect.innerHTML = `<option disabled selected>No Sources Loaded</option>`;
        return;
    }
    D.lookupSelect.innerHTML = allSources.map(source => `<option value="${source.sourceName}">${source.sourceName}</option>`).join('');
    if (allSources.some(s => s.sourceName === currentSelection)) {
        D.lookupSelect.value = currentSelection;
    } else if (allSources.length > 0) {
        D.lookupSelect.value = allSources[0].sourceName;
    }
}

function renderLookupTable(appConfig, liveValues) {
    const selectedSourceName = D.lookupSelect.value;
    const source = Object.values(appConfig).find(s => s.sourceName === selectedSourceName);
    if (!source || !source.tags) {
        D.lookupTableBody.innerHTML = '';
        return;
    }
    const fragment = document.createDocumentFragment();
    source.tags.forEach(tag => {
        const { valueDisplay, valueClass, actionsBtnHtml } = renderTagRow(tag, liveValues);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tag.name}</td>
            <td class="${valueClass}" data-tag-name="${tag.fullTagName}">${valueDisplay}</td>
            <td>${actionsBtnHtml}</td>
        `;
        fragment.appendChild(row);
    });
    D.lookupTableBody.innerHTML = '';
    D.lookupTableBody.appendChild(fragment);
}

function updateConnectionStatusUI(plcState) {
    const isConnected = plcState && plcState.connected;
    D.connStatusIndicator.classList.toggle('connected', isConnected);
    D.connStatusText.textContent = isConnected ? 'Connected' : (plcState.error || 'Disconnected');
    D.connectBtn.textContent = isConnected ? 'Disconnect' : 'Connect';
    D.connectBtn.classList.toggle('connected', isConnected);
    D.statusIpEl.textContent = isConnected ? plcState.ip : 'N/A';
    D.statusSessionEl.textContent = isConnected ? plcState.sessionId : 'N/A';
}
