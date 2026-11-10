import { st, anim, sim } from "./state.js";
import { $, niceV, fTime, fR } from "./utils.js";
import { synthWave } from "./signals.js";
import { renderTelecomGlobe } from "./globe.js";

const cv = $("scope"), ctx = cv.getContext("2d");
const hCv = $("heroCanvas"), hCtx = hCv.getContext("2d");

const CURSOR_HINT = "Pasa el cursor sobre la gráfica para inspeccionar t, v(t) y el área integrada";

function layout() {
  const r = $("screen").getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  sim.W = r.width; sim.H = r.height;
  cv.width = Math.round(sim.W * dpr);
  cv.height = Math.round(sim.H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const hr = hCv.getBoundingClientRect();
  hCv.width = Math.round(hr.width * dpr);
  hCv.height = Math.round(hr.height * dpr);
  hCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function initScope() {
  new ResizeObserver(layout).observe($("screen"));

  const updateMousePos = (clientX, clientY) => {
    const r = cv.getBoundingClientRect();
    sim.mouse = { x: clientX - r.left, y: clientY - r.top };
  };
  cv.addEventListener("mousemove", e => updateMousePos(e.clientX, e.clientY));
  cv.addEventListener("touchmove", e => {
    if (e.touches.length > 0) updateMousePos(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  cv.addEventListener("mouseleave", () => {
    sim.mouse = null;
    if ($("hudCursor")) $("hudCursor").textContent = CURSOR_HINT;
  });
}

function drawRoundedRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

// Mini osciloscopio del hero
function drawHeroPreview(wave) {
  const hw = hCv.clientWidth, hh = hCv.clientHeight;
  if (!hw || !hh) return;

  hCtx.fillStyle = "#070A10";
  hCtx.fillRect(0, 0, hw, hh);

  hCtx.strokeStyle = "rgba(255,255,255,0.06)";
  hCtx.lineWidth = 1;
  hCtx.beginPath(); hCtx.moveTo(0, hh / 2); hCtx.lineTo(hw, hh / 2); hCtx.stroke();

  const n = wave.v.length;
  hCtx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * hw;
    const y = (hh / 2) - (wave.v[i] / Math.max(anim.amp, 0.5)) * (hh * 0.36);
    i ? hCtx.lineTo(x, y) : hCtx.moveTo(x, y);
  }
  hCtx.strokeStyle = "#22C55E";
  hCtx.lineWidth = 2.2;
  hCtx.stroke();
}

// Osciloscopio principal
function drawScope(wave) {
  const { W, H, data, mouse } = sim;
  if (!W || !H) return;

  const cy = H / 2, dx = W / 10, dy = H / 8;

  // ====================================================================
  // NUEVO: RENDERIZADOR DE ESPECTRO (FFT)
  // ====================================================================
  if (st.fft && data && data.fft_f && data.fft_mag) {
    ctx.fillStyle = "#070A10"; // Fondo
    ctx.fillRect(0, 0, W, H);
    
    // Rejilla base
    ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * dx, 0); ctx.lineTo(i * dx, H); ctx.stroke(); }
    for (let j = 1; j < 8; j++)  { ctx.beginPath(); ctx.moveTo(0, j * dy); ctx.lineTo(W, j * dy); ctx.stroke(); }

    const freqs = data.fft_f;
    const mags = data.fft_mag;
    const maxFreq = Math.max(...freqs); 
    const maxMag = Math.max(...mags, 0.1); 
    
    // Estilo de barras FFT
    ctx.strokeStyle = "#818CF8"; 
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Dibujamos las barras del espectro
    for (let i = 1; i < freqs.length; i++) {
      const x = (freqs[i] / maxFreq) * W;
      const h = (mags[i] / maxMag) * (H * 0.85); 
      
      if (mags[i] > 0.05) {
        ctx.moveTo(x, H);
        ctx.lineTo(x, H - h);
        
        ctx.fillStyle = "#00E5FF";
        ctx.fillRect(x - 2, H - h - 2, 4, 4);
      }
    }
    ctx.stroke();

    // Actualizar HUD para modo Frecuencia
    $("hudTdiv").innerHTML = `<span style="color:#818CF8">DOMINIO: FRECUENCIA</span>`;
    $("hudVdiv").textContent = `Max FFT: ${maxMag.toFixed(2)} V`;
    $("hudRms").textContent  = (data ? data.rms : wave.rms).toFixed(3) + " V";
    $("hudMod").textContent  = st.mod === "none" ? "OFF" : st.mod.toUpperCase();
    $("hudR").textContent    = fR();
    $("hudCyc").textContent  = wave.cycles;
    if ($("hudCursor")) $("hudCursor").textContent = "Analizador de Espectro FFT. Armónicos de la señal activa.";
    
    return; // SALIR AQUÍ: No dibuja el osciloscopio normal de tiempo si está la FFT activa
  }
  // ====================================================================

  // DIBUJADO DE OSCILOSCOPIO NORMAL (DOMINIO DEL TIEMPO)
  ctx.fillStyle = "#070A10";
  ctx.fillRect(0, 0, W, H);

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
  for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * dx, 0); ctx.lineTo(i * dx, H); ctx.stroke(); }
  for (let j = 1; j < 8; j++)  { ctx.beginPath(); ctx.moveTo(0, j * dy); ctx.lineTo(W, j * dy); ctx.stroke(); }

  ctx.strokeStyle = "rgba(16, 185, 129, 0.22)";
  ctx.beginPath();
  ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
  ctx.stroke();

  const vdiv = niceV(st.amp);
  const n = wave.v.length, tspan = wave.t[n - 1];
  const Y = v => cy - (v / vdiv) * dy;
  const X = i => (wave.t[i] / tspan) * W;

  $("hudVdiv").textContent = vdiv + " V/div";
  $("hudTdiv").textContent = fTime(tspan / 10) + "/div";
  $("hudRms").textContent  = (data ? data.rms : wave.rms).toFixed(3) + " V";
  $("hudMod").textContent  = st.mod === "none" ? "OFF" : st.mod.toUpperCase();
  $("hudR").textContent    = fR();
  $("hudCyc").textContent  = wave.cycles;

  if (!st.ch1) return;

  if (!st.out) {
    ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    return;
  }

  // Área bajo v(t)²
  if (st.area) {
    const g = ctx.createLinearGradient(0, cy, 0, 0);
    g.addColorStop(0, "rgba(245, 158, 11, 0.03)");
    g.addColorStop(1, "rgba(245, 158, 11, 0.28)");
    ctx.beginPath();
    ctx.moveTo(X(0), cy);
    for (let i = 0; i < n; i++) {
      const v2 = (wave.v[i] * wave.v[i]) / Math.max(anim.amp, 0.1);
      ctx.lineTo(X(i), Y(v2));
    }
    ctx.lineTo(X(n - 1), cy);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const v2 = (wave.v[i] * wave.v[i]) / Math.max(anim.amp, 0.1);
      i ? ctx.lineTo(X(i), Y(v2)) : ctx.moveTo(X(i), Y(v2));
    }
    ctx.stroke();
  }

  // Guías ±Vrms
  if (st.rmsl) {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
    ctx.lineWidth = 1.2;
    [wave.rms, -wave.rms].forEach(rv => {
      ctx.beginPath(); ctx.moveTo(0, Y(rv)); ctx.lineTo(W, Y(rv)); ctx.stroke();
    });
    ctx.restore();
  }

  // Traza principal
  const trace = () => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) i ? ctx.lineTo(X(i), Y(wave.v[i])) : ctx.moveTo(X(i), Y(wave.v[i]));
    ctx.stroke();
  };
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(34, 197, 94, 0.18)"; ctx.lineWidth = 6; trace();
  ctx.strokeStyle = "#22C55E"; ctx.lineWidth = 2.2; trace();

  // Cursor de medición
  if (st.cur && mouse) {
    const f = Math.min(1, Math.max(0, mouse.x / W));
    const idx = Math.round(f * (n - 1));
    const cxPos = X(idx);
    const v = wave.v[idx];
    const v2Scaled = (v * v) / Math.max(anim.amp, 0.1);
    const yV = Y(v), yV2 = Y(v2Scaled);
    const tCur = f * tspan;

    // Integral acumulada de v(t)² desde 0 hasta el cursor (trapecio corregido)
    let integral = 0;
    for (let i = 1; i <= idx; i++) {
      integral += ((wave.v[i - 1] ** 2 + wave.v[i] ** 2) / 2) * (wave.t[i] - wave.t[i - 1]);
    }
    const integralMs = (integral * 1e3).toFixed(3);

    if (st.area) {
      ctx.beginPath();
      ctx.moveTo(X(0), cy);
      for (let i = 0; i <= idx; i++) {
        const v2i = (wave.v[i] * wave.v[i]) / Math.max(anim.amp, 0.1);
        ctx.lineTo(X(i), Y(v2i));
      }
      ctx.lineTo(cxPos, cy);
      ctx.closePath();
      ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
      ctx.fill();
    }

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cxPos, 0); ctx.lineTo(cxPos, H);
    ctx.moveTo(0, yV);    ctx.lineTo(W, yV);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#22C55E";
    ctx.beginPath(); ctx.arc(cxPos, yV, 5, 0, Math.PI * 2); ctx.fill();
    if (st.area) {
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath(); ctx.arc(cxPos, yV2, 4.5, 0, Math.PI * 2); ctx.fill();
    }

    const tLabel = fTime(tCur);
    const boxW = 214, boxH = 92;
    const bx = cxPos + 16 + boxW > W ? cxPos - boxW - 16 : cxPos + 16;
    const by = Math.min(H - boxH - 14, Math.max(14, yV - boxH / 2));

    drawRoundedRect(ctx, bx, by, boxW, boxH, 10);
    ctx.fillStyle = "rgba(13, 17, 26, 0.94)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "600 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#06B6D4"; ctx.fillText(`t    = ${tLabel}`, bx + 12, by + 20);
    ctx.fillStyle = "#22C55E"; ctx.fillText(`v(t) = ${v.toFixed(3)} V`, bx + 12, by + 39);
    ctx.fillStyle = "#F59E0B"; ctx.fillText(`v²   = ${(v * v).toFixed(3)} V²`, bx + 12, by + 58);

    if ($("hudCursor")) {
      $("hudCursor").innerHTML =
        `t = <b class="c-cyan">${tLabel}</b> · ` +
        `v(t) = <b class="c-lime">${v.toFixed(3)} V</b> · ` +
        `v(t)² = <b class="c-amber">${(v * v).toFixed(3)} V²</b>`;
    }
  }
}

// Bucle de animación (60 FPS)
export function renderScope() {
  anim.amp  += (st.amp  - anim.amp)  * 0.18;
  anim.freq += (st.freq - anim.freq) * 0.18;
  if (st.run && st.out) anim.phase -= 0.032;

  const wave = synthWave(st.forma, st.mod, anim.amp, anim.freq, st.r, anim.phase);
  if (!sim.data) sim.data = wave;

  drawHeroPreview(wave);
  renderTelecomGlobe();
  drawScope(wave);

  requestAnimationFrame(renderScope);
}