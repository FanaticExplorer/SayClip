/**
 * Visualization class for audio frequency bars
 */
export class Visualization {
    constructor(canvas) {
        this.canvas = canvas;
        this.canvasContext = canvas.getContext('2d');
        this.animationFrame = null;
        this.frameSkipCounter = 0;
        this.frameSkipRate = 1; // Render every frame by default
        this.lastFrameTime = 0;
        this.targetFrameTime = 1000 / 60; // 60fps target
        this.cachedGradient = null;
        this.cachedBarConfig = {
            barCount: 32,
            barWidth: 0,
            groupSize: 0,
            rect: { width: 0, height: 0 }
        };
    }

    /**
     * Setup canvas with proper scaling for device pixel ratio
     */
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.canvasContext.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Cache bar configuration for performance
        this.updateCachedBarConfig(rect);

        this.drawEmptyBars();
    }

    /**
     * Update cached bar configuration for performance optimization
     * @param {DOMRect} rect - Canvas bounding rectangle
     */
    updateCachedBarConfig(rect) {
        this.cachedBarConfig.rect = rect;
        this.cachedBarConfig.barWidth = rect.width / this.cachedBarConfig.barCount;
        this.cachedBarConfig.groupSize = Math.floor(256 / this.cachedBarConfig.barCount);

        // Create and cache the gradient
        this.cachedGradient = this.canvasContext.createLinearGradient(0, 0, 0, rect.height);
        this.cachedGradient.addColorStop(0, '#666');
        this.cachedGradient.addColorStop(0.5, '#999');
        this.cachedGradient.addColorStop(1, '#ccc');
    }

    /**
     * Start the visualization animation loop
     * @param {AnalyserNode} analyser - Web Audio API analyser node
     * @param {Uint8Array} dataArray - Array to store frequency data
     * @param {boolean} isRecording - Whether recording is active
     */
    startVisualization(analyser, dataArray, isRecording) {
        if (!isRecording || !analyser || !dataArray) {
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            return;
        }

        // Frame rate control for consistent 60fps performance
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        // Skip frames if we're running too fast
        this.frameSkipCounter++;
        if (deltaTime < this.targetFrameTime && this.frameSkipCounter < this.frameSkipRate) {
            this.animationFrame = requestAnimationFrame(() =>
                this.startVisualization(analyser, dataArray, isRecording)
            );
            return;
        }

        this.frameSkipCounter = 0;
        this.lastFrameTime = currentTime;

        this.animationFrame = requestAnimationFrame(() =>
            this.startVisualization(analyser, dataArray, isRecording)
        );

        analyser.getByteFrequencyData(dataArray);
        this.drawFrequencyBars(dataArray);
    }

    /**
     * Draw frequency bars visualization
     * @param {Uint8Array} dataArray - Array containing frequency data
     */
    drawFrequencyBars(dataArray) {
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
        const centerY = rect.height / 2;
        const borderRadius = 3;

        for (let i = 0; i < config.barCount; i++) {
            // Optimized averaging using cached group size
            let sum = 0;
            const startIndex = i * config.groupSize;
            const endIndex = Math.min(startIndex + config.groupSize, dataArray.length);

            for (let j = startIndex; j < endIndex; j++) {
                sum += dataArray[j];
            }

            const averageValue = sum / (endIndex - startIndex);
            const barHeight = averageValue * heightMultiplier;
            const halfBarHeight = barHeight / 2;

            // Draw bar from center with rounded corners
            const x = i * config.barWidth;
            const width = config.barWidth - barSpacing;
            const y = centerY - halfBarHeight;

            // Draw rounded rectangle
            ctx.beginPath();
            ctx.roundRect(x, y, width, barHeight, borderRadius);
            ctx.fill();
        }
    }

    /**
     * Clear the canvas completely
     */
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

    /**
     * Draw empty bars in idle state
     */
    drawEmptyBars() {
        const rect = this.canvas.getBoundingClientRect();
        const ctx = this.canvasContext;
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.clearRect(0, 0, rect.width, rect.height);
        const barCount = 32;
        const barWidth = rect.width / barCount;
        const centerY = rect.height / 2;
        const borderRadius = 3;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < barCount; i++) {
            const x = i * barWidth;
            const baseHeight = 3 + Math.sin(i * 0.3) * 2;
            const halfHeight = baseHeight / 2;
            const y = centerY - halfHeight;

            ctx.beginPath();
            ctx.roundRect(x, y, barWidth - 2, baseHeight, borderRadius);
            ctx.fill();
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('Ready', rect.width / 2, rect.height / 2);
    }

    /**
     * Stop the visualization animation
     */
    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}

