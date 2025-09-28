import React from 'react'; // Asegúrate de importar React

/**
 * Componente GlitchText adaptado de reactbits.dev
 * Aplica un efecto glitch animado al texto hijo.
 * Utiliza Tailwind CSS para estilos y animaciones.
 * Asegúrate de añadir los keyframes y animations a tu tailwind.config.js.
 */
const GlitchText = ({
  children, // El texto o elemento a mostrar (puede ser un SVG)
  speed = 0.5, // Velocidad base de la animación (afecta duración)
  enableShadows = true, // Habilita las sombras roja/cyan
  enableOnHover = false, // Activa la animación solo al pasar el mouse (true/false)
  className = '', // Clases CSS adicionales para el contenedor principal
}) => {
  // Estilos en línea para pasar variables CSS (duración de animación)
  const inlineStyles = {
    '--after-duration': `${speed * 3}s`,
    '--before-duration': `${speed * 2}s`,
    '--after-shadow': enableShadows ? '-5px 0 red' : 'none', // Variable para sombra roja
    '--before-shadow': enableShadows ? '5px 0 cyan' : 'none', // Variable para sombra cyan
  };

  // Clases base de Tailwind para el contenedor
  // Ajustado el tamaño base para que sea más flexible con las clases pasadas en 'className'
  const baseClasses = 'font-black relative mx-auto select-none cursor-pointer'; // Quitamos tamaño y color base, se definen al usar el componente

  // Clases condicionales para los pseudo-elementos (::before, ::after)
  const pseudoClasses = !enableOnHover
    ? // Clases para animación siempre activa
      // Usamos inset-0 para que los pseudo-elementos cubran todo el contenedor
      // Usamos bg-inherit para que tomen el fondo del contenedor (útil si es transparente)
      // Usamos text-inherit para que tomen el color del contenedor
      'after:content-[attr(data-text)] after:absolute after:inset-0 after:text-inherit after:bg-inherit after:overflow-hidden after:[clip-path:inset(0_0_0_0)] after:[text-shadow:var(--after-shadow)] after:animate-glitch-after ' +
      'before:content-[attr(data-text)] before:absolute before:inset-0 before:text-inherit before:bg-inherit before:overflow-hidden before:[clip-path:inset(0_0_0_0)] before:[text-shadow:var(--before-shadow)] before:animate-glitch-before'
    : // Clases para animación solo en hover
      "after:content-[''] after:absolute after:inset-0 after:text-inherit after:bg-inherit after:overflow-hidden after:[clip-path:inset(0_0_0_0)] after:opacity-0 " +
      "before:content-[''] before:absolute before:inset-0 before:text-inherit before:bg-inherit before:overflow-hidden before:[clip-path:inset(0_0_0_0)] before:opacity-0 " +
      'hover:after:content-[attr(data-text)] hover:after:opacity-100 hover:after:[text-shadow:var(--after-shadow)] hover:after:animate-glitch-after ' +
      'hover:before:content-[attr(data-text)] hover:before:opacity-100 hover:before:[text-shadow:var(--before-shadow)] hover:before:animate-glitch-before';

  // Combina todas las clases
  const combinedClasses = `${baseClasses} ${className}`; // Añade las clases pasadas como prop

  return (
    // El div principal aplica los estilos en línea y las clases combinadas
    // data-text se usa para que los pseudo-elementos puedan copiar el contenido (importante si children es texto)
    // Si children es un SVG, data-text no es estrictamente necesario para el visual, pero no hace daño
    <div
      style={inlineStyles}
      data-text={typeof children === 'string' ? children : ''}
      className={combinedClasses}
    >
      {/* El contenido real (texto o SVG) se muestra aquí */}
      {children}
    </div>
  );
};

export default GlitchText;
