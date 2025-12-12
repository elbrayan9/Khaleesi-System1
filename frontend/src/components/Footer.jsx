import React from 'react';
import AppLogo from './AppLogo';

function Footer({ simple = false }) {
  const currentYear = new Date().getFullYear();

  if (simple) {
    return (
      <footer className="mt-auto w-full border-t border-zinc-800 bg-transparent py-4 text-center">
        <p className="text-xs text-zinc-500">
          &copy; {currentYear} Khaleesi System. Todos los derechos reservados.
        </p>
      </footer>
    );
  }

  return (
    <footer className="mt-auto w-full border-t border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-start">
          {/* Left Side: Logo & Name */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 text-blue-500">
                <AppLogo />
              </div>
              <span className="text-2xl font-bold text-white">
                Khaleesi System
              </span>
            </div>
            <p className="mt-4 text-sm text-zinc-400">
              &copy; {currentYear} Khaleesi System. Todos los derechos
              reservados.
            </p>
          </div>

          {/* Right Side: Contact Info */}
          <div className="flex flex-col items-center text-center md:items-end md:text-right">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
              Contacto
            </h4>
            <div className="space-y-2 text-sm text-zinc-400">
              <p>+54 9 3541 21-5803</p>
              <p>khaleesisystempos@gmail.com</p>
              <p>Córdoba, Argentina</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
