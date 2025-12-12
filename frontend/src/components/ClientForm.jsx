// src/components/ClientForm.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';

function ClientForm({ onSave, clientToEdit, onCancelEdit }) {
  const { mostrarMensaje, sucursalActual } = useAppContext();

  // Estados locales
  const [nombre, setNombre] = useState('');
  const [cuit, setCuit] = useState('');
  const [direccion, setDireccion] = useState('');
  const [condicionFiscal, setCondicionFiscal] = useState('Consumidor Final');

  // Cargar datos al editar un cliente existente
  useEffect(() => {
    if (clientToEdit) {
      setNombre(clientToEdit.nombre || '');
      setCuit(clientToEdit.cuit || '');
      setDireccion(clientToEdit.direccion || '');
      setCondicionFiscal(clientToEdit.condicionFiscal || 'Consumidor Final');
    } else {
      // Limpiar formulario para nuevo cliente
      setNombre('');
      setCuit('');
      setDireccion('');
      setCondicionFiscal('Consumidor Final');
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
      direccion: direccion.trim() || '-', // Guion si está vacío para evitar error en PDF
      condicionFiscal: condicionFiscal || 'Consumidor Final',
    });
  };

  // --- FUNCIÓN DE BÚSQUEDA EN AFIP ---
  const handleSearchAfip = async (cuitToSearch = cuit) => {
    // 1. Limpiar CUIT (solo números)
    const cleanCuit = String(cuitToSearch).replace(/\D/g, '');

    if (!cleanCuit || cleanCuit.length !== 11) {
      if (!cuitToSearch) return; // Si está vacío no mostramos error, solo no buscamos
      mostrarMensaje(
        'Ingrese un CUIT válido (11 dígitos) para buscar.',
        'warning',
      );
      return;
    }

    try {
      mostrarMensaje('Buscando en AFIP...', 'info');

      const { getFunctions, httpsCallable } =
        await import('firebase/functions');
      const functions = getFunctions();
      const getContribuyente = httpsCallable(functions, 'getContribuyente');

      const result = await getContribuyente({
        cuit: cleanCuit,
        sucursalId: sucursalActual?.id,
      });

      const response = result.data;

      if (!response.success) {
        throw new Error(response.error || 'Error desconocido.');
      }

      const data = response.data;
      console.log('Datos recibidos de AFIP:', data);

      if (data) {
        // A. Nombre
        setNombre(data.nombre || '');

        // B. Dirección (AFIP devuelve 'domicilio', nosotros usamos 'direccion')
        if (data.domicilio) {
          setDireccion(data.domicilio);
        }

        // C. Condición Fiscal (Lógica Robusta)
        // Buscamos palabras clave por si el texto no coincide exacto
        const tipoAfip = (data.tipo || '').toLowerCase();

        if (tipoAfip.includes('monotributo')) {
          setCondicionFiscal('Responsable Monotributo');
        } else if (tipoAfip.includes('inscripto')) {
          setCondicionFiscal('Responsable Inscripto');
        } else if (tipoAfip.includes('exento')) {
          setCondicionFiscal('Exento');
        } else {
          // Por defecto o si dice "consumidor final"
          setCondicionFiscal('Consumidor Final');
        }

        mostrarMensaje('¡Datos cargados correctamente!', 'success');
      }
    } catch (error) {
      console.error('Error buscando en AFIP:', error);
      mostrarMensaje(
        `No se pudo completar la búsqueda: ${error.message}`,
        'error',
      );
    }
  };

  // Auto-buscar cuando se completan 11 dígitos
  useEffect(() => {
    const cleanCuit = cuit.replace(/\D/g, '');
    // Solo buscamos automático si NO estamos editando un cliente existente (para no pisar datos)
    if (cleanCuit.length === 11 && !clientToEdit) {
      const timer = setTimeout(() => {
        handleSearchAfip(cleanCuit);
      }, 800); // 800ms de espera para que termine de escribir
      return () => clearTimeout(timer);
    }
  }, [cuit, clientToEdit]);

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
        {/* NOMBRE */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Nombre / Razón Social:
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 focus:border-blue-500 focus:ring-blue-500"
            required
            placeholder="Ej: Juan Perez"
          />
        </div>

        {/* CUIT + BOTÓN */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            CUIT / DNI:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Sólo números"
            />
            <motion.button
              type="button"
              onClick={() => handleSearchAfip(cuit)}
              className="rounded-md bg-indigo-600 px-3 py-2 font-bold text-white hover:bg-indigo-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Buscar en AFIP"
            >
              <i className="fas fa-search"></i>
            </motion.button>
          </div>
        </div>

        {/* DIRECCIÓN */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Dirección:
          </label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Calle, Altura, Localidad, Provincia"
            className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* CONDICIÓN FISCAL */}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Condición Fiscal:
          </label>
          <select
            value={condicionFiscal}
            onChange={(e) => setCondicionFiscal(e.target.value)}
            className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="Consumidor Final">Consumidor Final</option>
            <option value="Responsable Monotributo">
              Responsable Monotributo
            </option>
            <option value="Responsable Inscripto">Responsable Inscripto</option>
            <option value="Exento">Exento</option>
          </select>
        </div>

        {/* BOTONES */}
        <div className="mt-3 flex flex-col space-y-2 sm:col-span-3 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0 lg:mt-0 lg:self-end lg:text-right">
          <motion.button
            type="submit"
            className={`order-1 w-full rounded-md px-3 py-2 font-bold text-white lg:w-auto ${clientToEdit ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
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
              className="order-2 w-full rounded-md bg-zinc-600 px-3 py-2 font-bold text-zinc-200 hover:bg-zinc-500 lg:w-auto"
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
