(function initConstellation() {
    const canvas = document.getElementById('constellation');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const nodes = [];
    const NODE_COUNT = 24;
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
        const time = t * 0.001;

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
