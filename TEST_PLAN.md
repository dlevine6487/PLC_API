# HMI Application Test Plan

This document outlines the automated test plan for the Siemens PLC Dashboard HMI. The tests are data-driven and executed using the Playwright test framework.

## Test Suite Summary

| Test Case ID                  | Description                                                        | High-Level Test Steps                                                                                                                                                             | Key Validations                                                                                             |
| ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TC_APP_LOAD_AND_CONNECT_001` | Verify app launch, file load simulation, and connection attempt. | 1. Launch application.<br>2. Mock file loading to transition UI.<br>3. Click 'Connect' button.<br>4. Fill in IP address in modal.<br>5. Confirm connection. | - Initial splash screen is visible.<br>- Main dashboard becomes visible after mock file load.<br>- Visual snapshot of the dashboard matches the baseline.<br>- Connection modal appears and disappears correctly. |
| `TC_MODAL_INTERACTION_002`    | Verify the tag actions and write confirmation modals work correctly. | 1. Load dashboard.<br>2. Click action button for a tag.<br>3. Fill value in modal.<br>4. Click 'Write'.<br>5. Cancel confirmation modal. | - Tag Actions modal appears and disappears correctly.<br>- Write Confirmation modal appears and disappears correctly.<br>- Input fields can be filled. |
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

### Test Case: TC_MODAL_INTERACTION_002

**Description:** Verify the tag actions and write confirmation modals work correctly.

**Actions:**
1.  **Wait for Selector:** Wait for the initial file drop zone to be visible. (Selector: `dropZone`)
2.  **Evaluate Script:** Load test file using the application's file parsing API. (Script: `window.api.parseFiles(['/app/tests/fixtures/test_db.xml'])`)
3.  **Wait:** Wait for UI transition animation. (Duration: 500ms)
4.  **Wait for Selector:** Wait for the main application container to be visible. (Selector: `appContainer`)
5.  **Wait for Selector:** Wait for the action button for TestInt to be available. (Selector: `button[data-tag-name='test_db.xml.TestInt']`)
6.  **Click:** Click the action button for the 'TestInt' tag. (Selector: `button[data-tag-name='test_db.xml.TestInt']`)
7.  **Wait for Selector:** Wait for the Tag Actions modal to appear. (Selector: `tagActionsModal`)
8.  **Fill Input:** Enter a new value for the tag. (Selector: `actionsModalInput`, Value: `123`)
9.  **Click:** Click the 'Write to PLC' button. (Selector: `actionsModalConfirmWriteBtn`)
10. **Wait for Selector:** Wait for the Write Confirmation modal to appear. (Selector: `writeConfirmModal`)
11. **Click:** Click the 'Cancel' button in the confirmation modal. (Selector: `writeConfirmCancelBtn`)
12. **Wait for Hidden:** Verify the confirmation modal is now hidden. (Selector: `writeConfirmModal`)
13. **Click:** Click the 'Close' button in the Tag Actions modal. (Selector: `actionsModalCloseBtn`)
14. **Wait for Hidden:** Verify the Tag Actions modal is now hidden. (Selector: `tagActionsModal`)
