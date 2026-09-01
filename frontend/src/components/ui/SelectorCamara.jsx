// Elegir con qué cámara se lee, y prender la luz.
//
// Existe porque el sistema no siempre acierta solo. Android expone la gran
// angular, la macro y hasta el sensor de profundidad como si fueran cámaras
// comunes, y ninguna de esas enfoca a 20 cm: si el navegador agarra una, el
// código no se lee nunca y no hay nada en pantalla que explique por qué.
//
// El mismo control en las tres pantallas que usan la cámara —la pistola, la
// carga con cámara y el escaneo con IA— para que quien lo aprendió en una lo
// encuentre en las otras.

import React from 'react';
import { Flashlight } from 'lucide-react';
import { nombreDeCamara } from '../../utils/lectorCamara.js';

function SelectorCamara({
  camaras = [],
  elegida,
  onElegir,
  tieneLinterna = false,
  linterna = false,
  onLinterna,
  id = 'camara',
}) {
  // Con una sola cámara no hay nada que elegir, y sin linterna no hay nada que
  // prender: no se muestra un control que no hace nada.
  if (camaras.length < 2 && !tieneLinterna) return null;

  return (
    <div className="mt-3 flex items-end gap-2">
      {camaras.length > 1 && (
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="mb-1 block text-xs text-zinc-400">
            ¿No lee? Probá con otra cámara
          </label>
          <select
            id={id}
            value={elegida || ''}
            onChange={(e) => onElegir?.(e.target.value)}
            className="w-full rounded-md border border-zinc-600 bg-zinc-800 p-2 text-sm text-zinc-100"
          >
            {camaras.map((c, i) => (
              <option key={c.deviceId || i} value={c.deviceId}>
                {nombreDeCamara(c, i)}
              </option>
            ))}
          </select>
        </div>
      )}

      {tieneLinterna && (
        <button
          type="button"
          onClick={onLinterna}
          aria-label={linterna ? 'Apagar la luz' : 'Prender la luz'}
          title={linterna ? 'Apagar la luz' : 'Prender la luz'}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
            linterna
              ? 'bg-amber-400 text-zinc-900'
              : 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
          }`}
        >
          <Flashlight className="h-4 w-4" />
          Luz
        </button>
      )}
    </div>
  );
}

export default SelectorCamara;
