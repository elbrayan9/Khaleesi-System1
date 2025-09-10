// frontend/src/components/ProveedoresTab.jsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ProveedorForm from './ProveedorForm';
import ProveedorTable from './ProveedorTable';
import { motion } from 'framer-motion';

const ProveedoresTab = () => {
  const { proveedores, handleSaveProveedor, handleDeleteProveedor } = useAppContext();
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