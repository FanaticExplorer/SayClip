class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.canvas = null;
        this.canvasContext = null;
        this.animationFrame = null;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.audioStream = null; // Store audio stream reference for proper cleanup

        // Performance optimizations
        this.frameSkipCounter = 0;
        this.frameSkipRate = 1; // Render every frame by default, can be adjusted for lower-end devices
        this.lastFrameTime = 0;
        this.targetFrameTime = 1000 / 60; // 60fps target
        this.cachedGradient = null;
        this.cachedBarConfig = {
            barCount: 32,
            barWidth: 0,
            groupSize: 0,
            rect: { width: 0, height: 0 }
        };

        this.setupUI();
        this.setupCanvas();
    }

    setupUI() {
        this.recordBtn = document.getElementById('recordBtn');
        this.statusText = document.getElementById('statusText');
        this.recordingTime = document.getElementById('recordingTime');
        this.canvas = document.getElementById('frequencyCanvas');
        this.canvasContext = this.canvas.getContext('2d');
        this.recordBtn.addEventListener('click', () => this.handleToggleRecording());
    }

    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.canvasContext.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Cache bar configuration for performance
        this.updateCachedBarConfig(rect);

        this.drawEmptyBars();
    }

    updateCachedBarConfig(rect) {
        this.cachedBarConfig.rect = rect;
        this.cachedBarConfig.barWidth = rect.width / this.cachedBarConfig.barCount;
        this.cachedBarConfig.groupSize = Math.floor(256 / this.cachedBarConfig.barCount); // Using half of fftSize for better performance

        // Create and cache the gradient
        this.cachedGradient = this.canvasContext.createLinearGradient(0, 0, 0, rect.height);
        this.cachedGradient.addColorStop(0, '#666');
        this.cachedGradient.addColorStop(0.5, '#999');
        this.cachedGradient.addColorStop(1, '#ccc');
    }

    handleToggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording().catch((error) => {
                console.error('Failed to start recording:', error);
                this.statusText.textContent = 'Failed to start recording';
                // Ensure cleanup on error
                this.cleanupAudioStream();
            });
        }
    }

    async startRecording() {
        try {
            // Clean up any existing stream before starting new recording
            this.cleanupAudioStream();

            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            // Store the stream reference for proper cleanup
            this.audioStream = audioStream;

            this.setupAudioAnalysis(audioStream);
            this.setupAudioRecording(audioStream);
            this.updateUIForRecording();
            this.startTimer();
            this.startVisualization();
        } catch (error) {
            console.error('Microphone access failed:', error);
            this.statusText.textContent = 'Error: No microphone access';
            // Ensure cleanup on error
            this.cleanupAudioStream();
        }
    }

    setupAudioAnalysis(audioStream) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContextClass();
        this.analyser = this.audioContext.createAnalyser();
        // Optimized FFT size for better performance while maintaining visual quality
        this.analyser.fftSize = 512; // Keep at 512 for good balance between performance and quality
        this.analyser.smoothingTimeConstant = 0.7; // Slightly reduced for more responsive visualization
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const microphone = this.audioContext.createMediaStreamSource(audioStream);
        microphone.connect(this.analyser);
    }

    setupAudioRecording(audioStream) {
        let mimeType;
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
        } else {
            mimeType = 'audio/webm';
        }
        this.mediaRecorder = new MediaRecorder(audioStream, { mimeType });
        this.recordedChunks = [];
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        this.mediaRecorder.onstop = () => this.processRecording();

        // Add error handling for MediaRecorder
        this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            this.statusText.textContent = 'Recording error';
            // Clean up on MediaRecorder error
            this.cleanupAudioStream();
        };

        this.mediaRecorder.start(100);
        this.isRecording = true;
        this.recordingStartTime = Date.now();
    }

    updateUIForRecording() {
        this.recordBtn.classList.add('recording');
        this.recordBtn.querySelector('.icon').textContent = '⏹';
        this.statusText.textContent = 'Recording...';
        this.recordingTime.textContent = '00:00';
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Clean up microphone stream to release access
        this.cleanupAudioStream();

        this.isRecording = false;
        this.dataArray = null;
        this.recordBtn.classList.remove('recording');
        this.recordBtn.querySelector('.icon').textContent = '●';
        this.statusText.textContent = 'Processing...';
        this.clearCanvasCompletely();
        setTimeout(() => {
            this.drawEmptyBars();
        }, 10);
    }

    processRecording() {
        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.statusText.textContent = 'Transcribing...';
        this.saveToFile(audioBlob)
            .then((result) => {
                if (result && result.success) {
                    this.statusText.textContent = result.copied ? 'Done! (copied)' : 'Done!';
                } else {
                    this.statusText.textContent = 'Failed';
                }
            })
            .catch((error) => {
                console.error('Failed to save audio file:', error);
                this.statusText.textContent = 'Failed';
            })
            .finally(() => {
                // Ensure stream cleanup after processing completes
                this.cleanupAudioStream();
            });
    }

    /**
     * Clean up audio stream to properly release microphone access
     * Handles all edge cases including null checks and error handling
     */
    cleanupAudioStream() {
        try {
            if (this.audioStream) {
                // Stop all tracks to release microphone
                this.audioStream.getTracks().forEach(track => {
                    try {
                        track.stop();
                    } catch (error) {
                        console.warn('Failed to stop track:', error);
                    }
                });

                // Reset stream reference
                this.audioStream = null;
                console.log('Audio stream cleaned up successfully');
            }
        } catch (error) {
            console.error('Error during audio stream cleanup:', error);
            // Always reset the reference even if cleanup failed
            this.audioStream = null;
        }
    }

    startTimer() {
        // Reduced timer frequency for better performance - update every 500ms instead of 1000ms for smoother feel
        this.timerInterval = setInterval(() => {
            if (this.recordingStartTime) {
                const elapsed = Date.now() - this.recordingStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                // Batch DOM updates to avoid multiple reflows
                requestAnimationFrame(() => {
                    this.recordingTime.textContent =
                        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                });
            }
        }, 500); // Reduced from 1000ms to 500ms for smoother timer updates
    }

    startVisualization() {
        if (!this.isRecording || !this.analyser || !this.dataArray) {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            return;
        }

        // Frame rate control for consistent 60fps performance
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        // Skip frames if we're running too fast (helps maintain stable 60fps)
        this.frameSkipCounter++;
        if (deltaTime < this.targetFrameTime && this.frameSkipCounter < this.frameSkipRate) {
            this.animationFrame = requestAnimationFrame(() => this.startVisualization());
            return;
        }

        this.frameSkipCounter = 0;
        this.lastFrameTime = currentTime;

        this.animationFrame = requestAnimationFrame(() => this.startVisualization());
        this.analyser.getByteFrequencyData(this.dataArray);
        this.drawFrequencyBars();
    }

    drawFrequencyBars() {
        const ctx = this.canvasContext;
        const config = this.cachedBarConfig;
        const rect = config.rect;

        // Optimized clear operation - only clear once
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Use cached gradient instead of creating new one each frame
        ctx.fillStyle = this.cachedGradient;

        // Pre-calculate values outside the loop for better performance
        const heightMultiplier = rect.height * 0.9 / 255;
        const barSpacing = 2;

        for (let i = 0; i < config.barCount; i++) {
            // Optimized averaging using cached group size
            let sum = 0;
            const startIndex = i * config.groupSize;
            const endIndex = Math.min(startIndex + config.groupSize, this.dataArray.length);

            for (let j = startIndex; j < endIndex; j++) {
                sum += this.dataArray[j];
            }

            const averageValue = sum / (endIndex - startIndex);
            const barHeight = averageValue * heightMultiplier;

            // Draw bar with cached width calculation
            ctx.fillRect(
                i * config.barWidth,
                rect.height - barHeight,
                config.barWidth - barSpacing,
                barHeight
            );
        }
    }

    clearCanvasCompletely() {
        const ctx = this.canvasContext;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }

    drawEmptyBars() {
        const rect = this.canvas.getBoundingClientRect();
        const ctx = this.canvasContext;
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.clearRect(0, 0, rect.width, rect.height);
        const barCount = 32;
        const barWidth = rect.width / barCount;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < barCount; i++) {
            const x = i * barWidth;
            const baseHeight = 3 + Math.sin(i * 0.3) * 2;
            ctx.fillRect(x, rect.height - baseHeight, barWidth - 2, baseHeight);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('Ready', rect.width / 2, rect.height / 2);
    }

    async saveToFile(audioBlob) {
        try {
            const reader = new FileReader();
            return new Promise((resolve, reject) => {
                reader.onload = () => {
                    try {
                        const base64Audio = reader.result.split(',')[1] || '';
                        if (window.pywebview && window.pywebview.api && window.pywebview.api.process_audio) {
                            window.pywebview.api.process_audio(base64Audio)
                                .then((result) => {
                                    if (result && result.success) {
                                        console.log('Audio saved successfully:', result);
                                        resolve(result);
                                    } else {
                                        const message = result && result.message ? result.message : 'Unknown error';
                                        console.error('Failed to save audio:', message);
                                        reject(new Error(message));
                                    }
                                })
                                .catch((error) => {
                                    console.error('Failed to save audio:', error);
                                    reject(error);
                                });
                        } else {
                            console.log('Audio ready (Python connection not available)');
                            this.statusText.textContent = 'Ready (no Python connection)';
                            resolve({ success: false, message: 'Python connection unavailable' });
                        }
                    } catch (e) {
                        reject(e);
                    }
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(audioBlob);
            });
        } catch (error) {
            console.error('Processing error:', error);
            this.statusText.textContent = 'Processing error';
            throw error;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Make audio recorder globally accessible for cleanup on window close
    window.audioRecorderInstance = new AudioRecorder();

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            // Clean up microphone before closing
            if (window.audioRecorderInstance) {
                window.audioRecorderInstance.cleanupAudioStream();
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
});

// Additional cleanup handlers for pywebview window events
window.addEventListener('beforeunload', () => {
    // Clean up microphone when window is being closed
    if (window.audioRecorderInstance) {
        window.audioRecorderInstance.cleanupAudioStream();
    }
});

window.addEventListener('unload', () => {
    // Final cleanup attempt
    if (window.audioRecorderInstance) {
        window.audioRecorderInstance.cleanupAudioStream();
    }
});

window.addEventListener('resize', () => {
    const canvas = document.getElementById('frequencyCanvas');
    if (canvas && window.audioRecorderInstance) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Update cached configuration when canvas resizes
        window.audioRecorderInstance.updateCachedBarConfig(rect);
        window.audioRecorderInstance.drawEmptyBars();
    }
});
