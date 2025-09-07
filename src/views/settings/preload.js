const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('settingsApi', {
  setHistoryRetention: (minutes) => ipcRenderer.send('settings:set-history-retention', minutes),
});```

---

### **`settings-renderer.js`**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const historyRetentionSelect = document.getElementById('settings-history-retention-select');
    const closeSettingsBtn = document.getElementById('close-settings-btn');

    historyRetentionSelect.addEventListener('change', (e) => {
        window.settingsApi.setHistoryRetention(parseInt(e.target.value, 10));
    });

    closeSettingsBtn.addEventListener('click', () => window.close());
});