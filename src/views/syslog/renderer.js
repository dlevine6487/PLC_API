document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('syslog-table-body');
    const saveTxtBtn = document.getElementById('save-syslog-txt-btn');
    const saveCsvBtn = document.getElementById('save-syslog-csv-btn');

    let currentRawLogs = [];
    let parsedLogs = [];

    // --- Data Definitions ---
    const S7_EVENT_DEFINITIONS = {
        '1': { name: 'SE_LOCAL_SUCCESSFUL_LOGON', description: 'Valid credentials provided by local logon.', severity: 'Informational' },
        '2': { name: 'SE_LOCAL_UNSUCCESSFUL_LOGON', description: 'Wrong username or password provided by local logon.', severity: 'Error' },
        '3': { name: 'SE_NETWORK_SUCCESSFUL_LOGON', description: 'Valid credentials provided by remote logon.', severity: 'Informational' },
        '4': { name: 'SE_NETWORK_UNSUCCESSFUL_LOGON', description: 'Wrong username or password provided by remote logon.', severity: 'Error' },
        '5': { name: 'SE_LOGOFF', description: 'User session ended - logout.', severity: 'Informational' },
        '6': { name: 'SE_DEFAULT_USER_AUTHENTICATION_USED', description: 'User logged in with default username and password.', severity: 'Informational' },
        '11': { name: 'SE_ACCESS_PWD_ENABLED', description: 'Password protection was enabled for a resource.', severity: 'Notice' },
        '12': { name: 'SE_ACCESS_PWD_DISABLED', description: 'Password protection was disabled for a resource.', severity: 'Notice' },
        '13': { name: 'SE_ACCESS_PWD_CHANGED', description: 'A user changed their password.', severity: 'Notice' },
        '19': { name: 'SE_ACCESS_GRANTED', description: 'Restricted access was granted to a user to perform a service.', severity: 'Informational' },
        '20': { name: 'SE_ACCESS_DENIED', description: 'Restricted access was denied to a user due to a lack of rights.', severity: 'Error' },
        '51': { name: 'SE_ACCESS_DENIED_NUMBER_OF_CONCURRENT_SESSIONS_EXCEEDED', description: 'Login attempt failed because the maximum number of concurrent sessions was exceeded.', severity: 'Warning' },
        '52': { name: 'SE_CRITICAL_DEVICE_STARTED', description: 'Initial start-up of a critical device (e.g., Webserver or OPC UA-Server).', severity: 'Notice' },
        '53': { name: 'SE_CRITICAL_DEVICE_STOPPED', description: 'Shut down of a critical device.', severity: 'Alert' },
        '56': { name: 'SE_AUDIT_EVENTS_OVERWRITTEN', description: 'The ring buffer is full, and the Audit Trail starts to overwrite old events that were not transferred to a syslog server.', severity: 'Alert' },
        '61': { name: 'SE_OPEN_RESOURCE', description: 'A handle of an object was opened (e.g., a file or folder for read/write access).', severity: 'Informational' },
        '62': { name: 'SE_CLOSE_RESOURCE', description: 'A handle of an object was closed.', severity: 'Informational' },
        '63': { name: 'SE_DELETE_OBJECT', description: 'An object was deleted or the memory card was formatted.', severity: 'Informational' },
        '64': { name: 'SE_OBJECT_OPERATION', description: 'An operation was executed on an object.', severity: 'Informational' },
        '75': { name: 'SE_SESSION_CLOSED', description: 'A session was closed.', severity: 'Informational' },
        '76': { name: 'SE_INVALID_SESSION_ID', description: 'An invalid session ID was detected.', severity: 'Error' },
        '79': { name: 'SE_BACKUP_STARTED', description: 'Creation of a backup file has started.', severity: 'Notice' },
        '80': { name: 'SE_BACKUP_SUCCESSFULLY_DONE', description: 'Creation of a backup file finished successfully.', severity: 'Notice' },
        '81': { name: 'SE_BACKUP_FAILED', description: 'Creation of a backup file failed.', severity: 'Error' },
        '85': { name: 'SE_BACKUP_RESTORE_STARTED', description: 'Restore of a backup file has started.', severity: 'Notice' },
        '86': { name: 'SE_BACKUP_RESTORE_FAILED', description: 'Restore of a backup file failed.', severity: 'Error' },
        '87': { name: 'SE_BACKUP_RESTORE_SUCCESSFULLY_DONE', description: 'Restore of a backup file finished successfully.', severity: 'Notice' },
        '94': { name: 'SE_SECURITY_CONFIGURATION_CHANGED', description: 'A security-relevant configuration change was performed.', severity: 'Notice' },
        '95': { name: 'SE_SESSION_ESTABLISHED', description: 'A session was created after a successful login from a client.', severity: 'Informational' },
        '96': { name: 'SE_CFG_DATA_CHANGED', description: 'Significant configuration changed.', severity: 'Notice' },
        '97': { name: 'SE_USER_PROGRAM_CHANGED', description: 'A program executed by the device was modified.', severity: 'Notice' },
        '98': { name: 'SE_OPMOD_CHANGED', description: 'The operating mode of the PLC was changed.', severity: 'Notice' },
        '99': { name: 'SE_FIRMWARE_LOADED', description: 'Firmware was successfully downloaded to the PLC.', severity: 'Notice' },
        '100': { name: 'SE_FIRMWARE_ACTIVATED', description: 'Firmware was successfully activated after download.', severity: 'Notice' },
        '101': { name: 'SE_SYSTEMTIME_CHANGED', description: 'The system time of the PLC was changed.', severity: 'Notice' },
        '102': { name: 'SE_OPMOD_CHANGE_INITIATED', description: 'A client initiated a change of the operating state of the device.', severity: 'Notice' },
        '103': { name: 'SE_RESET_TO_FACTORY', description: 'The device was set back to factory settings, deleting all retentive data.', severity: 'Notice' },
        '104': { name: 'SE_MEMORY_RESET', description: 'A client initiated a reset of user-relevant memory areas.', severity: 'Notice' },
        '105': { name: 'SE_SECURITY_STATE_CHANGE', description: 'The device or a subcomponent changed an important security state.', severity: 'Notice' },
        '106': { name: 'SE_DEVICE_STARTUP', description: 'Indicates the startup of the device itself.', severity: 'Notice' },
        '201': { name: 'SE_TIME_SYNCHRONIZATION', description: 'Internal system time is affected by a change or issue of time synchronization.', severity: 'Notice' },
        '301': { name: 'SE_DEVICE_CONNECTED', description: 'A USB device or SD card was connected.', severity: 'Informational' },
        '304': { name: 'SE_DEVICE_DISCONNECTED', description: 'A USB device or SD card was disconnected.', severity: 'Informational' },
        '307': { name: 'SE_SESSION_TERMINATED', description: 'A local or remote session was terminated due to timeout, network issues, or missing operator acknowledgement.', severity: 'Notice' }
    };

    // Functions to be implemented in subsequent steps.
    /**
     * Parses a raw syslog string into a structured object.
     * @param {string} logString - The raw log entry.
     * @returns {object} A structured log object.
     */
    function parseLogEntry(logString) {
        const parsed = {
            timestamp: 'N/A',
            severity: 'Unknown',
            source: 'N/A',
            event: logString, // Default to the raw string
            details: '{}',
            raw: logString
        };

        // Match format: "TIMESTAMP [SEVERITY] SOURCE: MESSAGE"
        const standardMatch = logString.match(/^(.*?Z)\s+\[(.*?)\]\s+([a-zA-Z\/-]+):\s+(.*)$/);

        if (standardMatch) {
            parsed.timestamp = new Date(standardMatch[1]).toLocaleString();
            parsed.severity = standardMatch[2].charAt(0).toUpperCase() + standardMatch[2].slice(1);
            parsed.source = standardMatch[3];
            const message = standardMatch[4];

            const details = {};
            const detailRegex = /(\w+)="(.*?)"/g;
            let detailMatch;
            while ((detailMatch = detailRegex.exec(message)) !== null) {
                details[detailMatch[1]] = detailMatch[2];
            }

            if (details.eventId && S7_EVENT_DEFINITIONS[details.eventId]) {
                const eventDef = S7_EVENT_DEFINITIONS[details.eventId];
                parsed.event = eventDef.description;
                if (parsed.severity === 'Unknown') {
                    parsed.severity = eventDef.severity;
                }
            } else {
                parsed.event = message; // Fallback to the message part
            }
            parsed.details = JSON.stringify(details, null, 2);

        } else {
            // Fallback for simpler formats like "Console: User admin logged in."
            const simpleMatch = logString.match(/^([a-zA-Z\s.-]+):\s+(.*)$/);
            if (simpleMatch) {
                parsed.source = simpleMatch[1];
                parsed.event = simpleMatch[2];
            }
        }
        return parsed;
    }

    /**
     * Renders the parsed logs into the table.
     * @param {Array<object>} logsToRender - An array of parsed log objects.
     */
    function renderLogs(logsToRender) {
        tableBody.innerHTML = ''; // Clear existing logs

        if (!logsToRender || logsToRender.length === 0) {
            const row = tableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
            cell.textContent = 'No syslog entries available.';
            cell.style.textAlign = 'center';
            return;
        }

        const fragment = document.createDocumentFragment();
        for (const log of logsToRender) {
            const row = document.createElement('tr');

            const timestampCell = document.createElement('td');
            timestampCell.textContent = log.timestamp;
            row.appendChild(timestampCell);

            const severityCell = document.createElement('td');
            severityCell.textContent = log.severity;
            severityCell.classList.add(`severity-${log.severity.toLowerCase()}`);
            row.appendChild(severityCell);

            const sourceCell = document.createElement('td');
            sourceCell.textContent = log.source;
            row.appendChild(sourceCell);

            const eventCell = document.createElement('td');
            eventCell.textContent = log.event;
            row.appendChild(eventCell);

            const detailsCell = document.createElement('td');
            const detailsPre = document.createElement('pre');
            detailsPre.textContent = log.details;
            detailsCell.appendChild(detailsPre);
            row.appendChild(detailsCell);

            fragment.appendChild(row);
        }
        tableBody.appendChild(fragment);
    }

    window.api.onLogUpdate((logs) => {
        currentRawLogs = logs;
        // Take the last 500 logs for performance, parse them, and render
        parsedLogs = logs.slice(-500).map(parseLogEntry);
        renderLogs(parsedLogs);
    });

    saveTxtBtn.addEventListener('click', async () => {
        if (currentRawLogs.length === 0) {
            alert('No log data to export.');
            return;
        }
        // The main process handler for this is already equipped to handle raw string arrays.
        await window.api.exportLog('syslog', currentRawLogs, 'txt');
    });

    saveCsvBtn.addEventListener('click', async () => {
        if (parsedLogs.length === 0) {
            alert('No log data to export.');
            return;
        }

        // Manually construct CSV content
        const headers = ['Timestamp', 'Severity', 'Source', 'Event', 'Details', 'Raw'];
        const rows = parsedLogs.map(log => {
            // Sanitize and quote each field to handle commas and quotes within the data
            const sanitized = [
                log.timestamp,
                log.severity,
                log.source,
                log.event,
                // For details, we remove newlines and escape quotes
                JSON.stringify(log.details).replace(/\n/g, ' '),
                log.raw
            ];
            return sanitized.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        await window.api.exportLog('syslog', csvContent, 'csv');
    });
});