# SIMATIC S7-1500 Web Server Function Manual Summary for AI Training

This document provides a structured summary of the SIMATIC S7-1500 Web Server's features, configuration, and API, based on the function manual.

---

## 1. Introduction to the S7-1500 Web Server

### 1.1. Purpose
The integrated web server in SIMATIC S7-1500 CPUs allows for monitoring and administration of the CPU over a network. This enables remote diagnostics, evaluation, and modifications without requiring STEP 7 software—only a standard web browser is needed.

### 1.2. Key Features
- **System Web Pages:** Standard, built-in pages for diagnostics and monitoring.
- **User-Defined Web Pages:** Custom pages can be created using the Web API (JSON-RPC).
- **Security:** Access is controlled via HTTPS, user authentication (local or central), and can be enabled/disabled per interface.
- **API Access:** A powerful Application Programming Interface (Web API) allows programmatic access to read/write CPU data, manage files, and more.

### 1.3. Supported CPUs
- SIMATIC S7-1500, ET 200SP, CPU 1513/1516pro (as of firmware V4.0)
- SIMATIC S7-1500 Software Controller (as of firmware V40.0)
- SIMATIC S7-1500 Virtual Controller (as of firmware V2.0)

---

## 2. Setting Up and Calling the Web Server

### 2.1. Activation
The web server is **deactivated by default**. To use it, you must:
1.  Open the CPU properties in TIA Portal.
2.  Navigate to "Web server" > "General".
3.  Check the box "Activate web server on this module".
4.  Download the hardware configuration to the CPU.

### 2.2. Accessing the Web Server
- Connect a device (PC, HMI, mobile) to the same PROFINET network as the CPU.
- Open a web browser (e.g., Chrome, Firefox, Edge).
- Enter the IP address of the CPU's interface in the format: `https://<ip_address>`.
- Example: `https://192.168.0.1`

### 2.3. Security Configuration
- **HTTPS:** Access is enforced over HTTPS (Port 443) by default for security. This requires a valid web server certificate on the CPU.
- **Certificates:** TIA Portal can generate self-signed certificates or manage CA-signed certificates for the web server. Managing certificates at runtime via OPC UA GDS is also possible.
- **Data Access via Web API:** You can restrict data access to *only* be allowed through the modern Web API, disabling older, unencrypted methods.
- **User Management:**
    - **Local User Management:** Users, roles, and function rights are managed within the TIA Portal project. This is the standard for most setups.
    - **Central User Management (UMC):** For larger systems, users can be managed on a central UMC server, optionally linked to Microsoft Active Directory. The CPU authenticates users against this central server.
    - **"Anonymous" User:** A user with no password. Its access rights must be carefully configured to avoid security risks. By default, it has no rights.

---

## 3. System Web Pages

The system web pages are the default, browser-based interface for interacting with the CPU.

### 3.1. Main Pages
- **Overview:** Displays general information about the CPU, such as module name, article number, and operating state.
- **Diagnostics:**
    - **Diagnostics Buffer:** Shows the CPU's diagnostic event log. Entries can be filtered and details can be viewed.
- **User Program:**
    - **Recipes & User Files:** Provides access to create and manage files in the "Recipes" and "UserFiles" folders on the load memory.
- **Alarming & Logging:**
    - **Alarms:** Displays the current alarm buffer. Alarms can be viewed and acknowledged.
    - **Data Logs:** Shows data logs created by the user program. Logs can be downloaded or deleted.
- **Maintenance:**
    - **File Browser:** A tool to browse, upload, download, rename, and delete files and folders on the CPU's SIMATIC load memory.


---

## 4. The Web API (Application Programming Interface)

The Web API is a powerful interface for programmatic access to the CPU using JSON-RPC 2.0 protocol over HTTPS. It allows custom applications, scripts, or dashboards to interact with the CPU.

### 4.1. Key Concepts
- **API Endpoint:** All requests are sent via HTTP POST to the URL: `https://<ip_address>/api/jsonrpc`
- **JSON-RPC:** The API uses the JSON-RPC 2.0 standard. Requests and responses are formatted in JSON.
- **Authentication:**
    1.  Call the `Api.Login` method with a username and password.
    2.  If successful, the CPU returns a session `token`.
    3.  This token must be included in the HTTP header (`X-Auth-Token`) of all subsequent requests.
- **Sessions:** Sessions are time-limited. They expire after 120 seconds of inactivity. To keep a session alive, a method like `Api.Ping` must be called periodically.

### 4.2. Core API Method Categories and Examples

#### Basic Functions
- `Api.Login`: Authenticate a user and get a session token.
- `Api.Logout`: End the current session.
- `Api.Ping`: Check if the CPU is reachable and keep the session alive.
- `Api.GetPermissions`: Get a list of actions the currently logged-in user is authorized to perform.

#### Reading and Writing Process Data
- **`PlcProgram.Read`**: Reads the value of a single tag.
  - **Request Example:**
    ```json
    {
      "jsonrpc": "2.0",
      "method": "PlcProgram.Read",
      "params": { "var": "\"MyDB\".MyVariable" },
      "id": 1
    }
    ```
- **`PlcProgram.Write`**: Writes a value to a single tag.
- **`PlcProgram.Browse`**: Lists available tags, data blocks, and code blocks.

#### Operating Mode Management
- `Plc.ReadOperatingMode`: Returns the current operating mode of the CPU (e.g., "run", "stop").
- `Plc.RequestChangeOperatingMode`: Requests the CPU to change its operating mode.

#### Diagnostics and Service Data
- `Alarms.Browse`: Reads the alarm buffer.
- `Alarms.Acknowledge`: Acknowledges a specific alarm.
- `DiagnosticBuffer.Browse`: Reads the diagnostics buffer entries.
- `Modules.DownloadServiceData`: Downloads service data for a specific module for support analysis.

#### File System Access (SIMATIC Load Memory)
- `Files.Browse`: Lists files and directories in a specific path.
- `Files.Download`: Creates a ticket to download a file.
- `Files.Create`: Creates a ticket to upload a file.
- `Files.Delete`: Deletes a file.
- `Files.CreateDirectory`: Creates a new directory.

#### User-Defined Web Applications
The API provides a full suite of `WebApp` methods to manage custom web applications hosted on the CPU.
- `WebApp.Create` / `WebApp.Delete` / `WebApp.Rename`: Manage web applications.
- `WebApp.Browse`: List all installed web applications.
- `WebApp.CreateResource` / `WebApp.DownloadResource`: Upload and download files (HTML, CSS, JS, images) for a specific web application.

This structured format should provide a solid foundation for training Jules on the capabilities of the S7-1500 web server.