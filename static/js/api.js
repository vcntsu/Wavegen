import { st, sim, knobs } from "./state.js";
import { $ } from "./utils.js";
import { synthWave } from "./signals.js";
import { lecturas } from "./readouts.js";
import { syncAudioSynth } from "./audio.js";

let busy = false, dirty = false;

// Cambio inmediato en pantalla y luego confirmación con Python
export function update() {
  knobs.freq();
  knobs.amp();
  
  // Generamos la onda localmente para no tener latencia
  const localWave = synthWave(st.forma, st.mod, st.amp, st.freq, st.r, 0);
  
  // FIX: Preservamos los datos de la FFT anterior mientras llega la nueva respuesta de Docker
  // Esto evita el parpadeo (flickering) al mover las perillas.
  if (sim.data && sim.data.fft_f) {
    localWave.fft_f = sim.data.fft_f;
    localWave.fft_mag = sim.data.fft_mag;
  }
  
  sim.data = localWave;
  
  lecturas();
  syncAudioSynth();
  pedir();
}

// Pide los cálculos a Python (una petición a la vez para no saturar)
export async function pedir() {
  if (busy) { dirty = true; return; }
  busy = true;
  try {
    const q = `forma=${st.forma}&mod=${st.mod}&amp=${st.amp}&freq=${st.freq}&r=${st.r}`;
    const res = await fetch(`/api/onda?${q}`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    sim.data = await res.json();
    $("engine").textContent = "● DOCKER ENGINE ONLINE";
    lecturas();
  } catch (e) {
    $("engine").textContent = "● LOCAL ENGINE ACTIVE";
  }
  busy = false;
  if (dirty) { dirty = false; pedir(); }
}