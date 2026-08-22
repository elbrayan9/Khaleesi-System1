// src/screens/PagosRecibidos.jsx
//
// Los cobros de Mercado Pago del comercio, sin salir del sistema. Consulta la
// cuenta con el Access Token configurado y se refresca sola.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';
import { sonarPago } from '../utils/sonido.js';

const METODOS = {
  account_money: 'Dinero en cuenta',
  debit_card: 'Tarjeta de débito',
  credit_card: 'Tarjeta de crédito',
  ticket: 'Efectivo (pago fácil)',
  bank_transfer: 'Transferencia',
};

const nombreMetodo = (p) =>
  METODOS[p.tipo] || p.metodo?.replace(/_/g, ' ') || 'Mercado Pago';

function PagosRecibidos() {
  const { sucursalActual, mostrarMensaje } = useAppContext();
  const [pagos, setPagos] = useState([]);
  const [estado, setEstado] = useState('cargando'); // cargando | ok | sinToken | error
  const [error, setError] = useState('');
  const [actualizado, setActualizado] = useState(null);
  const [dias, setDias] = useState(1); // 1 | 7 | 30
  const [filtroMetodo, setFiltroMetodo] = useState('todos');
  const vistos = useRef(null);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setEstado('cargando');
      try {
        const { getFunctions, httpsCallable } = await import(
          'firebase/functions'
        );
        const fn = httpsCallable(getFunctions(), 'consultarPagosMp');
        const res = await fn({
          sucursalId: sucursalActual?.id || null,
          dias,
        });
        if (!res.data?.configurado) {
          setEstado('sinToken');
          return;
        }
        const lista = res.data.pagos || [];

        // Aviso cuando entra uno nuevo (no en la primera carga).
        if (vistos.current !== null) {
          const nuevos = lista.filter((p) => !vistos.current.has(p.id));
          if (nuevos.length > 0) {
            sonarPago();
            mostrarMensaje?.(
              `¡Pago recibido! $${formatCurrency(nuevos[0].monto)}`,
              'success',
            );
          }
        }
        vistos.current = new Set(lista.map((p) => p.id));

        setPagos(lista);
        setActualizado(new Date());
        setEstado('ok');
      } catch (e) {
        setError(e?.message || 'No se pudo consultar.');
        setEstado('error');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sucursalActual?.id, dias],
  );

  useEffect(() => {
    cargar();
    const t = setInterval(() => cargar(true), 15000);
    return () => clearInterval(t);
  }, [cargar]);

  // Medios de pago presentes, para armar los filtros con lo que realmente hay.
  const mediosDisponibles = Array.from(
    new Set(pagos.map((p) => p.tipo).filter(Boolean)),
  );
  const visibles =
    filtroMetodo === 'todos'
      ? pagos
      : pagos.filter((p) => p.tipo === filtroMetodo);
  const totalFiltrado = visibles.reduce((s, p) => s + (p.monto || 0), 0);
  const netoFiltrado = visibles.reduce(
    (s, p) => s + (p.neto != null ? p.neto : p.monto || 0),
    0,
  );
  const etiquetaPeriodo =
    dias === 1 ? 'las últimas 24 h' : `los últimos ${dias} días`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
          <Wallet className="h-7 w-7 text-emerald-400" />
          Pagos recibidos
        </h2>
        <button
          type="button"
          onClick={() => cargar()}
          className="flex items-center gap-2 rounded-md bg-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-600"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {estado === 'sinToken' && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
          <span>
            Todavía no cargaste tu <strong>Access Token de Mercado Pago</strong>.
            Agregalo en Configuración para ver acá los pagos que te entran.
          </span>
        </div>
      )}

      {estado === 'error' && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {estado !== 'sinToken' && (
        <div className="flex flex-wrap gap-2">
          {[
            [1, 'Hoy'],
            [7, '7 días'],
            [30, '30 días'],
          ].map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => setDias(val)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                dias === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {estado === 'cargando' && (
        <p className="py-10 text-center text-sm text-zinc-400">
          Consultando Mercado Pago…
        </p>
      )}

      {estado === 'ok' && (
        <>
          <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Cobrado en {etiquetaPeriodo}
              {filtroMetodo !== 'todos' &&
                ` · ${METODOS[filtroMetodo] || filtroMetodo}`}
            </p>
            <p className="text-3xl font-bold tabular-nums text-white">
              ${formatCurrency(totalFiltrado)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {visibles.length} cobro{visibles.length === 1 ? '' : 's'}
              {netoFiltrado !== totalFiltrado &&
                ` · neto $${formatCurrency(netoFiltrado)}`}
              {actualizado &&
                ` · actualizado ${actualizado.toLocaleTimeString('es-AR')}`}
            </p>
          </div>

          {mediosDisponibles.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {['todos', ...mediosDisponibles].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFiltroMetodo(m)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    filtroMetodo === m
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  {m === 'todos'
                    ? 'Todos'
                    : METODOS[m] || m.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}

          {visibles.length === 0 ? (
            <p className="py-12 text-center text-sm italic text-zinc-500">
              {pagos.length === 0
                ? `No entraron pagos en ${etiquetaPeriodo}.`
                : 'No hay cobros con ese medio de pago.'}
            </p>
          ) : (
            <div className="space-y-2">
              {visibles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-none text-green-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {nombreMetodo(p)}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {p.fecha
                          ? new Date(p.fecha).toLocaleString('es-AR')
                          : ''}
                        {p.pagador ? ` · ${p.pagador}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-white">
                      ${formatCurrency(p.monto)}
                    </p>
                    {p.neto != null && p.neto !== p.monto && (
                      <p className="text-[11px] text-zinc-500">
                        te queda ${formatCurrency(p.neto)}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <p className="text-center text-[11px] text-zinc-500">
            Muestra los cobros de Mercado Pago (QR, link, posnet y tarjeta). Las
            transferencias entre personas pueden no aparecer.
          </p>
        </>
      )}
    </div>
  );
}

export default PagosRecibidos;
