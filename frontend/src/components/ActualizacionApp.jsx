// src/components/ActualizacionApp.jsx
//
// Avisa cuando hay una versión nueva instalada por el service worker. Sin esto,
// quien tenga la app abierta se queda con la versión vieja pegada.

import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

function ActualizacionApp() {
  const [oculto, setOculto] = useState(false);
  const {
    needRefresh: [necesitaRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Error registrando el service worker:', error);
    },
  });

  if (!necesitaRefresh || oculto) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-3 rounded-full border border-blue-500/40 bg-zinc-800 px-4 py-2 shadow-lg">
      <span className="text-xs font-medium text-zinc-200">
        Hay una versión nueva del sistema
      </span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Actualizar
      </button>
      <button
        type="button"
        onClick={() => setOculto(true)}
        className="rounded-full p-1 text-zinc-400 hover:text-white"
        aria-label="Cerrar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default ActualizacionApp;
