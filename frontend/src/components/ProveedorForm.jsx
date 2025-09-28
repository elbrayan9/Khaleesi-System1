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
      setProveedor({
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
    setProveedor({
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      cuit: '',
      notas: '',
    }); // Limpiar formulario
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800 p-4 shadow-md"
    >
      <h3 className="mb-4 text-lg font-bold text-white">
        {editingProveedor ? 'Editando Proveedor' : 'Nuevo Proveedor'}
      </h3>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <input
          type="text"
          name="nombre"
          value={proveedor.nombre}
          onChange={handleChange}
          placeholder="Nombre o Razón Social"
          className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          required
        />
        <input
          type="text"
          name="cuit"
          value={proveedor.cuit}
          onChange={handleChange}
          placeholder="CUIT / CUIL"
          className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="text"
          name="zona"
          value={proveedor.zona || ''}
          onChange={handleChange}
          placeholder="Zona (ej: Capital, Zona Norte)"
          className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="text"
          name="rubro"
          value={proveedor.rubro || ''}
          onChange={handleChange}
          placeholder="Rubro (ej: Ferretería, Limpieza)"
          className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="text"
          name="marcas"
          value={proveedor.marcas || ''}
          onChange={handleChange}
          placeholder="Marcas (separadas por coma)"
          className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 md:col-span-2"
        />

        <input
          type="tel"
          name="telefono"
          value={proveedor.telefono}
          onChange={handleChange}
          placeholder="Teléfono"
          className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <input
          type="email"
          name="email"
          value={proveedor.email}
          onChange={handleChange}
          placeholder="Email"
          className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <textarea
          name="direccion"
          value={proveedor.direccion}
          onChange={handleChange}
          placeholder="Dirección"
          className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 md:col-span-2"
          rows="2"
        />
        <textarea
          name="notas"
          value={proveedor.notas}
          onChange={handleChange}
          placeholder="Notas Adicionales"
          className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 md:col-span-2"
          rows="3"
        />
        <div className="flex justify-end gap-3 md:col-span-2">
          {editingProveedor && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-md bg-zinc-600 px-4 py-2 font-bold text-white transition-colors hover:bg-zinc-500"
            >
              Cancelar Edición
            </button>
          )}
          <button
            type="submit"
            className="rounded-md bg-cyan-600 px-4 py-2 font-bold text-white transition-colors hover:bg-cyan-500"
          >
            {editingProveedor ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ProveedorForm;
