# Product Requirements Document: Siemens PLC Dashboard v1.1

**Author:** Gemini
**Version:** 1.1
**Date:** September 6, 2025

## 1. Vision & Scope

This document outlines the requirements for version 1.1 of the Siemens PLC Dashboard, an Electron-based desktop application. The application's vision is to serve as a high-fidelity, secure, and user-friendly **maintenance and monitoring window** into Siemens S7-series PLC operations.

### 1.1. Core Purpose
To provide a real-time maintenance and monitoring window into PLC operations.

### 1.2. Out of Scope
The application will **strictly exclude any direct process control logic** (e.g., tank filling controls) to ensure operational safety and maintain its intended scope.

## 2. User Interface (Locked In)

The current graphical user interface (GUI) is **locked in and requires no modification**.

*   **Theme:** Modern, clean, and professional light theme.
*   **Layout:** A three-panel design composed of:
    *   **Left Panel (280px):** Navigation and System Status.
    *   **Center Panel (Flexible):** Main content, such as the live tag table.
    *   **Right Panel (350px):** Tag lookup and quick actions.

## 3. Prioritized v1.1 Feature Implementation

The following features are the core deliverables for this version, prioritized by importance.

### 3.1. Priority 1: Configuration Persistence

The application must automatically save the last used tag configuration to a `session.json` file located in the user's data directory. On subsequent launches, if this file exists, the application will load it and bypass the splash screen, taking the user directly to the dashboard. A "Load New Files" button on the dashboard will allow the user to clear this saved session and return to the splash screen to load a new configuration.

### 3.2. Priority 2: Externalize Credentials

Hardcoded PLC credentials must be removed from the `main.js` source code. A `plc-config.json` file will be created in the user's data directory to store the default username and password. The application will read from this file for authentication.

### 3.3. Priority 3: Optimize Data Polling

The data polling mechanism in `main.js` must be refactored to use a bulk request. Instead of reading tags one by one, all tags will be grouped into a single JSON-RPC request array and sent to the PLC in one API call per polling cycle to improve performance.

### 3.4. Priority 4: Enhance User Feedback & Interaction

*   **Write Feedback:** When a user writes a new value to a tag, the application must provide immediate visual feedback. This includes both a "toast" notification (e.g., "Write Successful") and a brief color flash on the corresponding table cell.
    *   **Status:** ✅ **Implemented.** (Verified existing implementation)
*   **"Log" & "Plot" Buttons:** Add dedicated "Log" and "Plot" buttons to each tag in the main dashboard tables to allow for manual data logging and graphing.
    *   **Status:** ✅ **Implemented.**
*   **Double-Click to Write:** Users can double-click on a tag's value in the main table to open the write modification window directly.
    *   **Status:** ✅ **Implemented.**

## 4. Core System Requirements

### 4.1. PLC Communication
All communication with the PLC must be performed exclusively over the **Siemens Web API (JSON-RPC 2.0 over HTTPS)** using `node-fetch`.

### 4.2. File Parsing
The application must parse `.xml` and `.s7dcl` files from TIA Portal to build its tag configuration.

### 4.3. Data Persistence
Historical tag data will be stored in a local SQLite database (`history.db`). Polled data will be queued and written to this database in batches to optimize performance.

### 4.4. Connection Handling
*   The application must automatically attempt to reconnect to the PLC every 2 seconds if a connection is lost.
    *   **Status:** ✅ **Implemented.**
*   When the user opens the connection modal, it should be pre-filled with the IP address from `plc-config.json`, but the user can override this value for the current session.
    *   **Status:** ✅ **Implemented.** (Verified existing implementation)

### 4.5. Viewer Windows
*   Separate windows for Alarms, Diagnostics, Syslog, History Table, and History Graph must be available.
*   When a viewer window is opened, it must be populated immediately with the most recent data available from the last backend poll.

### 4.6. Data Export
*   All viewer windows must provide a feature to export their current data.
*   The "Save As" dialog for exports will suggest a simple default filename (e.g., `Alarms_Export.csv`), which the user can then change as needed.

### 4.7. UI/UX Reliability
*   **Stale Data Indicator:** When the PLC connection is lost, tag values in the UI must visually indicate that they are stale (e.g., by changing color and style) to prevent misinterpretation by the user.
    *   **Status:** ✅ **Implemented.**
