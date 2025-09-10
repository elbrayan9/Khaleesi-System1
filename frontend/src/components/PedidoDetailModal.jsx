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

  const isFinalState = pedido.estado === 'recibido' || pedido.estado === 'cancelado';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-zinc-700"
        >
          <div className="flex justify-between items-center p-4 border-b border-zinc-700">
            <h3 className="text-lg font-bold text-white">Detalle del Pedido</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white"><FiX size={24} /></button>
          </div>

          <div className="flex-grow overflow-y-auto p-6 space-y-4 text-zinc-300">
            <div className="grid grid-cols-2 gap-4">
              <div><strong>Proveedor:</strong> <span className="text-white">{pedido.proveedorNombre}</span></div>
              <div><strong>Fecha Pedido:</strong> <span className="text-white">{formatDate(pedido.fechaPedido)}</span></div>
              
              {/* --- NUEVO: Selector de Estado --- */}
              <div className="flex items-center gap-2">
                <strong>Estado:</strong>
<select 
  value={pedido.estado}
  onChange={handleEstadoChange}
  className="bg-zinc-700 text-white p-1 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
>
  <option value="pedido">Pedido</option>
  <option value="enviado">Enviado</option>
  <option value="recibido">Recibido</option>
  <option value="cancelado">Cancelado</option>
</select>
              </div>

              <div><strong>Total:</strong> <span className="text-cyan-400 font-bold">{formatCurrency(pedido.totalCosto)}</span></div>
            </div>

            {pedido.notas && (
              <div>
                <strong>Notas:</strong>
                <p className="text-zinc-400 bg-zinc-700 p-2 rounded-md mt-1">{pedido.notas}</p>
              </div>
            )}

            <div>
              <h4 className="text-md font-semibold text-white mt-4 mb-2">Items del Pedido</h4>
              <div className="space-y-2">
                {pedido.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center bg-zinc-700 p-2 rounded">
                    <span className="col-span-6 text-zinc-100">{item.nombre}</span>
                    <span className="col-span-3 text-center">Cant: {item.cantidad}</span>
                    <span className="col-span-3 text-right">{formatCurrency(item.costoUnitario)} c/u</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center p-4 border-t border-zinc-700">
            {/* --- NUEVO: Botón de Eliminar --- */}
            <button 
              onClick={handleDelete} 
              className="bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              Eliminar Pedido
            </button>
            <button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PedidoDetailModal;