// El comprobante saliendo de la impresora.
//
// Una tarjeta oscura con el resumen del cobro y, saliendo desde atrás, el
// ticket de papel. Tres fases: procesando, imprimiendo, listo.
//
// El recibo vive detrás de la tarjeta con z-index menor y desplazado hacia
// arriba; cuando llega la fase de impresión baja deslizándose, que es lo que da
// la ilusión de que la tarjeta lo está expulsando.

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

function TicketImprimiendose() {
  const sinMovimiento = useReducedMotion();
  const [fase, setFase] = useState(sinMovimiento ? 2 : 0);
  const papelRef = useRef(null);
  const [altoPapel, setAltoPapel] = useState(0);

  // Se mide el papel para deslizarlo exactamente su propio alto: así queda
  // apoyado justo debajo de la tarjeta, sin números mágicos que se rompan
  // cuando cambie el contenido.
  useEffect(() => {
    const medir = () => setAltoPapel(papelRef.current?.offsetHeight || 0);
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
      {/* --- EL PAPEL, detrás de la tarjeta --- */}
      <motion.div
        ref={papelRef}
        aria-hidden="true"
        initial={false}
        animate={{ y: imprimiendo ? altoPapel - 12 : -8 }}
        transition={{
          duration: sinMovimiento ? 0 : 1.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute inset-x-3 top-0 z-0 shadow-xl"
      >
        <div className="bg-[#f5f2ea] px-5 pb-4 pt-5 font-mono text-[10.5px] leading-snug text-zinc-800">
          <div className="mb-2 text-center">
            <div className="mx-auto mb-1 h-5 w-5 rotate-45 bg-zinc-800" />
            <p className="font-bold tracking-widest">KHALEESI SYSTEM</p>
            <p className="text-[10px] text-zinc-500">
              Comprobante de suscripción
            </p>
          </div>

          <div className="border-y border-dashed border-zinc-400 py-2">
            <div className="flex justify-between">
              <span>PLAN COMPLETO</span>
              <span className="tabular-nums">${pesos(SUBTOTAL)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Suscripción anual</span>
              <span>12 meses</span>
            </div>
          </div>

          <div className="py-2">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span className="tabular-nums">${pesos(SUBTOTAL)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>IVA 21%</span>
              <span className="tabular-nums">${pesos(IVA)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-zinc-400 pt-1 font-bold">
              <span>TOTAL PAGADO</span>
              <span className="tabular-nums">${pesos(TOTAL)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-zinc-400 pt-2 text-[10px] text-zinc-500">
            <p>Comprobante: 0001-00004821</p>
            <p>Pagado con: Mercado Pago</p>
            <p>Fecha: 29 AGO 2026</p>
          </div>

          <div className="mt-2.5 flex h-7 items-end justify-center gap-[2px]">
            {RAYAS.map((ancho, i) => (
              <span
                key={i}
                className="bg-zinc-800"
                style={{
                  width: `${ancho}px`,
                  height: i % 3 === 0 ? '100%' : '80%',
                }}
              />
            ))}
          </div>
          <p className="mt-1 text-center text-[9px] tracking-[0.25em] text-zinc-500">
            0001000048212026
          </p>
        </div>
        {/* El corte del papel */}
        <div style={TIRA_DENTADA} />
      </motion.div>

      {/* --- LA TARJETA, por delante --- */}
      <div className="relative z-10 rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/60">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-white">Plan Completo</p>
            <p className="text-sm text-zinc-400">Suscripción anual</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-400">
            <Home size={12} /> Khaleesi
          </span>
        </div>

        <div className="mb-6 text-right">
          <p className="text-sm text-zinc-400">Total</p>
          <p className="text-3xl font-bold tabular-nums text-white">
            ${pesos(TOTAL)}
          </p>
        </div>

        {/* Estado: el ícono y el texto cambian juntos con la fase */}
        <div
          className="flex items-center gap-2 border-t border-white/10 pt-4"
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
                'text-blue-400 ' + (sinMovimiento ? '' : 'animate-spin')
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
    </div>
  );
}

export default TicketImprimiendose;
