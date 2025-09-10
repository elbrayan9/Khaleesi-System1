// frontend/src/components/ProveedorForm.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ProveedorForm = ({ onSave, editingProveedor, onCancelEdit }) => {
  const [proveedor, setProveedor] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    cuit: '',
    notas: '',
    zona: '',    
    rubro: '',   
    marcas: '',
  });

  useEffect(() => {
    if (editingProveedor) {
      setProveedor(editingProveedor);
    } else {
      // Reset form
      setProveedor({ nombre: '', telefono: '', email: '', direccion: '', cuit: '', notas: '', zona: '', rubro: '', marcas: '' });
    }
  }, [editingProveedor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProveedor({ ...proveedor, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!proveedor.nombre) {
      // Puedes usar tu sistema de notificaciones aquí
      alert('El nombre del proveedor es obligatorio.');
      return;
    }
    onSave(proveedor, editingProveedor?.id || null);
    setProveedor({ nombre: '', telefono: '', email: '', direccion: '', cuit: '', notas: '' }); // Limpiar formulario
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800 p-4 rounded-lg shadow-md mb-6 border border-zinc-700"
    >
      <h3 className="text-lg font-bold text-white mb-4">
        {editingProveedor ? 'Editando Proveedor' : 'Nuevo Proveedor'}
      </h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="nombre"
          value={proveedor.nombre}
          onChange={handleChange}
          placeholder="Nombre o Razón Social"
          className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          required
        />
        <input
          type="text"
          name="cuit"
          value={proveedor.cuit}
          onChange={handleChange}
          placeholder="CUIT / CUIL"
          className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
  type="text"
  name="zona"
  value={proveedor.zona || ''}
  onChange={handleChange}
  placeholder="Zona (ej: Capital, Zona Norte)"
  className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
/>
<input
  type="text"
  name="rubro"
  value={proveedor.rubro || ''}
  onChange={handleChange}
  placeholder="Rubro (ej: Ferretería, Limpieza)"
  className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
/>
<input
  type="text"
  name="marcas"
  value={proveedor.marcas || ''}
  onChange={handleChange}
  placeholder="Marcas (separadas por coma)"
  className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
/>


        <input
          type="tel"
          name="telefono"
          value={proveedor.telefono}
          onChange={handleChange}
          placeholder="Teléfono"
          className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="email"
          name="email"
          value={proveedor.email}
          onChange={handleChange}
          placeholder="Email"
          className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <textarea
          name="direccion"
          value={proveedor.direccion}
          onChange={handleChange}
          placeholder="Dirección"
          className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          rows="2"
        />
        <textarea
          name="notas"
          value={proveedor.notas}
          onChange={handleChange}
          placeholder="Notas Adicionales"
          className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 md:col-span-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          rows="3"
        />
        <div className="md:col-span-2 flex justify-end gap-3">
          {editingProveedor && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              Cancelar Edición
            </button>
          )}
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            {editingProveedor ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ProveedorForm;