/**
 * Global event handlers for keyboard shortcuts and window events
 */

/**
 * Setup keyboard event handlers
 * @param {AudioRecorder} audioRecorder - The audio recorder instance
 */
export function setupKeyboardHandlers(audioRecorder) {
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            // Clean up microphone before closing
            if (audioRecorder) {
                audioRecorder.cleanup();
            }

            if (window.pywebview && window.pywebview.api && window.pywebview.api.close_window) {
                window.pywebview.api.close_window()
                    .then(() => {
                        console.log('Window close requested');
                    })
                    .catch((error) => {
                        console.error('Failed to close window:', error);
                    });
            } else {
                console.log('Window close requested (Python connection not available)');
            }
        }
    });
}

/**
 * Setup window cleanup handlers
 * @param {AudioRecorder} audioRecorder - The audio recorder instance
 */
export function setupWindowCleanupHandlers(audioRecorder) {
    window.addEventListener('beforeunload', () => {
        // Clean up microphone when window is being closed
        if (audioRecorder) {
            audioRecorder.cleanup();
        }
    });

    window.addEventListener('unload', () => {
        // Final cleanup attempt
        if (audioRecorder) {
            audioRecorder.cleanup();
        }
    });
}

/**
 * Setup window resize handler
 * @param {AudioRecorder} audioRecorder - The audio recorder instance
 */
export function setupResizeHandler(audioRecorder) {
    window.addEventListener('resize', () => {
        const canvas = document.getElementById('frequencyCanvas');
        if (canvas && audioRecorder) {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            const ctx = canvas.getContext('2d');
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            // Update cached configuration when canvas resizes
            audioRecorder.updateCachedBarConfig(rect);
            audioRecorder.drawEmptyBars();
        }
    });
}

