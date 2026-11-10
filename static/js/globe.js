import { st, anim } from "./state.js";
import { $ } from "./utils.js";

const gCv = $("globeCanvas");
const gCtx = gCv.getContext("2d");

export function renderTelecomGlobe() {
  const gw = 220, gh = 220, cx = 110, cy = 110, R = 82;
  gCtx.clearRect(0, 0, gw, gh);

  const grad = gCtx.createRadialGradient(cx - 25, cy - 25, 12, cx, cy, R);
  grad.addColorStop(0, "#1E293B");
  grad.addColorStop(1, "#0B0F19");
  gCtx.fillStyle = grad;
  gCtx.beginPath();
  gCtx.arc(cx, cy, R, 0, Math.PI * 2);
  gCtx.fill();

  anim.globeAngle += 0.008 + (st.freq / 45000);

  gCtx.strokeStyle = "rgba(34, 197, 94, 0.55)";
  gCtx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    const a = anim.globeAngle + (i * Math.PI) / 4;
    const rx = Math.abs(Math.cos(a)) * R;
    gCtx.beginPath();
    gCtx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2);
    gCtx.stroke();
  }
  [-0.45, 0, 0.45].forEach(lat => {
    const y = cy + lat * R;
    const rx = Math.sqrt(1 - lat * lat) * R;
    gCtx.beginPath();
    gCtx.ellipse(cx, y, rx, rx * 0.24, 0, 0, Math.PI * 2);
    gCtx.stroke();
  });

  const nodes = [
    { lat: -0.45, lon: 0.2 },
    { lat: 0.0,   lon: 1.1 },
    { lat: 0.45,  lon: 2.3 },
    { lat: 0.0,   lon: 3.6 },
    { lat: -0.45, lon: 4.8 },
  ];
  nodes.forEach(n => {
    const lon = n.lon + anim.globeAngle;
    const z = Math.sin(lon);
    if (z > -0.2) {
      const x = cx + Math.cos(lon) * Math.sqrt(1 - n.lat * n.lat) * R;
      const y = cy + n.lat * R;
      gCtx.fillStyle = "#22C55E";
      gCtx.beginPath();
      gCtx.arc(x, y, 4.5, 0, Math.PI * 2);
      gCtx.fill();
    }
  });
}