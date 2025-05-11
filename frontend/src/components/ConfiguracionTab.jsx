// src/components/ConfiguracionTab.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function ConfiguracionTab({
    datosNegocio,
    onSaveDatosNegocio, // Nueva prop
    onLogout,
    mostrarMensaje,
    IconoLogout,
    IconoGuardar
}) {
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [cuit, setCuit] = useState('');

    useEffect(() => {
        setNombre(datosNegocio.nombre || '');
        setDireccion(datosNegocio.direccion || '');
        setCuit(datosNegocio.cuit || '');
    }, [datosNegocio]);

    const handleGuardarLocal = () => {
        const updatedData = {
            nombre: nombre.trim(),
            direccion: direccion.trim(),
            cuit: cuit.trim()
        };
        onSaveDatosNegocio(updatedData); // Llama a la función de App.jsx
    };

    return (
        <div id="configuracion">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Configuración del Negocio</h2>
            <div className="bg-zinc-800 p-4 sm:p-6 rounded-lg shadow-md max-w-xl mx-auto">
                <h3 className="text-lg sm:text-xl font-medium mb-5 text-white border-b border-zinc-700 pb-2">Datos para Impresión</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="config-nombre-form" className="block text-sm font-medium text-zinc-300 mb-1">Nombre:</label>
                        <input type="text" id="config-nombre-form" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" />
                    </div>
                    <div>
                        <label htmlFor="config-direccion-form" className="block text-sm font-medium text-zinc-300 mb-1">Dirección:</label>
                        <input type="text" id="config-direccion-form" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" />
                    </div>
                    <div>
                        <label htmlFor="config-cuit-form" className="block text-sm font-medium text-zinc-300 mb-1">CUIT:</label>
                        <input type="text" id="config-cuit-form" value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="XX-XXXXXXXX-X" className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" />
                    </div>
                    <div className="text-right pt-3">
                         <motion.button
                            onClick={handleGuardarLocal} // Llama al handler local
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition duration-150 ease-in-out inline-flex items-center"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                         >
                            {IconoGuardar && <IconoGuardar className="mr-2 h-4 w-4" strokeWidth={2.5} />}
                            Guardar
                        </motion.button>
                    </div>
                </div>
                <hr className="my-6 border-zinc-700" />
                <div className="text-center">
                    <motion.button
                        onClick={onLogout} // onLogout se mantiene igual
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md transition duration-150 ease-in-out inline-flex items-center"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        {IconoLogout && <IconoLogout className="mr-2 h-5 w-5" strokeWidth={2.5} />}
                        Salir
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
export default ConfiguracionTab;