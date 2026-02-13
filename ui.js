/* ui.js
   Fix: pointer tracked globally; engine computes inside per-frame.
   Debug: press D to toggle overlay.
*/
(() => {
  const arena = document.getElementById("playground"); // ✅ whole card
  const noBtn = document.getElementById("noBtn");
  const yesBtn = document.getElementById("yesBtn");
  const debugCanvas = document.getElementById("debugCanvas");

  const heartsLayer = document.getElementById("hearts");
  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("closeBtn");
  const moreBtn = document.getElementById("moreBtn");

  let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, has: false };

  function updatePointerFromEvent(e) {
    const pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
    if (!pt) return;
    lastPointer = { x: pt.clientX, y: pt.clientY, has: true };

    // keep your existing engine.setPointerPos(...) call too
    engine.setPointerPos(pt.clientX, pt.clientY);
  }

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function updateRimVars() {
    if (!lastPointer.has) {
      requestAnimationFrame(updateRimVars);
      return;
    }

    const cardRect = arena.getBoundingClientRect(); // arena = #playground (card)
    const yesRect = yesBtn.getBoundingClientRect();

    const px = lastPointer.x, py = lastPointer.y;
    const yesCx = yesRect.left + yesRect.width / 2;
    const yesCy = yesRect.top + yesRect.height / 2;

    const dx = px - yesCx;
    const dy = py - yesCy;
    const d = Math.hypot(dx, dy);

    // heat: 0 far -> 1 close
    const fear = 420;     // start warming from this distance
    const hard = 140;     // strongest warmth inside this distance
    let heat = 1 - smoothstep(hard, fear, d);
    heat = clamp(heat, 0, 1);

    // tilt: based on pointer X position over card (0..1)
    const tilt = clamp((px - cardRect.left) / Math.max(1, cardRect.width), 0, 1);

    // apply to card via CSS custom props
    arena.style.setProperty('--rimHeat', heat.toFixed(3));
    arena.style.setProperty('--rimTilt', tilt.toFixed(3));

    requestAnimationFrame(updateRimVars);
  }

  requestAnimationFrame(updateRimVars);

  (function initConstellation() {
    const canvas = document.getElementById('constellation');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const nodes = [];
    const NODE_COUNT = 200;
    const LINK_DIST = 150;
    const DPR = () => (window.devicePixelRatio || 1);

    let w = 0, h = 0, dpr = 1;
    let flash = 0; // boosts lines after YES

    function resize() {
      dpr = DPR();
      w = canvas.width = Math.floor(window.innerWidth * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes.length = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: 0.8 + Math.random() * 1.4,
          phase: Math.random() * 100,
          tw: 0.18 + Math.random() * 0.22,  // twinkle rate
        });
      }
    }

    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    function smoothstep(edge0, edge1, x) {
      const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function tick(t) {
      const time = t * 0.03;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // proximity factor to YES (lines appear mostly when near YES)
      const yR = yesBtn.getBoundingClientRect();
      const yesCx = yR.left + yR.width / 2;
      const yesCy = yR.top + yR.height / 2;

      const px = lastPointer.x, py = lastPointer.y;
      const dYes = Math.hypot(px - yesCx, py - yesCy);

      // 0 far -> 1 close
      const linkIntent = clamp(1 - smoothstep(180, 520, dYes), 0, 1);
      const lineAlphaBase = 0.04 + linkIntent * 0.12 + flash * 0.22; // subtle unless close or flash

      // draw links (thin, gold-white)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > LINK_DIST) continue;

          // Link strength by distance
          const k = 1 - dist / LINK_DIST;
          const alpha = lineAlphaBase * k;

          // rare “constellation moment”: only show some lines when not near yes
          if (linkIntent < 0.12 && Math.random() > 0.015) continue;

          ctx.beginPath();
          ctx.strokeStyle = `rgba(248,227,176,${alpha.toFixed(4)})`;
          ctx.lineWidth = 1;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // draw nodes (soft twinkle)
      for (const n of nodes) {
        const tw = 0.5 + 0.5 * Math.sin(time * n.tw + n.phase);
        const alpha = 0.10 + tw * 0.18 + linkIntent * 0.10 + flash * 0.18;

        ctx.beginPath();
        ctx.fillStyle = `rgba(248,227,176,${alpha.toFixed(4)})`;
        ctx.arc(n.x, n.y, n.r + tw * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // flash decay (after yes click)
      flash *= 0.94;

      requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(tick);

    // Hook: boost constellation on Yes click
    yesBtn.addEventListener('click', () => { flash = 1; });
  })();


  if (!arena || !noBtn || !yesBtn) {
    console.error("Missing required DOM elements.");
    return;
  }
  if (!window.RunawayButtonEngine) {
    console.error("RunawayButtonEngine not found. Make sure motion.js loads before ui.js.");
    return;
  }

  // Hearts effect
  function burstHearts(count = 30) {
    heartsLayer.classList.add("on");
    const w = window.innerWidth;
    for (let i = 0; i < count; i++) {
      const h = document.createElement("div");
      h.className = "heart";

      const left = Math.random() * w;
      const dx = (Math.random() * 2 - 1) * 180 + "px";
      const delay = Math.random() * 0.25 + "s";
      const dur = 1.45 + Math.random() * 1.15 + "s";
      const size = 10 + Math.random() * 12;

      h.style.left = left + "px";
      h.style.setProperty("--dx", dx);
      h.style.animationDelay = delay;
      h.style.animationDuration = dur;
      h.style.width = size + "px";
      h.style.height = size + "px";

      const variants = [
        "linear-gradient(135deg, rgba(255,79,216,.95), rgba(247,216,138,.95))",
        "linear-gradient(135deg, rgba(247,216,138,.95), rgba(207,162,74,.95))",
        "linear-gradient(135deg, rgba(255,59,119,.95), rgba(247,216,138,.90))",
      ];
      h.style.background = variants[(Math.random() * variants.length) | 0];

      heartsLayer.appendChild(h);
      h.addEventListener("animationend", () => h.remove());
    }
    setTimeout(() => {
      if (!heartsLayer.querySelector(".heart")) heartsLayer.classList.remove("on");
    }, 2200);
  }

  // Modal
  function openModal() {
    modal.classList.add("on");
  }
  function closeModal() {
    modal.classList.remove("on");
  }
  closeBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });
  moreBtn?.addEventListener("click", () => burstHearts(44));

  yesBtn.addEventListener("click", () => {
    burstHearts(38);
    openModal();
  });

  // Engine

  const engine = new RunawayButtonEngine({
    arena,
    noBtn,
    yesBtn,
    debug: { canvas: debugCanvas, enabled: false },
  });

  function updatePointerFromEvent(e) {
    const pt = e.touches && e.touches[0] ? e.touches[0] : e;
    if (!pt) return;
    engine.setPointerPos(pt.clientX, pt.clientY);
  }

  window.addEventListener("pointermove", updatePointerFromEvent, { passive: true });
  window.addEventListener("mousemove", updatePointerFromEvent, { passive: true });
  window.addEventListener("touchmove", updatePointerFromEvent, { passive: true });
  window.addEventListener("touchstart", updatePointerFromEvent, { passive: true });

  noBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    updatePointerFromEvent(e);
    engine.nudgeFleeImpulse();
  });

  noBtn.addEventListener("focus", () => engine.teleportSafe());

  window.addEventListener("keydown", e => {
    if (e.key.toLowerCase() !== "d") return;
    document.documentElement.classList.toggle("debug-on");
    const on = document.documentElement.classList.contains("debug-on");
    engine.setDebugEnabled(on);
    console.log(`[debug] ${on ? "ON" : "OFF"}`);
  });

  window.addEventListener("resize", () => engine.measure());

  requestAnimationFrame(() => {
    engine.measure();
    engine.start();
  });
})();
