import { createMotionEngine } from './motion.js';

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

const noBtn = document.getElementById("noBtn");
const yesBtn = document.getElementById("yesBtn");
const card = document.getElementById("card");
const modal = document.getElementById("modal");
const debugCanvas = document.getElementById("debugCanvas");
const ctx = debugCanvas.getContext("2d");

let pointer = { x: -9999, y: -9999 };
let debug = false;

window.addEventListener("mousemove", e => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

window.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "d") {
    debug = !debug;
    debugCanvas.style.display = debug ? "block" : "none";
  }
});

const engine = createMotionEngine(config);

function resize() {
  const rect = card.getBoundingClientRect();
  debugCanvas.width = rect.width;
  debugCanvas.height = rect.height;
}
resize();
window.addEventListener("resize", resize);

const rect = noBtn.getBoundingClientRect();
engine.setPosition(rect.left, rect.top);

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.03, (now - last) / 1000);
  last = now;

  const boundsRect = card.getBoundingClientRect();
  const bounds = {
    minX: boundsRect.left,
    maxX: boundsRect.right - noBtn.offsetWidth,
    minY: boundsRect.top,
    maxY: boundsRect.bottom - noBtn.offsetHeight
  };

  const result = engine.update(dt, pointer, bounds);

  noBtn.style.transform = `translate(${result.x - boundsRect.left}px, ${result.y - boundsRect.top}px)`;

  if (debug) drawDebug(result, boundsRect);

  requestAnimationFrame(loop);
}

function drawDebug(result, boundsRect) {
  ctx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

  const px = pointer.x - boundsRect.left;
  const py = pointer.y - boundsRect.top;

  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.arc(px, py, config.fearRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "yellow";
  ctx.beginPath();
  ctx.arc(px, py, config.hardRadius, 0, Math.PI * 2);
  ctx.stroke();
}

yesBtn.addEventListener("click", () => {
  modal.classList.add("active");
  card.style.transform = "scale(1.05)";
  card.style.boxShadow = "0 0 120px rgba(255,47,146,0.5)";
});

requestAnimationFrame(loop);
