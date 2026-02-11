/**
 * UI Wiring and Visual Effects
 */

document.addEventListener('DOMContentLoaded', () => {
    const noBtn = document.getElementById('no-btn');
    const yesBtn = document.getElementById('yes-btn');
    const container = document.body;
    const canvas = document.getElementById('debug-canvas');
    const ctx = canvas.getContext('2d');
    
    const engine = new MotionEngine(noBtn, container);
    let mousePos = { x: -1000, y: -1000 };
    let lastTime = performance.now();

    window.addEventListener('mousemove', (e) => {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
    });

    // Toggle Debug
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'd') {
            Config.debug = !Config.debug;
            canvas.style.display = Config.debug ? 'block' : 'none';
        }
    });

    function animate(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.032); // Cap dt to prevent tunneling
        lastTime = now;

        const { pos, debugInfo } = engine.update(dt, mousePos);

        // Apply visual transform
        // Subtract half width/height to center the button on the physics point
        const x = pos.x - noBtn.offsetWidth / 2;
        const y = pos.y - noBtn.offsetHeight / 2;
        noBtn.style.transform = `translate3d(${x}px, ${y}px, 0)`;

        if (Config.debug) drawDebug(pos, mousePos, debugInfo);

        requestAnimationFrame(animate);
    }

    function drawDebug(pos, mouse, info) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Radii
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Config.fearRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Config.hardRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.stroke();

        // Info text
        ctx.fillStyle = 'white';
        ctx.font = '12px monospace';
        ctx.fillText(`Dist: ${Math.round(info.dist)}`, pos.x + 20, pos.y - 20);
        ctx.fillText(`Speed: ${Math.round(info.speed)}`, pos.x + 20, pos.y - 5);
    }

    // Yes Click Handler
    yesBtn.addEventListener('click', () => {
        const bg = document.getElementById('glow-bg');
        const card = document.getElementById('proposal-card');
        const modal = document.getElementById('modal-overlay');

        bg.style.opacity = '0.3';
        card.style.transform = 'scale(1.05)';
        card.style.transition = 'transform 2s ease';
        
        modal.style.display = 'flex';
        setTimeout(() => { modal.style.opacity = '1'; }, 100);

        spawnHearts();
    });

    function spawnHearts() {
        for (let i = 0; i < 40; i++) {
            const heart = document.createElement('div');
            heart.innerHTML = '✦'; // Using a refined spark/star instead of cartoon hearts
            heart.style.position = 'fixed';
            heart.style.color = Math.random() > 0.5 ? '#d4af37' : '#ff2d75';
            heart.style.left = Math.random() * 100 + 'vw';
            heart.style.top = '110vh';
            heart.style.fontSize = (Math.random() * 20 + 10) + 'px';
            heart.style.opacity = Math.random();
            heart.style.transition = `transform ${Math.random() * 3 + 2}s linear, opacity 2s`;
            document.body.appendChild(heart);

            setTimeout(() => {
                heart.style.transform = `translateY(-120vh) rotate(${Math.random() * 360}deg)`;
                heart.style.opacity = '0';
            }, 100);
        }
    }

    requestAnimationFrame(animate);
});