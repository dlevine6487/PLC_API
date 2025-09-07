document.addEventListener('DOMContentLoaded', () => {
    const requestContentEl = document.getElementById('last-request-content');
    const responseContentEl = document.getElementById('last-response-content');
    const refreshBtn = document.getElementById('refresh-debug-btn');
    const exportBtn = document.getElementById('export-debug-btn');
    let lastCallData = {};

    async function loadApiData() {
        lastCallData = await window.debugApi.getLastApiCall();
        requestContentEl.textContent = JSON.stringify(lastCallData.request, null, 2) || 'No request captured yet.';
        responseContentEl.textContent = JSON.stringify(lastCallData.response, null, 2) || 'No response captured yet.';
    }

    async function exportApiData() {
        if (!lastCallData.request && !lastCallData.response) {
            alert("No API data has been captured yet.");
            return;
        }
        await window.debugApi.exportApiCall(lastCallData);
    }

    refreshBtn.addEventListener('click', loadApiData);
    exportBtn.addEventListener('click', exportApiData);

    loadApiData();
});