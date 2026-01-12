/**
 * UI Manager for handling DOM elements and UI updates
 */
export class UIManager {
    constructor() {
        this.recordBtn = null;
        this.statusText = null;
        this.recordingTime = null;
    }

    /**
     * Initialize UI elements
     */
    setupUI() {
        this.recordBtn = document.getElementById('recordBtn');
        this.statusText = document.getElementById('statusText');
        this.recordingTime = document.getElementById('recordingTime');
    }

    /**
     * Update UI for recording state
     */
    updateUIForRecording() {
        this.recordBtn.classList.add('recording');
        this.recordBtn.querySelector('.icon').textContent = '⏹';
        this.statusText.textContent = 'Recording...';
        this.recordingTime.textContent = '00:00';
    }

    /**
     * Update UI for stopped state
     */
    updateUIForStopped() {
        this.recordBtn.classList.remove('recording');
        this.recordBtn.querySelector('.icon').textContent = '●';
        this.statusText.textContent = 'Processing...';
    }

    /**
     * Set status text
     * @param {string} text - Status text to display
     */
    setStatus(text) {
        this.statusText.textContent = text;
    }

    /**
     * Set recording time display
     * @param {string} time - Formatted time string
     */
    setRecordingTime(time) {
        this.recordingTime.textContent = time;
    }

    /**
     * Get the record button element
     * @returns {HTMLElement} The record button
     */
    getRecordBtn() {
        return this.recordBtn;
    }
}

