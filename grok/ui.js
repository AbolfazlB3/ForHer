// ui.js
document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.card');
    const cardContainer = document.querySelector('.card-container');
    const yesButton = document.getElementById('yes-button');
    const noButton = document.getElementById('no-button');
    const modal = document.getElementById('modal');
    const debugCanvas = document.getElementById('debug-canvas');
    const body = document.body;

    let mouseX = 0;
    let mouseY = 0;
    let debugEnabled = false;

    // Pointer tracking
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Yes click handler
    yesButton.addEventListener('click', () => {
        body.classList.add('dimmed');
        card.classList.add('yes-active');
        createHeartParticles(20);
        modal.style.display = 'flex';
    });

    // Create heart particles
    function createHeartParticles(count) {
        for (let i = 0; i < count; i++) {
            const heart = document.createElement('div');
            heart.classList.add('heart-particle');
            heart.style.left = `${Math.random() * window.innerWidth}px`;
            heart.style.bottom = `${Math.random() * 100}px`;
            body.appendChild(heart);
            setTimeout(() => heart.remove(), 3000);
        }
    }

    // Debug toggle
    document.addEventListener('keydown', (e) => {
        if (e.key.toUpperCase() === 'D') {
            debugEnabled = !debugEnabled;
            debugCanvas.style.display = debugEnabled ? 'block' : 'none';
        }
    });

    // Config
    const config = {
        fearRadius: 260,
        hardRadius: 110,
        maxSpeed: 900,
        maxAccel: 3200,
        idleMaxSpeed: 90,
        idleMaxAccel: 260,
        edgePush: 1400,
        damping: 0.88
    };

    // Initialize motion
    initMotion({
        noButton,
        cardContainer,
        getMousePos: () => ({ x: mouseX, y: mouseY }),
        config,
        debug: {
            enabled: () => debugEnabled,
            canvas: debugCanvas,
            ctx: debugCanvas.getContext('2d')
        }
    });
});