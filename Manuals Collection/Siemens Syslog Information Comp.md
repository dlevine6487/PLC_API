# Siemens Syslog Information Compilation

This document combines information from two Siemens product documents regarding Syslog messages for SIMATIC controllers and other network components.

---

## Part 1: Syslog Messages for SIMATIC S7-1500, ET 200MP, ET 200SP, and others

This section is derived from the "Product Information about Syslog Messages" document (A5E53245873-AB, 11/2024).

### Introduction

This product information supplements the main documentation for various Siemens SIMATIC products, including S7-1500/ET 200MP, S7-1500R/H, SIMATIC Drive Controller, S7-1500 Software Controller, ET 200SP, and ET 200pro.

#### Cybersecurity Information
Siemens emphasizes the importance of a holistic, state-of-the-art industrial cybersecurity concept. Siemens' products are one element of such a concept, and customers are responsible for preventing unauthorized access to their systems. It is recommended to connect systems to a network only when necessary and with appropriate security measures like firewalls. Siemens strongly advises applying product updates as soon as they are available and using the latest product versions to mitigate cyber threats.

---

### 1. Event Details

#### 1.1. SE_LOCAL_SUCCESSFUL_LOGON
- **ID:** 1
- **Description:** Valid credentials provided by local logon.
- **Comment:** Successful login of an on-site user, e.g., via PLC Display.
- **Severity:** Informational

#### 1.2. SE_LOCAL_UNSUCCESSFUL_LOGON
- **ID:** 2
- **Description:** Wrong username or password provided by local logon.
- **Comment:** Unsuccessful login of an on-site user.
- **Severity:** Error

#### 1.3. SE_NETWORK_SUCCESSFUL_LOGON
- **ID:** 3
- **Description:** Valid credentials provided by remote logon.
- **Comment:** Indicates a successful login of a remote user.
- **Severity:** Informational

#### 1.4. SE_NETWORK_UNSUCCESSFUL_LOGON
- **ID:** 4
- **Description:** Wrong username or password provided by remote logon.
- **Comment:** Indicates a failed login attempt by a remote user.
- **Severity:** Error

#### 1.5. SE_LOGOFF
- **ID:** 5
- **Description:** User session ended - logout.
- **Severity:** Informational

#### 1.6. SE_DEFAULT_USER_AUTHENTICATION_USED
- **ID:** 6
- **Description:** User logged in with default username and password.
- **Comment:** E.g., the 'Anonymous' user.
- **Severity:** Informational

#### 1.7. SE_ACCESS_PWD_ENABLED
- **ID:** 11
- **Description:** Password protection was enabled for a resource.
- **Severity:** Notice

#### 1.8. SE_ACCESS_PWD_DISABLED
- **ID:** 12
- **Description:** Password protection was disabled for a resource.
- **Severity:** Notice

#### 1.9. SE_ACCESS_PWD_CHANGED
- **ID:** 13
- **Description:** A user changed their password.
- **Severity:** Notice

#### 1.10. SE_ACCESS_GRANTED
- **ID:** 19
- **Description:** Restricted access was granted to a user to perform a service.
- **Severity:** Informational

#### 1.11. SE_ACCESS_DENIED
- **ID:** 20
- **Description:** Restricted access was denied to a user due to a lack of rights.
- **Severity:** Error

#### 1.12. SE_ACCESS_DENIED_NUMBER_OF_CONCURRENT_SESSIONS_EXCEEDED
- **ID:** 51
- **Description:** Login attempt failed because the maximum number of concurrent sessions was exceeded.
- **Severity:** Warning

#### 1.13. SE_CRITICAL_DEVICE_STARTED
- **ID:** 52
- **Description:** Initial start-up of a critical device (e.g., Webserver or OPC UA-Server).
- **Severity:** Notice

#### 1.14. SE_CRITICAL_DEVICE_STOPPED
- **ID:** 53
- **Description:** Shut down of a critical device.
- **Severity:** Alert

#### 1.15. SE_AUDIT_EVENTS_OVERWRITTEN
- **ID:** 56
- **Description:** The ring buffer is full, and the Audit Trail starts to overwrite old events that were not transferred to a syslog server.
- **Severity:** Alert

#### 1.16. SE_OPEN_RESOURCE
- **ID:** 61
- **Description:** A handle of an object was opened (e.g., a file or folder for read/write access).
- **Severity:** Informational

#### 1.17. SE_CLOSE_RESOURCE
- **ID:** 62
- **Description:** A handle of an object was closed.
- **Severity:** Informational

#### 1.18. SE_DELETE_OBJECT
- **ID:** 63
- **Description:** An object was deleted or the memory card was formatted.
- **Severity:** Informational

#### 1.19. SE_OBJECT_OPERATION
- **ID:** 64
- **Description:** An operation was executed on an object.
- **Severity:** Informational

#### 1.20. SE_SESSION_CLOSED
- **ID:** 75
- **Description:** A session was closed.
- **Severity:** Informational

#### 1.21. SE_INVALID_SESSION_ID
- **ID:** 76
- **Description:** An invalid session ID was detected.
- **Severity:** Error

#### 1.22. SE_BACKUP_STARTED
- **ID:** 79
- **Description:** Creation of a backup file has started.
- **Severity:** Notice

#### 1.23. SE_BACKUP_SUCCESSFULLY_DONE
- **ID:** 80
- **Description:** Creation of a backup file finished successfully.
- **Severity:** Notice

#### 1.24. SE_BACKUP_FAILED
- **ID:** 81
- **Description:** Creation of a backup file failed.
- **Severity:** Error

#### 1.25. SE_BACKUP_RESTORE_STARTED
- **ID:** 85
- **Description:** Restore of a backup file has started.
- **Severity:** Notice

#### 1.26. SE_BACKUP_RESTORE_FAILED
- **ID:** 86
- **Description:** Restore of a backup file failed.
- **Severity:** Error

#### 1.27. SE_BACKUP_RESTORE_SUCCESSFULLY_DONE
- **ID:** 87
- **Description:** Restore of a backup file finished successfully.
- **Severity:** Notice

#### 1.28. SE_SECURITY_CONFIGURATION_CHANGED
- **ID:** 94
- **Description:** A security-relevant configuration change was performed (e.g., certificate management or user configuration).
- **Severity:** Notice

#### 1.29. SE_SESSION_ESTABLISHED
- **ID:** 95
- **Description:** A session was created after a successful login from a client.
- **Severity:** Informational

#### 1.30. SE_CFG_DATA_CHANGED
- **ID:** 96
- **Description:** Significant configuration changed (e.g., a new project configuration was loaded).
- **Severity:** Notice

#### 1.31. SE_USER_PROGRAM_CHANGED
- **ID:** 97
- **Description:** A program executed by the device was modified.
- **Severity:** Notice

#### 1.32. SE_OPMOD_CHANGED
- **ID:** 98
- **Description:** The operating mode of the PLC was changed.
- **Severity:** Notice

#### 1.33. SE_FIRMWARE_LOADED
- **ID:** 99
- **Description:** Firmware was successfully downloaded to the PLC.
- **Severity:** Notice

#### 1.34. SE_FIRMWARE_ACTIVATED
- **ID:** 100
- **Description:** Firmware was successfully activated after download.
- **Severity:** Notice

#### 1.35. SE_SYSTEMTIME_CHANGED
- **ID:** 101
- **Description:** The system time of the PLC was changed.
- **Severity:** Notice

#### 1.36. SE_OPMOD_CHANGE_INITIATED
- **ID:** 102
- **Description:** A client initiated a change of the operating state of the device.
- **Severity:** Notice

#### 1.37. SE_RESET_TO_FACTORY
- **ID:** 103
- **Description:** The device was set back to factory settings, deleting all retentive data.
- **Severity:** Notice

#### 1.38. SE_MEMORY_RESET
- **ID:** 104
- **Description:** A client initiated a reset of user-relevant memory areas.
- **Severity:** Notice

#### 1.39. SE_SECURITY_STATE_CHANGE
- **ID:** 105
- **Description:** The device or a subcomponent changed an important security state (e.g., running in provisioning mode).
- **Severity:** Notice

#### 1.40. SE_DEVICE_STARTUP
- **ID:** 106
- **Description:** Indicates the startup of the device itself (e.g., booting up after power-on).
- **Severity:** Notice

#### 1.41. SE_TIME_SYNCHRONIZATION
- **ID:** 201
- **Description:** Internal system time is affected by a change or issue of time synchronization.
- **Severity:** Notice

#### 1.42. SE_DEVICE_CONNECTED
- **ID:** 301
- **Description:** A USB device or SD card was connected.
- **Severity:** Informational

#### 1.43. SE_DEVICE_DISCONNECTED
- **ID:** 304
- **Description:** A USB device or SD card was disconnected.
- **Severity:** Informational

#### 1.44. SE_SESSION_TERMINATED
- **ID:** 307
- **Description:** A local or remote session was terminated due to timeout, network issues, or missing operator acknowledgement.
- **Severity:** Notice

---

### 2. Parameter Details
- **checksum:** Overall signature for user program.
- **dateAndTime:** Date and time.
- **devProduct:** Device Product Name.
- **devVendor:** Device Vendor Name.
- **DNSserver:** DNS server addresses.
- **domainName:** Domain name.
- **errReason:** Error reason.
- **fct:** Function.
- **functionRight:** The requested function right.
- **FWVersion:** Firmware Version.
- **hostName:** Host name.
- **interface:** Interface name.
- **IPv4Suite:** IP v4 Suite.
- **MACaddress:** MAC address.
- **newState:** New state or version.
- **NTPserver:** NTP server addresses.
- **oldState:** Old state or version.
- **PNDeviceName:** PROFINET device name.
- **protocolType:** Protocol Type.
- **resOper:** Resource Operation.
- **resource:** Object or file name.
- **result:** Result.
- **sessionID:** Session ID.
- **userMgmt:** Type of the user authentication.
- **userName:** Name of the user.
- **withMeasurements:** With Measurements.

---

### 3. APP-NAME Field Content
- **Backup/Restore:** Software component for Online Backup and Restore.
- **Cert-Store:** Software component for certificate management.
- **Display:** Display of the PLC.
- **FW-Update:** Software component for managing firmware updates.
- **HW-Configuration:** Software component for managing hardware configuration.
- **OPCUA-Server:** Software component OPC UA.
- **Operating-Mode-Mgt:** Software component for managing operating mode changes.
- **PG/HMIComm:** Software component for managing communication to Engineering systems and HMI devices.
- **PLC-Program:** Software component for user program execution.
- **UMAC:** User management and access control.
- **Webserver:** Software component web server.

---

### 4. Severity Levels
- **Alert (1):** System conditions requiring immediate attention.
- **Critical (2):** Failure in a primary system, such as serious hardware or software malfunctioning.
- **Error (3):** Correctable errors, continuation of operation is possible.
- **Warning (4):** Not an error, but an indication that an error will occur if action is not taken.
- **Notice (5):** Unusual events that are not error conditions, such as a change of an authorized security setting.
- **Informational (6):** Normal operational messages based on a valid security policy.

---
---

## Part 2: Syslog Security Events for SCALANCE & RUGGEDCOM

This section is derived from the "Syslog Security Events" document (109805218, V1.0, 12/2021) for SCALANCE and RUGGEDCOM network components.

### 1. Introduction

This document provides a categorized list of syslog security messages from Siemens network components, specifically SCALANCE and RUGGEDCOM modules.

#### Severity Levels for SCALANCE
The firmware supports three main severity levels: **Critical, Warning, and Info**. Other severities are automatically reassigned:
- **Emergency** is assigned to **Critical**.
- **Error** is assigned to **Warning**.
- **Notice** is assigned to **Info**.

---

### 2. Event Categories

#### 2.1. Human User Identification and Authentication

- **Local successful logon:** Valid logon information was specified during a local logon.
  - *Example (SCALANCE):* `Console: User admin logged in.`
  - *Severity:* Info
- **Default user authentication used:** A user logged in with the default username and password.
  - *Example (SCALANCE):* `Console: Default user admin logged in.`
  - *Severity:* Info
- **Local unsuccessful logon:** Incorrect username or password was specified.
  - *Example (SCALANCE):* `Console: User admin failed to log in.`
  - *Severity:* Error
- **Logout:** A user session ended.
  - *Example (SCALANCE):* `Console: User admin logged out.`
  - *Severity:* Info
- **Network successful login:** Valid login information was specified during a remote login.
  - *Example (SCALANCE):* `WBM/UDP/TCP/Telnet/SSH/Console / PNIO/PB/OPC: User admin has logged in from 192.168.0.1.`
  - *Severity:* Info
- **Network unsuccessful login:** Incorrect username or password was specified during a remote login.
  - *Example (SCALANCE):* `WBM/UDP/TCP/Telnet/SSH/Console / PNIO/PB/OPC: User admin failed to log in from 192.168.0.1.`
  - *Severity:* Error or Warning
- **Network logout:** A remote user session ended.
  - *Example (SCALANCE):* `WBM/UDP/TCP/Telnet / SSH / Console / PNIO / PB / OPC: User admin logged out from 192.168.0.1.`
  - *Severity:* Info

#### 2.2. Account Management

- **Password enabled/disabled:** Password protection was enabled or disabled for a resource.
- **Password changed:** A user has changed their own password or an admin changed another user's password.
  - *Example (SCALANCE):* `WBM: User admin changed own password.`
  - *Severity:* Notice
- **Account created:** An administrator created a user account.
  - *Example (SCALANCE):* `WBM: User admin created user-account service.`
  - *Severity:* Notice
- **Account disabled:** An administrator deleted an existing account.
  - *Example (SCALANCE):* `WBM: User admin deleted user-account service.`
  - *Severity:* Notice

#### 2.3. Access Enforcement and Management

- **Access granted/denied:** Restricted access was granted or denied for a user.
- **User group created/deleted:** An administrator created or deleted a user group.
- **Unsuccessful login attempts:** A user account was locked for a specific period after too many failed login attempts.
  - *Example (SCALANCE):* `User service account is locked for 44 minutes after 10 unsuccessful login attempts.`
  - *Severity:* Warning

#### 2.4. Access via Untrusted Networks (VPN)

- **Connection established/closed (IPsec/OpenVPN):** A VPN connection was successfully established or closed.
- **Authentication failed (IPsec):** Authentication of a VPN connection failed.
  - *Severity:* Error

#### 2.5. Session Management

- **Session lock:** The current session was locked due to a configurable period of inactivity.
  - *Example (SCALANCE):* `The session of user admin was closed after 60 seconds of inactivity.`
  - *Severity:* Warning
- **Remote session termination:** A remote session was ended after a period of inactivity.
- **Limiting simultaneous sessions:** The maximum number of concurrent login sessions was exceeded.
  - *Severity:* Warning
- **Invalid session ID:** An invalid session ID was detected during verification.
  - *Severity:* Error

#### 2.6. Data Backup and Recovery

- **Backup successfully done / failed:** A configuration backup (ConfigPack) was successfully saved or failed to save.
- **Restore successfully done (Firmware/Config):** A firmware or configuration file was successfully loaded. A restart is typically required.
- **Restore failed:** A firmware upload failed.
- **Patch deployment succeeded / failed (RUGGEDCOM):** A software patch was successfully deployed or failed.

#### 2.7. Integrity and Audit

- **Protection of audit information:** The Audit Trail buffer was cleared by an administrator.
  - *Severity:* Emergency
- **Nonrepudiation:** The device configuration was changed permanently.
- **Communication integrity error:** An integrity check failed for transmitted data (e.g., HMAC authentication failed for OpenVPN).
  - *Severity:* Critical or Error