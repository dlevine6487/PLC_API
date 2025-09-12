class HmiPage {
    constructor(page) {
        this.page = page;

        // Splash Screen
        this.dropZone = page.locator('#drop-zone');
        this.browseFilesButton = page.locator('#splash-load-files-btn');

        // App Container
        this.appContainer = page.locator('#app-container');
        this.leftPanel = page.locator('.left-panel');
        this.centerPanel = page.locator('.center-panel');
        this.rightPanel = page.locator('.right-panel');

        // Connection
        this.connectButton = page.locator('#connect-btn');
        this.connectModal = page.locator('#connect-modal');
        this.connectModalIpInput = page.locator('#connect-modal-ip-input');
        this.connectModalConfirmButton = page.locator('#connect-modal-confirm-btn');

        // Tag Actions
        // Scope the button selector to the main table to avoid ambiguity with the lookup table
        this.testIntActionButton = page.locator('#all-tags-table button[data-tag-name=\'"TestDB"."TestInt"\']');
        this.tagActionsModal = page.locator('#tag-actions-modal');
        this.actionsModalInput = page.locator('#actions-modal-input');
        this.actionsModalConfirmWriteBtn = page.locator('#actions-modal-confirm-write-btn');
        this.actionsModalCloseBtn = page.locator('#actions-modal-close-btn');

        // Write Confirmation Modal
        this.writeConfirmModal = page.locator('#write-confirm-modal');
        this.writeConfirmCancelBtn = page.locator('#write-confirm-cancel-btn');
    }

    /**
     * A utility function to connect to the PLC, encapsulating multiple steps.
     * @param {string} ipAddress - The IP address to connect to.
     */
    async connect(ipAddress) {
        await this.connectButton.click();
        await this.connectModal.waitFor();
        await this.connectModalIpInput.fill(ipAddress);
        await this.connectModalConfirmButton.click();
    }
}

module.exports = { HmiPage };
