import { RANGE, st, knobs } from "./state.js";
import { $, clampV } from "./utils.js";
import { playUiTick } from "./audio.js";
import { update } from "./api.js";
import { stepBy, edit } from "./actions.js";

function makeKnob(el, label, key, log, color, minTxt, maxTxt) {
  el.setAttribute("data-lenis-prevent", "");   // la rueda sobre una perilla ajusta el valor, no hace scroll

  const { min, max, base } = RANGE[key];
  const frac = v => log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min);
  const fromFrac = f => {
    const v = log ? min * Math.pow(max / min, f) : min + f * (max - min);
    return clampV(key, Math.round(v / base) * base);
  };

  const polar = (cx, cy, r, deg) => {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arcPath = (startDeg, endDeg) => {
    const s = polar(65, 60, 44, endDeg);
    const e = polar(65, 60, 44, startDeg);
    const large = endDeg - startDeg <= 180 ? "0" : "1";
    return `M ${s.x} ${s.y} A 44 44 0 ${large} 0 ${e.x} ${e.y}`;
  };

  el.innerHTML = `
    <svg viewBox="0 0 130 112">
      <path d="${arcPath(-135, 135)}" fill="none" stroke="#1E293B" stroke-width="5" stroke-linecap="round"/>
      <path class="arc-val" d="${arcPath(-135, 0)}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="65" cy="60" r="34" fill="#0F172A" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>
      <circle cx="65" cy="60" r="25" fill="#070A10" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
      <g class="cap">
        <line x1="65" y1="37" x2="65" y2="48" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      </g>
      <text x="18" y="106" fill="#64748B" font-size="9.5" font-family="'JetBrains Mono', monospace">${minTxt}</text>
      <text x="112" y="106" fill="#64748B" font-size="9.5" font-family="'JetBrains Mono', monospace" text-anchor="end">${maxTxt}</text>
    </svg>
    <div class="knob-caption">${label}</div>
  `;

  const svg = el.querySelector("svg"),
        cap = el.querySelector(".cap"),
        arc = el.querySelector(".arc-val");

  const paint = () => {
    const f = Math.min(1, Math.max(0, frac(st[key])));
    const deg = -135 + f * 270;
    cap.setAttribute("transform", `rotate(${deg} 65 60)`);
    arc.setAttribute("d", f <= 0.005 ? "" : arcPath(-135, deg));
  };

  let drag = null;
  svg.addEventListener("pointerdown", e => {
    drag = { y: e.clientY, f: frac(st[key]) };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", e => {
    if (!drag) return;
    const nf = Math.min(1, Math.max(0, drag.f + (drag.y - e.clientY) / 180));
    const nv = fromFrac(nf);
    if (nv !== st[key]) {
      st[key] = nv;
      playUiTick(key === "freq" ? 580 : 460);
      update();
    }
  });
  svg.addEventListener("pointerup", () => drag = null);
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    stepBy(key, e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  svg.addEventListener("dblclick", () => edit(key));

  knobs[key] = paint;
  paint();
}

export function initKnobs() {
  makeKnob($("kF"), "FRECUENCIA", "freq", true,  "#06B6D4", "10Hz", "1kHz");
  makeKnob($("kA"), "AMPLITUD",   "amp",  false, "#22C55E", "0.1V", "10V");
}