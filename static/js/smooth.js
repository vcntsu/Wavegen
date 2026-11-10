// Scroll con inercia (Lenis) y navegación por anclas con la misma suavidad
let lenis = null;

function scrollToEl(selector) {
  if (selector === "#inicio") {
    lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.querySelector(selector);
  if (!el) return;
  lenis ? lenis.scrollTo(el, { offset: -80 }) : el.scrollIntoView({ behavior: "smooth" });
}

// Disponible para otros módulos sin necesidad de importarlo
window.wgScrollTo = scrollToEl;

export function initSmoothScroll() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !window.Lenis) return;   // si no carga la librería, queda el scroll normal

  lenis = new window.Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);

  // Los enlaces del menú (#pilares, #workbench…) usan el mismo scroll suave
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    e.preventDefault();
    scrollToEl(id);
  });
}