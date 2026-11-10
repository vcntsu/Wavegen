import { st, sim } from "./state.js";
import { $, fR, fFreq, fTime } from "./utils.js";
import { synthWave } from "./signals.js";

// Fórmulas con KaTeX (se renderizan una sola vez)
export function renderKaTeX() {
  if (!window.katex) return;
  window.katex.render(
    String.raw`V_{\text{RMS}} = \sqrt{\frac{1}{T} \int_{0}^{T} [v(t)]^2 \, dt}`,
    $("katexRms"), { throwOnError: false }
  );
  window.katex.render(
    String.raw`\text{dBV} = 20 \log_{10}\!\left(\frac{V_{\text{RMS}}}{1\,\text{V}}\right)`,
    $("katexDbv"), { throwOnError: false }
  );
  window.katex.render(
    String.raw`\text{dBm} = 10 \log_{10}\!\left(\frac{P}{1\,\text{mW}}\right)`,
    $("katexDbm"), { throwOnError: false }
  );
}

export function initReadouts() {
  window.addEventListener("load", renderKaTeX);
}

// Actualiza todos los textos numéricos de la página
export function lecturas() {
  $("dF").textContent = fFreq(st.freq);
  $("dA").textContent = st.amp.toFixed(2) + " V";

  const src = sim.data || synthWave(st.forma, st.mod, st.amp, st.freq, st.r, 0);
  const off = !st.out;
  const T = st.mod === "none" ? 1 / st.freq : 6 / st.freq;
  const vmax = Math.max(...src.v), vmin = Math.min(...src.v);
  const peak = Math.max(Math.abs(vmax), Math.abs(vmin));
  const P = src.potencia, E = P * T, I = src.rms * src.rms * T;
  const dbm = 10 * Math.log10(Math.max(P, 1e-15) / 0.001), D = "---";

  // Telemetría
  $("tRms").textContent = off ? D : src.rms.toFixed(4) + " V";
  $("tVp").textContent  = off ? D : peak.toFixed(3) + " V";
  $("tVpp").textContent = off ? D : (vmax - vmin).toFixed(3) + " V";
  $("tDb").textContent  = off ? D : src.db.toFixed(2) + " dBV";
  $("tDbm").textContent = off ? D : dbm.toFixed(2) + " dBm";
  $("tPl").textContent  = "Potencia (" + fR() + ")";
  $("tP").textContent   = off ? D : P.toExponential(3) + " W";
  $("tE").textContent   = off ? D : E.toExponential(3) + " J";
  $("tT").textContent   = fTime(T);

  // Preview del hero
  $("heroRms").textContent  = src.rms.toFixed(3) + " V";
  $("heroDb").textContent   = src.db.toFixed(2) + " dBV";
  $("heroFreq").textContent = fFreq(st.freq);

  // Sección red telecom
  $("netDbm").textContent       = dbm.toFixed(2) + " dBm";
  $("netEnergy").textContent    = E.toExponential(3) + " J";
  $("netQuickFreq").textContent = "Frecuencia: " + fFreq(st.freq);
  $("netQuickAmp").textContent  = "Tensión Pico: " + st.amp.toFixed(2) + " V";

  // Expresión de v(t)
  const A = st.amp.toFixed(2), f = st.freq;
  const expr = {
    senoidal:   `v(t) = ${A}·sen(2π·${f}t)`,
    cuadrada:   `v(t) = ${A}·sgn(sen(2π·${f}t))`,
    triangular: `v(t) = ${A}·tri(2π·${f}t)`,
    diente:     `v(t) = ${A}·saw(2π·${f}t)`,
  }[st.forma];
  $("mV").textContent = expr;

  // Tarjetas de cálculo integral
  const Ims = (I * 1e3).toFixed(3);
  $("eqAreaVal").textContent = off ? D : `${Ims} V²·ms`;
  $("eqRmsVal").textContent  = off ? D : `${src.rms.toFixed(4)} V`;
  $("eqDbvVal").textContent  = off ? D : `${src.db.toFixed(2)} dBV`;
  $("eqWattVal").textContent = off ? D : `${P.toExponential(2)} W`;
  $("eqDbmVal").textContent  = off ? D : `${dbm.toFixed(2)} dBm`;
}