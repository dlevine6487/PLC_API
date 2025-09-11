# Project Backlog & Future Work

This document tracks known bugs, requested enhancements, and potential new features for the PLC Maintenance Portal. It is intended to be a living document to guide future development sprints.

---

## 🐞 Bug Fixes

| ID      | Bug Description                                                                      | Priority | Notes                                                                   |
| :------ | :----------------------------------------------------------------------------------- | :------- | :---------------------------------------------------------------------- |
| **BUG-02** | The Diagnostic Buffer viewer does not appear to be working.                          | High     | Needs investigation to determine the root cause. The viewer may not be loading data correctly. |
| **BUG-04** | A Content Security Policy error is present in a view, but not in the Trend Viewer.   | Low      | Investigate the console logs for the specific view to identify and fix the CSP violation. |

---

## ✨ UI/UX Enhancements

| ID      | Enhancement Description                                                                 | Priority | Notes                                                                   |
| :------ | :-------------------------------------------------------------------------------------- | :------- | :---------------------------------------------------------------------- |
| **UX-01** | Improve write-read-back validation.                                                     | High     | After a write, the system should confirm the value has changed. If it's immediately overwritten by the PLC, notify the user. |
| **UX-02** | Add zooming and panning capabilities to the Trend Viewer chart.                         | High     | Essential for analyzing historical data effectively. Libraries like `chartjs-plugin-zoom` could be used. |
| **UX-03** | Reorder the main tag table columns for better workflow.                                 | Medium   | Suggested order: `Source`, `Tag Name`, `Value`, `Actions`, `Status`, `Type`. This places the action button next to the value it affects. |
| **UX-04** | Add a "Topic" or "Group" column to the "Tag Look Up" table.                             | Medium   | Would allow for better organization and filtering of tags in the right-hand panel. |
| **UX-05** | Add a time-range slider and selection for the History Table export.                     | Medium   | Currently, it likely exports the entire table. Users need to be able to select a specific window of time to export. |
| **UX-06** | Add independent scroll bars to the "API Debug" viewer's input and response panels.      | Low      | Improves usability when inspecting large request/response payloads.     |

---

## 🚀 New Features

| ID      | Feature Description                                                                     | Priority | Notes                                                                   |
| :------ | :-------------------------------------------------------------------------------------- | :------- | :---------------------------------------------------------------------- |
| **FEAT-01** | Implement advanced diagnostic linking.                                                  | High     | Link alarms/events to the diagnostic buffer by timestamp. Highlight related tags in the live view to speed up root cause analysis. |
| **FE-02** | Add state persistence for plotted tags.                                                 | Medium   | The Trend Viewer should remember which tags were being plotted, even after the window is closed and reopened. |
| **FE-03** | Implement a Syslog export to CSV feature.                                               | Medium   | Add a button to the Syslog viewer to dump the current log contents to a `.csv` file. |
| **FE-04** | Prevent boolean tags from being processed or displayed in the Trend Viewer.             | Medium   | The Trend Viewer is for analog/numeric data. The application should filter out boolean tags when plotting. |
| **FE-05** | Investigate polling rate impact on performance.                                         | Low      | Analyze how the polling rate affects UI responsiveness, graph updates, and SQLite database writes. |
| **FE-06** | Research "VCI" integration with the alarm list.                                         | Low      | The term "VCI" needs clarification. This is a research task to determine feasibility and value. |

---

## 🔧 Technical Debt & Maintenance

| ID      | Item Description                                                                     | Priority | Notes                                                                   |
| :------ | :----------------------------------------------------------------------------------- | :------- | :---------------------------------------------------------------------- |
| **TECH-01** | The Playwright snapshot test (`main-dashboard-loaded.png`) is out of date due to UI changes. | Low     | The test fails because the UI was updated (e.g., new action buttons). The snapshot needs to be updated to reflect the current UI. Run `npx playwright test --update-snapshots`. |
| **TECH-02** | The Playwright test for modals is flaky.                                             | Low      | The test `Verify the tag actions and write confirmation modals work correctly` fails because it expects the splash screen to be visible, but a session is already active. The tests need to be isolated to not share state. |
