// src/components/CuentaCorrienteModal.jsx
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Notebook } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';

function CuentaCorrienteModal({ cliente, onClose }) {
  const { movimientosCC, getSaldoCliente, handleRegistrarPagoCuenta } =
    useAppContext();
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('efectivo');
  const [guardando, setGuardando] = useState(false);

  const millis = (m) => {
    if (m.createdAt?.toMillis) return m.createdAt.toMillis();
    if (typeof m.createdAt?.seconds === 'number') return m.createdAt.seconds * 1000;
    return 0;
  };

  const movimientos = useMemo(
    () =>
      (movimientosCC || [])
        .filter((m) => m.clienteId === cliente?.id)
        .slice()
        .sort((a, b) => millis(b) - millis(a)),
    [movimientosCC, cliente],
  );

  const saldo = getSaldoCliente ? getSaldoCliente(cliente?.id) : 0;

  const registrar = async () => {
    setGuardando(true);
    const ok = await handleRegistrarPagoCuenta(cliente, monto, metodo);
    setGuardando(false);
    if (ok) setMonto('');
  };

  if (!cliente) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-zinc-800 p-5 shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-zinc-700 pb-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Notebook className="h-5 w-5 text-amber-400" />
            Cuenta Corriente — {cliente.nombre}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Saldo */}
        <div className="mb-4 rounded-lg bg-zinc-900 p-4 text-center">
          <p className="text-sm text-zinc-400">Saldo actual</p>
          {saldo > 0 ? (
            <p className="text-3xl font-bold text-red-400">
              Debe ${formatCurrency(saldo)}
            </p>
          ) : saldo < 0 ? (
            <p className="text-3xl font-bold text-green-400">
              A favor ${formatCurrency(Math.abs(saldo))}
            </p>
          ) : (
            <p className="text-3xl font-bold text-zinc-300">$0,00</p>
          )}
        </div>

        {/* Registrar pago */}
        <div className="mb-4 rounded-lg border border-zinc-700 p-3">
          <p className="mb-2 text-sm font-medium text-zinc-300">
            Registrar pago a cuenta
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-zinc-400">Monto</label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Método</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <button
              onClick={registrar}
              disabled={guardando}
              className="rounded-md bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-zinc-600"
            >
              {guardando ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>

        {/* Historial */}
        <p className="mb-2 text-sm font-medium text-zinc-300">Movimientos</p>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {movimientos.length === 0 ? (
            <p className="py-6 text-center text-sm italic text-zinc-500">
              Sin movimientos.
            </p>
          ) : (
            movimientos.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-md bg-zinc-700/50 p-2 text-sm"
              >
                <div>
                  <p className="text-zinc-200">{m.descripcion || m.tipo}</p>
                  <p className="text-xs text-zinc-500">
                    {m.fecha} {m.hora}
                    {m.metodoPago ? ` · ${m.metodoPago}` : ''}
                  </p>
                </div>
                <span
                  className={`font-semibold ${m.tipo === 'pago' ? 'text-green-400' : 'text-red-400'}`}
                >
                  {m.tipo === 'pago' ? '-' : '+'} ${formatCurrency(m.monto)}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default CuentaCorrienteModal;
