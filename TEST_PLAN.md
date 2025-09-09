# HMI Application Test Plan

This document outlines the automated test plan for the Siemens PLC Dashboard HMI. The tests are data-driven and executed using the Playwright test framework.

## Test Suite Summary

| Test Case ID                  | Description                                                        | High-Level Test Steps                                                                                                                                                             | Key Validations                                                                                             |
| ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TC_APP_LOAD_AND_CONNECT_001` | Verify app launch, file load simulation, and connection attempt. | 1. Launch application.<br>2. Mock file loading to transition UI.<br>3. Click 'Connect' button.<br>4. Fill in IP address in modal.<br>5. Confirm connection. | - Initial splash screen is visible.<br>- Main dashboard becomes visible after mock file load.<br>- Visual snapshot of the dashboard matches the baseline.<br>- Connection modal appears and disappears correctly. |
| ...                           | *(Future test cases for other features like Alarms, Diagnostics, etc. will be added here)*                           | ...                                                                                                                                                                               | ...                                                                                                         |

## Detailed Scenarios

For the complete, step-by-step definition of each test case, including selectors, action types, and parameters, please refer to the `tests/test_scenarios.yaml` file, which is the single source of truth for test execution.
