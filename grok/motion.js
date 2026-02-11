// motion.js
function initMotion({ noButton, cardContainer, getMousePos, config, debug }) {
    let posX = 0;
    let posY = 0;
    let velX = 0;
    let velY = 0;
    let lastTime = performance.now();
    let idleTime = 0;
    let seed = Math.random();

    // Set initial position
    const updateButtonStyle = () => {
        noButton.style.transform = `translate(${posX}px, ${posY}px)`;
    };

    // Get bounds
    const getBounds = () => {
        const rect = cardContainer.getBoundingClientRect();
        const btnRect = noButton.getBoundingClientRect();
        return {
            minX: -rect.width / 2 + btnRect.width / 2,
            maxX: rect.width / 2 - btnRect.width / 2,
            minY: -50, // Adjust based on button row position
            maxY: 50
        };
    };

    // Smoothstep function
    const smoothstep = (min, max, value) => {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    };

    // Animation loop
    function animate(time) {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        const mouse = getMousePos();
        const btnRect = noButton.getBoundingClientRect();
        const containerRect = cardContainer.getBoundingClientRect();
        const btnCenterX = containerRect.left + containerRect.width / 2 + posX;
        const btnCenterY = containerRect.top + containerRect.height / 2 + posY; // Adjust for button position

        const dx = mouse.x - btnCenterX;
        const dy = mouse.y - btnCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let accelX = 0;
        let accelY = 0;

        idleTime += dt;

        // Idle motion
        const idleSpeed = config.idleMaxSpeed;
        const idleAccel = config.idleMaxAccel;
        const idleFreq = 0.5 + seed * 0.5;
        accelX += Math.sin(idleTime * idleFreq * 2 * Math.PI) * idleAccel * 0.1;
        accelY += Math.cos(idleTime * idleFreq * 2 * Math.PI) * idleAccel * 0.1;

        // Flee behavior
        if (distance < config.fearRadius) {
            const flee = 1 - smoothstep(config.hardRadius, config.fearRadius, distance);
            const panic = flee * flee;
            const dirX = dx / distance;
            const dirY = dy / distance;
            const fleeAccel = -dirX * config.maxAccel * panic;
            const fleeAccely = -dirY * config.maxAccel * panic;
            accelX += fleeAccel;
            accelY += fleeAccely;
        }

        // Edge push
        const bounds = getBounds();
        if (posX < bounds.minX) accelX += config.edgePush * (bounds.minX - posX) / Math.abs(bounds.minX - posX);
        if (posX > bounds.maxX) accelX += config.edgePush * (posX - bounds.maxX) / Math.abs(posX - bounds.maxX);
        if (posY < bounds.minY) accelY += config.edgePush * (bounds.minY - posY) / Math.abs(bounds.minY - posY);
        if (posY > bounds.maxY) accelY += config.edgePush * (posY - bounds.maxY) / Math.abs(posY - bounds.maxY);

        // Clamp accel
        const accelMag = Math.sqrt(accelX * accelX + accelY * accelY);
        if (accelMag > config.maxAccel) {
            accelX = (accelX / accelMag) * config.maxAccel;
            accelY = (accelY / accelMag) * config.maxAccel;
        }

        // Update velocity
        velX += accelX * dt;
        velY += accelY * dt;

        // Damping
        velX *= config.damping;
        velY *= config.damping;

        // Clamp speed
        const speed = Math.sqrt(velX * velX + velY * velY);
        const maxSpeed = distance < config.fearRadius ? config.maxSpeed : config.idleMaxSpeed;
        if (speed > maxSpeed) {
            velX = (velX / speed) * maxSpeed;
            velY = (velY / speed) * maxSpeed;
        }

        // Update position
        posX += velX * dt;
        posY += velY * dt;

        // Soft bounce at edges
        if (posX < bounds.minX) {
            posX = bounds.minX;
            velX = -velX * 0.5;
        }
        if (posX > bounds.maxX) {
            posX = bounds.maxX;
            velX = -velX * 0.5;
        }
        if (posY < bounds.minY) {
            posY = bounds.minY;
            velY = -velY * 0.5;
        }
        if (posY > bounds.maxY) {
            posY = bounds.maxY;
            velY = -velY * 0.5;
        }

        // Teleport if pinned (optional)
        if (speed < 1 && distance < config.hardRadius / 2) {
            posX = (Math.random() - 0.5) * 200;
            posY = (Math.random() - 0.5) * 100;
        }

        updateButtonStyle();

        // Debug
        if (debug.enabled()) {
            const ctx = debug.ctx;
            const canvas = debug.canvas;
            canvas.width = cardContainer.offsetWidth;
            canvas.height = cardContainer.offsetHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const relMouseX = mouse.x - containerRect.left;
            const relMouseY = mouse.y - containerRect.top;
            const relBtnX = canvas.width / 2 + posX;
            const relBtnY = canvas.height / 2 + posY;

            // Draw pointer
            ctx.beginPath();
            ctx.arc(relMouseX, relMouseY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();

            // Draw button center
            ctx.beginPath();
            ctx.arc(relBtnX, relBtnY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'blue';
            ctx.fill();

            // Fear radius
            ctx.beginPath();
            ctx.arc(relBtnX, relBtnY, config.fearRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = 'yellow';
            ctx.stroke();

            // Hard radius
            ctx.beginPath();
            ctx.arc(relBtnX, relBtnY, config.hardRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = 'orange';
            ctx.stroke();

            // Line for distance
            ctx.beginPath();
            ctx.moveTo(relMouseX, relMouseY);
            ctx.lineTo(relBtnX, relBtnY);
            ctx.strokeStyle = 'white';
            ctx.stroke();

            // Text
            ctx.fillStyle = 'white';
            ctx.font = '12px sans-serif';
            ctx.fillText(`Distance: ${distance.toFixed(0)}`, 10, 20);
            const flee = distance < config.fearRadius ? 1 - smoothstep(config.hardRadius, config.fearRadius, distance) : 0;
            ctx.fillText(`Flee: ${flee.toFixed(2)}`, 10, 40);
            ctx.fillText(`Panic: ${(flee * flee).toFixed(2)}`, 10, 60);
            ctx.fillText(`Speed: ${speed.toFixed(0)} / ${maxSpeed}`, 10, 80);
        }

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}