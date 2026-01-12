/**
 * Utility functions for audio processing and stream management
 */

/**
 * Clean up audio stream to properly release microphone access
 * Handles all edge cases including null checks and error handling
 * @param {MediaStream} audioStream - The audio stream to clean up
 * @returns {void}
 */
export function cleanupAudioStream(audioStream) {
    try {
        if (audioStream) {
            // Stop all tracks to release microphone
            audioStream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (error) {
                    console.warn('Failed to stop track:', error);
                }
            });

            console.log('Audio stream cleaned up successfully');
        }
    } catch (error) {
        console.error('Error during audio stream cleanup:', error);
    }
}

/**
 * Convert audio blob to base64 string
 * @param {Blob} audioBlob - The audio blob to convert
 * @returns {Promise<string>} Base64 encoded audio string
 */
export function blobToBase64(audioBlob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64Audio = reader.result.split(',')[1] || '';
            resolve(base64Audio);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(audioBlob);
    });
}

/**
 * Format elapsed time to MM:SS format
 * @param {number} elapsed - Elapsed time in milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(elapsed) {
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

