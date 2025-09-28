// src/components/ClientForm.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx'; // Importar hook

function ClientForm({ onSave, clientToEdit, onCancelEdit }) {
  // mostrarMensaje ya no es prop
  const { mostrarMensaje } = useAppContext(); // Obtener del contexto

  const [nombre, setNombre] = useState('');
  const [cuit, setCuit] = useState('');

  useEffect(() => {
    if (clientToEdit) {
      setNombre(clientToEdit.nombre);
      setCuit(clientToEdit.cuit || '');
    } else {
      setNombre('');
      setCuit('');
    }
  }, [clientToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      mostrarMensaje('El nombre del cliente es obligatorio.', 'warning');
      return;
    }
    onSave({
      id: clientToEdit ? clientToEdit.id : null,
      nombre: nombre.trim(),
      cuit: cuit.trim() || null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-5 rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5"
    >
      <h3 className="mb-4 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
        {clientToEdit
          ? `Editando: ${clientToEdit.nombre}`
          : 'Agregar Nuevo Cliente'}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label
            htmlFor="cli-nombre-form"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Nombre/Razón Social:
          </label>
          <input
            type="text"
            id="cli-nombre-form"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label
            htmlFor="cli-cuit-form"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            CUIT/CUIL/DNI:
          </label>
          <input
            type="text"
            id="cli-cuit-form"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="mt-3 flex flex-col space-y-2 sm:col-span-3 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0 lg:mt-0 lg:self-end lg:text-right">
          <motion.button
            type="submit"
            className={`order-1 w-full rounded-md px-3 py-2 font-bold text-white transition duration-150 ease-in-out lg:w-auto ${clientToEdit ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {clientToEdit ? (
              <>
                <i className="fas fa-save mr-2"></i>Guardar
              </>
            ) : (
              <>
                <i className="fas fa-user-plus mr-2"></i>Agregar
              </>
            )}
          </motion.button>
          {clientToEdit && (
            <motion.button
              type="button"
              onClick={onCancelEdit}
              className="order-2 w-full rounded-md bg-zinc-600 px-3 py-2 font-bold text-zinc-200 transition duration-150 ease-in-out hover:bg-zinc-500 lg:w-auto"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <i className="fas fa-times mr-2"></i>Cancelar
            </motion.button>
          )}
        </div>
      </div>
    </form>
  );
}
export default ClientForm;
