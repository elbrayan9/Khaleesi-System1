import React, { useRef, useState, useEffect } from 'react';

/**
 * Wrapper component that tracks mouse position relative to itself.
 * Exposes CSS variables --mouse-x and --mouse-y to its children.
 * Used for the "spotlight" hover effect.
 */
const HoverEffectWrapper = ({ children, className = '' }) => {
  const containerRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [spotlightColor, setSpotlightColor] = useState(
    'rgba(255, 255, 255, 0.1)',
  );

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setOpacity(1);

    // Detectar color de la tarjeta
    const card = e.target.closest('[data-glow-color]');
    if (card) {
      setSpotlightColor(card.getAttribute('data-glow-color'));
    } else {
      setSpotlightColor('rgba(255, 255, 255, 0.1)'); // Color por defecto (blanco suave en gaps)
    }
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{
        '--mouse-x': `${position.x}px`,
        '--mouse-y': `${position.y}px`,
        '--spotlight-opacity': opacity,
        '--spotlight-color': spotlightColor,
      }}
    >
      {/* Spotlight Overlay */}
      <div
        className="pointer-events-none absolute -inset-px z-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 40%)`,
        }}
      />
      {children}
    </div>
  );
};

export default HoverEffectWrapper;
