import { initPage } from "./page.js";
import { initAudioControls } from "./audio.js";
import { initKnobs } from "./knobs.js";
import { initControls, syncKeys } from "./controls.js";
import { initScope, renderScope } from "./scope.js";
import { initReadouts } from "./readouts.js";
import { initContact } from "./contact.js";
import { update } from "./api.js";
import { initTilt } from "./tilt.js";

// Cada bloque va aislado: si uno falla, el error sale en consola y los demás siguen
const safe = (name, fn) => {
  try { fn(); } catch (e) { console.error(`[${name}] falló:`, e); }
};

// 1) Lo esencial de la página (menú, aparición de secciones): siempre primero
safe("page", initPage);
safe("tilt", initTilt);

// 2) Extra opcional: si falla, solo se pierde la inercia del scroll
import("./smooth.js")
  .then(m => m.initSmoothScroll())
  .catch(err => console.warn("Scroll suave desactivado:", err));

// 3) Simulador
safe("audio",    initAudioControls);
safe("knobs",    initKnobs);        // las perillas deben existir antes del primer update()
safe("controls", initControls);
safe("scope",    initScope);
safe("readouts", initReadouts);
safe("contact",  initContact);

safe("inicio", () => {
  syncKeys();
  update();
  requestAnimationFrame(renderScope);
});
