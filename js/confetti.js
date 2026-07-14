/**
 * Canvas Particle Confetti Simulation Engine
 */
export const ConfettiEngine = {
    canvas: null,
    ctx: null,
    particles: [],
    animationFrameId: null,

    init(canvasSelector) {
        this.canvas = document.querySelector(canvasSelector);
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    },

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    /**
     * origin: optional { x, y } in viewport coordinates — e.g. the exact
     * point the person clicked to confirm completion. Falls back to
     * bottom-center of the screen if omitted.
     */
    burst(origin) {
        const originX = origin?.x ?? window.innerWidth / 2;
        const originY = origin?.y ?? window.innerHeight;

        const colors = ['#0071e3', '#2997ff', '#42a5f5', '#ff453a', '#34c759', '#ff9f0a'];
        for (let i = 0; i < 60; i++) {
            this.particles.push({
                x: originX,
                y: originY,
                radius: Math.random() * 3 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 10,
                vy: -Math.random() * 10 - 6,
                gravity: 0.35,
                opacity: 1,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 8
            });
        }

        if (!this.animationFrameId) {
            this.loop();
        }
    },

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.opacity -= 0.018;
            p.rotation += p.rotationSpeed;

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.globalAlpha = Math.max(p.opacity, 0);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
            this.ctx.restore();

            if (p.opacity <= 0 || p.y > window.innerHeight + 50) {
                this.particles.splice(i, 1);
            }
        }

        if (this.particles.length > 0) {
            this.animationFrameId = requestAnimationFrame(() => this.loop());
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.animationFrameId = null;
        }
    }
};