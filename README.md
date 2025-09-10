# PLC Web API Dashboard

A desktop application for monitoring and interacting with Siemens S7 PLCs (1200/1500) that have the web API enabled. Built with Electron.
<img width="1917" height="1073" alt="overview" src="https://github.com/user-attachments/assets/1018c03f-3f80-4454-b4fc-e682d369f7a6" />

## Features

-   Load tag definitions directly from TIA Portal Version Control Interface exports (`.xml`, `.s7dcl`).
-   View live tag values from the PLC.
-   Write values to PLC tags.
-   Log tag values to a local historical database.
-   Trend tags in a real-time graph.
-   View PLC diagnostic information.

## Usage

1.  **Export Data from TIA Portal:**
    -   In the TIA Portal, right-click on a PLC Tag Table or a Global DB in the project tree.
    -   Select "Export to Version Control Interface (VCI)".
    -   Save the `.xml` file.
    -   Alternatively, you can use `.s7dcl` files.

2.  **Load Data into the Application:**
    -   Start the application.
    -   Drag and drop the exported `.xml` or `.s7dcl` files onto the application window, or use the "Load Files" button.

3.  **Connect to the PLC:**
    -   Click the "Connect" button in the top-right corner.
    -   Enter the IP address of your PLC and confirm.

## Configuration

### Secure Connection to PLC (HTTPS)

For a secure connection to your PLC, you must provide the PLC's TLS certificate to the application.

1.  **Export the Certificate from your PLC:**
    -   Using your web browser, navigate to the web interface of your PLC (e.g., `https://192.168.0.1`).
    -   Your browser will likely show a security warning. Proceed to the site.
    -   Click on the padlock icon in the address bar and view the certificate details.
    -   Export the certificate as a Base64-encoded ASCII file. The format should be `.pem` or `.cer`.

2.  **Install the Certificate for the Application:**
    -   Rename the exported certificate file to `plc-cert.pem`.
    -   Find the application's user data directory. You can find this path in the `session.json` file in the application's root directory.
        -   Windows: `C:\\Users\\<YourUser>\\AppData\\Roaming\\plc-web-api-dashboard`
        -   macOS: `~/Library/Application Support/plc-web-api-dashboard`
        -   Linux: `~/.config/plc-web-api-dashboard`
    -   Place the `plc-cert.pem` file inside this directory.

3.  **Restart and Verify:**
    -   Restart the application.
    -   When you connect, the application will load the certificate and establish a secure, encrypted connection. Check the application logs for a confirmation message.

If the `plc-cert.pem` file is not found, the application will log a security warning and fall back to an **insecure** connection mode where certificate validation is disabled. This is not recommended for production environments.
