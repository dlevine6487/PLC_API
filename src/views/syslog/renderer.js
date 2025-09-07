document.addEventListener('DOMContentLoaded', () => {
    const syslogContentEl = document.getElementById('syslog-content');
    const saveSyslogBtn = document.getElementById('save-syslog-btn');
    let currentSyslogData = [];

    window.api.onLogUpdate((data) => {
        currentSyslogData = data;
        syslogContentEl.textContent = data.slice(-50).join('\n') || 'No syslog entries available.';
        syslogContentEl.scrollTop = syslogContentEl.scrollHeight;
    });

    saveSyslogBtn.addEventListener('click', async () => {
        await window.api.exportLog('syslog', currentSyslogData, 'txt');
    });
});