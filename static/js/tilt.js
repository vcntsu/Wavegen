export function initTilt() {
  // Ignorar en móviles para no interferir con el touch/scroll
  if (window.matchMedia("(pointer: coarse)").matches) return;

  // Seleccionamos SOLO la tarjeta flotante del Hero
  const cards = document.querySelectorAll('.floating-card-main');

  cards.forEach(card => {
    // Aplicamos la clase base
    card.classList.add('tilt-card');

    card.addEventListener('mousemove', (e) => {
      // 1. Obtener dimensiones y posición de la tarjeta
      const rect = card.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // 2. Coordenadas del ratón dentro de la tarjeta
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 3. Posición porcentual respecto al centro (-1 a 1)
      const percentX = (x / width) * 2 - 1;
      const percentY = (y / height) * 2 - 1;

      // 4. Límite de inclinación: 8 grados + la inclinación base por defecto
      const maxAngle = 8;
      const baseRotateX = 3;  // Inclinación X por defecto
      const baseRotateY = -5; // Inclinación Y por defecto
      
      const rotateX = baseRotateX + (percentY * -maxAngle);
      const rotateY = baseRotateY + (percentX * maxAngle);

      // 5. Aplicar Transformación y variables CSS para el brillo
      requestAnimationFrame(() => {
        card.classList.add('is-moving');
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        
        // Mapear X e Y a porcentajes (0% a 100%) para el CSS radial-gradient
        card.style.setProperty('--glare-x', `${(x / width) * 100}%`);
        card.style.setProperty('--glare-y', `${(y / height) * 100}%`);
      });
    });

    card.addEventListener('mouseenter', () => {
      card.classList.add('is-hovered');
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('is-moving', 'is-hovered');
      
      // 6. Físicas de restauración: volver a la inclinación isométrica por defecto
      card.style.transform = `perspective(1000px) rotateX(3deg) rotateY(-5deg) scale3d(1, 1, 1)`;
    });
  });
}