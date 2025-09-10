// frontend/src/components/PedidosTab.jsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import PedidosTable from './PedidosTable';
import PedidoForm from './PedidoForm';
import { motion } from 'framer-motion';
import { FiPlus } from 'react-icons/fi';
import PedidoDetailModal from './PedidoDetailModal';
// Opcional: Crearemos un modal de detalle simple también.
// import PedidoDetailModal from './PedidoDetailModal'; 

const PedidosTab = () => {
  const { pedidos, handleRecibirPedido, handleUpdatePedidoEstado, handleCancelarPedido } = useAppContext();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  // Opcional: Estado para un futuro modal de detalle
  // const [selectedPedido, setSelectedPedido] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestión de Pedidos a Proveedores</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
          <FiPlus />
          Nuevo Pedido
        </button>
      </div>

      <PedidosTable
        pedidos={pedidos}
        onRecibir={handleRecibirPedido}
        onUpdateEstado={handleUpdatePedidoEstado}
        onCancelar={handleCancelarPedido}
        onVerDetalle={setSelectedPedido} // Descomentar si creas el modal de detalle
      />

      <PedidoForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      {/* Opcional: Renderizar el modal de detalle */}
      {selectedPedido && (
        <PedidoDetailModal
          pedido={selectedPedido}
          onClose={() => setSelectedPedido(null)}
        />
      )}
    </motion.div>
  );
};

export default PedidosTab;