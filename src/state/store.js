class Store {
    constructor(initialState) {
        this.state = initialState || {};
        this.listeners = new Set();
    }

    /**
     * Returns the current state object.
     * @returns {object} The current state.
     */
    getState() {
        return this.state;
    }

    /**
     * Updates the state by merging the new state with the old state.
     * Notifies all listeners and sends the updated state to the renderer process.
     * @param {object} newState - An object to merge with the current state.
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.listeners.forEach(listener => listener(this.state));

        // Send the updated state to the renderer process
        const { mainWindow } = this.state;
        if (mainWindow && !mainWindow.isDestroyed()) {
            // Create a serializable copy of the state
            const stateForRenderer = { ...this.state };
            delete stateForRenderer.db; // remove non-serializable properties
            delete stateForRenderer.mainWindow;
            delete stateForRenderer.pollTimer;

            mainWindow.webContents.send('state-update', stateForRenderer);
        }
    }

    /**
     * Registers a listener function to be called on state updates.
     * @param {function} listener - The callback function.
     * @returns {function} A function to unsubscribe the listener.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        // Return an unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }
}

// Export a single instance to act as a singleton store
const store = new Store();

module.exports = store;
