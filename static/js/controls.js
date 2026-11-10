import { st } from "./state.js";
import { $ } from "./utils.js";
import { playUiTick, syncAudioSynth } from "./audio.js";
import { update } from "./api.js";
import { lecturas } from "./readouts.js";
import { stepBy, edit } from "./actions.js";

// Usa el scroll suave si está disponible; si no, el del navegador
const goTo = sel =>
  window.wgScrollTo ? window.wgScrollTo(sel)
                    : document.querySelector(sel)?.scrollIntoView({ behavior: "smooth" });

const PRESETS = {
  tono:      { forma: "senoidal", mod: "none", freq: 440, amp: 5.0 },
  reloj:     { forma: "cuadrada", mod: "none", freq: 250, amp: 5.0 },
  portadora: { forma: "senoidal", mod: "am",   freq: 600, amp: 8.0 },
  barrido:   { forma: "diente",   mod: "none", freq: 120, amp: 6.5 },
};

// Refleja el estado en los botones (clases "on")
export function syncKeys() {
  document.querySelectorAll("#waves .wave-option").forEach(b => b.classList.toggle("on", b.dataset.f === st.forma));
  document.querySelectorAll("#mods .pill-btn").forEach(b => b.classList.toggle("on", b.dataset.m === st.mod));
  document.querySelectorAll("#steps .step-pill").forEach(b => b.classList.toggle("on", +b.dataset.m === st.mult));
  $("bRun").classList.toggle("on", st.run);
  $("bRun").textContent = st.run ? "RUN" : "HOLD";
  $("bCh1").classList.toggle("on", st.ch1);
  $("bOut").classList.toggle("on", st.out);
  $("r50").classList.toggle("on", st.r === 50);
  $("rhz").classList.toggle("on", st.r !== 50);
  $("tShade").classList.toggle("on", st.area);
  $("tRmsL").classList.toggle("on", st.rmsl);
  $("tCur").classList.toggle("on", st.cur);

  // --- LÓGICA DEL BOTÓN FFT ---
  const btnFft = $("tFft");
  if (btnFft) {
    btnFft.classList.toggle("on", st.fft);
    if (st.fft) {
      btnFft.style.background = "rgba(99, 102, 241, 0.16)";
      btnFft.style.color = "#818CF8";
      btnFft.style.borderColor = "rgba(99, 102, 241, 0.45)";
    } else {
      btnFft.style.background = "";
      btnFft.style.color = "";
      btnFft.style.borderColor = "";
    }
  }
}

function setTab(mathActive) {
  $("tabMetrics").classList.toggle("on", !mathActive);
  $("tabMath").classList.toggle("on", mathActive);
  $("viewMetrics").classList.toggle("hidden", mathActive);
  $("viewMath").classList.toggle("active", mathActive);
  playUiTick(600);
}

function radio(container, attr, cb) {
  $(container).addEventListener("click", e => {
    const b = e.target.closest(`[${attr}]`);
    if (b) {
      playUiTick(540);
      cb(b.getAttribute(attr));
    }
  });
}

export function initControls() {
  // Pestañas Telemetría / Cálculo Integral
  $("tabMetrics").onclick = () => setTab(false);
  $("tabMath").onclick = () => setTab(true);

  // Presets de señales base
  document.querySelectorAll("[data-preset]").forEach(card => {
    card.addEventListener("click", () => {
      const p = PRESETS[card.dataset.preset];
      if (!p) return;
      Object.assign(st, p);
      playUiTick(680);
      syncKeys();
      update();
      goTo("#workbench");
    });
  });

  $("btnTestLink").onclick = () => {
    playUiTick(660);
    goTo("#workbench");
  };

  // Forma de onda, modulación y paso
  radio("waves", "data-f", f => { st.forma = f; syncKeys(); update(); });
  radio("mods",  "data-m", m => { st.mod = m;   syncKeys(); update(); });
  radio("steps", "data-m", m => { st.mult = +m; syncKeys(); });

  // Botones del encabezado
  $("bRun").onclick = () => { st.run = !st.run; playUiTick(600); syncKeys(); };
  $("bCh1").onclick = () => { st.ch1 = !st.ch1; playUiTick(500); syncKeys(); syncAudioSynth(); };
  $("bOut").onclick = () => { st.out = !st.out; playUiTick(500); syncKeys(); lecturas(); syncAudioSynth(); };
  $("r50").onclick  = () => { st.r = 50;  playUiTick(550); syncKeys(); update(); };
  $("rhz").onclick  = () => { st.r = 1e6; playUiTick(550); syncKeys(); update(); };

  // Capas del osciloscopio (AHORA INCLUYE EL FFT)
  [["tShade", "area"], ["tRmsL", "rmsl"], ["tCur", "cur"], ["tFft", "fft"]].forEach(([id, k]) => {
    const btn = $(id);
    if (btn) {
      btn.onclick = () => { st[k] = !st[k]; playUiTick(640); syncKeys(); };
    }
  });

  // Botones +/− y clic en los displays digitales
  document.querySelectorAll(".nudge").forEach(b =>
    b.addEventListener("click", () => stepBy(b.dataset.k, +b.dataset.d)));
  document.querySelectorAll(".dc-value").forEach(b =>
    b.addEventListener("click", () => edit(b.dataset.k)));
}