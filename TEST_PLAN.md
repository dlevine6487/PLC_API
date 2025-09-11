# HMI Application Test Plan

This document outlines the automated test plan for the Siemens PLC Dashboard HMI. The tests are data-driven and executed using the Playwright test framework.

## Test Suite Summary

| Test Case ID                  | Description                                                        | High-Level Test Steps                                                                                                                                                             | Key Validations                                                                                             |
| ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TC_APP_LOAD_AND_CONNECT_001` | Verify app launch, file load simulation, and connection attempt. | 1. Launch application.<br>2. Mock file loading to transition UI.<br>3. Click 'Connect' button.<br>4. Fill in IP address in modal.<br>5. Confirm connection. | - Initial splash screen is visible.<br>- Main dashboard becomes visible after mock file load.<br>- Visual snapshot of the dashboard matches the baseline.<br>- Connection modal appears and disappears correctly. |
| ...                           | *(Future test cases for other features like Alarms, Diagnostics, etc. will be added here)*                           | ...                                                                                                                                                                               | ...                                                                                                         |

## Detailed Test Scenarios

This section provides a human-readable breakdown of the automated test cases defined in `tests/test_scenarios.yaml`.

### Test Case: TC_APP_LOAD_AND_CONNECT_001

**Description:** Verify app launch, file load simulation, and connection attempt.

**Actions:**
1.  **Wait for Selector:** Wait for the initial file drop zone to be visible. (Selector: `dropZone`)
2.  **Evaluate Script:** Load test file using the application's file parsing API. (Script: `window.api.parseFiles(['/app/tests/fixtures/test_db.xml'])`)
3.  **Wait:** Wait for UI transition animation. (Duration: 500ms)
4.  **Wait for Selector:** Wait for the main application container to be visible. (Selector: `appContainer`)
5.  **Wait for Hidden:** Verify the file drop zone is now hidden. (Selector: `dropZone`)
6.  **Take Screenshot:** Take a screenshot for visual verification. (Name: `main-dashboard-loaded`, Target: `page`)
7.  **Wait for Selector:** Check for the left panel. (Selector: `leftPanel`)
8.  **Wait for Selector:** Check for the 'Connect' button. (Selector: `connectButton`)
9.  **Click:** Click the 'Connect' button. (Selector: `connectButton`)
10. **Wait for Selector:** Wait for the connection modal to appear. (Selector: `connectModal`)
11. **Fill Input:** Enter IP address into the modal. (Selector: `connectModalIpInput`, Value: `192.168.0.100`)
12. **Click:** Click the 'Connect' button in the modal. (Selector: `connectModalConfirmButton`)
13. **Wait for Hidden:** Verify the connection modal is now hidden. (Selector: `connectModal`)
