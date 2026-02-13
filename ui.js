(() => {
  const arena = document.getElementById("playground");
  const noBtn = document.getElementById("noBtn");
  const yesBtn = document.getElementById("yesBtn");
  const debugCanvas = document.getElementById("debugCanvas");

  const heartsLayer = document.getElementById("hearts");
  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("closeBtn");
  const moreBtn = document.getElementById("moreBtn");
  const rageModal = document.getElementById("rageModal");
  const rageCloseBtn = document.getElementById("rageCloseBtn");

  if (!arena || !noBtn || !yesBtn) {
    console.error("Missing required DOM elements.");
    return;
  }
  if (!window.RunawayButtonEngine) {
    console.error("RunawayButtonEngine not found. Make sure motion.js loads before ui.js.");
    return;
  }

  // Shared state for other modules (e.g. constellation.js)
  const shared = (window.ValentineShared = window.ValentineShared || {});
  shared.pointer = shared.pointer || { x: window.innerWidth / 2, y: window.innerHeight / 2, has: false };
  shared.emitYes = () => window.dispatchEvent(new CustomEvent("valentine:yes"));

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Engine
  const engine = new RunawayButtonEngine({
    arena,
    noBtn,
    yesBtn,
    debug: { canvas: debugCanvas, enabled: false },
  });

  // Pointer tracking (global)
  function updatePointerFromEvent(e) {
    const pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
    if (!pt) return;

    shared.pointer = { x: pt.clientX, y: pt.clientY, has: true };
    engine.setPointerPos(pt.clientX, pt.clientY);
  }

  window.addEventListener("pointermove", updatePointerFromEvent, { passive: true });
  window.addEventListener("mousemove", updatePointerFromEvent, { passive: true });
  window.addEventListener("touchmove", updatePointerFromEvent, { passive: true });
  window.addEventListener("touchstart", updatePointerFromEvent, { passive: true });

  // Rim lighting response
  function updateRimVars() {
    const p = shared.pointer;
    if (!p.has) {
      requestAnimationFrame(updateRimVars);
      return;
    }

    const cardRect = arena.getBoundingClientRect();
    const yesRect = yesBtn.getBoundingClientRect();

    const yesCx = yesRect.left + yesRect.width / 2;
    const yesCy = yesRect.top + yesRect.height / 2;

    const d = Math.hypot(p.x - yesCx, p.y - yesCy);

    // heat: 0 far -> 1 close
    const fear = 420;
    const hard = 140;
    let heat = 1 - smoothstep(hard, fear, d);
    heat = clamp(heat, 0, 1);

    // tilt: 0..1 based on pointer x over card
    const tilt = clamp((p.x - cardRect.left) / Math.max(1, cardRect.width), 0, 1);

    arena.style.setProperty("--rimHeat", heat.toFixed(3));
    arena.style.setProperty("--rimTilt", tilt.toFixed(3));

    requestAnimationFrame(updateRimVars);
  }
  requestAnimationFrame(updateRimVars);

  // ---------------------------
  // "How hard are you trying to click NO?" meter
  // ---------------------------
  let chasePressure = 0;         // fades to 0 over time, grows with chasing + presses
  let lastTick = performance.now();

  let rageShown = false;

  const PRESS_BUMP = 0.60;       // how much each No press adds
  const CHASE_GAIN = 0.80;       // per-second gain when pointer is close
  const DECAY_PER_SEC = 0.98;    // per-second decay toward 0

  const CHASE_RADIUS = 220;      // px radius around the NO button that counts as "chasing"
  const TRIGGER_AT = 3.0;        // threshold to open the modal
  const RAGE_CLOSE_COOLDOWN_MS = 1500; // tweak: 300–700 feels good
  let rageCloseUnlockedAt = 0;

  function openRageModal() {
    if (!rageModal) return;
    rageModal.classList.add("on");
    rageShown = true;
    rageCloseUnlockedAt = performance.now() + RAGE_CLOSE_COOLDOWN_MS;
  }

  function closeRageModal() {
    if (performance.now() < rageCloseUnlockedAt) return;
    rageModal?.classList.remove("on");
    rageShown = false;
    chasePressure = 0;
  }

  rageCloseBtn?.addEventListener("click", closeRageModal);
  rageModal?.addEventListener("click", (e) => { if (e.target === rageModal) closeRageModal(); });

  function updateChasePressure(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;

    // decay
    if (chasePressure > 0.000001) {
      const damp = Math.pow(DECAY_PER_SEC, dt);
      chasePressure *= damp;
      chasePressure = Math.max(0, chasePressure - 0.0001);
    } else {
      chasePressure = 0.0;
    }

    {
      // --- Visual warning on NO button (0..1) as we approach trigger ---
      // Start showing at 0 when far, ramp up as we near TRIGGER_AT.
      const START_AT = 0.05; // or use 0.8 to only begin glowing late
      const t = (chasePressure - START_AT) / Math.max(0.0001, (TRIGGER_AT - START_AT));
      const noHeat = Math.min(1, Math.max(0, t));
      noBtn.style.setProperty("--noHeat", noHeat.toFixed(3));
    }

    // chase contribution (pointer close to NO)
    if (shared.pointer?.has) {
      const nb = noBtn.getBoundingClientRect();
      const cx = nb.left + nb.width / 2;
      const cy = nb.top + nb.height / 2;

      const d = Math.hypot(shared.pointer.x - cx, shared.pointer.y - cy);
      if (d < CHASE_RADIUS) {
        // closer => more gain
        const closeness = 1 - (d / CHASE_RADIUS);   // 0..1
        chasePressure += (closeness * CHASE_GAIN * dt);
      }
    }

    // trigger
    if (!rageShown && chasePressure >= TRIGGER_AT) {
      openRageModal();
    }

    requestAnimationFrame(updateChasePressure);
  }
  requestAnimationFrame(updateChasePressure);

  function onNoPress(e) {
    e.preventDefault();
    updatePointerFromEvent(e);
    chasePressure += PRESS_BUMP;
    engine.nudgeFleeImpulse();
  }

  noBtn.addEventListener("pointerdown", onNoPress, { passive: false });
  // iOS Safari sometimes needs explicit touchstart to feel instant/reliable
  noBtn.addEventListener("touchstart", onNoPress, { passive: false });
  // Optional: also catch "click" to prevent rare edge-cases (e.g., old browsers)
  noBtn.addEventListener("click", (e) => e.preventDefault());

  // Keyboard focus safety
  noBtn.addEventListener("focus", () => engine.teleportSafe());

  // Debug toggle: press D
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "d") return;
    document.documentElement.classList.toggle("debug-on");
    const on = document.documentElement.classList.contains("debug-on");
    engine.setDebugEnabled(on);
    console.log(`[debug] ${on ? "ON" : "OFF"}`);
  });

  // Resize
  window.addEventListener("resize", () => engine.measure());

  // Hearts
  function burstHearts(count = 30) {
    heartsLayer.classList.add("on");
    const w = window.innerWidth;

    for (let i = 0; i < count; i++) {
      const h = document.createElement("div");
      h.className = "heart";

      const left = Math.random() * w;
      const dx = (Math.random() * 2 - 1) * 180 + "px";
      const delay = (Math.random() * 1.2) + "s";
      const dur = (1.45 + Math.random() * 1.15) + "s";
      const size = 10 + Math.random() * 12;

      h.style.left = left + "px";
      h.style.setProperty("--dx", dx);
      h.style.animationDelay = delay;
      h.style.animationDuration = dur;
      h.style.width = size + "px";
      h.style.height = size + "px";

      const variants = [
        "linear-gradient(135deg, rgba(255,107,214,.95), rgba(248,227,176,.95))",
        "linear-gradient(135deg, rgba(248,227,176,.95), rgba(201,150,42,.95))",
        "linear-gradient(135deg, rgba(255,59,119,.95), rgba(248,227,176,.90))",
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
  const openModal = () => modal.classList.add("on");
  const closeModal = () => modal.classList.remove("on");

  closeBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  moreBtn?.addEventListener("click", () => burstHearts(44));

  yesBtn.addEventListener("click", () => {
    burstHearts(38);
    openModal();
    shared.emitYes(); // tells constellation to flash
  });

  // Start engine
  requestAnimationFrame(() => {
    engine.measure();
    engine.start();
  });
})();
