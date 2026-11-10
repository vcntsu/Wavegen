import { st } from "./state.js";
import { $ } from "./utils.js";

/* ==========================================================================
   AJUSTES
   ========================================================================== */
const MAX_GAIN  = 0.4;    // volumen máximo de salida (0 a 1)
const AM_DEPTH  = 0.5;    // profundidad AM (igual que la onda dibujada)
const FM_BETA   = 2.5;    // índice FM (igual que la onda dibujada)
const UI_CLICKS = false;  // clics al mover controles (desactivados: causaban saturación)

/* ==========================================================================
   MOTOR DE AUDIO
   Cadena: oscilador -> AM -> filtro -> volumen -> limitador -> salida
   ========================================================================== */
let ac = null;
let osc, lfo, amGain, lfoToAm, lfoToFm, tone, master, limiter;

export function initAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
  const t0 = ac.currentTime;

  limiter = ac.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-6, t0);
  limiter.knee.setValueAtTime(6, t0);
  limiter.ratio.setValueAtTime(12, t0);
  limiter.attack.setValueAtTime(0.003, t0);
  limiter.release.setValueAtTime(0.2, t0);

  master = ac.createGain();
  master.gain.setValueAtTime(0, t0);

  tone = ac.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.setValueAtTime(9000, t0);
  tone.Q.setValueAtTime(0.5, t0);

  amGain = ac.createGain();

  amGain.connect(tone);
  tone.connect(master);
  master.connect(limiter);
  limiter.connect(ac.destination);

  osc = ac.createOscillator();
  osc.connect(amGain);

  // Modulador (mismo f/6 que la onda del osciloscopio)
  lfo = ac.createOscillator();
  lfoToAm = ac.createGain();
  lfoToFm = ac.createGain();
  lfoToAm.gain.setValueAtTime(0, t0);
  lfoToFm.gain.setValueAtTime(0, t0);
  lfo.connect(lfoToAm); lfoToAm.connect(amGain.gain);
  lfo.connect(lfoToFm); lfoToFm.connect(osc.frequency);

  osc.start();
  lfo.start();
}

// Se mantiene para no romper los imports; solo suena si UI_CLICKS = true
export function playUiTick() {
  if (!UI_CLICKS || !st.sfx || !ac) return;
}

// Sincroniza el sonido con el estado (forma, frecuencia, amplitud, modulación)
export function syncAudioSynth() {
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();

  const t = ac.currentTime;
  const TC = 0.04;                              // suavizado: evita clics al mover perillas
  const active = st.audio && st.out && st.ch1;

  const types = { senoidal: "sine", cuadrada: "square", triangular: "triangle", diente: "sawtooth" };
  const newType = types[st.forma] || "sine";
  if (osc.type !== newType) osc.type = newType;
  osc.frequency.setTargetAtTime(st.freq, t, TC);

  // Modulación AM / FM, igual que la onda dibujada
  const isAM = st.mod === "am", isFM = st.mod === "fm";
  const fm = st.freq / 6;
  lfo.frequency.setTargetAtTime(fm, t, TC);
  amGain.gain.setTargetAtTime(isAM ? 1 / (1 + AM_DEPTH) : 1, t, TC);
  lfoToAm.gain.setTargetAtTime(isAM ? AM_DEPTH / (1 + AM_DEPTH) : 0, t, TC);
  lfoToFm.gain.setTargetAtTime(isFM ? FM_BETA * fm : 0, t, TC);

  // Volumen
  const slider = +$("volSlider").value / 100;
  const vol = slider * slider * MAX_GAIN;
  const ampGain = Math.max(0.04, st.amp / 10);
  const loud = st.freq < 300 ? Math.min(2.2, Math.pow(300 / st.freq, 0.4)) : 1;
  master.gain.setTargetAtTime(active ? vol * ampGain * loud : 0, t, 0.06);
}

// Botones de audio, volumen y SFX
export function initAudioControls() {
  $("bAudio").onclick = () => {
    initAudio();
    if (ac.state === "suspended") ac.resume();
    st.audio = !st.audio;
    $("bAudio").classList.toggle("on", st.audio);
    $("bAudio").textContent = st.audio ? "🔊 Audio: ON" : "🔈 Audio: OFF";
    syncAudioSynth();
  };
  $("volSlider").addEventListener("input", syncAudioSynth);

  $("bSfx").onclick = () => {
    st.sfx = !st.sfx;
    $("bSfx").classList.toggle("on", st.sfx);
  };
}