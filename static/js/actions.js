import { RANGE, st } from "./state.js";
import { clampV } from "./utils.js";
import { playUiTick } from "./audio.js";
import { update } from "./api.js";

// Sube o baja un valor usando el multiplicador de paso
export function stepBy(k, d) {
  st[k] = clampV(k, st[k] + d * RANGE[k].base * st.mult);
  playUiTick(620);
  update();
}

// Pide un valor exacto escrito
export function edit(k) {
  const v = prompt(
    (k === "freq" ? "Frecuencia (Hz)" : "Amplitud (V)") + ` [${RANGE[k].min} – ${RANGE[k].max}]`,
    st[k]
  );
  if (v !== null && v.trim() !== "" && Number.isFinite(+v)) {
    st[k] = clampV(k, +v);
    playUiTick(700);
    update();
  }
}