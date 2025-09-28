// frontend/src/components/Footer.jsx

import React from 'react';

function Footer() {
  // Obtenemos el año actual dinámicamente para que no tengas que cambiarlo cada año.
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-white/10 p-4 text-center">
      <p className="text-xs text-zinc-400">
        &copy; {currentYear} Khaleesi System. Todos los derechos reservados.
      </p>
    </footer>
  );
}

export default Footer;
