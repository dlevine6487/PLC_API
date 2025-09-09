# HMI Application Test Plan

**Version:** 1.0
**Author:** Jules

## 1. Introduction

This document outlines the comprehensive testing strategy for the Siemens PLC Dashboard HMI application. Our approach combines automated, data-driven tests for core functionality and regression testing, with structured manual tests to validate the end-to-end user experience.

## 2. Testing Strategy

### 2.1. Automated Testing

Automated tests form the backbone of our quality assurance process. They are designed to run quickly and reliably in a CI/CD environment to catch regressions before they enter the main codebase.

*   **Framework:** [Playwright](https://playwright.dev/)
*   **Source of Truth:** Test scenarios are defined in a human-readable, data-driven format.
    *   **Location:** [`/tests/test_scenarios.yaml`](../tests/test_scenarios.yaml)
*   **Implementation:** The tests are implemented using the Page Object Model (POM) to ensure they are maintainable and readable.
    *   **Page Objects:** [`/tests/pages/hmi.page.js`](../tests/pages/hmi.page.js)
    *   **Test Runner:** [`/tests/hmi_test.spec.js`](../tests/hmi_test.spec.js)
*   **Execution:** These tests are run automatically via GitHub Actions on every push and pull request.

The `TC_APP_LOAD_AND_CONNECT_001` test case is the primary automated scenario, covering application launch, file loading, and connection. Additional test cases will be added to this framework as new features are developed.

### 2.2. Manual Testing

Manual testing is crucial for evaluating usability, visual correctness, and workflows that are difficult to automate. It serves as a final quality gate before a release.

*   **Guide Document:** A complete, step-by-step guide for manual testing is maintained here:
    *   **[Manual Testing Guide](./MANUAL_TESTING_GUIDE.md)**
*   **Scope:** The manual testing guide covers:
    *   Initial application setup and configuration file loading.
    *   Connecting to the PLC.
    *   Verifying all interactive features (writing values, logging, plotting).
    *   Opening and verifying all viewer windows (History, Alarms, etc.).
    *   Testing data export functionality.
    *   A comprehensive troubleshooting guide.

## 3. Quality Gates

1.  **Pull Requests:** All new code must be submitted via a Pull Request.
2.  **CI Checks:** The automated Playwright test suite must pass on all PRs.
3.  **Manual Verification:** Before merging release-critical features, a manual test run following the **[Manual Testing Guide](./MANUAL_TESTING_GUIDE.md)** should be performed.
