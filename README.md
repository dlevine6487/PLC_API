# PLC Web API Dashboard

A desktop application for monitoring and interacting with Siemens S7 PLCs (1200/1500) that have their web API enabled. Built with Electron.

## Core Features

-   Load tag definitions from TIA Portal VCI exports (`.xml`, `.s7dcl`).
-   View and write live tag values.
-   Log tag values to a local database.
-   Trend tags in a real-time graph.
-   View PLC diagnostic information.

## Quick Start

1.  **Start the application.**
2.  **Load Configuration:** Drag and drop your exported TIA Portal files (`.xml` or `.s7dcl`) onto the window.
3.  **Connect to PLC:** Click the "Connect" button and enter your PLC's IP address.

---

## Project Documentation

For more detailed information about the project, please see the documents in the `docs/` directory:

-   **[Product Requirements Document (PRD.md)](./docs/PRD.md):** The vision, scope, and prioritized features for the current version.
-   **[Expert UI/UX Review (EXPERT_UI_UX_REVIEW.md)](./docs/EXPERT_UI_UX_REVIEW.md):** A detailed review of the user interface and experience with recommendations.
-   **[Engineering Excellence Report (ENGINEERING_EXCELLENCE_REPORT.md)](./docs/ENGINEERING_EXCELLENCE_REPORT.md):** The project's engineering standards, CI/CD strategy, and best practices.
-   **[Test Plan (TEST_PLAN.md)](./docs/TEST_PLAN.md):** The strategy for automated testing.
-   **[Manual Testing Guide (MANUAL_TESTING_GUIDE.md)](./docs/MANUAL_TESTING_GUIDE.md):** A step-by-step guide for manually testing the application's features.

The original, more detailed README content, including instructions for setting up a secure HTTPS connection, has been moved to the **[Manual Testing Guide](./docs/MANUAL_TESTING_GUIDE.md)** for now to keep this main entry point clean.
