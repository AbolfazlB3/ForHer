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
