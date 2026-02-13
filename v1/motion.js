(function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const len = (x, y) => Math.hypot(x, y) || 1;

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  class RunawayButtonEngine {
    constructor(opts) {
      this.arena = opts.arena; // NOW: the outer card (#playground)
      this.noBtn = opts.noBtn;
      this.yesBtn = opts.yesBtn || null;

      this.prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Whole-window pointer tracking (no "inside" concept)
      this.pointer = { x: 0, y: 0, has: false };

      // Debug
      this.debug = {
        enabled: !!(opts.debug && opts.debug.enabled),
        canvas: opts.debug ? opts.debug.canvas : null,
        ctx: null,
        dpr: 1,
      };

      this.state = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        w: 0,
        h: 0,
        aw: 0,
        ah: 0,
        t0: performance.now(),
        seeded: Math.random() * 1000,

        // base (idle) center near YES
        baseX: 0,
        baseY: 0,

        // Tune
        fearRadius: 260, // start reacting from farther away (whole card feels nicer)
        hardRadius: 110, // panic zone
        maxSpeed: 1500,
        maxAccel: 5000,
        idleMaxSpeed: 90,
        idleMaxAccel: 260,
        edgePush: 1500,
        damping: 0.006,

        _init: false,
      };

      this._raf = null;
    }

    setDebugEnabled(v) {
      this.debug.enabled = !!v;
      if (this.debug.enabled && this.debug.canvas && !this.debug.ctx) {
        this.debug.ctx = this.debug.canvas.getContext("2d");
      }
    }

    setPointerPos(x, y) {
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.has = true;
    }

    nudgeFleeImpulse() {
      const s = this.state;
      const pad = 16;
      const maxX = Math.max(1, s.aw - s.w - pad * 4);
      const maxY = Math.max(1, s.ah - s.h - pad * 4);
      const tx = pad * 2 + Math.random() * maxX;
      const ty = pad * 2 + Math.random() * maxY;
      const strength = 1500;

      let dx = tx - s.x;
      let dy = ty - s.y;

      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;

      // Add impulse toward the target
      s.vx += dx * strength;
      s.vy += dy * strength;
    }

    teleportSafe() {
      const s = this.state;
      const pad = 16;
      const maxX = Math.max(1, s.aw - s.w - pad * 2);
      const maxY = Math.max(1, s.ah - s.h - pad * 2);
      s.x = pad + Math.random() * maxX;
      s.y = pad + Math.random() * maxY;
      s.vx = 0;
      s.vy = 0;
      this.commit(true);
      this.yesBtn?.focus({ preventScroll: true });
    }

    start() {
      this.measure();
      this._raf = requestAnimationFrame(this._tick);
    }

    stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    measure() {
      const a = this.arena.getBoundingClientRect();
      const b = this.noBtn.getBoundingClientRect();
      const s = this.state;

      s.aw = a.width;
      s.ah = a.height;
      s.w = b.width;
      s.h = b.height;

      // Base position anchored near YES button (if available)
      if (this.yesBtn) {
        const y = this.yesBtn.getBoundingClientRect();
        const yesCxLocal = y.left + y.width / 2 - a.left;
        const yesCyLocal = y.top + y.height / 2 - a.top;

        // Put NO slightly to the right of YES as a starting “home”
        s.baseX = clamp(yesCxLocal + 140, 0, a.width - s.w);
        s.baseY = clamp(yesCyLocal - s.h / 2, 0, a.height - s.h);
      } else {
        s.baseX = clamp(a.width * 0.62, 0, a.width - s.w);
        s.baseY = clamp(a.height * 0.55, 0, a.height - s.h);
      }

      if (!s._init) {
        s.x = s.baseX;
        s.y = s.baseY;
        s.vx = 0;
        s.vy = 0;
        s._init = true;
      } else {
        s.x = clamp(s.x, 0, s.aw - s.w);
        s.y = clamp(s.y, 0, s.ah - s.h);
      }

      this.commit(false);

      // Debug canvas sizing
      if (this.debug.canvas) {
        const dpr = window.devicePixelRatio || 1;
        this.debug.dpr = dpr;
        this.debug.canvas.width = Math.max(1, Math.floor(a.width * dpr));
        this.debug.canvas.height = Math.max(1, Math.floor(a.height * dpr));
        if (!this.debug.ctx) this.debug.ctx = this.debug.canvas.getContext("2d");
      }
    }

    commit(animate) {
      this.noBtn.style.transition = animate ? "left 110ms ease, top 110ms ease" : "none";
      this.noBtn.style.left = `${this.state.x}px`;
      this.noBtn.style.top = `${this.state.y}px`;
    }

    _drawDebug({ a, bx, by, lx, ly, d, flee, panic, cap, speed }) {
      if (!this.debug.enabled || !this.debug.ctx || !this.debug.canvas) return;
      const ctx = this.debug.ctx;
      const dpr = this.debug.dpr || 1;

      // clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.debug.canvas.width, this.debug.canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // radii
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.arc(bx, by, this.state.fearRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.arc(bx, by, this.state.hardRadius, 0, Math.PI * 2);
      ctx.stroke();

      // line
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // points
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // text
      ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const lines = [
        `distance: ${Number.isFinite(d) ? d.toFixed(1) : "—"} px`,
        `flee: ${flee.toFixed(3)}  panic: ${panic.toFixed(3)}`,
        `speed: ${speed.toFixed(1)} / cap ${cap.toFixed(1)} px/s`,
      ];
      let ty = 14;
      for (const line of lines) {
        ctx.fillText(line, 10, ty);
        ty += 16;
      }
    }

    _tick = now => {
      const s = this.state;
      const dt = clamp((now - s.t0) / 1000, 0, 0.033);
      s.t0 = now;

      if (!s._init) this.measure();

      if (this.prefersReduced) {
        this.commit(false);
        this._raf = requestAnimationFrame(this._tick);
        return;
      }

      const a = this.arena.getBoundingClientRect();

      // Button center (arena-local)
      const bx = s.x + s.w / 2;
      const by = s.y + s.h / 2;

      // Pointer (arena-local) from whole-window pointer coords
      const lx = this.pointer.x - a.left;
      const ly = this.pointer.y - a.top;

      // Distance ALWAYS computed; no inside gating
      let flee = 0;
      let awayX = 0,
        awayY = 0;
      let d = Infinity;

      if (this.pointer.has) {
        const dx = bx - lx;
        const dy = by - ly;
        d = len(dx, dy);

        // ✅ Correct: close -> flee=1, far -> 0
        flee = 1 - smoothstep(s.hardRadius, s.fearRadius, d);
        flee = clamp(flee, 0, 1);

        awayX = dx / d;
        awayY = dy / d;
      }

      const panic = flee * flee;

      // Alive drift target
      const t = now * 0.001;
      const seed = s.seeded;

      const idleAmpX = 26,
        idleAmpY = 16;
      const idleTx = s.baseX + Math.sin(t * 0.9 + seed) * idleAmpX + Math.sin(t * 1.7 + seed * 1.9) * (idleAmpX * 0.35);

      const idleTy =
        s.baseY + Math.cos(t * 1.05 + seed * 1.3) * idleAmpY + Math.sin(t * 2.2 + seed * 0.7) * (idleAmpY * 0.25);

      // Idle spring-ish accel
      const toIdleX = idleTx - s.x;
      const toIdleY = idleTy - s.y;

      let axIdle = toIdleX * 10 - s.vx * 6;
      let ayIdle = toIdleY * 10 - s.vy * 6;

      const idleAcc = len(axIdle, ayIdle);
      if (idleAcc > s.idleMaxAccel) {
        axIdle = (axIdle / idleAcc) * s.idleMaxAccel;
        ayIdle = (ayIdle / idleAcc) * s.idleMaxAccel;
      }

      // Runaway accel (scaled by panic)
      let axRun = 0,
        ayRun = 0;
      if (panic > 0) {
        const runStrength = s.maxAccel * panic;

        // small lateral twist
        const lateral = Math.sin(t * 4.2 + seed) * 0.35 + Math.cos(t * 3.1 + seed * 0.6) * 0.2;
        const lx2 = -awayY,
          ly2 = awayX;

        axRun = awayX * runStrength + lx2 * runStrength * 0.14 * lateral;
        ayRun = awayY * runStrength + ly2 * runStrength * 0.14 * lateral;
      }

      // Edge push so it roams the whole card without getting pinned
      let axEdge = 0,
        ayEdge = 0;
      const pad = 14;
      const leftDist = s.x - pad;
      const rightDist = s.aw - s.w - pad - s.x;
      const topDist = s.y - pad;
      const bottomDist = s.ah - s.h - pad - s.y;

      const edgeRamp = dist => (dist >= 36 ? 0 : 1 - dist / 36);
      axEdge += edgeRamp(leftDist) * s.edgePush;
      axEdge -= edgeRamp(rightDist) * s.edgePush;
      ayEdge += edgeRamp(topDist) * s.edgePush;
      ayEdge -= edgeRamp(bottomDist) * s.edgePush;

      // Blend: runaway dominates as panic rises
      const ax = axIdle * (1 - panic) + axRun + axEdge;
      const ay = ayIdle * (1 - panic) + ayRun + ayEdge;

      // Integrate velocity
      s.vx += ax * dt;
      s.vy += ay * dt;

      // Speed cap (smooth with panic)
      const speed = len(s.vx, s.vy);
      const cap = s.idleMaxSpeed * (1 - panic) + s.maxSpeed * panic;
      if (speed > cap) {
        s.vx = (s.vx / speed) * cap;
        s.vy = (s.vy / speed) * cap;
      }

      // Damping
      const damp = Math.pow(s.damping, dt);
      // const damp = Math.pow(s.damping, dt * 60);
      s.vx *= damp;
      s.vy *= damp;

      // Integrate position
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // Clamp + soft bounce
      const minX = 0,
        minY = 0;
      const maxX = s.aw - s.w;
      const maxY = s.ah - s.h;

      if (s.x < minX) {
        s.x = minX;
        s.vx = Math.abs(s.vx) * 0.55;
      }
      if (s.x > maxX) {
        s.x = maxX;
        s.vx = -Math.abs(s.vx) * 0.55;
      }
      if (s.y < minY) {
        s.y = minY;
        s.vy = Math.abs(s.vy) * 0.55;
      }
      if (s.y > maxY) {
        s.y = maxY;
        s.vy = -Math.abs(s.vy) * 0.55;
      }

      // Commit
      this.noBtn.style.transition = "none";
      this.noBtn.style.left = `${s.x}px`;
      this.noBtn.style.top = `${s.y}px`;

      // Debug
      this._drawDebug({ a, bx, by, lx, ly, d, flee, panic, cap, speed: len(s.vx, s.vy) });

      this._raf = requestAnimationFrame(this._tick);
    };
  }

  window.RunawayButtonEngine = RunawayButtonEngine;
})();
