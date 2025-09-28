// frontend/src/components/PedidoDetailModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { useAppContext } from '../context/AppContext'; // Importamos el contexto
import { formatCurrency, formatDate } from '../utils/helpers';

const PedidoDetailModal = ({ pedido, onClose }) => {
  // Obtenemos las funciones directamente del contexto
  const { handleUpdatePedidoEstado, handleDeletePedido } = useAppContext();

  if (!pedido) return null;

  const handleEstadoChange = (e) => {
    const nuevoEstado = e.target.value;
    handleUpdatePedidoEstado(pedido.id, nuevoEstado);
  };

  const handleDelete = async () => {
    const success = await handleDeletePedido(pedido);
    if (success) {
      onClose(); // Cierra el modal si la eliminación fue exitosa
    }
  };

  const isFinalState =
    pedido.estado === 'recibido' || pedido.estado === 'cancelado';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-zinc-700 p-4">
            <h3 className="text-lg font-bold text-white">Detalle del Pedido</h3>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="flex-grow space-y-4 overflow-y-auto p-6 text-zinc-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Proveedor:</strong>{' '}
                <span className="text-white">{pedido.proveedorNombre}</span>
              </div>
              <div>
                <strong>Fecha Pedido:</strong>{' '}
                <span className="text-white">
                  {formatDate(pedido.fechaPedido)}
                </span>
              </div>

              {/* --- NUEVO: Selector de Estado --- */}
              <div className="flex items-center gap-2">
                <strong>Estado:</strong>
                <select
                  value={pedido.estado}
                  onChange={handleEstadoChange}
                  className="rounded-md border border-zinc-600 bg-zinc-700 p-1 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="pedido">Pedido</option>
                  <option value="enviado">Enviado</option>
                  <option value="recibido">Recibido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <strong>Total:</strong>{' '}
                <span className="font-bold text-cyan-400">
                  {formatCurrency(pedido.totalCosto)}
                </span>
              </div>
            </div>

            {pedido.notas && (
              <div>
                <strong>Notas:</strong>
                <p className="mt-1 rounded-md bg-zinc-700 p-2 text-zinc-400">
                  {pedido.notas}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-md mb-2 mt-4 font-semibold text-white">
                Items del Pedido
              </h4>
              <div className="space-y-2">
                {pedido.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 items-center gap-2 rounded bg-zinc-700 p-2"
                  >
                    <span className="col-span-6 text-zinc-100">
                      {item.nombre}
                    </span>
                    <span className="col-span-3 text-center">
                      Cant: {item.cantidad}
                    </span>
                    <span className="col-span-3 text-right">
                      {formatCurrency(item.costoUnitario)} c/u
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-700 p-4">
            {/* --- NUEVO: Botón de Eliminar --- */}
            <button
              onClick={handleDelete}
              className="rounded-md bg-red-800 px-4 py-2 font-bold text-white transition-colors hover:bg-red-700"
            >
              Eliminar Pedido
            </button>
            <button
              onClick={onClose}
              className="rounded-md bg-zinc-600 px-4 py-2 font-bold text-white transition-colors hover:bg-zinc-500"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PedidoDetailModal;
