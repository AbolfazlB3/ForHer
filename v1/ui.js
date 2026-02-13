(() => {
  const arena = document.getElementById("playground");
  const noBtn = document.getElementById("noBtn");
  const yesBtn = document.getElementById("yesBtn");
  const debugCanvas = document.getElementById("debugCanvas");

  const heartsLayer = document.getElementById("hearts");
  const modal = document.getElementById("modal");
  const closeBtn = document.getElementById("closeBtn");
  const moreBtn = document.getElementById("moreBtn");

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

  function onNoPress(e) {
    e.preventDefault();
    updatePointerFromEvent(e);
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
      const delay = (Math.random() * 0.25) + "s";
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
