// frontend/src/components/ProveedoresTab.jsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ProveedorForm from './ProveedorForm';
import ProveedorTable from './ProveedorTable';
import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';

const ProveedoresTab = () => {
  const { proveedores, handleSaveProveedor, handleDeleteProveedor } =
    useAppContext();
  const [editingProveedor, setEditingProveedor] = useState(null);

  const handleEdit = (proveedor) => {
    setEditingProveedor(proveedor);
    window.scrollTo(0, 0); // Desplaza la vista hacia arriba para ver el form
  };

  const handleCancelEdit = () => {
    setEditingProveedor(null);
  };

  // La función handleSave ya está conectada al contexto (handleSaveProveedor)
  // La función handleDelete ya está conectada al contexto (handleDeleteProveedor)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <h2 className="flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
        <Truck className="h-8 w-8 text-blue-500" />
        Gestión de Proveedores
      </h2>
      <ProveedorForm
        onSave={handleSaveProveedor}
        editingProveedor={editingProveedor}
        onCancelEdit={handleCancelEdit}
      />
      <ProveedorTable
        proveedores={proveedores}
        onEdit={handleEdit}
        onDelete={handleDeleteProveedor}
      />
    </motion.div>
  );
};

export default ProveedoresTab;
