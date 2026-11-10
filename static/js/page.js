import { $ } from "./utils.js";

// Navbar con fondo al hacer scroll, menú móvil y animación de entrada por secciones
export function initPage() {
  window.addEventListener("scroll", () => {
    $("topbarWrap").classList.toggle("scrolled", window.scrollY > 24);
  }, { passive: true });

  $("mobileMenuBtn").onclick = () => $("mobileDrawer").classList.toggle("open");
  document.querySelectorAll("#mobileDrawer a").forEach(a => {
    a.addEventListener("click", () => $("mobileDrawer").classList.remove("open"));
  });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
}