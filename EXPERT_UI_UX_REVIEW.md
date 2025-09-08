# Expert UI/UX Review: PLC Maintenance Portal

**Date:** September 7, 2025
**Auditor:** Jules, Senior UI/UX Consultant

## 1. Executive Summary

This report provides a detailed UI/UX evaluation of the PLC maintenance portal. The review was conducted based on three key user scenarios and a general heuristic analysis of the existing modern interface.

While the portal has a clean visual design and a solid functional base, this review identifies **critical issues in safety and workflow efficiency** that must be addressed. The most urgent recommendations focus on preventing operator error during high-risk actions (forcing a bit) and streamlining the diagnostic process to reduce equipment downtime. The current implementation of high-consequence interactions does not meet standard industry safety practices for HMI design.

**Key Findings:**
- **Critical Safety Risk:** The "Force Bit" (Write) function lacks an essential confirmation step, creating a significant risk of accidental, high-impact operator error.
- **Inefficient Diagnostics:** The workflow for investigating alarms is disconnected and cumbersome, requiring manual correlation between different views. This significantly increases the cognitive load on technicians and delays root cause analysis.
- **Insufficient Data Visualization:** The trend graphing tool is functionally incomplete, lacking fundamental features like zooming, panning, and configurable time windows, making it unsuitable for serious performance monitoring.

This report provides a prioritized action plan to address these issues, with a focus on high-impact, low-to-medium effort improvements that will dramatically improve operator safety and efficiency.

---

## 2. Scenario-based Analysis

### Scenario 1: Fault Investigation
*A technician gets an alarm notification. Review the user flow from the notification to identifying the root cause in the PLC fault log.*

**Evaluation:** The workflow is **inefficient and imposes a high cognitive load.**

- **Disconnected Workflow:** There is no direct link between the Alarms view and the Diagnostic/Syslog views. A technician must manually open separate windows and attempt to correlate events by timestamp. This is slow, tedious, and highly prone to error, especially under pressure.
- **Missing Alarm Information:** The Alarms table does not display the `info_text` and `producer` fields available from the backend. This `info_text` could contain vital details for a diagnosis.
- **Unstructured Diagnostic Log:** The Diagnostic Buffer is displayed as a plain, unstructured wall of text. It is not searchable or filterable, making it extremely difficult to find relevant information.
- **Limited Log History:** The log viewers are hardcoded to show only the last 50 entries, which is insufficient for root cause analysis, as the causal event may have occurred much earlier.

### Scenario 2: Forcing a Bit
*A technician needs to force a specific input or output to troubleshoot a circuit. Review the interaction design for this "force" function.*

**Evaluation:** The interaction is **unsafe and does not meet industry standards.**

- **CRITICAL - No Confirmation Step:** The "Write to PLC" button immediately executes the write command. There is no final "Are you sure?" confirmation dialog. This is a critical failure in error prevention for a high-consequence action. An accidental click could have serious operational consequences.
- **Inadequate Visual Warnings:** The modal does not use strong visual cues (e.g., red color, warning icons, bold text) to communicate the potential danger of the action. It is styled like any other routine data entry form.
- **No Persistent "Forced" State Indicator:** After a value is forced, the UI provides no persistent indication on the main dashboard that the tag is in a manually-controlled state. This violates a fundamental principle of safe HMI design and can lead to dangerous confusion.

### Scenario 3: Performance Monitoring
*A technician needs to view trend data for a particular analog input over the last 24 hours.*

**Evaluation:** The trend visualization is **functionally incomplete and unsuitable for professional use.**

- **No Interactive Chart Controls:** The graph lacks essential features for data analysis, including **zooming** and **panning**. A technician cannot inspect a specific time range in detail.
- **Inflexible Time Range:** The chart is hardcoded to a 10-minute window. The user cannot select a different time range (e.g., the "last 24 hours" specified in the scenario), making it useless for analyzing long-term trends.
- **No Data Point Inspection:** The user cannot hover over a point on the chart to see its precise value and timestamp.
- **Poor Multi-Scale Handling:** The chart cannot effectively display tags with vastly different value ranges on the same graph, as it lacks support for multiple Y-axes.

---

## 3. General Heuristic Findings

- **Navigation & Consistency:**
    - Actions are scattered inconsistently (e.g., 'Acknowledge All' is on the main page, but 'Acknowledge' is in the viewer).
    - Overuse of modals for simple toggle actions like 'Log' and 'Trend' adds unnecessary clicks.
    - Minor inconsistencies in terminology (e.g., "Tag Name" vs. "Variable") increase cognitive load.
- **Error Prevention:**
    - The "Write" modal lacks client-side input validation to prevent users from entering text for a numeric tag, providing delayed feedback only after the failed write attempt.
- **Interaction Design:**
    - Touch targets for in-table actions (like the write/actions button) are too small for reliable use on a tablet.

---

## 4. Prioritized Recommendations

### Priority: CRITICAL
1.  **Implement Write Confirmation Dialog:**
    - **Impact:** Critical
    - **Effort:** Low
    - **Recommendation:** Before executing a write to the PLC, display a second, simple confirmation modal. It should state clearly what value is being written to what tag (e.g., "Are you sure you want to write `1` to `Motor_A_Start`?").

2.  **Add Visual Warnings to Write Modal:**
    - **Impact:** High
    - **Effort:** Low
    - **Recommendation:** Change the "Write to PLC" button color to a warning color (e.g., red). Add a bold, colored warning message and/or icon at the top of the modal.

3.  **Add Persistent "Forced" State Indicator:**
    - **Impact:** High
    - **Effort:** Medium
    - **Recommendation:** In the main tag tables, any tag that has been manually written to should have a clear, persistent visual indicator (e.g., a yellow background highlight, a "FORCED" text label, or an icon) until the force is removed or the application is restarted.

### Priority: HIGH
4.  **Link Alarms to Diagnostic Logs:**
    - **Impact:** High
    - **Effort:** Medium
    - **Recommendation:** In the Alarms table, make each row clickable. Clicking an alarm should open the Diagnostic Buffer and automatically filter/scroll to the log entries corresponding to the alarm's timestamp.

5.  **Implement Interactive Chart Controls:**
    - **Impact:** High
    - **Effort:** Medium
    - **Recommendation:** Integrate a Chart.js plugin (like `chartjs-plugin-zoom`) to enable zooming and panning on the history graph. Enable tooltips to show precise values on hover.

6.  **Add Time Range Selection to Graph:**
    - **Impact:** High
    - **Effort:** Low
    - **Recommendation:** Add a simple dropdown/button group above the chart to allow users to select the time window (e.g., "Last 10 Mins," "Last Hour," "Last 24 Hours").

### Priority: MEDIUM
7.  **Structure and Enhance Log Viewers:**
    - **Impact:** Medium
    - **Effort:** Medium
    - **Recommendation:** Change the Diagnostic and Syslog viewers from a `<pre>` tag to a proper HTML table. Add controls for basic text search/filtering. Increase the number of loaded entries from 50 to a more reasonable number like 500.

8.  **Add Missing Fields to Alarms Table:**
    - **Impact:** Medium
    - **Effort:** Low
    - **Recommendation:** Add the `info_text` and `producer` fields as columns in the Alarms table.

9.  **Improve Tablet Interaction:**
    - **Impact:** Medium
    - **Effort:** Low
    - **Recommendation:** Increase the padding and size of clickable elements within table rows, especially the icon buttons, to make them easier to press on a touch screen.

### Priority: LOW
10. **Add Client-Side Input Validation:**
    - **Impact:** Low
    - **Effort:** Low
    - **Recommendation:** Add basic JavaScript validation to the "Write" modal input to provide immediate feedback if a user enters non-numeric characters for a numeric tag.

11. **Consolidate and Simplify Tag Actions:**
    - **Impact:** Low
    - **Effort:** Medium
    - **Recommendation:** Redesign the tag action interaction. Instead of a modal for toggling, consider using smaller, stateful icon buttons directly in the table row for "Log" and "Trend" to reduce clicks.
