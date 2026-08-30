// El comprobante saliendo de la impresora.
//
// Antes esto era una tarjeta con un papel apareciendo por detrás. Ahora es una
// impresora: una carcasa con la pantalla del cobro arriba y una ranura de
// salida abajo, y el papel emergiendo de esa ranura.
//
// El truco es de capas: el papel vive detrás de la carcasa (z-0) y arranca
// desplazado hacia arriba, escondido; cuando llega la fase de impresión baja
// deslizándose. Como la carcasa es opaca y está por delante, el papel parece
// nacer de la ranura.
//
// Tres fases: procesando, imprimiendo, listo.

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Home, Loader2 } from 'lucide-react';

const pesos = (n) =>
  n.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SUBTOTAL = 28925.62;
const IVA = 6074.38;
const TOTAL = SUBTOTAL + IVA;

const FASES = [
  { id: 'procesando', texto: 'Procesando el cobro', ms: 2000 },
  { id: 'imprimiendo', texto: 'Imprimiendo el ticket', ms: 2600 },
  { id: 'listo', texto: 'Venta completada', ms: 3400 },
];

// El corte dentado del papel, como el que deja una impresora térmica.
//
// Va en una tira propia debajo del ticket y no como máscara del papel entero:
// aplicada al elemento completo, con repetición horizontal y anclada abajo, la
// máscara deja fuera todo el cuerpo y el ticket se vuelve invisible.
const TIRA_DENTADA = {
  height: '10px',
  backgroundColor: '#f5f2ea',
  maskImage: 'radial-gradient(circle at 5px 0, transparent 5px, black 5.5px)',
  maskSize: '10px 10px',
  maskRepeat: 'repeat-x',
  WebkitMaskImage:
    'radial-gradient(circle at 5px 0, transparent 5px, black 5.5px)',
  WebkitMaskSize: '10px 10px',
  WebkitMaskRepeat: 'repeat-x',
};

// Las rayas del código de barras. Anchos fijos y no aleatorios: si cambiaran en
// cada render, el ticket "parpadearía" a cada actualización.
const RAYAS = [
  3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3,
  2, 1, 1, 2, 3, 1, 2, 1, 1, 3,
];

// Los datos del pie del ticket, en pares etiqueta/valor: alineados en dos
// columnas se leen como un comprobante y no como un párrafo suelto.
const PIE = [
  ['Comprobante', '0001-00004821'],
  ['Pagado con', 'Mercado Pago'],
  ['Fecha', '29 AGO 2026 · 14:32'],
];

function TicketImprimiendose() {
  const sinMovimiento = useReducedMotion();
  const [fase, setFase] = useState(sinMovimiento ? 2 : 0);
  const carcasaRef = useRef(null);
  const [altoCarcasa, setAltoCarcasa] = useState(0);

  // Se mide LA CARCASA, no el papel: el ticket tiene que bajar hasta que su
  // borde superior quede en la ranura, y eso depende de cuánto mide la
  // impresora. Midiendo el papel —como hacía antes— un ticket más largo se
  // desliza de más y queda flotando, despegado del aparato.
  useEffect(() => {
    const medir = () => setAltoCarcasa(carcasaRef.current?.offsetHeight || 0);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  useEffect(() => {
    if (sinMovimiento) return undefined;
    const t = setTimeout(
      () => setFase((f) => (f + 1) % FASES.length),
      FASES[fase].ms,
    );
    return () => clearTimeout(t);
  }, [fase, sinMovimiento]);

  const imprimiendo = fase >= 1;
  const listo = fase === 2;

  return (
    <div className="relative mx-auto w-full max-w-[340px] select-none">
      {/* --- EL PAPEL, detrás de la carcasa ---
          Más angosto que la impresora, como el rollo de 58 mm dentro de un
          equipo más ancho. */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ y: imprimiendo ? altoCarcasa - 6 : -12 }}
        transition={{
          duration: sinMovimiento ? 0 : 1.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute inset-x-7 top-0 z-0 drop-shadow-[0_18px_25px_rgba(0,0,0,0.45)]"
      >
        <div className="bg-[#f5f2ea] px-5 pb-4 pt-6 font-mono text-[10.5px] leading-relaxed text-zinc-800">
          {/* El logo impreso: un cuadrado sólido, como sale del cabezal
              térmico, que no tiene grises. */}
          <div className="mx-auto mb-4 flex h-9 w-9 items-center justify-center bg-zinc-900">
            <span className="h-3.5 w-3.5 rotate-45 bg-[#f5f2ea]" />
          </div>

          <div className="border-t border-dashed border-zinc-400" />

          <div className="py-3">
            <div className="flex justify-between font-semibold tracking-wider">
              <span>PLAN COMPLETO</span>
              <span className="tabular-nums">${pesos(SUBTOTAL)}</span>
            </div>
            <p className="text-zinc-500">Suscripción anual · 12 meses</p>
          </div>

          <div className="border-t border-dashed border-zinc-400" />

          <div className="py-3">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span className="tabular-nums">${pesos(SUBTOTAL)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>IVA 21%</span>
              <span className="tabular-nums">${pesos(IVA)}</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between font-bold tracking-wider">
              <span>TOTAL PAGADO</span>
              <span className="text-[15px] tabular-nums">${pesos(TOTAL)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-zinc-400" />

          <div className="space-y-0.5 py-3 text-zinc-600">
            {PIE.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="flex justify-between gap-3">
                <span className="text-zinc-500">{etiqueta}</span>
                <span className="text-right">{valor}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 flex h-9 items-end justify-center gap-[2px]">
            {RAYAS.map((ancho, i) => (
              <span
                key={i}
                className="bg-zinc-900"
                style={{
                  width: `${ancho}px`,
                  height: i % 3 === 0 ? '100%' : '82%',
                }}
              />
            ))}
          </div>
          <p className="mt-1.5 text-center text-[9px] tracking-[0.3em] text-zinc-500">
            0001 00004821
          </p>
        </div>
        {/* El corte del papel */}
        <div style={TIRA_DENTADA} />
      </motion.div>

      {/* --- LA IMPRESORA, por delante --- */}
      <div
        ref={carcasaRef}
        className="relative z-10 rounded-[26px] bg-zinc-900 p-3 pb-4 shadow-2xl shadow-black/70 ring-1 ring-white/10"
      >
        <div className="mb-3 flex items-center justify-between px-2 pt-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-700">
            <span className="h-2.5 w-2.5 rotate-45 bg-zinc-300" />
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-white/10">
            <Home size={13} /> Khaleesi
          </span>
        </div>

        {/* La pantalla del aparato, hundida en la carcasa */}
        <div className="rounded-2xl bg-zinc-950 p-5 ring-1 ring-white/5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight text-white">
                Plan Completo
              </p>
              <p className="text-sm text-zinc-400">Suscripción anual</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm text-zinc-400">Total</p>
              <p className="text-xl font-bold tabular-nums text-white">
                ${pesos(TOTAL)}
              </p>
            </div>
          </div>

          {/* Estado: el ícono y el texto cambian juntos con la fase */}
          <div
            className="mt-5 flex items-center gap-2.5"
            role="status"
            aria-live="polite"
          >
            {listo ? (
              <motion.span
                initial={sinMovimiento ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500"
              >
                <Check size={13} strokeWidth={3} className="text-zinc-950" />
              </motion.span>
            ) : (
              <Loader2
                size={20}
                className={
                  'text-zinc-400 ' + (sinMovimiento ? '' : 'animate-spin')
                }
              />
            )}
            <span
              className={
                'text-sm font-medium ' +
                (listo ? 'text-green-400' : 'text-zinc-300')
              }
            >
              {FASES[fase].texto}
            </span>
          </div>
        </div>

        {/* La ranura de salida: la sombra interior es lo que la hace leer como
            un hueco y no como una raya pintada sobre la carcasa. */}
        <div className="mx-4 mt-3 h-[5px] rounded-full bg-zinc-950 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.9)]" />
      </div>
    </div>
  );
}

export default TicketImprimiendose;
