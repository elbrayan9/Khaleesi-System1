import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { AlertTriangle, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function PanelAlertas() {
  const { alertasBorrados, isAdmin } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAlerta, setSelectedAlerta] = useState(null);

  const alertasOrdenadas = [...alertasBorrados].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Considerar solo si hay alertas. Si queres, solo mostrar a admin.
  // Pero según enunciado, es útil "Entramos a ventas y vamos a tener un panel de alerta"
  if (!isAdmin && alertasOrdenadas.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 rounded-md bg-red-600/20 px-4 py-2 font-bold text-red-500 hover:bg-red-600 hover:text-white transition"
      >
        <AlertTriangle size={20} />
        Alertas de Borrados
        {alertasOrdenadas.length > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {alertasOrdenadas.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-2xl overflow-hidden rounded-lg bg-zinc-900 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-700 p-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-red-400">
                  <AlertTriangle /> Actividad Sospechosa / Borrados
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X />
                </button>
              </div>

              <div className="max-h-[500px] overflow-y-auto p-4">
                {alertasOrdenadas.length === 0 ? (
                  <p className="text-center text-zinc-500">No hay alertas recientes.</p>
                ) : (
                  <div className="space-y-4">
                    {alertasOrdenadas.map((alerta) => (
                      <div
                        key={alerta.id}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-zinc-100">
                              El usuario <span className="text-red-400">{alerta.vendedorNombre}</span> {alerta.descripcion.toLowerCase()}{' '}
                              por <span className="text-red-400 font-bold">${formatCurrency(alerta.montoTotal)}</span>
                            </p>
                            <p className="text-sm text-zinc-400">
                              {new Date(alerta.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedAlerta(alerta)}
                            className="flex items-center gap-1 rounded bg-zinc-700 px-3 py-1 text-sm text-white hover:bg-zinc-600"
                          >
                            <Eye size={16} /> Ver Detalle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAlerta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-lg bg-zinc-800 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-700 bg-red-900/40 p-4">
                <h3 className="font-bold text-white">Detalle del Carrito Borrado</h3>
                <button
                  onClick={() => setSelectedAlerta(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X />
                </button>
              </div>
              <div className="p-4">
                <p className="mb-4 text-sm text-zinc-300">
                  <span className="font-bold text-white">Vendedor:</span> {selectedAlerta.vendedorNombre}<br />
                  <span className="font-bold text-white">Fecha y Hora:</span> {new Date(selectedAlerta.timestamp).toLocaleString()}
                </p>
                <div className="max-h-60 overflow-y-auto rounded bg-zinc-900 p-2 border border-zinc-700">
                  {selectedAlerta.itemsBorrados?.map((item, i) => (
                    <div key={i} className="flex justify-between border-b border-zinc-800 py-2 last:border-0 text-sm">
                      <span className="text-zinc-100">{item.cantidad}x {item.nombre}</span>
                      <span className="font-bold text-zinc-400">${formatCurrency(item.precioFinal)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-right text-lg font-bold text-red-400">
                  Total Fuga: ${formatCurrency(selectedAlerta.montoTotal)}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PanelAlertas;
