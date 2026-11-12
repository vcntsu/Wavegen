import { st, anim, sim, VDIV_STEPS, TDIV_STEPS } from "./state.js";
import { $, fTime, fR } from "./utils.js";
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

  const getLocalPos = (clientX, clientY) => {
    const r = cv.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const pickCursorToDrag = pos => {
    if (!st.manCur || !sim.W || !sim.H) return null;
    const xT1 = st.curT1 * sim.W, xT2 = st.curT2 * sim.W;
    const cy = sim.H / 2, dy = sim.H / 8;
    const yV1 = cy - st.curV1 * dy, yV2 = cy - st.curV2 * dy;

    const candidates = [
      { id: "T1", d: Math.abs(pos.x - xT1) },
      { id: "T2", d: Math.abs(pos.x - xT2) },
      { id: "V1", d: Math.abs(pos.y - yV1) },
      { id: "V2", d: Math.abs(pos.y - yV2) },
    ].sort((a, b) => a.d - b.d);

    return candidates[0].d <= 14 ? candidates[0].id : null;
  };

  const updateDragOrMouse = (clientX, clientY) => {
    const pos = getLocalPos(clientX, clientY);
    sim.mouse = pos;

    if (sim.dragCursor && sim.W && sim.H) {
      const cy = sim.H / 2, dy = sim.H / 8;
      if (sim.dragCursor === "T1") st.curT1 = Math.min(0.98, Math.max(0.02, pos.x / sim.W));
      if (sim.dragCursor === "T2") st.curT2 = Math.min(0.98, Math.max(0.02, pos.x / sim.W));
      if (sim.dragCursor === "V1") st.curV1 = Math.min(3.9, Math.max(-3.9, (cy - pos.y) / dy));
      if (sim.dragCursor === "V2") st.curV2 = Math.min(3.9, Math.max(-3.9, (cy - pos.y) / dy));
    } else if (st.manCur) {
      const hit = pickCursorToDrag(pos);
      cv.style.cursor = hit ? (hit.startsWith("T") ? "ew-resize" : "ns-resize") : "crosshair";
    } else {
      cv.style.cursor = "crosshair";
    }
  };

  cv.addEventListener("mousedown", e => {
    const pos = getLocalPos(e.clientX, e.clientY);
    sim.dragCursor = pickCursorToDrag(pos);
  });
  window.addEventListener("mouseup", () => { sim.dragCursor = null; });

  cv.addEventListener("mousemove", e => updateDragOrMouse(e.clientX, e.clientY));
  cv.addEventListener("touchstart", e => {
    if (e.touches.length > 0) {
      const pos = getLocalPos(e.touches[0].clientX, e.touches[0].clientY);
      sim.dragCursor = pickCursorToDrag(pos);
    }
  }, { passive: true });
  cv.addEventListener("touchmove", e => {
    if (e.touches.length > 0) updateDragOrMouse(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  cv.addEventListener("touchend", () => { sim.dragCursor = null; });
  cv.addEventListener("mouseleave", () => {
    sim.mouse = null;
    if (!st.manCur && $("hudCursor")) $("hudCursor").textContent = CURSOR_HINT;
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

// Síntesis matemática pura, limpia y sin ruido sobre la ventana de Time/Div
function acquireScopeWave(tdiv, posX) {
  const N = 520;
  const tspan = Math.max(1e-5, tdiv * 10);
  const t = new Array(N), v = new Array(N), v2 = new Array(N), vMath = new Array(N);
  const freq = Math.max(1, anim.freq);
  const amp1 = anim.amp;
  const amp2 = anim.amp2;
  const fm = freq / 6;
  const radPhase2 = (st.phase2 * Math.PI) / 180;

  const evalShape = (shape, ph) => {
    const f = ((ph / (2 * Math.PI)) % 1 + 1) % 1;
    if (shape === "cuadrada") return f < 0.5 ? 1 : -1;
    if (shape === "triangular") return 4 * Math.abs(f - 0.5) - 1;
    if (shape === "diente") return 2 * f - 1;
    return Math.sin(ph);
  };

  const sampleCH1 = timeSec => {
    if (st.coupling === "GND") return 0;
    const ph = 2 * Math.PI * freq * timeSec;
    const base = evalShape(st.forma, ph);
    if (st.mod === "am") return amp1 * ((1 + 0.5 * Math.sin(2 * Math.PI * fm * timeSec)) / 1.5) * base;
    if (st.mod === "fm") return amp1 * evalShape(st.forma, ph + 2.5 * Math.sin(2 * Math.PI * fm * timeSec));
    return amp1 * base;
  };

  const sampleCH2 = timeSec => {
    const ph = 2 * Math.PI * freq * timeSec + radPhase2;
    return amp2 * evalShape(st.forma2, ph);
  };

  // --- ALGORITMO DE TRIGGER ---
  let tTrig = 0;
  let locked = false;

  if (st.trigMode === "FREE") {
    tTrig = -anim.phase / (2 * Math.PI * freq);
    locked = false;
  } else {
    const T = 1 / freq;
    const searchSteps = 360;
    const dtSearch = (2 * T) / searchSteps;
    const lvl = st.trigLvl;
    const rising = st.trigSlope === "RISE";

    for (let k = 1; k <= searchSteps; k++) {
      const tPrev = (k - 1) * dtSearch;
      const tCurr = k * dtSearch;
      const vPrev = sampleCH1(tPrev);
      const vCurr = sampleCH1(tCurr);

      if (rising && vPrev < lvl && vCurr >= lvl) {
        const frac = (lvl - vPrev) / Math.max(1e-9, vCurr - vPrev);
        tTrig = tPrev + frac * dtSearch;
        locked = true;
        break;
      }
      if (!rising && vPrev > lvl && vCurr <= lvl) {
        const frac = (vPrev - lvl) / Math.max(1e-9, vPrev - vCurr);
        tTrig = tPrev + frac * dtSearch;
        locked = true;
        break;
      }
    }

    if (!locked && st.trigMode === "AUTO") {
      tTrig = -anim.phase / (2 * Math.PI * freq);
    }
  }

  sim.trigLocked = locked;

  const tOffset = -posX * tdiv;
  let sumSq = 0;

  for (let i = 0; i < N; i++) {
    const ti = (i / (N - 1)) * tspan;
    t[i] = ti;
    const tEval = tTrig + tOffset + (ti - tspan / 2);

    if (st.trigMode === "NORM" && !locked) {
      v[i] = 0;
      v2[i] = 0;
    } else {
      const val1 = sampleCH1(tEval);
      const val2 = sampleCH2(tEval);
      v[i] = val1;
      v2[i] = val2;
      sumSq += val1 * val1;
    }

    if (st.mathMode === "ADD") vMath[i] = v[i] + v2[i];
    else if (st.mathMode === "SUB") vMath[i] = v[i] - v2[i];
    else vMath[i] = 0;
  }

  const rms = Math.sqrt(sumSq / N);
  const cycles = Math.max(0.1, +(tspan * freq).toFixed(1));
  return { t, v, v2, vMath, rms, cycles, tspan };
}

// Análisis de Transitorios Automático (Modo MEASURE)
function updateTransientMeasures() {
  if (!$("mRise")) return;

  if (!st.out || st.coupling === "GND") {
    ["mRise", "mFall", "mPWidth", "mDuty", "mOver", "mPhase"].forEach(id => {
      if ($(id)) $(id).textContent = "0.00";
    });
    return;
  }

  const freq = Math.max(1, anim.freq);
  const T = 1 / freq;

  let riseTime = 0, fallTime = 0, duty = 50.0, overshoot = 0.0;

  if (st.forma === "cuadrada") {
    riseTime = T * 0.016;
    fallTime = T * 0.016;
    duty = 50.0;
    overshoot = st.mod === "none" ? 4.2 : 8.5;
  } else if (st.forma === "triangular") {
    riseTime = 0.4 * T;
    fallTime = 0.4 * T;
    duty = 50.0;
    overshoot = 0.0;
  } else if (st.forma === "diente") {
    riseTime = 0.8 * T;
    fallTime = 0.02 * T;
    duty = 50.0;
    overshoot = 1.8;
  } else {
    riseTime = (2 * Math.asin(0.8) / (2 * Math.PI)) * T;
    fallTime = riseTime;
    duty = 50.0;
    overshoot = st.mod === "am" ? 25.0 : 0.0;
  }

  const pulseWidth = (duty / 100) * T;

  $("mRise").textContent   = fTime(riseTime);
  $("mFall").textContent   = fTime(fallTime);
  $("mPWidth").textContent = fTime(pulseWidth);
  $("mDuty").textContent   = duty.toFixed(1) + " %";
  $("mOver").textContent   = overshoot.toFixed(1) + " %";
  $("mPhase").textContent  = st.ch2 ? `${st.phase2.toFixed(0)}°` : "0° (CH2 OFF)";
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
function drawScope(scopeWave) {
  const { W, H, data, mouse } = sim;
  if (!W || !H) return;

  const cy = H / 2, dx = W / 10, dy = H / 8;

  // ====================================================================
  // 1. MODO ESPECTRO (FFT)
  // ====================================================================
  if (st.fft && data && data.fft_f && data.fft_mag) {
    ctx.fillStyle = "#070A10";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * dx, 0); ctx.lineTo(i * dx, H); ctx.stroke(); }
    for (let j = 1; j < 8; j++)  { ctx.beginPath(); ctx.moveTo(0, j * dy); ctx.lineTo(W, j * dy); ctx.stroke(); }

    const freqs = data.fft_f;
    const mags = data.fft_mag;
    const maxFreq = Math.max(...freqs);
    const maxMag = Math.max(...mags, 0.1);

    ctx.strokeStyle = "#818CF8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
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

    $("hudTdiv").innerHTML = `<span style="color:#818CF8">DOMINIO: FRECUENCIA</span>`;
    $("hudVdiv").textContent = `Max FFT: ${maxMag.toFixed(2)} V`;
    $("hudRms").textContent  = (data ? data.rms : scopeWave.rms).toFixed(3) + " V";
    $("hudMod").textContent  = st.mod === "none" ? "OFF" : st.mod.toUpperCase();
    $("hudR").textContent    = fR();
    $("hudCyc").textContent  = scopeWave.cycles;
    if ($("hudCursor")) $("hudCursor").textContent = "Analizador de Espectro FFT. Armónicos de la señal activa.";
    return;
  }

  // ====================================================================
  // 2. MODO PARAMÉTRICO X-Y (FIGURAS DE LISSAJOUS)
  // ====================================================================
  if (st.xyMode) {
    ctx.fillStyle = "#070A10";
    ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * dx, 0); ctx.lineTo(i * dx, H); ctx.stroke(); }
    for (let j = 1; j < 8; j++)  { ctx.beginPath(); ctx.moveTo(0, j * dy); ctx.lineTo(W, j * dy); ctx.stroke(); }

    ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.stroke();

    const vdiv = anim.vdiv;
    const cx = W / 2;
    const n = scopeWave.v.length;

    const drawLissajous = () => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const px = cx + (scopeWave.v[i] / vdiv) * dx;
        const py = cy - (scopeWave.v2[i] / vdiv) * dy;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    };

    ctx.strokeStyle = "rgba(56, 189, 248, 0.22)"; ctx.lineWidth = 6; drawLissajous();
    ctx.strokeStyle = "#38BDF8"; ctx.lineWidth = 2.4; drawLissajous();

    $("hudTdiv").innerHTML = `<span style="color:#38BDF8">MODO X-Y (LISSAJOUS)</span>`;
    $("hudVdiv").textContent = `${VDIV_STEPS[st.vdivIdx].toFixed(1)} V/div`;
    if ($("hudCursor")) {
      $("hudCursor").innerHTML =
        `Plano Cartesiano: <b class="c-lime">X = CH1(t)</b> vs <b class="c-cyan">Y = CH2(t)</b> · ` +
        `Desfase θ = <b class="c-amber">${st.phase2}°</b>`;
    }
    return;
  }

  // ====================================================================
  // 3. MODO DOMINIO DEL TIEMPO (GRILLA 10x8 + MULTICANAL + CURSORES)
  // ====================================================================
  ctx.fillStyle = "#070A10";
  ctx.fillRect(0, 0, W, H);

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
  for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * dx, 0); ctx.lineTo(i * dx, H); ctx.stroke(); }
  for (let j = 1; j < 8; j++)  { ctx.beginPath(); ctx.moveTo(0, j * dy); ctx.lineTo(W, j * dy); ctx.stroke(); }

  ctx.strokeStyle = "rgba(16, 185, 129, 0.24)";
  ctx.beginPath();
  ctx.moveTo(0, cy); ctx.lineTo(W, cy);
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
  for (let s = 1; s < 50; s++) {
    const tx = (s / 50) * W;
    ctx.moveTo(tx, cy - 3); ctx.lineTo(tx, cy + 3);
  }
  for (let s = 1; s < 40; s++) {
    const ty = (s / 40) * H;
    ctx.moveTo(W / 2 - 3, ty); ctx.lineTo(W / 2 + 3, ty);
  }
  ctx.stroke();

  const vdiv = anim.vdiv;
  const yZero1 = cy - anim.posY * dy;
  const yZero2 = cy - anim.posY2 * dy;
  const n = scopeWave.v.length;
  const tspan = scopeWave.tspan;

  const Y1 = v => yZero1 - (v / vdiv) * dy;
  const Y2 = v => yZero2 - (v / vdiv) * dy;
  const YM = v => cy - (v / vdiv) * dy;
  const X  = i => (scopeWave.t[i] / tspan) * W;

  $("hudVdiv").textContent = `${VDIV_STEPS[st.vdivIdx].toFixed(1)} V/div`;
  $("hudTdiv").textContent = `${fTime(TDIV_STEPS[st.tdivIdx])}/div`;
  $("hudRms").textContent  = (data ? data.rms : scopeWave.rms).toFixed(3) + " V";
  $("hudMod").textContent  = st.mod === "none" ? "OFF" : st.mod.toUpperCase();
  $("hudR").textContent    = fR();
  $("hudCyc").textContent  = scopeWave.cycles;

  const trigBadge = $("hudTrigState");
  if (trigBadge) {
    if (st.trigMode === "FREE") {
      trigBadge.textContent = "FREE RUN";
      trigBadge.style.color = "#38BDF8";
    } else if (sim.trigLocked) {
      trigBadge.textContent = `TRIG'D ${st.trigSlope === "RISE" ? "↑" : "↓"}`;
      trigBadge.style.color = "#22C55E";
    } else {
      trigBadge.textContent = st.trigMode === "NORM" ? "WAIT TRIG" : "AUTO";
      trigBadge.style.color = "#F59E0B";
    }
  }

  // Marcador lateral izquierdo CH1 (1)
  if (st.ch1) {
    const yClamp1 = Math.min(H - 10, Math.max(10, yZero1));
    ctx.fillStyle = "#22C55E";
    ctx.beginPath();
    ctx.moveTo(0, yClamp1 - 6); ctx.lineTo(14, yClamp1 - 6); ctx.lineTo(19, yClamp1);
    ctx.lineTo(14, yClamp1 + 6); ctx.lineTo(0, yClamp1 + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#04130A"; ctx.font = "700 9px 'JetBrains Mono', monospace";
    ctx.fillText("1", 4, yClamp1 + 3);
  }

  // Marcador lateral izquierdo CH2 (2)
  if (st.ch2) {
    const yClamp2 = Math.min(H - 10, Math.max(10, yZero2));
    ctx.fillStyle = "#38BDF8";
    ctx.beginPath();
    ctx.moveTo(0, yClamp2 - 6); ctx.lineTo(14, yClamp2 - 6); ctx.lineTo(19, yClamp2);
    ctx.lineTo(14, yClamp2 + 6); ctx.lineTo(0, yClamp2 + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#04131A"; ctx.font = "700 9px 'JetBrains Mono', monospace";
    ctx.fillText("2", 4, yClamp2 + 3);
  }

  // Marcador derecho de Nivel de Trigger (T)
  const yTrig = Y1(anim.trigLvl);
  if (yTrig >= 0 && yTrig <= H) {
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, yTrig); ctx.lineTo(W, yTrig); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.moveTo(W, yTrig - 6); ctx.lineTo(W - 14, yTrig - 6); ctx.lineTo(W - 19, yTrig);
    ctx.lineTo(W - 14, yTrig + 6); ctx.lineTo(W, yTrig + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1F1202"; ctx.font = "700 9px 'JetBrains Mono', monospace";
    ctx.fillText("T", W - 11, yTrig + 3);
  }

  if (!st.out) {
    if (st.ch1) {
      ctx.strokeStyle = "rgba(34, 197, 94, 0.4)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, yZero1); ctx.lineTo(W, yZero1); ctx.stroke();
    }
    return;
  }

  // Área bajo v(t)² de CH1
  if (st.ch1 && st.area) {
    const g = ctx.createLinearGradient(0, yZero1, 0, 0);
    g.addColorStop(0, "rgba(245, 158, 11, 0.03)");
    g.addColorStop(1, "rgba(245, 158, 11, 0.28)");
    ctx.beginPath();
    ctx.moveTo(X(0), yZero1);
    for (let i = 0; i < n; i++) {
      const vSq = (scopeWave.v[i] * scopeWave.v[i]) / Math.max(anim.amp, 0.1);
      ctx.lineTo(X(i), Y1(vSq));
    }
    ctx.lineTo(X(n - 1), yZero1);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const vSq = (scopeWave.v[i] * scopeWave.v[i]) / Math.max(anim.amp, 0.1);
      i ? ctx.lineTo(X(i), Y1(vSq)) : ctx.moveTo(X(i), Y1(vSq));
    }
    ctx.stroke();
  }

  // Guías ±Vrms
  if (st.ch1 && st.rmsl) {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.7)";
    ctx.lineWidth = 1.2;
    [scopeWave.rms, -scopeWave.rms].forEach(rv => {
      ctx.beginPath(); ctx.moveTo(0, Y1(rv)); ctx.lineTo(W, Y1(rv)); ctx.stroke();
    });
    ctx.restore();
  }

  // Traza Canal 2 (CH2 - Cian)
  if (st.ch2) {
    const trace2 = () => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) i ? ctx.lineTo(X(i), Y2(scopeWave.v2[i])) : ctx.moveTo(X(i), Y2(scopeWave.v2[i]));
      ctx.stroke();
    };
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.16)"; ctx.lineWidth = 5; trace2();
    ctx.strokeStyle = "#38BDF8"; ctx.lineWidth = 2.0; trace2();
  }

  // Traza Función MATH (CH1 + CH2 o CH1 - CH2 en Magenta)
  if (st.mathMode !== "OFF") {
    const traceM = () => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) i ? ctx.lineTo(X(i), YM(scopeWave.vMath[i])) : ctx.moveTo(X(i), YM(scopeWave.vMath[i]));
      ctx.stroke();
    };
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(244, 63, 94, 0.18)"; ctx.lineWidth = 5; traceM();
    ctx.strokeStyle = "#F43F5E"; ctx.lineWidth = 2.0; traceM();
  }

  // Traza principal Canal 1 (CH1 - Verde Esmeralda)
  if (st.ch1) {
    const trace1 = () => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) i ? ctx.lineTo(X(i), Y1(scopeWave.v[i])) : ctx.moveTo(X(i), Y1(scopeWave.v[i]));
      ctx.stroke();
    };
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(34, 197, 94, 0.18)"; ctx.lineWidth = 6; trace1();
    ctx.strokeStyle = "#22C55E"; ctx.lineWidth = 2.2; trace1();
  }

  // ====================================================================
  // 4. CURSORES MANUALES DIFERENCIALES ARRASTRABLES (ΔV, Δt, 1/Δt)
  // ====================================================================
  if (st.manCur) {
    const xT1 = st.curT1 * W, xT2 = st.curT2 * W;
    const yV1 = cy - st.curV1 * dy, yV2 = cy - st.curV2 * dy;

    ctx.save();
    ctx.lineWidth = 1.3;

    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "#A855F7";
    ctx.beginPath();
    ctx.moveTo(xT1, 0); ctx.lineTo(xT1, H);
    ctx.moveTo(xT2, 0); ctx.lineTo(xT2, H);
    ctx.stroke();

    ctx.strokeStyle = "#EC4899";
    ctx.beginPath();
    ctx.moveTo(0, yV1); ctx.lineTo(W, yV1);
    ctx.moveTo(0, yV2); ctx.lineTo(W, yV2);
    ctx.stroke();
    ctx.restore();

    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#A855F7";
    ctx.fillText("T1", xT1 + 4, 14);
    ctx.fillText("T2", xT2 + 4, 14);
    ctx.fillStyle = "#EC4899";
    ctx.fillText("V1", 24, yV1 - 4);
    ctx.fillText("V2", 24, yV2 - 4);

    const dt = Math.abs(st.curT2 - st.curT1) * tspan;
    const freqCur = dt > 1e-7 ? (1 / dt) : 0;
    const v1Real = (st.curV1 - anim.posY) * vdiv;
    const v2Real = (st.curV2 - anim.posY) * vdiv;
    const dV = Math.abs(v1Real - v2Real);

    const boxW = 242, boxH = 66;
    drawRoundedRect(ctx, 26, 22, boxW, boxH, 8);
    ctx.fillStyle = "rgba(11, 15, 25, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "600 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#E9D5FF";
    ctx.fillText(`Δt = ${fTime(dt)}   (1/Δt = ${freqCur.toFixed(1)} Hz)`, 36, 42);
    ctx.fillStyle = "#FBCFE8";
    ctx.fillText(`ΔV = ${dV.toFixed(2)} V   (${v1Real.toFixed(1)}V a ${v2Real.toFixed(1)}V)`, 36, 62);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 9.5px 'JetBrains Mono', monospace";
    ctx.fillText("Arrastra las líneas T1, T2, V1, V2 con el mouse", 36, 80);

    if ($("hudCursor")) {
      $("hudCursor").innerHTML =
        `Cursores: <b class="c-cyan">Δt = ${fTime(dt)}</b> · ` +
        `<b class="c-lime">1/Δt = ${freqCur.toFixed(1)} Hz</b> · ` +
        `<b class="c-amber">ΔV = ${dV.toFixed(2)} V</b>`;
    }
  }

  // Cursor de inspección de integral
  if (st.cur && mouse && !sim.dragCursor && !st.manCur && st.ch1) {
    const f = Math.min(1, Math.max(0, mouse.x / W));
    const idx = Math.round(f * (n - 1));
    const cxPos = X(idx);
    const v = scopeWave.v[idx];
    const v2Scaled = (v * v) / Math.max(anim.amp, 0.1);
    const yV = Y1(v), yV2 = Y1(v2Scaled);
    const tCur = f * tspan;

    let integral = 0;
    for (let i = 1; i <= idx; i++) {
      integral += ((scopeWave.v[i - 1] ** 2 + scopeWave.v[i] ** 2) / 2) * (scopeWave.t[i] - scopeWave.t[i - 1]);
    }
    const integralMs = (integral * 1e3).toFixed(3);

    if (st.area) {
      ctx.beginPath();
      ctx.moveTo(X(0), yZero1);
      for (let i = 0; i <= idx; i++) {
        const v2i = (scopeWave.v[i] * scopeWave.v[i]) / Math.max(anim.amp, 0.1);
        ctx.lineTo(X(i), Y1(v2i));
      }
      ctx.lineTo(cxPos, yZero1);
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
    const boxW = 218, boxH = 96;
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
    ctx.fillStyle = "#A7F3D0"; ctx.fillText(`∫v²dt= ${integralMs} V²·ms`, bx + 12, by + 77);

    if ($("hudCursor")) {
      $("hudCursor").innerHTML =
        `t = <b class="c-cyan">${tLabel}</b> · ` +
        `v(t) = <b class="c-lime">${v.toFixed(3)} V</b> · ` +
        `∫v²dt = <b class="c-amber">${integralMs} V²·ms</b>`;
    }
  }
}

// Bucle de animación (60 FPS)
export function renderScope() {
  const targetVdiv = VDIV_STEPS[st.vdivIdx];
  const targetTdiv = TDIV_STEPS[st.tdivIdx];

  anim.amp     += (st.amp     - anim.amp)     * 0.18;
  anim.amp2    += (st.amp2    - anim.amp2)    * 0.18;
  anim.freq    += (st.freq    - anim.freq)    * 0.18;
  anim.vdiv    += (targetVdiv - anim.vdiv)    * 0.22;
  anim.tdiv    += (targetTdiv - anim.tdiv)    * 0.22;
  anim.posY    += (st.posY    - anim.posY)    * 0.22;
  anim.posY2   += (st.posY2   - anim.posY2)   * 0.22;
  anim.posX    += (st.posX    - anim.posX)    * 0.22;
  anim.trigLvl += (st.trigLvl - anim.trigLvl) * 0.22;

  if (st.run && st.out) anim.phase -= 0.032;

  const heroWave = synthWave(st.forma, st.mod, anim.amp, anim.freq, st.r, anim.phase);
  if (!sim.data) sim.data = heroWave;

  const scopeWave = acquireScopeWave(anim.tdiv, anim.posX);
  updateTransientMeasures();

  drawHeroPreview(heroWave);
  renderTelecomGlobe();
  drawScope(scopeWave);

  requestAnimationFrame(renderScope);
}