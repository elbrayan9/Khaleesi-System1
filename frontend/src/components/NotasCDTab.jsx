import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Trash2, ShoppingBag, XCircle, Eye, Printer } from 'lucide-react';
import SearchBar from './SearchBar.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppContext } from '../context/AppContext.jsx'; // Importar hook
import { formatCurrency } from '../utils/helpers.js'; // Importar helper

function NotasCDTab({ onViewDetailsNotaCD, onPrintNotaCD }) { // Solo recibe props para modales/impresión
    const {
        notasCD,
        handleGenerarNota,  // Renombrado desde onAddNotaCD
        handleEliminarNotaCD, // Renombrado desde onDeleteNotaCD
        clientes,
        productos,
        mostrarMensaje,
        // formatCurrency (si no se importa directamente)
    } = useAppContext();

    // Estados locales para el formulario de esta pestaña se mantienen
    const [tipoNota, setTipoNota] = useState('credito');
    const [ventaRelacionadaId, setVentaRelacionadaId] = useState('');
    const [clienteId, setClienteId] = useState('');
    const [motivo, setMotivo] = useState('');
    const [monto, setMonto] = useState('');
    const [implicaDevolucion, setImplicaDevolucion] = useState(false);
    const [itemsDevueltos, setItemsDevueltos] = useState([]);
    const [productoSeleccionadoParaDev, setProductoSeleccionadoParaDev] = useState(null);
    const [cantidadDevolucion, setCantidadDevolucion] = useState(1);
    const [busquedaProductoDev, setBusquedaProductoDev] = useState('');
    const productoDevRef = useRef(null);

    useEffect(() => {
        if (!implicaDevolucion || tipoNota === 'debito') {
            setItemsDevueltos([]);
            if (tipoNota === 'debito') setImplicaDevolucion(false);
        }
    }, [implicaDevolucion, tipoNota]);

    const isValidFirestoreIdForSelection = (id) => id && typeof id === 'string' && !id.startsWith("local_") && !id.includes("_inv_") && !id.includes("_err_");
    const productosValidosParaDevolucion = productos.filter(p => isValidFirestoreIdForSelection(p.id));
    const clientesValidos = clientes.filter(c => isValidFirestoreIdForSelection(c.id));

    const handleSelectProductoDev = (producto) => { setProductoSeleccionadoParaDev(producto); setBusquedaProductoDev(producto ? producto.nombre : ''); };
    const handleAgregarItemDevuelto = () => {
        if (!productoSeleccionadoParaDev || !isValidFirestoreIdForSelection(productoSeleccionadoParaDev.id)) { mostrarMensaje("Seleccione un producto válido.", "warning"); return; }
        const cant = parseInt(cantidadDevolucion, 10);
        if (isNaN(cant) || cant <= 0) { mostrarMensaje("Ingrese una cantidad válida.", "warning"); return; }
        const existenteIndex = itemsDevueltos.findIndex(item => item.id === productoSeleccionadoParaDev.id);
        if (existenteIndex > -1) {
            const nuevosItems = [...itemsDevueltos];
            nuevosItems[existenteIndex].cantidad += cant;
            setItemsDevueltos(nuevosItems);
        } else {
            setItemsDevueltos(prev => [...prev, { id: productoSeleccionadoParaDev.id, nombre: productoSeleccionadoParaDev.nombre, cantidad: cant, precioOriginal: productoSeleccionadoParaDev.precio }]);
        }
        setProductoSeleccionadoParaDev(null); setCantidadDevolucion(1); setBusquedaProductoDev('');
        productoDevRef.current?.clearInput?.();
    };
    const handleQuitarItemDevuelto = (index) => setItemsDevueltos(prev => prev.filter((_, i) => i !== index));

    const handleLocalGenerarNotaClick = () => {
        const montoNota = parseFloat(monto);
        if (!clienteId) { mostrarMensaje("Seleccione un cliente.", 'warning'); return; }
        if (!motivo.trim()) { mostrarMensaje("Ingrese un motivo.", 'warning'); return; }
        if (isNaN(montoNota) || montoNota <= 0) { mostrarMensaje("Ingrese un monto válido.", 'warning'); return; }
        if (implicaDevolucion && tipoNota === 'credito' && itemsDevueltos.length === 0) { mostrarMensaje("Agregue productos a devolver.", "warning"); return; }
        if (implicaDevolucion && tipoNota === 'credito' && itemsDevueltos.some(item => !isValidFirestoreIdForSelection(item.id))) { mostrarMensaje("Productos devueltos con IDs inválidos.", "error"); return; }

        const clienteSeleccionado = clientes.find(c => c.id === clienteId);
        const notaDataParaApp = {
            tipo: tipoNota, ventaRelacionadaId: ventaRelacionadaId.trim() || null, clienteId: clienteId,
            clienteNombre: clienteSeleccionado ? clienteSeleccionado.nombre : 'Cliente Desconocido',
            motivo: motivo.trim(), monto: montoNota,
            itemsDevueltos: (implicaDevolucion && tipoNota === 'credito') ? itemsDevueltos : [],
        };
        handleGenerarNota(notaDataParaApp); // Llama al handler del contexto
        setTipoNota('credito'); setVentaRelacionadaId(''); setClienteId(''); setMotivo(''); setMonto('');
        setImplicaDevolucion(false); setItemsDevueltos([]); setProductoSeleccionadoParaDev(null);
        setCantidadDevolucion(1); setBusquedaProductoDev(''); productoDevRef.current?.clearInput?.();
    };

    const isActionDisabled = (nota) => !nota.id || !!nota._id_original_invalid || (typeof nota.id === 'string' && (nota.id.startsWith("local_") || nota.id.includes("_inv_")));
    const thClasses = "px-3 py-2 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider";
    const tdClasses = "px-3 py-2 text-sm";

    return (
        <div id="notas_cd">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Notas de Crédito / Débito</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md">
                    <h3 className="text-lg sm:text-xl font-medium mb-3 text-white border-b border-zinc-700 pb-2">Generar Nueva Nota</h3>
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="nota-tipo-form" className="block text-sm font-medium text-zinc-300 mb-1">Tipo:</label>
                            <select id="nota-tipo-form" value={tipoNota} onChange={(e) => setTipoNota(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100">
                                <option value="credito">Nota de Crédito</option>
                                <option value="debito">Nota de Débito</option>
                            </select>
                        </div>
                        <div><label htmlFor="nota-venta-rel-form" className="block text-sm font-medium text-zinc-300 mb-1">Venta Relacionada (ID - Opc.):</label><input type="text" id="nota-venta-rel-form" value={ventaRelacionadaId} onChange={(e) => setVentaRelacionadaId(e.target.value)} placeholder="ID Venta Original" className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100 placeholder-zinc-400"/></div>
                        <div>
                            <label htmlFor="nota-cliente-form" className="block text-sm font-medium text-zinc-300 mb-1">Cliente:</label>
                            <select id="nota-cliente-form" value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" required>
                                <option value="">Seleccione Cliente...</option>
                                {clientesValidos.map(c => (<option key={c.id} value={c.id}>{c.nombre} ({c.cuit || 'S/N CUIT'})</option>))}
                            </select>
                        </div>
                        <div><label htmlFor="nota-motivo-form" className="block text-sm font-medium text-zinc-300 mb-1">Motivo:</label><textarea id="nota-motivo-form" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows="2" placeholder="Ej: Devolución, ajuste..." className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100 placeholder-zinc-400" required></textarea></div>
                        <div><label htmlFor="nota-monto-form" className="block text-sm font-medium text-zinc-300 mb-1">Monto Total ($):</label><input type="number" id="nota-monto-form" value={monto} onChange={(e) => setMonto(e.target.value)} step="0.01" min="0.01" placeholder="Monto de la nota" className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" required /></div>
                        {tipoNota === 'credito' && (
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                                <label className="flex items-center text-sm text-zinc-300 cursor-pointer">
                                    <input type="checkbox" checked={implicaDevolucion} onChange={(e) => setImplicaDevolucion(e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 border-zinc-500 rounded focus:ring-blue-500 bg-zinc-700"/>
                                    ¿Implica devolución de productos al stock?
                                </label>
                            </div>
                        )}
                        {implicaDevolucion && tipoNota === 'credito' && (
                            <div className="border border-zinc-600 p-3 mt-2 rounded-md space-y-3 bg-zinc-700/30">
                                <h4 className="text-md font-medium text-zinc-100 mb-1">Productos Devueltos</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                    <div className="sm:col-span-2">
                                        <label htmlFor="producto-devolucion-buscar" className="block text-xs font-medium text-zinc-400 mb-1">Buscar Producto:</label>
                                        <SearchBar ref={productoDevRef} items={productosValidosParaDevolucion} placeholder="Buscar producto a devolver..." onSelect={handleSelectProductoDev} displayKey="nombre" filterKeys={['nombre', 'codigoBarras']} inputId="producto-devolucion-buscar" initialValue={busquedaProductoDev}/>
                                    </div>
                                    <div>
                                        <label htmlFor="cantidad-devolucion" className="block text-xs font-medium text-zinc-400 mb-1">Cantidad:</label>
                                        <input type="number" id="cantidad-devolucion" value={cantidadDevolucion} onChange={(e) => setCantidadDevolucion(e.target.value)} min="1" className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100"/>
                                    </div>
                                </div>
                                <button type="button" onClick={handleAgregarItemDevuelto} disabled={!productoSeleccionadoParaDev || !cantidadDevolucion || Number(cantidadDevolucion) <=0} className={`w-full text-sm font-medium py-1.5 px-3 rounded-md transition ${(!productoSeleccionadoParaDev || !cantidadDevolucion || Number(cantidadDevolucion) <=0) ? 'bg-zinc-500 text-zinc-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 text-white'} inline-flex items-center justify-center`}>
                                    <ShoppingBag className="h-4 w-4 mr-2"/>Agregar Producto a Devolución
                                </button>
                                {itemsDevueltos.length > 0 && (
                                    <div className="mt-2 max-h-32 overflow-y-auto pr-1 space-y-1">
                                        <p className="text-xs text-zinc-400 mb-1">Ítems a devolver:</p>
                                        {itemsDevueltos.map((item, index) => (
                                            <div key={`${item.id}-${index}`} className="flex justify-between items-center text-xs bg-zinc-700/70 p-1.5 rounded">
                                                <span className="text-zinc-200">{item.nombre} (x{item.cantidad})</span>
                                                <button onClick={() => handleQuitarItemDevuelto(index)} className="text-red-400 hover:text-red-300 p-0.5" title="Quitar"><XCircle size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="text-right mt-4">
                            <motion.button onClick={handleLocalGenerarNotaClick} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-md inline-flex items-center" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}><PlusCircle className="h-4 w-4 mr-2"/>Generar Nota</motion.button>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md overflow-x-auto">
                    <h3 className="text-lg sm:text-xl font-medium mb-3 text-white border-b border-zinc-700 pb-2">Notas Generadas</h3>
                    {notasCD.length === 0 ? (
                        <p className="text-zinc-400 italic text-sm py-6 text-center">No hay notas generadas.</p>
                    ) : (
                        <Table>
                            <TableHeader><TableRow className="hover:bg-transparent border-b-zinc-700"><TableHead className={thClasses}>ID</TableHead><TableHead className={thClasses}>Tipo</TableHead><TableHead className={thClasses}>Fecha</TableHead><TableHead className={thClasses}>Cliente</TableHead><TableHead className={`${thClasses} text-right`}>Monto</TableHead><TableHead className={`${thClasses} text-center`}>Acciones</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {notasCD.slice().sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).map(n => (
                                    <TableRow key={n.id || `nota_fb_${Date.now()}${Math.random()}`} className="hover:bg-zinc-700/30 border-b-zinc-700">
                                        <TableCell className={`${tdClasses} font-medium text-zinc-200`}>{(n.id || 'N/A').substring(0, 8)}...</TableCell>
                                        <TableCell className={`${tdClasses} font-medium ${n.tipo === 'credito' ? 'text-red-400' : 'text-green-400'}`}>{n.tipo === 'credito' ? 'Crédito' : 'Débito'}</TableCell>
                                        <TableCell className={`${tdClasses} text-zinc-400`}>{n.fecha} {n.hora}</TableCell>
                                        <TableCell className={`${tdClasses} text-zinc-200`}>{n.clienteNombre}</TableCell>
                                        <TableCell className={`${tdClasses} text-right font-semibold ${n.tipo === 'credito' ? 'monto-negativo' : 'monto-positivo'}`}>${formatCurrency(n.monto)}</TableCell>
                                        <TableCell className={`${tdClasses} text-center whitespace-nowrap`}>
                                            {typeof onViewDetailsNotaCD === 'function' && (<motion.button onClick={() => onViewDetailsNotaCD(n.id)} className="text-purple-400 hover:text-purple-300 mr-2 p-1 rounded" title="Ver Detalle" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={isActionDisabled(n)}><Eye className="h-4 w-4 inline-block"/></motion.button>)}
                                            {typeof onPrintNotaCD === 'function' && (<motion.button onClick={() => onPrintNotaCD(n.id)} className="text-blue-400 hover:text-blue-300 mr-2 p-1 rounded" title="Imprimir Nota" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={isActionDisabled(n)}><Printer className="h-4 w-4 inline-block"/></motion.button>)}
                                            <motion.button onClick={() => handleEliminarNotaCD(n.id)} className="text-red-500 hover:text-red-400 p-1 rounded" title="Eliminar Nota" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={isActionDisabled(n)}><Trash2 className="h-4 w-4 inline-block"/></motion.button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </div>
    );
}
export default NotasCDTab;