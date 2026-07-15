/**
 * Browser Notifications and Audio Feedback Orchestrator
 */
export const NotificationManager = {
    async requestPermission() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    },

    async sendNotification(title, options = {}) {
        const hasPermission = await this.requestPermission();
        if (hasPermission) {
            new Notification(title, {
                icon: 'assets/icons/icon-192.png',
                ...options
            });
        }
    },

    playSystemSound(type = 'success') {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
            
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1200, ctx.currentTime);
                gain2.gain.setValueAtTime(0.1, ctx.currentTime);
                osc2.start();
                osc2.stop(ctx.currentTime + 0.3);
            }, 150);
        } else if (type === 'click') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        }
    }
};