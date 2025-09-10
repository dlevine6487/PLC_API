(() => {
  // src/views/main/renderer.js
  var appState = {};
  document.addEventListener("DOMContentLoaded", () => {
    main();
  });
  function main() {
    const D = {
      get dropZone() {
        return document.getElementById("drop-zone");
      },
      get splashLoadFilesBtn() {
        return document.getElementById("splash-load-files-btn");
      },
      get appContainer() {
        return document.getElementById("app-container");
      },
      get connectBtn() {
        return document.getElementById("connect-btn");
      },
      get loadFilesBtn() {
        return document.getElementById("load-files-btn");
      },
      get pollRateSelect() {
        return document.getElementById("poll-rate-select");
      },
      get activeTagsCountEl() {
        return document.getElementById("active-tags-count");
      },
      get sourcesCountEl() {
        return document.getElementById("sources-count");
      },
      get pollingRateDisplayEl() {
        return document.getElementById("polling-rate-display");
      },
      get allTagsTableBody() {
        return document.querySelector("#all-tags-table tbody");
      },
      get lookupTableBody() {
        return document.querySelector("#lookup-table tbody");
      },
      get lookupSelect() {
        return document.getElementById("lookup-select");
      },
      get connStatusIndicator() {
        return document.getElementById("connection-status-indicator");
      },
      get connStatusText() {
        return document.getElementById("connection-status-text");
      },
      get statusIpEl() {
        return document.getElementById("status-ip");
      },
      get statusSessionEl() {
        return document.getElementById("status-session");
      },
      get connectModal() {
        return document.getElementById("connect-modal");
      },
      get connectModalIpInput() {
        return document.getElementById("connect-modal-ip-input");
      },
      get connectModalConfirmBtn() {
        return document.getElementById("connect-modal-confirm-btn");
      },
      get connectModalCancelBtn() {
        return document.getElementById("connect-modal-cancel-btn");
      },
      get clearHistoryBtn() {
        return document.getElementById("clear-history-btn");
      },
      get clearTrendsBtn() {
        return document.getElementById("clear-trends-btn");
      },
      get ackAllAlarmsBtn() {
        return document.getElementById("ack-all-alarms-btn");
      },
      get tagActionsModal() {
        return document.getElementById("tag-actions-modal");
      },
      get actionsModalTagName() {
        return document.getElementById("actions-modal-tag-name");
      },
      get actionsModalWriteSection() {
        return document.getElementById("actions-modal-write-section");
      },
      get actionsModalReadOnlyNotice() {
        return document.getElementById("actions-modal-readonly-notice");
      },
      get actionsModalLogBtn() {
        return document.getElementById("actions-modal-log-btn");
      },
      get actionsModalTrendBtn() {
        return document.getElementById("actions-modal-trend-btn");
      },
      get actionsModalCloseBtn() {
        return document.getElementById("actions-modal-close-btn");
      },
      get writeConfirmModal() {
        return document.getElementById("write-confirm-modal");
      },
      get writeConfirmTagName() {
        return document.getElementById("write-confirm-tag-name");
      },
      get writeConfirmTagValue() {
        return document.getElementById("write-confirm-tag-value");
      },
      get writeConfirmCancelBtn() {
        return document.getElementById("write-confirm-cancel-btn");
      },
      get writeConfirmConfirmBtn() {
        return document.getElementById("write-confirm-confirm-btn");
      },
      get loadingOverlay() {
        return document.getElementById("loading-overlay");
      },
      get toastContainer() {
        return document.getElementById("toast-container");
      }
    };
    function showToast(options) {
      const { title, details, type = "success", duration = 3e3 } = options;
      const toast = document.createElement("div");
      toast.className = `toast ${type}`;
      let content = `<div class="toast-title">${title}</div>`;
      if (details) {
        content += `<div class="toast-details">${details}</div>`;
      }
      const timerId = `timer-${Date.now()}`;
      if (duration > 0) {
        content += `<div class="toast-timer" id="${timerId}">(Closing in ${duration / 1e3}s...)</div>`;
      }
      toast.innerHTML = content;
      D.toastContainer.appendChild(toast);
      let countdown = duration / 1e3;
      let interval;
      if (duration > 0) {
        const timerEl = document.getElementById(timerId);
        interval = setInterval(() => {
          countdown--;
          if (timerEl) {
            timerEl.textContent = `(Closing in ${countdown}s...)`;
          }
          if (countdown <= 0) {
            clearInterval(interval);
          }
        }, 1e3);
      }
      setTimeout(() => {
        toast.remove();
        if (interval) clearInterval(interval);
      }, duration);
    }
    function showLoading() {
      D.loadingOverlay.classList.add("active");
    }
    function hideLoading() {
      D.loadingOverlay.classList.remove("active");
    }
    function flashTableRow(tagName) {
      const cells = document.querySelectorAll(`td[data-tag-name='${tagName}']`);
      cells.forEach((cell) => {
        const row = cell.closest("tr");
        if (row) {
          row.classList.add("flash-row");
          setTimeout(() => {
            row.classList.remove("flash-row");
          }, 5e3);
        }
      });
    }
    function transitionToDashboard() {
      if (D.dropZone.style.display !== "none") {
        D.dropZone.style.opacity = "0";
        setTimeout(() => {
          D.dropZone.style.display = "none";
          D.appContainer.style.display = "grid";
          D.appContainer.style.opacity = "1";
        }, 300);
      }
    }
    function renderAll(tagConfig, liveValues, plcState) {
      const totalTags = tagConfig ? Object.values(tagConfig).reduce((sum, source) => sum + (source.tags?.length || 0), 0) : 0;
      const sourcesCount = tagConfig ? Object.keys(tagConfig).length : 0;
      D.activeTagsCountEl.textContent = totalTags;
      D.sourcesCountEl.textContent = sourcesCount;
      renderAllTagsTable(tagConfig, liveValues);
      renderLookupSelect(tagConfig);
      renderLookupTable(tagConfig, liveValues);
      updateConnectionStatusUI(plcState);
    }
    const renderTagRow = (tag, liveValues) => {
      const liveData = liveValues[tag.fullTagName];
      const value = liveData ? liveData.value : "-";
      const quality = tag.error ? "UDT_NOT_SUPPORTED" : liveData ? liveData.quality : "UNKNOWN";
      let valueDisplay = String(value);
      let valueClass = "";
      if (quality !== "GOOD") {
        valueDisplay = tag.error || quality;
        valueClass = "quality-bad";
      }
      const actionsBtnHtml = `<button class="action-icon-btn" data-tag-name='${tag.fullTagName}' title="Tag Actions"><i class="fa-solid fa-pen-to-square"></i></button>`;
      let statusIconsHtml = "";
      const tagState = appState.tagStates ? appState.tagStates[tag.fullTagName] : null;
      if (tagState) {
        if (tagState.isLogging) {
          statusIconsHtml += `<i class="fa-solid fa-database" title="Logging Enabled"></i>`;
        }
        if (tagState.isTrending) {
          statusIconsHtml += `<i class="fa-solid fa-chart-line" title="Trending Enabled" style="margin-left: 8px;"></i>`;
        }
      }
      return { valueDisplay, valueClass, statusIconsHtml, actionsBtnHtml };
    };
    function renderAllTagsTable(tagConfig, liveValues) {
      const fragment = document.createDocumentFragment();
      if (tagConfig) {
        Object.entries(tagConfig).forEach(([filename, source]) => {
          (source.tags || []).forEach((tag) => {
            const liveData = liveValues[tag.fullTagName];
            if (liveData && liveData.quality === "BAD_TAG") {
              return;
            }
            const { valueDisplay, valueClass, statusIconsHtml, actionsBtnHtml } = renderTagRow(tag, liveValues);
            const row = document.createElement("tr");
            row.innerHTML = `
                        <td>${filename}</td>
                        <td>${tag.name}</td>
                        <td class="${valueClass}" data-tag-name='${tag.fullTagName}'>${valueDisplay}</td>
                        <td>${tag.type}</td>
                        <td>${statusIconsHtml}</td>
                        <td>${actionsBtnHtml}</td>
                    `;
            fragment.appendChild(row);
          });
        });
      }
      D.allTagsTableBody.innerHTML = "";
      D.allTagsTableBody.appendChild(fragment);
    }
    function renderLookupSelect(tagConfig) {
      if (!tagConfig) return;
      const allSources = Object.values(tagConfig);
      const currentSelection = D.lookupSelect.value;
      if (allSources.length === 0) {
        D.lookupSelect.innerHTML = `<option disabled selected>No Sources Loaded</option>`;
        return;
      }
      D.lookupSelect.innerHTML = allSources.map((source) => `<option value="${source.sourceName}">${source.sourceName}</option>`).join("");
      if (allSources.some((s) => s.sourceName === currentSelection)) {
        D.lookupSelect.value = currentSelection;
      } else if (allSources.length > 0) {
        D.lookupSelect.value = allSources[0].sourceName;
      }
    }
    function renderLookupTable(tagConfig, liveValues) {
      if (!tagConfig) return;
      const selectedSourceName = D.lookupSelect.value;
      const source = Object.values(tagConfig).find((s) => s.sourceName === selectedSourceName);
      if (!source || !source.tags) {
        D.lookupTableBody.innerHTML = "";
        return;
      }
      const fragment = document.createDocumentFragment();
      source.tags.forEach((tag) => {
        const { valueDisplay, valueClass, statusIconsHtml, actionsBtnHtml } = renderTagRow(tag, liveValues);
        const row = document.createElement("tr");
        row.innerHTML = `
                <td>${tag.name}</td>
                <td class="${valueClass}" data-tag-name='${tag.fullTagName}'>${valueDisplay}</td>
                <td>${statusIconsHtml}</td>
                <td>${actionsBtnHtml}</td>
            `;
        fragment.appendChild(row);
      });
      D.lookupTableBody.innerHTML = "";
      D.lookupTableBody.appendChild(fragment);
    }
    function updateConnectionStatusUI(plcState) {
      const isConnected = plcState && plcState.connected;
      D.connStatusIndicator.classList.toggle("connected", isConnected);
      D.connStatusText.textContent = isConnected ? "Connected" : plcState.error || "Disconnected";
      D.connectBtn.textContent = isConnected ? "Disconnect" : "Connect";
      D.connectBtn.classList.toggle("connected", isConnected);
      D.statusIpEl.textContent = isConnected ? plcState.ip : "N/A";
      D.statusSessionEl.textContent = isConnected ? plcState.sessionId : "N/A";
    }
    function initializeTagStates() {
      appState.tagStates = {};
      if (appState.tagConfig) {
        Object.values(appState.tagConfig).forEach((source) => {
          (source.tags || []).forEach((tag) => {
            appState.tagStates[tag.fullTagName] = { isLogging: false, isTrending: false };
          });
        });
      }
    }
    async function handleFileDrop(event) {
      event.preventDefault();
      event.stopPropagation();
      D.dropZone.classList.remove("dragover");
      const filePaths = Array.from(event.dataTransfer.files).map((f) => f.path);
      if (filePaths.length > 0) await processFiles(filePaths);
    }
    async function handleLoadFilesClick() {
      const filePaths = await window.api.openFileDialog();
      if (filePaths.length > 0) await processFiles(filePaths);
    }
    async function processFiles(filePaths) {
      showLoading();
      try {
        await window.api.clearSession();
        const result = await window.api.parseFiles(filePaths);
        if (result.success) {
          if (result.warnings && result.warnings.length > 0) {
            showToast({ title: "Import Complete (with warnings)", details: result.warnings[0], type: "warning" });
          }
        } else {
          showToast({ title: "Error Parsing Files", details: result.error || "Unknown Error", type: "error" });
        }
      } catch (error) {
        console.error("Critical error during file processing:", error);
        showToast({ title: "Critical Error", details: error.message, type: "error" });
      } finally {
        hideLoading();
      }
    }
    async function handleConnectionToggle() {
      if (appState.plcState && appState.plcState.connected) {
        await window.api.disconnectPlc();
      } else {
        D.connectModal.classList.add("active");
        D.connectModalIpInput.focus();
      }
    }
    async function confirmConnection() {
      const ip = D.connectModalIpInput.value.trim();
      if (!ip) return;
      D.connectModal.classList.remove("active");
      const result = await window.api.connectPlc(ip);
      if (!result.success) {
        showToast({ title: "Connection Failed", details: result.error, type: "error" });
      } else {
        showToast({ title: "Connection Successful!" });
      }
    }
    function handleTableButtonClick(event) {
      const button = event.target.closest(".action-icon-btn");
      if (!button) {
        return;
      }
      if (!appState || !appState.tagConfig) {
        return;
      }
      const tagName = button.dataset.tagName;
      if (!tagName) {
        return;
      }
      const allTags = Object.values(appState.tagConfig).flatMap((source) => source.tags || []);
      const tagObject = allTags.find((t) => t.fullTagName === tagName);
      if (tagObject) {
        openTagActionsModal(tagObject);
      }
    }
    function validateInputValue(value, type) {
      const lowerType = (type || "").toLowerCase();
      if (lowerType.includes("bool")) {
        const lowerVal = value.toLowerCase();
        return ["true", "false", "1", "0", ""].includes(lowerVal);
      }
      if (lowerType.includes("int")) {
        return /^-?\d*$/.test(value);
      }
      if (lowerType.includes("real")) {
        return /^-?\d*\.?\d*$/.test(value);
      }
      return true;
    }
    function openTagActionsModal(tag) {
      appState.currentActionTag = tag;
      D.actionsModalTagName.textContent = tag.fullTagName;
      if (tag.isReadOnly) {
        D.actionsModalWriteSection.style.display = "none";
        D.actionsModalReadOnlyNotice.style.display = "block";
      } else {
        D.actionsModalWriteSection.style.display = "block";
        D.actionsModalReadOnlyNotice.style.display = "none";
        const inputEl = document.getElementById("actions-modal-input");
        const writeBtn = document.getElementById("actions-modal-confirm-write-btn");
        inputEl.value = "";
        writeBtn.disabled = true;
        inputEl.oninput = () => {
          const currentValue = inputEl.value;
          const isValid = validateInputValue(currentValue, tag.type);
          inputEl.classList.toggle("input-error", !isValid);
          writeBtn.disabled = !isValid || currentValue.trim() === "";
        };
      }
      updateTagActionButtons();
      D.tagActionsModal.classList.add("active");
    }
    function updateTagActionButtons() {
      if (!appState.currentActionTag || !appState.currentActionTag.fullTagName || !appState.tagStates) return;
      const state = appState.tagStates[appState.currentActionTag.fullTagName];
      if (!state) return;
      D.actionsModalLogBtn.classList.toggle("active", state.isLogging);
      D.actionsModalLogBtn.textContent = state.isLogging ? "Historical Logging Enabled" : "Enable Historical Logging";
      D.actionsModalTrendBtn.classList.toggle("active", state.isTrending);
      D.actionsModalTrendBtn.textContent = state.isTrending ? "Trending Enabled" : "Enable Trending";
      D.actionsModalTrendBtn.disabled = !state.isLogging;
    }
    async function confirmWrite() {
      const { fullTagName, type } = appState.currentActionTag;
      const rawValue = document.getElementById("actions-modal-input").value;
      const result = await window.api.writePlc({ tagName: fullTagName, value: rawValue, type });
      if (result.success) {
        showToast({
          title: "Write Successful!",
          details: `${fullTagName} = ${rawValue}`,
          duration: 5e3
        });
        flashTableRow(fullTagName);
      } else {
        showToast({ title: "Write Failed", details: result.error, type: "error" });
      }
      D.writeConfirmModal.classList.remove("active");
      D.tagActionsModal.classList.remove("active");
    }
    function initiateConfirmWrite() {
      const { fullTagName } = appState.currentActionTag;
      const rawValue = document.getElementById("actions-modal-input").value;
      D.writeConfirmTagName.textContent = fullTagName;
      D.writeConfirmTagValue.textContent = rawValue;
      D.writeConfirmModal.classList.add("active");
    }
    async function toggleLogging() {
      const tagName = appState.currentActionTag.fullTagName;
      const state = appState.tagStates[tagName];
      state.isLogging = !state.isLogging;
      await window.api.setLoggingState({ tagName, isLogging: state.isLogging });
      if (state.isLogging) {
        showToast({ title: `Logging enabled for ${tagName}` });
      } else {
        state.isTrending = false;
        await window.api.setTrendingState({ tagName, isTrending: false });
        showToast({ title: `Logging disabled for ${tagName}` });
      }
      updateTagActionButtons();
    }
    async function toggleTrending() {
      const tagName = appState.currentActionTag.fullTagName;
      const state = appState.tagStates[tagName];
      state.isTrending = !state.isTrending;
      await window.api.setTrendingState({ tagName, isTrending: state.isTrending });
      showToast({ title: `Trending ${state.isTrending ? "enabled" : "disabled"} for ${tagName}` });
      updateTagActionButtons();
    }
    async function handleClearHistory() {
      const result = await window.api.clearAllHistory();
      if (result.success) showToast({ title: "All historical logs have been cleared." });
      else showToast({ title: "Failed to clear history.", type: "error" });
    }
    async function handleClearTrends() {
      const result = await window.api.clearAllTrends();
      if (result.success) {
        Object.values(appState.tagStates).forEach((state) => {
          state.isTrending = false;
        });
        showToast({ title: "All trends have been cleared." });
      } else {
        showToast({ title: "Failed to clear trends.", type: "error" });
      }
    }
    async function handleAckAllAlarms() {
      const result = await window.api.acknowledgeAllAlarms();
      if (result.success) showToast({ title: "All alarms acknowledged." });
      else showToast({ title: "Failed to acknowledge alarms.", type: "error" });
    }
    async function handleLoadNewFiles() {
      await window.api.clearSession();
      window.location.reload();
    }
    document.addEventListener("click", (event) => {
      const target = event.target;
      const actionIcon = target.closest(".action-icon-btn");
      const tagActionsModal = target.closest("#tag-actions-modal");
      if (actionIcon) {
        handleTableButtonClick(event);
        return;
      }
      if (target.matches("#splash-load-files-btn")) handleLoadFilesClick();
      else if (target.matches("#load-files-btn")) handleLoadNewFiles();
      else if (target.matches("#connect-btn")) handleConnectionToggle();
      else if (target.matches("#connect-modal-confirm-btn")) confirmConnection();
      else if (target.matches("#connect-modal-cancel-btn")) D.connectModal.classList.remove("active");
      else if (target.matches("#view-alarms-btn")) window.api.openViewer("alarms");
      else if (target.matches("#view-trends-btn")) window.api.openViewer("graph");
      else if (target.matches("#view-history-btn")) window.api.openViewer("history");
      else if (target.matches("#view-diagnostics-btn")) window.api.openViewer("diagnostics");
      else if (target.matches("#view-syslog-btn")) window.api.openViewer("syslog");
      else if (target.matches("#view-debug-btn")) window.api.openViewer("debug");
      else if (target.matches("#clear-history-btn")) handleClearHistory();
      else if (target.matches("#clear-trends-btn")) handleClearTrends();
      else if (target.matches("#ack-all-alarms-btn")) handleAckAllAlarms();
      else if (target.matches("#write-confirm-confirm-btn")) confirmWrite();
      else if (target.matches("#write-confirm-cancel-btn")) D.writeConfirmModal.classList.remove("active");
      if (tagActionsModal) {
        if (target.matches("#actions-modal-close-btn")) D.tagActionsModal.classList.remove("active");
        else if (target.matches("#actions-modal-log-btn")) toggleLogging();
        else if (target.matches("#actions-modal-trend-btn")) toggleTrending();
        else if (target.matches("#actions-modal-confirm-write-btn")) initiateConfirmWrite();
      }
    });
    D.pollRateSelect.addEventListener("change", (e) => {
      window.api.setPollRate(parseInt(e.target.value, 10));
      D.pollingRateDisplayEl.textContent = `${e.target.value / 1e3}s`;
    });
    D.lookupSelect.addEventListener("change", () => {
      renderLookupTable(appState.tagConfig, appState.liveValues);
    });
    D.dropZone.addEventListener("drop", handleFileDrop);
    D.dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      D.dropZone.classList.add("dragover");
    });
    D.dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      D.dropZone.classList.remove("dragover");
    });
    D.appContainer.style.display = "none";
    window.api.onStateUpdate((newState) => {
      const isNewSession = newState.tagConfig && (!appState.tagConfig || Object.keys(newState.tagConfig).length !== Object.keys(newState.tagConfig).length);
      Object.assign(appState, newState);
      const { tagConfig, liveValues, plcState, DEFAULT_PLC_IP } = appState;
      if (tagConfig && Object.keys(tagConfig).length > 0) {
        if (D.appContainer.style.display === "none") {
          transitionToDashboard();
        }
        if (isNewSession) {
          initializeTagStates();
        }
      } else {
        D.dropZone.style.display = "flex";
        D.dropZone.style.opacity = "1";
        D.appContainer.style.display = "none";
        D.appContainer.style.opacity = "0";
      }
      renderAll(tagConfig, liveValues, plcState);
      const lastUsedIp = plcState?.lastUsedIp || plcState?.ip || DEFAULT_PLC_IP;
      if (D.connectModalIpInput) {
        D.connectModalIpInput.value = lastUsedIp;
      }
    });
  }
})();
