// El sistema funcionando, dibujado en HTML.
//
// Antes acá había una captura de pantalla: una foto quieta de 264 KB que no
// contaba nada. Esto muestra el sistema trabajando —entra un producto, se suma
// otro, se cobra, sale el ticket— y pesa cero bytes de imagen, porque son divs.
//
// Es decorativo: si alguien pidió menos movimiento, se queda en el estado final
// y no se anima nada.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// El guion del ciclo. Cada paso dice cuánto dura y qué se ve.
const PRODUCTOS = [
  { nombre: 'Coca-Cola 2.25 L', codigo: '7790895000997', precio: 2800 },
  { nombre: 'Yerba Playadito 1 kg', codigo: '7792200000012', precio: 5400 },
  { nombre: 'Pan lactal Bimbo', codigo: '7791234500018', precio: 3200 },
];

const PASOS = [
  { id: 'escaneo', ms: 1400 },
  { id: 'item-1', ms: 1100 },
  { id: 'item-2', ms: 1100 },
  { id: 'item-3', ms: 1300 },
  { id: 'cobro', ms: 1600 },
  { id: 'listo', ms: 2000 },
];

const pesos = (n) =>
  n.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function MockupSistema() {
  const sinMovimiento = useReducedMotion();
  // Con menos movimiento se muestra el final: el carrito completo y cobrado,
  // que es la imagen más informativa de las seis.
  const [paso, setPaso] = useState(sinMovimiento ? PASOS.length - 1 : 0);

  useEffect(() => {
    if (sinMovimiento) return undefined;
    const t = setTimeout(
      () => setPaso((p) => (p + 1) % PASOS.length),
      PASOS[paso].ms,
    );
    return () => clearTimeout(t);
  }, [paso, sinMovimiento]);

  const actual = PASOS[paso].id;
  const cuantosItems =
    actual === 'escaneo'
      ? 0
      : actual === 'item-1'
        ? 1
        : actual === 'item-2'
          ? 2
          : 3;

  const items = PRODUCTOS.slice(0, cuantosItems);
  const total = items.reduce((s, p) => s + p.precio, 0);
  const cobrando = actual === 'cobro';
  const listo = actual === 'listo';

  return (
    <div className="flex aspect-[16/10] w-full bg-zinc-950 text-left text-[10px] sm:text-xs">
      {/* --- MENÚ LATERAL --- */}
      <aside className="hidden w-[22%] shrink-0 border-r border-white/5 bg-zinc-900/80 p-3 sm:block">
        <div className="mb-4 flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-blue-500/80" />
          <span className="font-semibold text-white">Khaleesi</span>
        </div>
        {['Nueva Venta', 'Productos', 'Clientes', 'Caja', 'Reportes'].map(
          (x, i) => (
            <div
              key={x}
              className={
                'mb-1 rounded px-2 py-1.5 ' +
                (i === 0 ? 'bg-blue-500/15 text-blue-300' : 'text-zinc-500')
              }
            >
              {x}
            </div>
          ),
        )}
      </aside>

      {/* --- PANEL DE VENTA --- */}
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold text-white">Nueva Venta</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-500">
            Sucursal Principal
          </span>
        </div>

        <div className="flex min-h-0 flex-1 gap-3">
          {/* Escáner */}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="mb-1 text-zinc-500">Escanear código</span>
            <div className="relative flex items-center gap-2 rounded-md border border-white/10 bg-zinc-800/70 px-2 py-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={cuantosItems}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate font-mono text-zinc-300"
                >
                  {cuantosItems < 3
                    ? PRODUCTOS[cuantosItems]?.codigo
                    : 'Listo para cobrar'}
                </motion.span>
              </AnimatePresence>
              {/* El cursor titilando es lo que da la sensación de que alguien
                  está del otro lado, tipeando. */}
              {!sinMovimiento && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="h-3 w-px bg-blue-400"
                />
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {['Buscar', 'Por voz', 'Con la cámara', 'Foto (IA)'].map((x) => (
                <div
                  key={x}
                  className="rounded border border-white/10 px-2 py-1.5 text-center text-zinc-500"
                >
                  {x}
                </div>
              ))}
            </div>
          </div>

          {/* Carrito */}
          <div className="flex w-[46%] shrink-0 flex-col rounded-md border border-white/10 bg-zinc-900/70 p-2">
            <span className="mb-1.5 font-medium text-white">Carrito</span>

            <div className="min-h-0 flex-1 space-y-1">
              <AnimatePresence>
                {items.map((p) => (
                  <motion.div
                    key={p.nombre}
                    initial={sinMovimiento ? false : { opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    className="flex items-baseline justify-between gap-2 border-b border-white/5 pb-1"
                  >
                    <span className="truncate text-zinc-300">{p.nombre}</span>
                    <span className="whitespace-nowrap tabular-nums text-zinc-100">
                      ${pesos(p.precio)}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {items.length === 0 && (
                <p className="pt-4 text-center italic text-zinc-600">
                  Escaneá el primer producto
                </p>
              )}
            </div>

            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-zinc-400">Total</span>
                {/* El total cambia con un salto chico: se nota que subió sin
                    que haga falta leer el número. */}
                <motion.span
                  key={total}
                  initial={sinMovimiento ? false : { scale: 1.18 }}
                  animate={{ scale: 1 }}
                  className="whitespace-nowrap text-sm font-bold tabular-nums text-white sm:text-base"
                >
                  ${pesos(total)}
                </motion.span>
              </div>

              <motion.div
                animate={
                  cobrando && !sinMovimiento
                    ? { scale: [1, 0.96, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.4 }}
                className={
                  'mt-2 rounded px-2 py-1.5 text-center font-semibold transition-colors ' +
                  (listo
                    ? 'bg-green-600 text-white'
                    : cobrando
                      ? 'bg-green-700 text-white'
                      : items.length
                        ? 'bg-green-600/90 text-white'
                        : 'bg-zinc-700 text-zinc-500')
                }
              >
                {listo
                  ? '✓ Venta registrada'
                  : cobrando
                    ? 'Cobrando…'
                    : 'Cobrar'}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MockupSistema;
