// Síntesis de la onda en el navegador (animación a 60 FPS y vista previa inmediata)
export function synthWave(forma, mod, amp, freq, r, phaseShift = 0) {
  const cycles = mod === "none" ? 3 : 6;
  const tspan = cycles / freq;
  const N = 460;
  const t = new Array(N), v = new Array(N);
  let sumSq = 0;
  const fm = freq / 6;

  for (let i = 0; i < N; i++) {
    const ti = (i / (N - 1)) * tspan;
    t[i] = ti;
    const ph = 2 * Math.PI * freq * ti + phaseShift;
    let base = 0;
    if (forma === "senoidal") base = Math.sin(ph);
    else if (forma === "cuadrada") base = Math.sin(ph) >= 0 ? 1 : -1;
    else if (forma === "triangular") base = (2 / Math.PI) * Math.asin(Math.sin(ph));
    else if (forma === "diente") {
      const p = (ph / (2 * Math.PI)) % 1;
      const norm = p < 0 ? p + 1 : p;
      base = 2 * norm - 1;
    }

    let val = amp * base;
    if (mod === "am") {
      val = amp * ((1 + 0.5 * Math.sin(2 * Math.PI * fm * ti)) / 1.5) * base;
    } else if (mod === "fm") {
      val = amp * Math.sin(ph + 2.5 * Math.sin(2 * Math.PI * fm * ti));
    }
    v[i] = val;
    sumSq += val * val;
  }

  const rms = Math.sqrt(sumSq / N);
  const db = 20 * Math.log10(Math.max(rms, 1e-12));
  const potencia = (rms * rms) / r;
  return { t, v, rms, db, potencia, cycles };
}