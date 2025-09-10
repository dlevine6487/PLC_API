document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#history-table tbody');
    const retentionSelect = document.getElementById('history-retention-select');
    const exportHistoryBtn = document.getElementById('export-history-btn');
    
    let currentHistoryRecords = [];
    let newestTimestamp = '';

    retentionSelect.addEventListener('change', () => {
        // Force a full reload when the time range changes
        currentHistoryRecords = [];
        newestTimestamp = '';
        tableBody.innerHTML = '';
        loadHistory();
    });

    exportHistoryBtn.addEventListener('click', async () => {
        if (currentHistoryRecords.length === 0) {
            alert('No history data to export.');
            return;
        }
        await window.historyApi.exportData(currentHistoryRecords);
    });
    
    async function loadHistory() {
        const allTagNames = await window.historyApi.getAllHistoricalTagNames();
        if (allTagNames.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No history data found.</td></tr>';
            return;
        }
        
        // Calculate limit based on selection. Assumes approx. 1s polling.
        const minutes = parseInt(retentionSelect.value);
        const limitPerTag = minutes > 0 ? minutes * 60 : 10000; // a large number for "Forever"

        const historyData = await window.historyApi.getHistory(allTagNames, limitPerTag);
        
        const newRecords = Object.values(historyData).flat().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (tableBody.innerHTML === '' || currentHistoryRecords.length === 0) {
            // Initial full render
            tableBody.innerHTML = newRecords.map(renderRow).join('');
        } else {
            // Smart update: find only new records and prepend them
            const newEntries = newRecords.filter(record => new Date(record.timestamp) > new Date(newestTimestamp));
            if (newEntries.length > 0) {
                const isScrolledToTop = tableBody.parentElement.scrollTop === 0;
                const oldScrollHeight = tableBody.parentElement.scrollHeight;

                const newRowsHtml = newEntries.map(renderRow).join('');
                tableBody.insertAdjacentHTML('afterbegin', newRowsHtml);

                if (!isScrolledToTop) {
                    const newScrollHeight = tableBody.parentElement.scrollHeight;
                    tableBody.parentElement.scrollTop += (newScrollHeight - oldScrollHeight);
                }
            }
        }

        currentHistoryRecords = newRecords;
        if (currentHistoryRecords.length > 0) {
            newestTimestamp = currentHistoryRecords[0].timestamp;
        }
    }
    
    function renderRow(record) {
        return `
            <tr>
                <td>${record.tagName}</td>
                <td>${record.value}</td>
                <td>${new Date(record.timestamp).toLocaleString()}</td>
                <td>${record.quality}</td>
            </tr>`;
    }
    
    loadHistory();
    setInterval(loadHistory, 2000); // Check for new data every 2 seconds
});