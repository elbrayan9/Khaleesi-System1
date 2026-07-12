// frontend/src/components/Tilt3D.jsx
//
// Envuelve un contenido y le da un efecto 3D que sigue al mouse (tilt),
// con springs suaves y perspectiva. Respeta prefers-reduced-motion.

import React, { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';

export default function Tilt3D({
  children,
  className = '',
  max = 12, // inclinación máxima en grados
  scale = 1.02, // zoom sutil al pasar el mouse
  glare = true, // brillo que sigue al cursor
}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const spring = { stiffness: 150, damping: 15, mass: 0.4 };
  const sx = useSpring(mx, spring);
  const sy = useSpring(my, spring);

  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);

  // Posición del brillo (glare) que sigue al cursor.
  const glareX = useTransform(sx, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(sy, [-0.5, 0.5], ['0%', '100%']);
  const glareBackground = useTransform(
    [glareX, glareY],
    ([x, y]) =>
      `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.35), transparent 45%)`,
  );

  const handleMove = (e) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ perspective: 1200 }}
      className={className}
    >
      <motion.div
        className="relative h-full w-full"
        style={{
          rotateX: reduce ? 0 : rotateX,
          rotateY: reduce ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        whileHover={reduce ? {} : { scale }}
        transition={{ scale: { duration: 0.3, ease: 'easeOut' } }}
      >
        {children}

        {glare && !reduce && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] mix-blend-soft-light"
            style={{ background: glareBackground }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
