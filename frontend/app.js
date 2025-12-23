/**
 * SayClip - Audio Recording Application
 * Main entry point
 */
import { AudioRecorder } from './js/AudioRecorder.js';
import { setupKeyboardHandlers, setupWindowCleanupHandlers, setupResizeHandler } from './js/eventHandlers.js';

document.addEventListener('DOMContentLoaded', () => {
    // Make audio recorder globally accessible for cleanup on window close
    window.audioRecorderInstance = new AudioRecorder();

    // Setup event handlers
    setupKeyboardHandlers(window.audioRecorderInstance);
    setupWindowCleanupHandlers(window.audioRecorderInstance);
    setupResizeHandler(window.audioRecorderInstance);
});
