import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion'; // Importar motion

function ClientForm({ onSave, clientToEdit, onCancelEdit, mostrarMensaje }) {
    // ... (estados y lógica sin cambios) ...
    const [nombre, setNombre] = useState('');
    const [cuit, setCuit] = useState('');
    useEffect(() => { if (clientToEdit) { setNombre(clientToEdit.nombre); setCuit(clientToEdit.cuit || ''); } else { setNombre(''); setCuit(''); } }, [clientToEdit]);
    const handleSubmit = (e) => { e.preventDefault(); if (!nombre.trim()) { mostrarMensaje("El nombre del cliente es obligatorio.", 'warning'); return; } onSave({ id: clientToEdit ? clientToEdit.id : null, nombre: nombre.trim(), cuit: cuit.trim() || null }); };

    return (
        // Fondo zinc oscuro, padding y margen ajustados
        <form onSubmit={handleSubmit} className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md mb-5">
            {/* Título blanco */}
            <h3 className="text-lg sm:text-xl font-medium mb-4 text-white border-b border-zinc-700 pb-2">
                {clientToEdit ? `Editando: ${clientToEdit.nombre}` : 'Agregar Nuevo Cliente'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Inputs (sin cambios) */}
                <div className="sm:col-span-2"> <label htmlFor="cli-nombre-form" className="block text-sm font-medium text-zinc-300 mb-1">Nombre/Razón Social:</label> <input type="text" id="cli-nombre-form" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" required /> </div>
                <div> <label htmlFor="cli-cuit-form" className="block text-sm font-medium text-zinc-300 mb-1">CUIT/CUIL/DNI:</label> <input type="text" id="cli-cuit-form" value={cuit} onChange={(e) => setCuit(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" /> </div>

                 {/* Botones Animados */}
                <div className="sm:col-span-3 lg:self-end lg:text-right flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 mt-3 lg:mt-0">
                     {/* Botón Guardar/Agregar Animado */}
                     <motion.button
                        type="submit"
                        className={`w-full lg:w-auto text-white font-bold py-2 px-3 rounded-md transition duration-150 ease-in-out order-1 ${clientToEdit ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        {clientToEdit ? <><i className="fas fa-save mr-2"></i>Guardar</> : <><i className="fas fa-user-plus mr-2"></i>Agregar</>}
                    </motion.button>
                    {/* Botón Cancelar Animado */}
                    {clientToEdit && (
                        <motion.button
                            type="button"
                            onClick={onCancelEdit}
                            className="w-full lg:w-auto bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold py-2 px-3 rounded-md transition duration-150 ease-in-out order-2"
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
