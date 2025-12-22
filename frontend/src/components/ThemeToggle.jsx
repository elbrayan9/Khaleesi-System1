import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
  const { theme, toggleTheme: contextToggleTheme } = useAppContext();

  const handleToggleTheme = async (e) => {
    // Si el navegador no soporta View Transitions, cambiamos el tema directamente
    if (!document.startViewTransition) {
      contextToggleTheme();
      return;
    }

    // Coordenadas del clic para iniciar la animación desde ahí
    const x = e.clientX;
    const y = e.clientY;

    // Calcular la distancia más lejana desde el clic hasta una esquina
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    );

    // Iniciar la transición
    const transition = document.startViewTransition(() => {
      contextToggleTheme();
    });

    // Esperar a que el DOM se actualice
    await transition.ready;

    // Animar el círculo (clip-path)
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    // Animamos el pseudo-elemento ::view-transition-new(root)
    // que es la NUEVA vista (el tema entrante) expandiéndose sobre la vieja.
    document.documentElement.animate(
      {
        clipPath: clipPath,
      },
      {
        duration: 500,
        easing: 'ease-in-out',
        // Siempre animamos el 'new' porque en CSS pusimos z-index: 9999 al new
        pseudoElement: '::view-transition-new(root)',
      },
    );
  };

  return (
    <button
      onClick={handleToggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 p-0 text-zinc-900 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/80 dark:focus-visible:ring-zinc-300"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          scale: theme === 'dark' ? 1 : 0,
          opacity: theme === 'dark' ? 1 : 0,
          rotate: theme === 'dark' ? 0 : 90,
        }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Moon className="h-5 w-5" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          scale: theme === 'light' ? 1 : 0,
          opacity: theme === 'light' ? 1 : 0,
          rotate: theme === 'light' ? 0 : -90,
        }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Sun className="h-5 w-5" />
      </motion.div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};

export default ThemeToggle;
