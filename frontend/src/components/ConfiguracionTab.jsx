// src/components/ConfiguracionTab.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';
import { Save, Download  } from 'lucide-react';

function ConfiguracionTab() {
    const { datosNegocio, handleGuardarDatosNegocio, handleBackupData, isLoading, currentUser } = useAppContext();
    
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [cuit, setCuit] = useState('');
    const [ventaRapidaHabilitada, setVentaRapidaHabilitada] = useState(false);
    const [umbralStockBajo, setUmbralStockBajo] = useState(10);
    const [recibirReporteDiario, setRecibirReporteDiario] = useState(false);

    useEffect(() => {
        if (datosNegocio) {
            setNombre(datosNegocio.nombre || '');
            setDireccion(datosNegocio.direccion || '');
            setCuit(datosNegocio.cuit || '');
            setVentaRapidaHabilitada(datosNegocio.habilitarVentaRapida || false);
            setUmbralStockBajo(datosNegocio.umbralStockBajo || 10);
            setRecibirReporteDiario(datosNegocio.recibirReporteDiario || false);
        }
    }, [datosNegocio]);

    const handleLocalGuardar = () => {
        const updatedData = {
            nombre: nombre.trim(),
            direccion: direccion.trim(),
            cuit: cuit.trim(),
            habilitarVentaRapida: ventaRapidaHabilitada,
            umbralStockBajo: Number(umbralStockBajo) || 0,
            recibirReporteDiario: recibirReporteDiario,
            email: currentUser?.email || datosNegocio?.email || ''
        };
        handleGuardarDatosNegocio(updatedData);
    };

    return (
        <div id="configuracion">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Configuración</h2>
            <div className="bg-zinc-800 p-4 sm:p-6 rounded-lg shadow-md max-w-xl mx-auto">
                <h3 className="text-lg sm:text-xl font-medium mb-5 text-white border-b border-zinc-700 pb-2">Datos del Negocio</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="config-nombre-form" className="block text-sm font-medium text-zinc-300 mb-1">Nombre:</label>
                        <input type="text" id="config-nombre-form" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100"/>
                    </div>
                    <div>
                        <label htmlFor="config-direccion-form" className="block text-sm font-medium text-zinc-300 mb-1">Dirección:</label>
                        <input type="text" id="config-direccion-form" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100"/>
                    </div>
                    <div>
                        <label htmlFor="config-cuit-form" className="block text-sm font-medium text-zinc-300 mb-1">CUIT:</label>
                        <input type="text" id="config-cuit-form" value={cuit} onChange={(e) => setCuit(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100"/>
                    </div>
                    <div className="sm:col-span-1">
    <label htmlFor="umbral-stock-bajo" className="block text-sm font-medium text-zinc-300">
        Umbral de stock bajo
    </label>
    <input
        type="number"
        name="umbralStockBajo"
        id="umbral-stock-bajo"
        value={umbralStockBajo}
         onChange={(e) => setUmbralStockBajo(e.target.value)}
        placeholder="Ej: 5"
        className="mt-1 block w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400"
    />
    <p className="mt-1 text-xs text-zinc-400">
        Recibirás alertas cuando el stock sea igual o menor a este número.
    </p>
</div>
                </div>

                <hr className="my-6 border-zinc-700" />

                {/* SECCIÓN DE BACKUP */}
<h3 className="text-lg sm:text-xl font-medium mb-4 text-white mt-6">Seguridad y Datos</h3>
<div className="bg-zinc-700/50 p-3 rounded-md">
    <div className="flex items-center justify-between">
        <div>
            <p className="font-medium text-zinc-100">Backup Manual</p>
            <p className="text-xs text-zinc-400">Descarga un archivo JSON con todos tus datos.</p>
        </div>
        <motion.button 
          onClick={handleBackupData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-zinc-500 transition-colors text-xs"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Download size={14} />
          {isLoading ? 'Generando...' : 'Generar Backup'}
        </motion.button>
    </div>
</div>
<div className="flex items-center justify-between p-4 bg-zinc-700/50 rounded-lg mt-4">
    <div>
        <label htmlFor="reporte-diario" className="text-base font-medium text-zinc-100">Reporte Diario por Email</label>
        <p className="text-sm text-zinc-400">Recibe un resumen de tus ventas todas las noches.</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
        <input 
            type="checkbox" 
            id="reporte-diario" 
            checked={recibirReporteDiario} 
            onChange={(e) => setRecibirReporteDiario(e.target.checked)} 
            className="sr-only peer" 
        />
        <div className="w-11 h-6 bg-zinc-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
</div>
                
                <h3 className="text-lg sm:text-xl font-medium mb-4 text-white mt-6">Funcionalidades</h3>
                <div className="flex items-center justify-between bg-zinc-700/50 p-3 rounded-md">
                    <div>
                        <label htmlFor="toggle-venta-rapida" className="font-medium text-zinc-100">Habilitar Venta Rápida</label>
                        <p className="text-xs text-zinc-400">Permite agregar items por monto sin control de stock.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" id="toggle-venta-rapida" checked={ventaRapidaHabilitada} onChange={(e) => setVentaRapidaHabilitada(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-zinc-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                <div className="text-right pt-5">
                     <motion.button onClick={handleLocalGuardar} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Save className="mr-2 h-4 w-4 inline-block" />Guardar Cambios
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

export default ConfiguracionTab;