# Product Requirements Document: Siemens PLC Dashboard v1.1

**Author:** Jules
**Version:** 1.1
**Date:** September 6, 2025

## 1. Vision & Scope

This document outlines the requirements for version 1.1 of the Siemens PLC Dashboard, an Electron-based desktop application. The application's vision is to serve as a high-fidelity, secure, and user-friendly **maintenance and monitoring window ONLY** into the operations of Siemens S7-series PLCs.

*   **Core Purpose:** To provide a real-time, read-only view into PLC operations for maintenance and monitoring personnel.
*   **Out of Scope:** The application will strictly exclude any direct process control logic (e.g., writing new setpoints, starting/stopping machinery). This is a critical safety constraint to maintain the application's intended scope as a passive monitoring tool.

## 2. User Interface (Locked In)

The current graphical user interface (GUI) is **locked in and requires no modification**.

*   **Theme:** Modern, clean, and professional light theme.
*   **Layout:** A three-panel design composed of:
    *   **Left Panel (280px):** Navigation and System Status.
    *   **Center Panel (Flexible):** Main content, such as the live tag table.
    *   **Right Panel (350px):** Tag lookup and quick actions.

## 3. Prioritized v1.1 Feature Implementation

The following features are the core deliverables for this version, prioritized by importance.

*   **Priority 1: Configuration Persistence**
    The application must automatically save the last used tag configuration to a `session.json` file upon closing. On subsequent launches, if this file exists, the application will load it directly and bypass the splash screen, taking the user immediately to the main dashboard. A "Load New Files" button on the dashboard will allow the user to clear this saved session and return to the splash screen to load a new configuration.

*   **Priority 2: Externalize Credentials**
    Hardcoded PLC credentials must be removed entirely from the `main.js` source code. A `plc-config.json` file will be created in the user's data directory to store the default username and password. The application will read from this file for authentication.

*   **Priority 3: Optimize Data Polling**
    The data polling mechanism in `main.js` must be refactored to use a bulk request. Instead of reading tags one by one in a loop, all tags designated for polling will be grouped into a single JSON-RPC request array and sent to the PLC in one API call per polling cycle to improve performance and reduce network overhead.

*   **Priority 4: Enhance User Feedback**
    *   **Write Feedback:** When a user writes a new value to a tag, the application must provide immediate visual feedback. This includes both a "toast" notification (e.g., "Write Successful") and a brief color flash on the corresponding table cell to confirm the action.
    *   **"Log" & "Plot" Buttons:** Add dedicated "Log" and "Plot" buttons to each tag row in the main dashboard tables to allow for manual, on-demand data logging and graphing initiation.

## 4. Core System Requirements & Final Decisions

*   **PLC Communication:** All communication with the PLC must be performed exclusively over the Siemens Web API (JSON-RPC 2.0 over HTTPS) using `node-fetch`.
*   **File Parsing:** The application must parse `.xml` and `.s7dcl` files exported from TIA Portal to build its tag configuration.
*   **Data Persistence:** Historical tag data will be stored in a local SQLite database (`history.db`). Polled data will be queued and written to this database in batches to optimize I/O performance.
*   **Connection Handling:**
    *   The application must automatically attempt to reconnect to the PLC every 2 seconds if a connection is lost.
    *   When the user opens the connection modal, it should be pre-filled with the IP address from `plc-config.json`, but the user can override this value for the current session.
*   **Viewer Windows:**
    *   Separate windows for Alarms, Diagnostics, Syslog, History Table, and History Graph must be available.
    *   When a viewer window is opened, it must be populated immediately with the most recent data available from the last backend poll.
*   **Data Export:**
    *   All viewer windows must provide a feature to export their current data to a CSV file.
    *   The "Save As" dialog for exports will suggest a simple default filename (e.g., `Alarms_Export.csv`), which the user can then change as needed.
