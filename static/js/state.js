// Escalas físicas estándar de un osciloscopio (secuencia 1-2-5)
export const VDIV_STEPS = [0.2, 0.5, 1.0, 2.0, 5.0, 10.0]; // V/div (8 divisiones verticales)
export const TDIV_STEPS = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02]; // s/div (10 div horiz)

// Valores objetivo (lo que pide el usuario)
export const st = {
  forma: "senoidal", mod: "none",
  amp: 5.9, freq: 150, r: 50, mult: 1,
  area: true, rmsl: true, cur: true, sfx: true,
  ch1: true, out: true, run: true, audio: false,
  fft: false,

  // --- CONTROLES FÍSICOS DEL OSCILOSCOPIO (CH1 + BASE DE TIEMPO) ---
  vdivIdx: 3,         // 2.0 V/div por defecto
  tdivIdx: 4,         // 2.0 ms/div por defecto
  posY: 0.0,          // Desplazamiento vertical CH1 en divisiones
  posX: 0.0,          // Desplazamiento horizontal en divisiones
  coupling: "DC",     // "DC" | "AC" | "GND"

  // --- CANAL 2 (CH2) Y ÁLGEBRA MULTICANAL (MATH / X-Y) ---
  ch2: false,         // Activar/desactivar CH2
  forma2: "senoidal", // Forma de onda CH2
  amp2: 4.0,          // Amplitud pico CH2 (V)
  phase2: 90,         // Desfase de CH2 respecto a CH1 en grados (0° a 360°)
  posY2: 0.0,         // Posición vertical CH2
  mathMode: "OFF",    // "OFF" | "ADD" (CH1+CH2) | "SUB" (CH1-CH2)
  xyMode: false,      // Modo X-Y (Figuras de Lissajous)

  // --- CURSORES MANUALES DIFERENCIALES (ΔV y Δt) ---
  manCur: false,      // Mostrar cursores arrastrables T1, T2, V1, V2
  curT1: 0.28,        // Fracción horizontal cursor T1 (0 a 1)
  curT2: 0.72,        // Fracción horizontal cursor T2 (0 a 1)
  curV1: 1.5,         // Nivel de voltaje cursor V1 (en divisiones desde el centro)
  curV2: -1.5,        // Nivel de voltaje cursor V2 (en divisiones desde el centro)

  // --- SISTEMA DE DISPARO (TRIGGER) ---
  // Inicia en "FREE" para que la onda se mueva suave y fluida como antes;
  // cambia a "AUTO" o "NORM" cuando quieras anclarla al nivel de disparo.
  trigMode: "FREE",   // "AUTO" | "NORM" | "FREE"
  trigSlope: "RISE",  // "RISE" (Flanco subida ↑) | "FALL" (Flanco bajada ↓)
  trigLvl: 0.0        // Nivel de voltaje de disparo en V
};

// Valores animados (se acercan a `st` suavemente a 60 FPS)
export const anim = {
  amp: 5.9,
  amp2: 4.0,
  freq: 150,
  phase: 0,
  globeAngle: 0,
  vdiv: 2.0,
  tdiv: 0.002,
  posY: 0.0,
  posY2: 0.0,
  posX: 0.0,
  trigLvl: 0.0
};

export const RANGE = {
  freq: { min: 10,  max: 1000, base: 1 },
  amp:  { min: 0.1, max: 10,   base: 0.1 },
};

// Estado de la simulación
export const sim = {
  W: 0, H: 0,
  data: null,
  mouse: null,
  trigLocked: false,
  dragCursor: null
};

// Registro de funciones que repintan cada perilla
export const knobs = {};