const { test, expect, _electron } = require('@playwright/test');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const { HmiPage } = require('./pages/hmi.page.js');

// Load and parse the YAML file
const testCases = yaml.load(fs.readFileSync(path.join(__dirname, 'test_scenarios.yaml'), 'utf8'));

// Loop through each test case from the YAML file and generate a test for it
for (const testCase of testCases.test_cases) {
  test(testCase.description, async ({}, testInfo) => {
    // Launch the Electron application
    const electronApp = await _electron.launch({ args: [path.join(__dirname, '../src/main.js')] });

    try {
      const page = await electronApp.firstWindow();
      await page.waitForLoadState('networkidle');
      const hmiPage = new HmiPage(page); // Instantiate the Page Object

      for (const resolution of testCase.resolutions) {
        const [width, height] = resolution;
        console.log(`Testing at resolution: ${width}x${height}`);
        await page.setViewportSize({ width, height });

        // Perform the sequence of UI Actions from the YAML file
        for (const action of testCase.actions) {
          console.log(`---> Performing action: '${action.type}' (${action.description})`);

          // Correctly use the Page Object Model.
          // The selector from YAML (e.g., "dropZone") is used as a key to get the locator from the hmiPage instance.
          const element = action.selector && action.selector !== 'page' ? hmiPage[action.selector] : page;

          if (!element) {
            throw new Error(`Selector '${action.selector}' is not defined in HmiPage page object.`);
          }

          switch (action.type) {
            case 'wait_for_selector':
              await expect(element).toBeVisible({ timeout: 10000 });
              break;
            case 'wait_for_hidden':
              await expect(element).toBeHidden({ timeout: 10000 });
              break;
            case 'click':
              await expect(element).toBeVisible();
              await element.click();
              break;
            case 'fill':
              await expect(element).toBeVisible();
              await element.fill(action.value);
              break;
            case 'screenshot':
              // The element is the 'page' itself, handled by the lookup logic above.
              await expect(element).toHaveScreenshot(`${action.name}.png`, { maxDiffPixels: 100 });
              console.log(`     Screenshot '${action.name}.png' captured and compared.`);
              break;
            case 'evaluate':
              await page.evaluate(action.script);
              break;
            case 'wait':
              await page.waitForTimeout(action.duration);
              break;
            default:
              throw new Error(`Unknown action type: ${action.type}`);
          }
          // Wait for the UI to stabilize after the action
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => console.log('Network idle timeout ignored, continuing test.'));
        }
      }
    } finally {
      // Ensure the Electron application is closed after each test
      await electronApp.close();
    }
  });
}
