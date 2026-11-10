import { RANGE, st } from "./state.js";

export const $ = id => document.getElementById(id);

export const clampV = (k, v) =>
  +Math.min(RANGE[k].max, Math.max(RANGE[k].min, v)).toFixed(3);

export const niceV = a => [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10].find(x => x >= a / 3.4) || 10;

export const fFreq = f =>
  f >= 1000 ? (f / 1000).toFixed(2) + " kHz" : (Number.isInteger(f) ? f : f.toFixed(1)) + " Hz";

export const fTime = s =>
  s >= 1 ? s.toFixed(3) + " s" :
  s >= 1e-3 ? (s * 1e3).toFixed(2) + " ms" :
  (s * 1e6).toFixed(1) + " µs";

export const fR = () => st.r === 50 ? "50 Ω" : "1 MΩ";