// frontend/src/components/PedidosTable.jsx
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEye, FiCheckSquare, FiTruck, FiXSquare } from 'react-icons/fi';
import { formatCurrency, formatDate } from '../utils/helpers';

const PedidosTable = ({
  pedidos,
  onVerDetalle,
  onRecibir,
  onUpdateEstado,
  onCancelar,
}) => {
  const [filter, setFilter] = useState('todos');

  const filteredPedidos = useMemo(() => {
    if (!pedidos) return [];
    const sorted = [...pedidos].sort(
      (a, b) => new Date(b.fechaPedido) - new Date(a.fechaPedido),
    );
    if (filter === 'todos') {
      return sorted;
    }
    return sorted.filter((p) => p.estado === filter);
  }, [pedidos, filter]);

  const getStatusChip = (status) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case 'pedido':
        return (
          <span className={`${baseClasses} bg-yellow-500 text-yellow-900`}>
            Pedido
          </span>
        );
      case 'enviado':
        return (
          <span className={`${baseClasses} bg-blue-500 text-blue-900`}>
            Enviado
          </span>
        );
      case 'recibido':
        return (
          <span className={`${baseClasses} bg-green-500 text-green-900`}>
            Recibido
          </span>
        );
      case 'cancelado':
        return (
          <span className={`${baseClasses} bg-red-500 text-red-900`}>
            Cancelado
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-500 text-gray-900`}>
            Desconocido
          </span>
        );
    }
  };

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Historial de Pedidos</h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="todos">Todos</option>
            <option value="pedido">Pedido</option>
            <option value="enviado">Enviado</option>
            <option value="recibido">Recibido</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-zinc-700 text-xs uppercase text-zinc-100">
            <tr>
              <th scope="col" className="px-6 py-3">
                Fecha Pedido
              </th>
              <th scope="col" className="px-6 py-3">
                Proveedor
              </th>
              <th scope="col" className="px-6 py-3">
                Total
              </th>
              <th scope="col" className="px-6 py-3">
                Estado
              </th>
              <th scope="col" className="px-6 py-3">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredPedidos.length > 0 ? (
                filteredPedidos.map((pedido) => (
                  <motion.tr
                    key={pedido.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                  >
                    <td className="px-6 py-4">
                      {formatDate(pedido.fechaPedido)}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {pedido.proveedorNombre}
                    </td>
                    <td className="px-6 py-4">
                      {formatCurrency(pedido.totalCosto)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusChip(pedido.estado)}
                    </td>
                    <td className="flex items-center gap-4 px-6 py-4">
                      <button
                        onClick={() => onVerDetalle(pedido)}
                        className="text-gray-400 hover:text-white"
                        title="Ver Detalle"
                      >
                        <FiEye size={18} />
                      </button>

                      {/* Acción: Marcar como Enviado */}
                      {pedido.estado === 'pedido' && (
                        <button
                          onClick={() => onUpdateEstado(pedido.id, 'enviado')}
                          className="text-blue-400 hover:text-blue-300"
                          title="Marcar como Enviado"
                        >
                          <FiTruck size={18} />
                        </button>
                      )}

                      {/* Acción: Marcar como Recibido */}
                      {(pedido.estado === 'pedido' ||
                        pedido.estado === 'enviado') && (
                        <button
                          onClick={() => onRecibir(pedido)}
                          className="text-green-400 hover:text-green-300"
                          title="Marcar como Recibido y Actualizar Stock"
                        >
                          <FiCheckSquare size={18} />
                        </button>
                      )}

                      {/* Acción: Cancelar Pedido */}
                      {pedido.estado !== 'recibido' &&
                        pedido.estado !== 'cancelado' && (
                          <button
                            onClick={() => onCancelar(pedido)}
                            className="text-red-500 hover:text-red-400"
                            title="Cancelar Pedido"
                          >
                            <FiXSquare size={18} />
                          </button>
                        )}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-zinc-400">
                    No hay pedidos que coincidan con el filtro.
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PedidosTable;
