/**
 * Pure Motion Engine logic
 * Handles physics calculations and state updates
 */

const Config = {
    fearRadius: 260,
    hardRadius: 110,
    maxSpeed: 900,
    maxAccel: 3200,
    idleMaxSpeed: 40,
    idleMaxAccel: 120,
    edgePush: 1400,
    damping: 0.88,
    debug: false
};

class MotionEngine {
    constructor(element, container) {
        this.el = element;
        this.container = container;
        
        const rect = element.getBoundingClientRect();
        this.pos = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
        this.vel = { x: 0, y: 0 };
        this.accel = { x: 0, y: 0 };
        this.target = { x: this.pos.x, y: this.pos.y };
        
        this.time = 0;
        this.seed = Math.random() * 1000;
    }

    update(dt, mousePos) {
        this.accel = { x: 0, y: 0 };

        // 1. Idle Drift (Perlin-like sine motion)
        this.time += dt;
        const idleX = Math.sin(this.time * 0.5 + this.seed) * Config.idleMaxAccel;
        const idleY = Math.cos(this.time * 0.7 + this.seed) * Config.idleMaxAccel;
        this.accel.x += idleX;
        this.accel.y += idleY;

        // 2. Flee Logic
        const dx = this.pos.x - mousePos.x;
        const dy = this.pos.y - mousePos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < Config.fearRadius) {
            // Smoothstep-based flee mapping
            const fleeFactor = 1 - Math.min(1, Math.max(0, (dist - Config.hardRadius) / (Config.fearRadius - Config.hardRadius)));
            const panic = Math.pow(fleeFactor, 2);
            
            const forceX = (dx / dist) * panic * Config.maxAccel;
            const forceY = (dy / dist) * panic * Config.maxAccel;
            
            this.accel.x += forceX;
            this.accel.y += forceY;
        }

        // 3. Edge Constraints
        const pad = 80;
        if (this.pos.x < pad) this.accel.x += Config.edgePush;
        if (this.pos.x > window.innerWidth - pad) this.accel.x -= Config.edgePush;
        if (this.pos.y < pad) this.accel.y += Config.edgePush;
        if (this.pos.y > window.innerHeight - pad) this.accel.y -= Config.edgePush;

        // 4. Integration
        this.vel.x += this.accel.x * dt;
        this.vel.y += this.accel.y * dt;
        
        // Damping
        this.vel.x *= Config.damping;
        this.vel.y *= Config.damping;

        // Speed Cap
        const speed = Math.sqrt(this.vel.x**2 + this.vel.y**2);
        const currentMax = dist < Config.fearRadius ? Config.maxSpeed : Config.idleMaxSpeed;
        if (speed > currentMax) {
            this.vel.x = (this.vel.x / speed) * currentMax;
            this.vel.y = (this.vel.y / speed) * currentMax;
        }

        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;

        return {
            pos: this.pos,
            debugInfo: { dist, panic: Math.pow(1 - (dist/Config.fearRadius), 2), speed }
        };
    }
}