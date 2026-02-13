export function createMotionEngine(config) {
  const state = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    seed: Math.random() * 1000
  };

  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function update(dt, pointer, bounds) {
    const dx = state.x - pointer.x;
    const dy = state.y - pointer.y;
    const dist = Math.hypot(dx, dy);

    let flee = 0;
    if (dist < config.fearRadius) {
      flee = 1 - smoothstep(config.hardRadius, config.fearRadius, dist);
    }

    const panic = flee * flee;

    const maxSpeed = config.maxSpeed * panic + config.idleMaxSpeed * (1 - panic);
    const maxAccel = config.maxAccel * panic + config.idleMaxAccel * (1 - panic);

    let ax = 0;
    let ay = 0;

    if (panic > 0.001) {
      const inv = 1 / (dist || 1);
      ax += dx * inv * maxAccel;
      ay += dy * inv * maxAccel;
    } else {
      // idle sine drift
      const t = performance.now() / 1000 + state.seed;
      ax += Math.sin(t * 0.8) * config.idleMaxAccel;
      ay += Math.cos(t * 0.6) * config.idleMaxAccel;
    }

    // edge push
    if (state.x < bounds.minX) ax += config.edgePush;
    if (state.x > bounds.maxX) ax -= config.edgePush;
    if (state.y < bounds.minY) ay += config.edgePush;
    if (state.y > bounds.maxY) ay -= config.edgePush;

    // clamp accel
    const accelMag = Math.hypot(ax, ay);
    if (accelMag > maxAccel) {
      ax *= maxAccel / accelMag;
      ay *= maxAccel / accelMag;
    }

    state.vx += ax * dt;
    state.vy += ay * dt;

    state.vx *= config.damping;
    state.vy *= config.damping;

    const speed = Math.hypot(state.vx, state.vy);
    if (speed > maxSpeed) {
      state.vx *= maxSpeed / speed;
      state.vy *= maxSpeed / speed;
    }

    state.x += state.vx * dt;
    state.y += state.vy * dt;

    return { ...state, panic, flee, dist };
  }

  function setPosition(x, y) {
    state.x = x;
    state.y = y;
  }

  return { update, setPosition };
}
