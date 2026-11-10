// Estado compartido: lo único que otros módulos pueden modificar

// Valores objetivo (lo que pide el usuario)
export const st = {
  forma: "senoidal", mod: "none",
  amp: 5.9, freq: 150, r: 50, mult: 1,
  area: true, rmsl: true, cur: true, sfx: true,
  ch1: true, out: true, run: true, audio: false,
  fft: false
};

// Valores animados (se acercan a `st` suavemente)
export const anim = { amp: 5.9, freq: 150, phase: 0, globeAngle: 0 };

export const RANGE = {
  freq: { min: 10,  max: 1000, base: 1 },
  amp:  { min: 0.1, max: 10,   base: 0.1 },
};

// Estado de la simulación (objeto para poder reasignar sus campos desde otros módulos)
export const sim = { W: 0, H: 0, data: null, mouse: null };

// Registro de funciones que repintan cada perilla: knobs.freq(), knobs.amp()
export const knobs = {};