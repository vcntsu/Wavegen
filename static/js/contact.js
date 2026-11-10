import { $ } from "./utils.js";

const EMAIL = "vicentegalvezcl@gmail.com";

export function initContact() {
  const btn = $("btnCopyMail");
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      btn.textContent = "¡Copiado!";
      btn.classList.add("ok");
    } catch {
      btn.textContent = "Selecciona y copia";
    }
    setTimeout(() => { btn.textContent = "Copiar"; btn.classList.remove("ok"); }, 1800);
  });
}