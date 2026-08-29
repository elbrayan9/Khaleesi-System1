// La pantalla de Caja.
//
// Reemplaza al viejo "Cierre de Caja (Simulado)", que era un cartel informativo
// que no guardaba nada. Sigue la forma de los sistemas de gestión clásicos, que
// es lo que un comerciante ya sabe leer: una sola tabla con una columna de
// ingresos y otra de egresos, el saldo anterior arrastrado arriba, y los
// totales al pie.
//
// Los datos ya existían todos —ventas, ingresos manuales y egresos— pero solo
// se veían mezclados en la lista de movimientos o enterrados en aquel cartel.

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Printer,
  X,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers.js';
import { useAppContext } from '../context/AppContext.jsx';

// Los medios de pago con nombre legible. Las claves son las que guarda la venta
// en su array `pagos`.
const NOMBRE_MEDIO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  qr_banco: 'QR Banco',
  qr_billetera: 'QR Billetera',
  mercado_pago: 'Mercado Pago',
  cuenta_corriente: 'Cuenta corriente',
};

// Motivos que se repiten en cualquier comercio. Son sugerencias: el campo
// admite cualquier texto. Antes el motivo era un placeholder de tres letras en
// un input de 16px de ancho, así que en la práctica nadie lo llenaba.
const MOTIVOS_EGRESO = [
  'Retiro de caja',
  'Pago a proveedor',
  'Adelanto de sueldo',
  'Gastos de limpieza',
  'Fletes y envíos',
  'Servicios (luz, gas, internet)',
];
const MOTIVOS_INGRESO = [
  'Aporte del dueño',
  'Cobro de deuda',
  'Devolución de proveedor',
  'Saldo inicial',
];

const GUION = '—';

/** Convierte 'DD/MM/YYYY' en Date. Es el formato en que se guardan las fechas. */
const aFecha = (str) => {
  const [d, m, a] = String(str || '').split('/');
  return new Date(Number(a), Number(m) - 1, Number(d));
};

const safe = (x) => (Array.isArray(x) ? x : []);

/**
 * Lo que de una venta entró al cajón, que es solo la parte pagada en efectivo.
 *
 * Es la definición que sostiene toda la pantalla: la caja cuadra contra el
 * dinero físico. Una venta de $10.000 cobrada con tarjeta no pone un peso en el
 * cajón, así que suma cero acá y se muestra aparte, en el panel de medios de
 * pago.
 *
 * Las ventas viejas, anteriores al array `pagos`, guardaban un único
 * `metodoPago`; se contemplan para que el histórico no quede en cero.
 */
const efectivoDeVenta = (v) => {
  if (Array.isArray(v.pagos) && v.pagos.length) {
    return v.pagos.reduce(
      (s, p) => s + (p.metodo === 'efectivo' ? Number(p.monto) || 0 : 0),
      0,
    );
  }
  const metodoViejo = String(v.metodoPago || '').toLowerCase();
  return metodoViejo === 'efectivo' ? Number(v.total) || 0 : 0;
};

function CajaModal({
  isOpen,
  onClose,
  selectedDate,
  onCambiarFecha,
  dateFormatter,
}) {
  const {
    ventas,
    egresos,
    ingresosManuales,
    handleRegistrarIngresoManual,
    handleRegistrarEgreso,
    mostrarMensaje,
  } = useAppContext();

  const [formulario, setFormulario] = useState(null); // 'ingreso' | 'egreso' | null
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Qué tipos de movimiento se muestran. Como en los sistemas de gestión
  // clásicos, se pueden apagar para mirar solo una parte.
  const [verVentas, setVerVentas] = useState(true);
  const [verIngresos, setVerIngresos] = useState(true);
  const [verEgresos, setVerEgresos] = useState(true);
  const [arrastraSaldo, setArrastraSaldo] = useState(true);

  const diaStr = dateFormatter.format(selectedDate);

  // --- Saldo anterior: todo lo movido ANTES del día elegido ---
  // Es lo que hace que la caja "arrastre": el número de arriba no sale de la
  // nada, viene de los días anteriores.
  const saldoAnterior = useMemo(() => {
    if (!arrastraSaldo) return 0;
    const limite = aFecha(diaStr);
    const antes = (item) => aFecha(item.fecha) < limite;
    const ing =
      safe(ventas)
        .filter(antes)
        .reduce((s, v) => s + efectivoDeVenta(v), 0) +
      safe(ingresosManuales)
        .filter(antes)
        .reduce((s, i) => s + (Number(i.monto) || 0), 0);
    const egr = safe(egresos)
      .filter(antes)
      .reduce((s, e) => s + (Number(e.monto) || 0), 0);
    return ing - egr;
  }, [ventas, ingresosManuales, egresos, diaStr, arrastraSaldo]);

  // --- Los movimientos del día, en una sola lista ordenada por hora ---
  const movimientos = useMemo(() => {
    const filas = [];
    if (verVentas) {
      safe(ventas)
        .filter((v) => v.fecha === diaStr)
        .forEach((v) => {
          const medios = (v.pagos || [])
            .map((p) => NOMBRE_MEDIO[p.metodo] || p.metodo)
            .join(', ');
          const partes = [
            `${v.tipoComprobante || 'Ticket'} ${v.numeroFactura || ''}`.trim(),
            v.clienteNombre,
            medios,
          ].filter(Boolean);
          const enEfectivo = efectivoDeVenta(v);
          filas.push({
            id: v.id,
            hora: v.hora || '',
            tipo: 'VENTA',
            detalle: partes.join(' · '),
            // Solo el efectivo: es lo que entra al cajón y lo que tiene que
            // cuadrar contra el conteo. El resto se ve en medios de pago.
            ingreso: enEfectivo,
            egreso: 0,
            totalVenta: Number(v.total) || 0,
          });
        });
    }
    if (verIngresos) {
      safe(ingresosManuales)
        .filter((i) => i.fecha === diaStr)
        .forEach((i) => {
          filas.push({
            id: i.id,
            hora: i.hora || '',
            tipo: 'INGRESO DE CAJA',
            detalle: i.descripcion || 'Sin motivo',
            ingreso: Number(i.monto) || 0,
            egreso: 0,
          });
        });
    }
    if (verEgresos) {
      safe(egresos)
        .filter((e) => e.fecha === diaStr)
        .forEach((e) => {
          filas.push({
            id: e.id,
            hora: e.hora || '',
            tipo: 'EGRESO DE CAJA',
            detalle: e.descripcion || 'Sin motivo',
            ingreso: 0,
            egreso: Number(e.monto) || 0,
          });
        });
    }
    return filas.sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  }, [
    ventas,
    ingresosManuales,
    egresos,
    diaStr,
    verVentas,
    verIngresos,
    verEgresos,
  ]);

  const totalIngresos = movimientos.reduce((s, m) => s + m.ingreso, 0);
  const totalEgresos = movimientos.reduce((s, m) => s + m.egreso, 0);
  const saldo = saldoAnterior + totalIngresos - totalEgresos;

  // --- Lo que entró por cada medio de pago ---
  // El dato ya se calculaba en Reportes, pero solo se veía dentro del cartel
  // simulado. Acá está a la vista, que es donde sirve para cuadrar la caja.
  const porMedio = useMemo(() => {
    const acc = {};
    safe(ventas)
      .filter((v) => v.fecha === diaStr)
      .forEach((v) => {
        (v.pagos || []).forEach((p) => {
          acc[p.metodo] = (acc[p.metodo] || 0) + (Number(p.monto) || 0);
        });
      });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [ventas, diaStr]);

  const totalPorMedio = porMedio.reduce((s, [, v]) => s + v, 0);

  // Las fechas van en UTC, igual que en Reportes: mezclarlo con la hora local
  // corre el día cerca de medianoche y la caja mostraría otra jornada.
  const hoyUTC = () => {
    const h = new Date();
    return new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate()));
  };

  const moverDia = (dias) => {
    const d = new Date(selectedDate);
    d.setUTCDate(d.getUTCDate() + dias);
    onCambiarFecha(d);
  };

  const guardarMovimiento = async () => {
    const valor = parseFloat(monto);
    if (!motivo.trim()) {
      mostrarMensaje('Poné un motivo para el movimiento.', 'warning');
      return;
    }
    if (isNaN(valor) || valor <= 0) {
      mostrarMensaje('El monto tiene que ser mayor a cero.', 'warning');
      return;
    }
    setGuardando(true);
    try {
      if (formulario === 'ingreso') {
        await handleRegistrarIngresoManual(motivo.trim(), valor);
      } else {
        await handleRegistrarEgreso(motivo.trim(), valor);
      }
      setMotivo('');
      setMonto('');
      setFormulario(null);
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  const esHoy = dateFormatter.format(hoyUTC()) === diaStr;
  const sugerencias =
    formulario === 'ingreso' ? MOTIVOS_INGRESO : MOTIVOS_EGRESO;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        {/* ENCABEZADO */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-700 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Wallet size={20} className="text-blue-400" /> Caja
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => moverDia(-1)}
              aria-label="Día anterior"
              className="rounded-md bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => {
                const [a, m, d] = e.target.value.split('-');
                onCambiarFecha(
                  new Date(Date.UTC(Number(a), Number(m) - 1, Number(d))),
                );
              }}
              aria-label="Fecha de la caja"
              className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100"
            />
            <button
              type="button"
              onClick={() => moverDia(1)}
              disabled={esHoy}
              aria-label="Día siguiente"
              className="rounded-md bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => onCambiarFecha(hoyUTC())}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Imprimir"
              className="rounded-md bg-zinc-800 p-2 text-zinc-300 hover:bg-zinc-700"
            >
              <Printer size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md bg-zinc-800 p-2 text-zinc-300 hover:bg-red-600 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_260px]">
          {/* --- TABLA DE MOVIMIENTOS --- */}
          <div className="min-w-0">
            <div className="overflow-x-auto rounded-lg border border-zinc-700">
              <div className="max-h-[46vh] overflow-y-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-800">
                    <tr className="text-left text-xs uppercase text-zinc-400">
                      <th className="px-3 py-2 font-medium">Hora</th>
                      <th className="px-3 py-2 font-medium">Movimiento</th>
                      <th className="px-3 py-2 font-medium">Detalle</th>
                      <th className="px-3 py-2 text-right font-medium">
                        Ingresos
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Egresos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {arrastraSaldo && (
                      <tr className="bg-zinc-800/40 text-zinc-300">
                        <td className="px-3 py-2 text-zinc-500">{GUION}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium">
                          SALDO ANTERIOR
                        </td>
                        <td className="px-3 py-2 text-zinc-500">
                          Arrastrado de días anteriores
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {saldoAnterior >= 0
                            ? `$${formatCurrency(saldoAnterior)}`
                            : GUION}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {saldoAnterior < 0
                            ? `$${formatCurrency(-saldoAnterior)}`
                            : GUION}
                        </td>
                      </tr>
                    )}

                    {movimientos.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-10 text-center text-zinc-500"
                        >
                          No hubo movimientos este día.
                        </td>
                      </tr>
                    ) : (
                      movimientos.map((m) => (
                        <tr
                          key={`${m.tipo}-${m.id}`}
                          className="hover:bg-zinc-800/50"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                            {m.hora}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <span
                              className={
                                'rounded px-1.5 py-0.5 text-xs font-medium ' +
                                (m.tipo === 'VENTA'
                                  ? 'bg-blue-500/15 text-blue-300'
                                  : m.tipo === 'INGRESO DE CAJA'
                                    ? 'bg-green-500/15 text-green-300'
                                    : 'bg-red-500/15 text-red-300')
                              }
                            >
                              {m.tipo}
                            </span>
                          </td>
                          <td
                            className="max-w-[280px] truncate px-3 py-2 text-zinc-300"
                            title={m.detalle}
                          >
                            {m.detalle}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-green-400">
                            {m.ingreso
                              ? `$${formatCurrency(m.ingreso)}`
                              : GUION}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-red-400">
                            {m.egreso ? `$${formatCurrency(m.egreso)}` : GUION}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* TOTALES: la fila que se mira primero al cuadrar la caja */}
                  <tfoot className="sticky bottom-0 border-t-2 border-zinc-600 bg-zinc-800">
                    <tr className="font-semibold text-white">
                      <td
                        colSpan={3}
                        className="px-3 py-2.5 text-right text-zinc-400"
                      >
                        Totales del día
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-green-400">
                        $
                        {formatCurrency(
                          totalIngresos +
                            (arrastraSaldo && saldoAnterior > 0
                              ? saldoAnterior
                              : 0),
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-red-400">
                        ${formatCurrency(totalEgresos)}
                      </td>
                    </tr>
                    <tr className="border-t border-zinc-700 text-white">
                      <td
                        colSpan={4}
                        className="px-3 py-2.5 text-right font-semibold"
                      >
                        Saldo
                      </td>
                      <td
                        className={
                          'whitespace-nowrap px-3 py-2.5 text-right text-lg font-bold tabular-nums ' +
                          (saldo >= 0 ? 'text-white' : 'text-red-400')
                        }
                      >
                        ${formatCurrency(saldo)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ACCIONES Y FILTROS */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormulario('ingreso');
                  setMotivo('');
                  setMonto('');
                }}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                <ArrowDownCircle size={16} /> Ingreso
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormulario('egreso');
                  setMotivo('');
                  setMonto('');
                }}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <ArrowUpCircle size={16} /> Egreso
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                {[
                  ['Ventas', verVentas, setVerVentas],
                  ['Ingresos', verIngresos, setVerIngresos],
                  ['Egresos', verEgresos, setVerEgresos],
                  ['Saldo anterior', arrastraSaldo, setArrastraSaldo],
                ].map(([etiqueta, valor, setter]) => (
                  <label
                    key={etiqueta}
                    className="flex cursor-pointer items-center gap-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={valor}
                      onChange={(e) => setter(e.target.checked)}
                      className="h-3.5 w-3.5 accent-blue-500"
                    />
                    {etiqueta}
                  </label>
                ))}
              </div>
            </div>

            {/* FORMULARIO DE MOVIMIENTO */}
            <AnimatePresence>
              {formulario && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className={
                      'mt-3 rounded-lg border p-4 ' +
                      (formulario === 'ingreso'
                        ? 'border-green-700/50 bg-green-950/20'
                        : 'border-red-700/50 bg-red-950/20')
                    }
                  >
                    <p className="mb-3 text-sm font-semibold text-white">
                      {formulario === 'ingreso'
                        ? 'Registrar ingreso de dinero'
                        : 'Registrar egreso de dinero'}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                      <div>
                        <label
                          htmlFor="caja-motivo"
                          className="mb-1 block text-xs font-medium text-zinc-400"
                        >
                          Motivo
                        </label>
                        <input
                          id="caja-motivo"
                          list="caja-motivos-sugeridos"
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && guardarMovimiento()
                          }
                          placeholder="Ej: pago a proveedor"
                          autoFocus
                          className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                        />
                        {/* Las sugerencias evitan que cada movimiento quede
                            descrito distinto y después no se puedan agrupar. */}
                        <datalist id="caja-motivos-sugeridos">
                          {sugerencias.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label
                          htmlFor="caja-monto"
                          className="mb-1 block text-xs font-medium text-zinc-400"
                        >
                          Monto
                        </label>
                        <input
                          id="caja-monto"
                          type="number"
                          min="0"
                          step="0.01"
                          value={monto}
                          onChange={(e) => setMonto(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && guardarMovimiento()
                          }
                          placeholder="0,00"
                          className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                        />
                      </div>

                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          onClick={guardarMovimiento}
                          disabled={guardando}
                          className={
                            'rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ' +
                            (formulario === 'ingreso'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-red-600 hover:bg-red-700')
                          }
                        >
                          {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormulario(null)}
                          className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* --- POR MEDIO DE PAGO --- */}
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4">
            <p className="mb-3 text-sm font-semibold text-white">
              Cobrado por medio de pago
            </p>
            {porMedio.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin cobros este día.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {porMedio.map(([metodo, valor]) => (
                    <li key={metodo}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-zinc-300">
                          {NOMBRE_MEDIO[metodo] || metodo}
                        </span>
                        <span className="whitespace-nowrap font-semibold tabular-nums text-white">
                          ${formatCurrency(valor)}
                        </span>
                      </div>
                      {/* La barra deja ver de un vistazo con qué cobra la gente,
                          sin tener que comparar números. */}
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-700">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${totalPorMedio ? (valor / totalPorMedio) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-baseline justify-between border-t border-zinc-700 pt-3">
                  <span className="text-sm font-medium text-zinc-400">
                    Total
                  </span>
                  <span className="whitespace-nowrap text-lg font-bold tabular-nums text-white">
                    ${formatCurrency(totalPorMedio)}
                  </span>
                </div>
              </>
            )}

            <div className="mt-4 rounded-md bg-zinc-900/60 p-3 text-xs text-zinc-500">
              El saldo de arriba cuenta solo el <strong>efectivo</strong> más
              los movimientos manuales: es lo que tiene que haber en el cajón.
              Lo cobrado por tarjeta, QR o transferencia entra a la cuenta, no a
              la caja.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default CajaModal;
