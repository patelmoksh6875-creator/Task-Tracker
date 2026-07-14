/**
 * Lightweight, granular application countdown system controller logic
 */
export class TaskTimer {
    constructor(taskId, initialMinutes, onTick, onComplete) {
        this.taskId = taskId;
        this.remainingSeconds = initialMinutes * 60;
        this.onTick = onTick;
        this.onComplete = onComplete;
        this.intervalId = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds--;
                this.onTick(this.formatTime());
            } else {
                this.stop();
                this.onComplete(this.taskId);
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        clearInterval(this.intervalId);
    }

    stop() {
        this.pause();
    }

    formatTime() {
        const mins = Math.floor(this.remainingSeconds / 60);
        const secs = this.remainingSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}