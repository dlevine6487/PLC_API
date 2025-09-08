import pytest
import yaml
import logging
import os
from playwright.sync_api import sync_playwright, Page, expect, Playwright

# --- Test Configuration ---
# Get the absolute path to the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
log_file_path = os.path.join(script_dir, "test_log.log")
failures_dir_path = os.path.join(script_dir, "test-failures")

# Configure logging to file and console
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler(log_file_path),
                        logging.StreamHandler()
                    ])

# Create a directory for failure screenshots if it doesn't exist
if not os.path.exists(failures_dir_path):
    os.makedirs(failures_dir_path)

# --- Backend Validation Placeholder ---

def backend_validation_placeholder(page: Page, backend_check: dict):
    """
    Placeholder for backend validation logic.

    In a real-world scenario, this function would interact with your backend
    to verify that the UI action triggered the correct response. Playwright's
    network interception is used here as a powerful example.

    Args:
        page (Page): The Playwright page object.
        backend_check (dict): A dictionary containing backend check details
                              from the YAML file.
    """
    if not backend_check:
        logging.info("No backend validation required for this action.")
        return

    endpoint = backend_check.get('endpoint')
    method = backend_check.get('method', 'GET').upper()
    expected_status = backend_check.get('expected_status')

    logging.info(f"--- Backend Validation ---")
    logging.info(f"ACTION: Verifying a '{method}' request to '...{endpoint}' resulted in status {expected_status}.")

    # HOW TO IMPLEMENT:
    # This example uses Playwright's built-in network request/response interception.
    # This is the recommended approach for validating API calls triggered by the UI.
    # It avoids the flakiness of external log checks or direct database queries.
    try:
        # Use a lambda to wait for a response that matches the criteria
        with page.expect_response(
            lambda response: endpoint in response.url and response.request.method == method,
            timeout=5000
        ) as response_info:
            response = response_info.value
            logging.info(f"Intercepted response from: {response.url} [Status: {response.status}]")

            # Assert that the response status matches the expected status
            if response.status != expected_status:
                pytest.fail(
                    f"Backend validation failed for endpoint '{endpoint}'. "
                    f"Expected status {expected_status}, but got {response.status}."
                )
            else:
                 logging.info(f"Response status {response.status} matches expected status {expected_status}.")

    except Exception as e:
        # This will catch timeouts if no matching response is received.
        logging.error(f"Failed to intercept a matching network response for endpoint '{endpoint}'.")
        pytest.fail(f"Backend validation failed: {e}")

    logging.info(f"--- End Backend Validation ---")


# --- Test Case Loading ---

def load_test_cases():
    """Loads test cases from the YAML file located in the same directory."""
    try:
        # Get the absolute path to the directory where the script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(script_dir, 'test_scenarios.yaml')
        with open(file_path, 'r') as file:
            data = yaml.safe_load(file)
        return data.get('test_cases', [])
    except FileNotFoundError:
        logging.error(f"Error: The YAML configuration file was not found at '{file_path}'")
        return []
    except yaml.YAMLError as e:
        logging.error(f"Error: Could not parse the YAML file: {e}")
        return []

# --- Pytest Test Suite ---

# Parameterize the test function with all test cases from the YAML file
@pytest.mark.parametrize("test_case", load_test_cases())
def test_hmi_scenario(playwright: Playwright, test_case: dict):
    """
    Runs a single data-driven test scenario on the HMI.
    This test requires a local HMI server to be running.
    """
    if not test_case:
        pytest.skip("Skipping empty or invalid test case.")

    test_id = test_case['id']
    logging.info(f"--- Starting Test Case: {test_id} ---")
    logging.info(f"Description: {test_case['description']}")

    # Use headless=True for CI/CD environments for better performance
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()

    # The base URL of the HMI application.
    # Replace with your actual HMI address.
    base_url = "http://localhost:3000"

    try:
        # Loop through each resolution specified in the test case
        for resolution in test_case['resolutions']:
            width, height = resolution
            logging.info(f"Setting resolution: {width}x{height}")
            page.set_viewport_size({"width": width, "height": height})

            # Navigate to the initial page
            page.goto(base_url)
            page.wait_for_load_state('networkidle')

            # --- Perform UI Actions ---
            for action in test_case['actions']:
                action_type = action['type']
                selector = action['selector']
                logging.info(f"Performing action: '{action_type}' on selector '{selector}'")

                element = page.locator(selector)
                # Wait for the element to be visible before interacting
                expect(element).to_be_visible(timeout=5000)

                if action_type == 'click':
                    element.click()
                elif action_type == 'fill':
                    value = action['value']
                    element.fill(value)

                # Wait for the UI to stabilize after an action
                page.wait_for_load_state('networkidle')

            # --- Perform Backend Validation ---
            backend_validation_placeholder(page, test_case.get('backend_check'))

            # --- Visual Verification ---
            # A simple check to ensure the main body is visible.
            # For more advanced visual regression, tools like Percy or Applitools can be integrated.
            expect(page.locator("body")).to_be_visible()
            logging.info(f"Visual check passed for resolution {width}x{height}.")

        logging.info(f"--- Test Case PASSED: {test_id} ---")

    except Exception as e:
        # On failure, log the error and take a screenshot
        failure_screenshot_path = os.path.join(failures_dir_path, f"{test_id}_resolution_{width}x{height}_failure.png")
        page.screenshot(path=failure_screenshot_path)
        logging.error(f"--- Test Case FAILED: {test_id} ---")
        logging.error(f"Failure during {width}x{height} resolution test.")
        logging.error(f"Error: {e}")
        logging.error(f"Screenshot saved to: {failure_screenshot_path}")
        pytest.fail(f"Test '{test_id}' failed at {width}x{height}. See logs and screenshot.")

    finally:
        # Clean up resources
        context.close()
        browser.close()
