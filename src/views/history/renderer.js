document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#history-table tbody');
    const retentionSelect = document.getElementById('history-retention-select');
    const exportHistoryBtn = document.getElementById('export-history-btn');
    let currentHistoryRecords = [];
    retentionSelect.addEventListener('change', () => loadHistory());
    exportHistoryBtn.addEventListener('click', async () => {
        await window.historyApi.exportData('history', currentHistoryRecords, 'csv');
    });
    
    async function loadHistory() {
        const allTagNames = await window.historyApi.getAllHistoricalTagNames();
        if (allTagNames.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No history data found.</td></tr>';
            return;
        }
        const limitPerTag = parseInt(retentionSelect.value) * 60;
        const historyData = await window.historyApi.getHistory(allTagNames, limitPerTag);
        
        currentHistoryRecords = Object.values(historyData).flat().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        renderTable(currentHistoryRecords);
    }
    
    function renderTable(records) {
        if (records.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No history data for this period.</td></tr>';
            return;
        }
        tableBody.innerHTML = records.map(record => `
            <tr>
                <td>${record.tagName}</td>
                <td>${record.value}</td>
                <td>${new Date(record.timestamp).toLocaleString()}</td>
                <td>${record.quality}</td>
            </tr>`).join('');
    }
    
    loadHistory();
    setInterval(loadHistory, 2000);
    });