// El celular funcionando, dibujado en HTML.
//
// Acá había una captura de 264 KB: una foto quieta de la pantalla de venta, o
// sea la misma pantalla que ya se ve en la computadora de al lado. Repetía en
// chiquito lo que la otra mostraba en grande.
//
// Esto muestra lo que el celular hace y la computadora no puede: apuntar la
// cámara a un código y que el producto caiga en la caja. Son divs, pesa cero.
//
// Es decorativo: si alguien pidió menos movimiento, se queda en el paso donde
// el producto ya se envió, que es el que cuenta la historia completa.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useEnPantalla } from './scroll.jsx';

const PASOS = [
  { id: 'buscando', ms: 1500 },
  { id: 'leido', ms: 900 },
  { id: 'enviado', ms: 2200 },
];

// Un EAN cualquiera dibujado con barras de ancho variable: el patrón fijo hace
// que parezca un código real y no un rayado decorativo.
const BARRAS = [3, 1, 1, 2, 1, 3, 1, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1];

function MockupCelu() {
  const sinMovimiento = useReducedMotion();
  const [paso, setPaso] = useState(sinMovimiento ? PASOS.length - 1 : 0);

  // Igual que en el mockup de la computadora: los temporizadores esperan a que
  // el navegador termine de acomodar la página.
  const [listoParaAnimar, setListoParaAnimar] = useState(false);
  useEffect(() => {
    if (sinMovimiento) return undefined;
    const pedir = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
    const cancelar = window.cancelIdleCallback || clearTimeout;
    const id = pedir(() => setListoParaAnimar(true), { timeout: 2500 });
    return () => cancelar(id);
  }, [sinMovimiento]);

  // El ciclo se congela cuando el mockup no está en pantalla.
  const { ref: caja, visible } = useEnPantalla();

  useEffect(() => {
    if (sinMovimiento || !listoParaAnimar || !visible) return undefined;
    const t = setTimeout(
      () => setPaso((p) => (p + 1) % PASOS.length),
      PASOS[paso].ms,
    );
    return () => clearTimeout(t);
  }, [paso, sinMovimiento, listoParaAnimar, visible]);

  const actual = PASOS[paso].id;
  const leido = actual !== 'buscando';
  const enviado = actual === 'enviado';

  return (
    <div
      ref={caja}
      className="flex h-full w-full flex-col bg-zinc-950 px-2 pb-2 text-left text-[9px]"
    >
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <span className="font-semibold text-white">Escáner</span>
        <span className="text-[8px] text-zinc-500">Caja 1</span>
      </div>

      {/* --- EL VISOR DE LA CÁMARA --- */}
      <div className="relative flex-1 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/10">
        {/* El producto que la cámara está mirando. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="h-12 w-9 rounded-sm bg-gradient-to-b from-red-600 to-red-800 shadow-lg" />
          <div className="flex h-6 items-end gap-[2px] rounded bg-white px-1.5 py-1">
            {BARRAS.map((ancho, i) => (
              <span
                key={i}
                style={{ width: ancho }}
                className="h-full bg-zinc-900"
              />
            ))}
          </div>
        </div>

        {/* Las esquinas del encuadre, que se ponen verdes al leer. */}
        {[
          'left-2 top-2 border-l-2 border-t-2',
          'right-2 top-2 border-r-2 border-t-2',
          'bottom-2 left-2 border-b-2 border-l-2',
          'bottom-2 right-2 border-b-2 border-r-2',
        ].map((pos) => (
          <div
            key={pos}
            className={
              'absolute h-4 w-4 rounded-[3px] transition-colors duration-300 ' +
              pos +
              (leido ? ' border-emerald-400' : ' border-white/50')
            }
          />
        ))}

        {/* La línea que barre el visor: es lo que hace que se lea como una
            cámara buscando y no como una foto. */}
        {!sinMovimiento && !leido && visible && (
          <motion.div
            animate={{ y: ['15%', '85%', '15%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-x-3 top-0 h-px bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]"
          />
        )}

        {/* El destello del momento en que engancha el código. */}
        <AnimatePresence>
          {leido && !sinMovimiento && (
            <motion.div
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-emerald-400"
            />
          )}
        </AnimatePresence>
      </div>

      {/* --- LO QUE PASA DESPUÉS DE LEER --- */}
      <div className="mt-1.5 h-[52px] shrink-0">
        <AnimatePresence mode="wait">
          {enviado ? (
            <motion.div
              key="enviado"
              initial={sinMovimiento ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex h-full flex-col justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2"
            >
              <span className="truncate font-medium text-white">
                Coca-Cola 2.25 L
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-emerald-400">
                <Check size={11} strokeWidth={3} />
                Agregado a la venta
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="buscando"
              initial={sinMovimiento ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full items-center justify-center rounded-lg border border-white/10 px-2 text-center text-zinc-500"
            >
              {leido ? 'Enviando a la caja...' : 'Apuntá al código de barras'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default MockupCelu;
