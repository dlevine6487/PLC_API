document.addEventListener('DOMContentLoaded', () => {
    const alarmsTableBody = document.querySelector('#alarms-table tbody');
    const activeAlarmsCountEl = document.getElementById('active-alarms-count-viewer');
    const exportAlarmsCsvBtn = document.getElementById('export-alarms-csv-btn');
    let currentAlarmsData = [];

    exportAlarmsCsvBtn.addEventListener('click', async () => {
        await window.alarmsApi.exportData('alarms', currentAlarmsData, 'csv');
    });
    
    window.alarmsApi.onAlarmsUpdate((data) => {
        currentAlarmsData = data.entries;
        renderAlarmsTable(data);
    });
    
    async function handleAcknowledge(alarmId) {
        await window.alarmsApi.acknowledgeAlarm(alarmId);
    }
    
    function renderAlarmsTable(data) {
        activeAlarmsCountEl.textContent = data.count_current || 0;
        if (!data.entries || data.entries.length === 0) {
            alarmsTableBody.innerHTML = '<tr><td colspan="7">No active alarms.</td></tr>';
            return;
        }
        alarmsTableBody.innerHTML = data.entries.map(alarm => {
            const isAck = alarm.acknowledgement?.state === 'acknowledged';
            const ackBtn = isAck ? '' : `<button class="action-btn-secondary" data-alarm-id="${alarm.id}">ACK</button>`;
            return `
                <tr>
                    <td>${alarm.id}</td>
                    <td>${alarm.alarm_number || '-'}</td>
                    <td>${new Date(alarm.timestamp).toLocaleString()}</td>
                    <td>${alarm.status}</td>
                    <td>${alarm.alarm_text}</td>
                    <td>${isAck ? 'Yes' : 'No'}</td>
                    <td>${ackBtn}</td>
                </tr>`;
        }).join('');
    
        document.querySelectorAll('.action-btn-secondary[data-alarm-id]').forEach(btn => {
            btn.addEventListener('click', () => handleAcknowledge(btn.dataset.alarmId));
        });
    }
    });