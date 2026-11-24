// Each wire is an ellipse in the local cross-section of the orbit.
// Twist that cross-section as it travels around the loop.
const tau = 2 * Math.PI;
const wireCount = 88;
const sides = 44;
const wires = [];

for (let wire = 0; wire < wireCount; wire++) {
  const u = tau * wire / wireCount;
  const twist = u + 0.55;
  const ring = [];
  for (let side = 0; side < sides; side++) {
    const v = tau * side / sides;
    const wide = 0.66 * Math.cos(v);
    const narrow = 0.33 * Math.sin(v);
    const radius = 1.04 + wide * Math.cos(twist) - narrow * Math.sin(twist);
    ring.push({
      x: 1.15 * radius * Math.cos(u),
      y: radius * Math.sin(u),
      z: wide * Math.sin(twist) + narrow * Math.cos(twist) + 0.22 * Math.sin(2 * u),
      // An outward surface normal provides a continuous highlight around each wire.
      nx: Math.cos(u) * (Math.cos(v) * Math.cos(twist) - 2 * Math.sin(v) * Math.sin(twist)),
      ny: Math.sin(u) * (Math.cos(v) * Math.cos(twist) - 2 * Math.sin(v) * Math.sin(twist)),
      nz: Math.cos(v) * Math.sin(twist) + 2 * Math.sin(v) * Math.cos(twist)
    });
  }
  wires.push(ring);
}

const canvas = document.querySelector("#sculpture");
const context = canvas.getContext("2d");
if (context) setupCover();
else canvas.replaceWith(document.createTextNode("Orbit Study · 이 브라우저에서 캔버스를 표시할 수 없습니다."));

function setupCover() {
  const button = document.querySelector("#rotate");
  const label = document.querySelector("#rotate-label");
  const palette = Array.from({ length: 64 }, (_, i) => {
    const level = i / 63;
    const shine = Math.pow(level, 6);
    return `rgb(${Math.round(14 + 32 * level + 114 * shine)}, ${Math.round(24 + 53 * level + 101 * shine)}, ${Math.round(87 + 139 * level + 28 * shine)})`;
  });
  const tilt = 0.63;
  const roll = -0.43;
  let angle = -0.22;
  let playing = false;
  let visible = true;
  let frame = 0;
  let lastDraw = null;

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (!pixelWidth || !pixelHeight) return;
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const scale = Math.min(width * 0.222, height * 0.30);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const segments = [];

    for (const ring of wires) {
      const points = ring.map(point => {
        const horizontal = point.x * cos - point.y * sin;
        const forward = point.x * sin + point.y * cos;
        const vertical = forward * Math.cos(tilt) - point.z * Math.sin(tilt);
        const depth = forward * Math.sin(tilt) + point.z * Math.cos(tilt);
        const projection = scale * 6 / (6 - depth);
        const normalX = point.nx * cos - point.ny * sin;
        const normalY = point.nx * sin + point.ny * cos;
        const light = (-0.5 * normalX - 0.55 * normalY + 0.66 * point.nz) /
          Math.hypot(point.nx, point.ny, point.nz);
        return {
          x: width * 0.5 + (horizontal * Math.cos(roll) - vertical * Math.sin(roll)) * projection,
          y: height * 0.5 - (horizontal * Math.sin(roll) + vertical * Math.cos(roll)) * projection,
          z: depth,
          color: Math.round(Math.max(0, Math.min(1, (light + 1) * 0.5)) * 63)
        };
      });
      for (let side = 0; side < sides; side++) {
        const start = points[side];
        const end = points[(side + 1) % sides];
        segments.push({ start, end, depth: (start.z + end.z) / 2 });
      }
    }
    // Paint back-to-front so the nearest wire covers those behind it.
    segments.sort((a, b) => a.depth - b.depth);
    context.lineCap = "round";
    for (const { start, end, depth } of segments) {
      context.lineWidth = Math.max(0.8, scale * 0.018 * 6 / (6 - depth));
      context.strokeStyle = palette[start.color];
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
  }

  function animate(now) {
    if (lastDraw === null || now - lastDraw >= 32) {
      if (lastDraw !== null) angle += Math.min(now - lastDraw, 80) * 0.00025;
      lastDraw = now;
      draw();
    }
    frame = requestAnimationFrame(animate);
  }
  function updatePlayback() {
    cancelAnimationFrame(frame);
    lastDraw = null;
    if (playing && visible && !document.hidden) frame = requestAnimationFrame(animate);
  }
  button.hidden = false;
  button.addEventListener("click", () => {
    playing = !playing;
    label.textContent = playing ? "회전 정지" : "회전 재생";
    button.classList.toggle("playing", playing);
    updatePlayback();
  });
  new ResizeObserver(draw).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  }).observe(canvas);
  document.addEventListener("visibilitychange", updatePlayback);
  draw();
}
