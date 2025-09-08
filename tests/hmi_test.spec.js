const { test, expect, _electron } = require('@playwright/test');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// Load and parse the YAML file
const testCases = yaml.load(fs.readFileSync(path.join(__dirname, 'test_scenarios.yaml'), 'utf8'));

// Loop through each test case from the YAML file and generate a test for it
for (const testCase of testCases.test_cases) {
  // Use the test case description as the test name
  test(testCase.description, async () => {
    // Launch the Electron application. The path to the main script is relative to the project root.
    const electronApp = await _electron.launch({ args: [path.join(__dirname, '../src/main.js')] });

    try {
      // Get the first window that the app opens, which is our "page"
      const page = await electronApp.firstWindow();
      // Wait for the window to finish loading
      await page.waitForLoadState('networkidle');

      // Loop through each resolution specified in the test case
      for (const resolution of testCase.resolutions) {
        const [width, height] = resolution;
        console.log(`Testing at resolution: ${width}x${height}`);
        await page.setViewportSize({ width, height });

        // Perform the sequence of UI Actions
        for (const action of testCase.actions) {
          console.log(`Performing action: '${action.type}' on selector '${action.selector}'`);
          const element = page.locator(action.selector);

          // Wait for the element to be visible before interacting
          await expect(element).toBeVisible({ timeout: 5000 });

          if (action.type === 'click') {
            await element.click();
          } else if (action.type === 'fill') {
            await element.fill(action.value);
          }

          // Wait for the UI to stabilize after each action
          await page.waitForLoadState('networkidle');
        }

        // Perform Backend Validation if specified
        if (testCase.backend_check) {
          const { endpoint, method, expected_status } = testCase.backend_check;
          console.log(`--- Backend Validation ---`);
          console.log(`Verifying a '${method}' request to '...${endpoint}' resulted in status ${expected_status}.`);

          // Playwright's native test runner has powerful network waiting capabilities.
          // This will wait for a matching response and automatically fail the test on timeout.
          await page.waitForResponse(response =>
            response.url().includes(endpoint) &&
            response.request().method() === method.toUpperCase() &&
            response.status() === expected_status
          );
          console.log(`--- Backend Validation PASSED ---`);
        }

        // A simple visual check to ensure the main body of the app is rendered
        await expect(page.locator("body")).toBeVisible();
        console.log(`Visual check passed for resolution ${width}x${height}.`);
      }
    } finally {
      // Ensure the Electron application is closed after each test
      await electronApp.close();
    }
  });
}
