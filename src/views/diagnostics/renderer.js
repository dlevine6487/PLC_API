document.addEventListener('DOMContentLoaded', () => {
    const diagnosticContentEl = document.getElementById('diagnostic-content');
    const saveDiagnosticBtn = document.getElementById('save-diagnostic-btn');
    let currentDiagnosticData = [];

    window.api.onLogUpdate((data) => {
        currentDiagnosticData = data;
        diagnosticContentEl.textContent = data.slice(-50).join('\n') || 'No diagnostic entries.';
        diagnosticContentEl.scrollTop = diagnosticContentEl.scrollHeight;
    });
    
    saveDiagnosticBtn.addEventListener('click', async () => {
        await window.api.exportLog('diagnostic', currentDiagnosticData, 'txt');
    });
    });