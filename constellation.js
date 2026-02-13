(() => {
  const canvas = document.getElementById("constellation");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const shared = (window.ValentineShared = window.ValentineShared || {});
  const getPointer = () => shared.pointer || { x: 0, y: 0, has: false };

  const nodes = [];
  const NODE_COUNT = 24;         // keep it elegant (not 200)
  // const LINK_DIST = 140;
  const LINK_DIST = document.getElementById("playground").getBoundingClientRect().height;

  const DPR = () => (window.devicePixelRatio || 1);

  let dpr = 1;
  let flash = 0;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function resize() {
    dpr = DPR();
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    nodes.length = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.8 + Math.random() * 1.4,
        phase: Math.random() * 100,
        tw: 0.18 + Math.random() * 0.22,
      });
    }
  }

  function tick(t) {
    const time = t * 0.001;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // link intention near YES
    const yesBtn = document.getElementById("yesBtn");
    const yR = yesBtn?.getBoundingClientRect();
    let linkIntent = 0;

    const p = getPointer();
    if (p.has && yR) {
      const yesCx = yR.left + yR.width / 2;
      const yesCy = yR.top + yR.height / 2;
      const dYes = Math.hypot(p.x - yesCx, p.y - yesCy);

      // 0 far -> 1 close
      linkIntent = clamp(1 - smoothstep(180, 520, dYes), 0, 1);
    }

    const lineAlphaBase = 0.02 + linkIntent * 0.10 + flash * 0.22;

    // links
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist > LINK_DIST) continue;

        const k = 1 - dist / LINK_DIST;
        const alpha = lineAlphaBase * k;

        // keep constellation rare if not near YES
        if (linkIntent < 0.12 && Math.random() > 0.015) continue;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(248,227,176,${alpha.toFixed(4)})`;
        ctx.lineWidth = 1;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // nodes
    for (const n of nodes) {
      const tw = 0.5 + 0.5 * Math.sin(time * n.tw + n.phase);
      const alpha = 0.06 + tw * 0.14 + linkIntent * 0.10 + flash * 0.16;

      ctx.beginPath();
      ctx.fillStyle = `rgba(248,227,176,${alpha.toFixed(4)})`;
      ctx.arc(n.x, n.y, n.r + tw * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    flash *= 0.94;
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("valentine:yes", () => { flash = 1; });

  resize();
  requestAnimationFrame(tick);
})();
