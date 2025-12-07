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
        this.drawEmptyBars();
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
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.8;
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
        this.saveToFile(audioBlob).catch((error) => {
            console.error('Failed to save audio file:', error);
            this.statusText.textContent = 'Save failed';
        }).finally(() => {
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
        this.timerInterval = setInterval(() => {
            if (this.recordingStartTime) {
                const elapsed = Date.now() - this.recordingStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                this.recordingTime.textContent =
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    startVisualization() {
        if (!this.isRecording || !this.analyser || !this.dataArray) {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            return;
        }
        this.animationFrame = requestAnimationFrame(() => this.startVisualization());
        this.analyser.getByteFrequencyData(this.dataArray);
        this.drawFrequencyBars();
    }

    drawFrequencyBars() {
        const canvas = this.canvas;
        const ctx = this.canvasContext;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        const barCount = 32;
        const barWidth = rect.width / barCount;
        const groupSize = Math.floor(this.dataArray.length / barCount);
        const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
        gradient.addColorStop(0, '#666');
        gradient.addColorStop(0.5, '#999');
        gradient.addColorStop(1, '#ccc');
        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            const startIndex = i * groupSize;
            const endIndex = Math.min(startIndex + groupSize, this.dataArray.length);
            for (let j = startIndex; j < endIndex; j++) {
                sum += this.dataArray[j];
            }
            const averageValue = sum / (endIndex - startIndex);
            const barHeight = (averageValue / 255) * rect.height * 0.9;
            ctx.fillStyle = gradient;
            ctx.fillRect(
                i * barWidth,
                rect.height - barHeight,
                barWidth - 2,
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
                                    console.log('Audio saved successfully:', result);
                                    this.statusText.textContent = 'Saved';
                                    resolve(result);
                                })
                                .catch((error) => {
                                    console.error('Failed to save audio:', error);
                                    this.statusText.textContent = 'Save failed';
                                    reject(error);
                                });
                        } else {
                            console.log('Audio ready (Python connection not available)');
                            this.statusText.textContent = 'Ready (no Python connection)';
                            resolve(null);
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
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
});
