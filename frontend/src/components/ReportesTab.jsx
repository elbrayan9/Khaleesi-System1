// src/components/ReportesTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, Trash2, PlusCircle, MinusCircle, Archive, Search, ArrowUp, ArrowDown, Minus, Eye } from 'lucide-react';
import Swal from 'sweetalert2';
import PaginationControls from './PaginationControls.jsx';
import SalesChart from './SalesChart.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ITEMS_PER_PAGE_REPORTE = 10;

function ReportesTab({
    ventas = [],
    egresos = [],
    ingresosManuales = [],
    // productos = [], // Solo para lectura si es necesario, no se modifica aquí
    clientes = [],  // Solo para lectura (ej. info de cliente en ventas)
    datosNegocio,   // Para el cierre de caja
    onPrintRequest,
    onViewDetailsRequest,
    // Handlers de App.jsx para la lógica de Firebase
    onAddIngresoManual,
    onDeleteIngresoManual,
    onAddEgreso,
    onDeleteEgreso,
    onDeleteVenta,
    // Helpers
    formatCurrency,
    obtenerNombreMes,
    mostrarMensaje
}) {
    // Estados locales para los formularios de esta pestaña
    const [formIngresoDesc, setFormIngresoDesc] = useState('');
    const [formIngresoMonto, setFormIngresoMonto] = useState('');
    const [formEgresoDesc, setFormEgresoDesc] = useState('');
    const [formEgresoMonto, setFormEgresoMonto] = useState('');

    const [searchTermDia, setSearchTermDia] = useState('');
    const [sortConfigDia, setSortConfigDia] = useState({ key: 'timestamp', direction: 'descending' });
    const [currentPageDia, setCurrentPageDia] = useState(1);
    const [searchTermMes, setSearchTermMes] = useState('');
    const [sortConfigMes, setSortConfigMes] = useState({ key: 'timestamp', direction: 'descending' });
    const [currentPageMes, setCurrentPageMes] = useState(1);

    const ahora = new Date();
    const hoyStr = ahora.toLocaleDateString('es-AR');
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const nombreMesActual = obtenerNombreMes(mesActual);

    const parseDateFromReport = (fechaStr) => {
        if (!fechaStr || typeof fechaStr !== 'string') return null;
        const parts = fechaStr.split('/');
        if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return null;
    };

    const ventasHoy = ventas.filter(v => v.fecha === hoyStr);
    const egresosHoy = egresos.filter(e => e.fecha === hoyStr);
    const ingresosManualesHoy = ingresosManuales.filter(i => i.fecha === hoyStr);

    const filterByMonthAndYear = (item) => {
        const itemDate = item.timestamp ? new Date(item.timestamp) : parseDateFromReport(item.fecha);
        return itemDate && itemDate.getMonth() === mesActual && itemDate.getFullYear() === anioActual;
    };

    const ventasMes = ventas.filter(filterByMonthAndYear);
    const egresosMes = egresos.filter(filterByMonthAndYear);
    const ingresosManualesMes = ingresosManuales.filter(filterByMonthAndYear);

    const totalVentasHoyTodos = ventasHoy.reduce((s, v) => s + (Number(v.total) || 0), 0);
    const ventasPorMedioHoy = ventasHoy.reduce((acc, v) => { acc[v.metodoPago] = (acc[v.metodoPago] || 0) + (Number(v.total) || 0); return acc; }, {});
    const totalEgresosEfectivoHoy = egresosHoy.reduce((s, e) => s + (Number(e.monto) || 0), 0);
    const totalIngresosManualesHoy = ingresosManualesHoy.reduce((s, i) => s + (Number(i.monto) || 0), 0);
    const saldoEfectivoEsperado = (ventasPorMedioHoy['efectivo'] || 0) + totalIngresosManualesHoy - totalEgresosEfectivoHoy;
    const totalVentasMesTodos = ventasMes.reduce((s, v) => s + (Number(v.total) || 0), 0);

    const defaultSort = (a,b) => (new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    const generateFallbackId = (prefix) => `${prefix}${Date.now()}${Math.random().toString(16).slice(2)}`;

    const todosMovimientosEfectivoHoy = useMemo(() => [
        ...ventasHoy.filter(v => v.metodoPago === 'efectivo').map(v => ({ ...v, id: v.id || generateFallbackId('vh_'), tipo: 'Venta', montoDisplay: v.total, desc: `Venta #${(v.id || 'N/A').substring(0,8)}... - ${v.clienteNombre || 'Cons. Final'}` })),
        ...ingresosManualesHoy.map(i => ({ ...i, id: i.id || generateFallbackId('ih_'), tipo: 'Ingreso Manual', montoDisplay: i.monto, desc: i.descripcion })),
        ...egresosHoy.map(e => ({ ...e, id: e.id || generateFallbackId('eh_'), tipo: 'Egreso', montoDisplay: -(Number(e.monto) || 0), desc: e.descripcion }))
    ].sort(defaultSort), [ventasHoy, ingresosManualesHoy, egresosHoy]);

    const todosMovimientosMes = useMemo(() => [
        ...ventasMes.map(v => ({ ...v, id: v.id || generateFallbackId('vm_'), tipo: 'Venta', montoDisplay: v.total, desc: `Venta #${(v.id || 'N/A').substring(0,8)}... - ${v.clienteNombre || 'Cons. Final'} (${v.metodoPago})` })),
        ...ingresosManualesMes.map(i => ({ ...i, id: i.id || generateFallbackId('im_'), tipo: 'Ingreso Manual', montoDisplay: i.monto, desc: i.descripcion })),
        ...egresosMes.map(e => ({ ...e, id: e.id || generateFallbackId('em_'), tipo: 'Egreso', montoDisplay: -(Number(e.monto) || 0), desc: e.descripcion }))
    ].sort(defaultSort), [ventasMes, ingresosManualesMes, egresosMes]);

    const salesDataForChart = useMemo(() => {
        const salesByDay = ventasMes.reduce((acc, venta) => {
            try { if (venta.fecha && typeof venta.fecha === 'string') { const day = venta.fecha.split('/')[0]; if (day) { acc[day] = (acc[day] || 0) + (Number(venta.total) || 0); } }
            } catch (e) { console.error("Error parsing date for chart:", venta.fecha, e); } return acc;
        }, {});
        return Object.entries(salesByDay).map(([dia, total]) => ({ dia, total })).sort((a, b) => parseInt(a.dia, 10) - parseInt(b.dia, 10));
    }, [ventasMes]);

    const sortItems = (items, config) => {
        if (!config.key) return items;
        return [...items].sort((a, b) => {
            let valA = a[config.key]; let valB = b[config.key];
            if (config.key === 'timestamp') { valA = new Date(valA || 0).getTime(); valB = new Date(valB || 0).getTime(); }
            else if (typeof valA === 'number' && typeof valB === 'number') { /* no change */ }
            else { valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase(); }
            if (valA < valB) return config.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return config.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    };

    const filteredSortedMovimientosDia = useMemo(() => {
        let items = todosMovimientosEfectivoHoy;
        if (searchTermDia) { const lower = searchTermDia.toLowerCase(); items = items.filter(m => String(m.tipo).toLowerCase().includes(lower) || String(m.desc).toLowerCase().includes(lower) || String(m.montoDisplay).includes(lower) || String(m.hora).toLowerCase().includes(lower)); }
        return sortItems(items, sortConfigDia);
    }, [todosMovimientosEfectivoHoy, searchTermDia, sortConfigDia]);
    const totalPagesDia = Math.ceil(filteredSortedMovimientosDia.length / ITEMS_PER_PAGE_REPORTE);
    const paginatedMovimientosDia = useMemo(() => { const first = (currentPageDia - 1) * ITEMS_PER_PAGE_REPORTE; return filteredSortedMovimientosDia.slice(first, first + ITEMS_PER_PAGE_REPORTE); }, [currentPageDia, filteredSortedMovimientosDia]);
    useEffect(() => { if (currentPageDia > totalPagesDia && totalPagesDia > 0) setCurrentPageDia(totalPagesDia); else if (currentPageDia <= 0 && totalPagesDia > 0) setCurrentPageDia(1); else if (filteredSortedMovimientosDia.length === 0 && currentPageDia !== 1) setCurrentPageDia(1); }, [currentPageDia, totalPagesDia, filteredSortedMovimientosDia.length]);
    const requestSortDia = (key) => { let d = (sortConfigDia.key === key && sortConfigDia.direction === 'ascending') ? 'descending' : 'ascending'; setSortConfigDia({ key, direction: d }); setCurrentPageDia(1); };

    const filteredSortedMovimientosMes = useMemo(() => {
        let items = todosMovimientosMes;
        if (searchTermMes) { const lower = searchTermMes.toLowerCase(); items = items.filter(m => String(m.fecha).toLowerCase().includes(lower) || String(m.tipo).toLowerCase().includes(lower) || String(m.desc).toLowerCase().includes(lower) || String(m.montoDisplay).includes(lower) || String(m.hora).toLowerCase().includes(lower)); }
        return sortItems(items, sortConfigMes);
    }, [todosMovimientosMes, searchTermMes, sortConfigMes]);
    const totalPagesMes = Math.ceil(filteredSortedMovimientosMes.length / ITEMS_PER_PAGE_REPORTE);
    const paginatedMovimientosMes = useMemo(() => { const first = (currentPageMes - 1) * ITEMS_PER_PAGE_REPORTE; return filteredSortedMovimientosMes.slice(first, first + ITEMS_PER_PAGE_REPORTE); }, [currentPageMes, filteredSortedMovimientosMes]);
    useEffect(() => { if (currentPageMes > totalPagesMes && totalPagesMes > 0) setCurrentPageMes(totalPagesMes); else if (currentPageMes <= 0 && totalPagesMes > 0) setCurrentPageMes(1); else if (filteredSortedMovimientosMes.length === 0 && currentPageMes !== 1) setCurrentPageMes(1); }, [currentPageMes, totalPagesMes, filteredSortedMovimientosMes.length]);
    const requestSortMes = (key) => { let d = (sortConfigMes.key === key && sortConfigMes.direction === 'ascending') ? 'descending' : 'ascending'; setSortConfigMes({ key, direction: d }); setCurrentPageMes(1); };

    const handleRegistrarIngresoClick = () => {
        const montoNum = parseFloat(formIngresoMonto);
        if (!formIngresoDesc.trim() || isNaN(montoNum) || montoNum <= 0) { mostrarMensaje("Ingrese descripción y monto válido para el ingreso.", 'warning'); return; }
        onAddIngresoManual(formIngresoDesc.trim(), montoNum);
        setFormIngresoDesc(''); setFormIngresoMonto('');
    };
    const handleRegistrarEgresoClick = () => {
        const montoNum = parseFloat(formEgresoMonto);
        if (!formEgresoDesc.trim() || isNaN(montoNum) || montoNum <= 0) { mostrarMensaje("Ingrese descripción y monto válido para el egreso.", 'warning'); return; }
        onAddEgreso(formEgresoDesc.trim(), montoNum);
        setFormEgresoDesc(''); setFormEgresoMonto('');
    };

    const checkIdValidityForAction = (id, itemType) => {
        const isInvalid = !id || typeof id !== 'string' || id.startsWith("local_") || id.includes("_h_") || id.includes("_m_") || id.includes("_flt_") || (id && id._id_original_invalid);
        if (isInvalid) {
            mostrarMensaje(`Este ${itemType.toLowerCase()} tiene un ID temporal o inválido. La acción no puede completarse en la base de datos.`, "warning");
            return false;
        }
        return true;
    };

    const handleEliminarMovimientoClick = (id, tipo, descripcion) => {
        if (!checkIdValidityForAction(id, tipo)) return;
        if (tipo === 'Ingreso Manual') onDeleteIngresoManual(id, descripcion);
        else if (tipo === 'Egreso') onDeleteEgreso(id, descripcion);
    };
    const handleEliminarVentaClick = (ventaId) => {
        if (!checkIdValidityForAction(ventaId, "Venta")) return;
        onDeleteVenta(ventaId);
    };
    const handlePrintClick = (ventaId) => {
        if (!checkIdValidityForAction(ventaId, "Venta")) { mostrarMensaje('ID de venta inválido para imprimir.', 'error'); return; }
        const ventaToPrint = ventas.find(v => v.id === ventaId);
        const clienteInfo = ventaToPrint && clientes ? clientes.find(c => c.id === ventaToPrint.clienteId) : null;
        if (ventaToPrint) { onPrintRequest(ventaToPrint, clienteInfo); }
        else { mostrarMensaje('Venta no encontrada para imprimir (ID: ' + ventaId + ').', 'error'); }
    };
    const handleViewDetailsClick = (itemId) => { // Renombrado a itemId para generalizar, aunque solo se usa para ventas
        if (!checkIdValidityForAction(itemId, "elemento")) { mostrarMensaje('ID inválido para ver detalles.', 'error'); return; }
        onViewDetailsRequest(itemId); // Asume que onViewDetailsRequest es para ventas
    };

    const handleCerrarCaja = () => {
        console.log("ReportesTab: Simular Cierre de Caja.");
        console.log("Datos para cierre:", { totalVentasHoyTodos, ventasPorMedioHoy, totalIngresosManualesHoy, totalEgresosEfectivoHoy, saldoEfectivoEsperado });
        Swal.fire({
            title: 'Cierre de Caja (Simulado)',
            html: `<div class="text-left text-sm space-y-1 text-zinc-300"><p>Total Ventas del Día: <strong class="text-zinc-100">$${formatCurrency(totalVentasHoyTodos)}</strong></p><hr class="border-zinc-600 my-2"/><p>+ Ventas en Efectivo: <span class="monto-positivo">$${formatCurrency(ventasPorMedioHoy['efectivo'] || 0)}</span></p><p>+ Ingresos Manuales: <span class="monto-positivo">$${formatCurrency(totalIngresosManualesHoy)}</span></p><p>- Egresos en Efectivo: <span class="monto-negativo">-${formatCurrency(totalEgresosEfectivoHoy)}</span></p><hr class="border-zinc-600 my-2"/><p>Saldo Efectivo Esperado: <strong class="text-blue-400 text-base">$${formatCurrency(saldoEfectivoEsperado)}</strong></p></div>`,
            icon: 'info', confirmButtonText: 'Entendido', heightAuto: false, background: '#27272a', color: '#d4d4d8',
            confirmButtonColor: '#3b82f6', customClass: { popup: 'text-sm rounded-lg', title: 'text-zinc-100 !text-lg', htmlContainer: 'text-zinc-300', confirmButton: 'px-4 py-2 rounded-md text-white hover:bg-blue-600' }
        });
    };

    const getSortIcon = (key, config) => { if (!config || config.key !== key) { return <Minus className="h-3 w-3 inline-block ml-1 text-zinc-500 opacity-50" />; } return config.direction === 'ascending' ? <ArrowUp className="h-4 w-4 inline-block ml-1 text-blue-400" /> : <ArrowDown className="h-4 w-4 inline-block ml-1 text-blue-400" />; };
    const headerButtonClasses = "flex items-center text-left text-xs font-medium text-zinc-300 uppercase tracking-wider hover:text-white focus:outline-none";

    return (
        <div id="reportes">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Caja y Reportes</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Columna Izquierda */}
                <div className="lg:col-span-1 space-y-5">
                    <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md">
                        <h3 className="text-lg sm:text-xl font-medium mb-3 text-white border-b border-zinc-700 pb-2">Registrar Ingreso Manual</h3>
                        <div className="space-y-3">
                            <div><label htmlFor="ingreso-descripcion-rep" className="block text-sm font-medium text-zinc-300 mb-1">Descripción:</label><input type="text" id="ingreso-descripcion-rep" value={formIngresoDesc} onChange={(e) => setFormIngresoDesc(e.target.value)} placeholder="Ej: Fondo inicial" className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" /></div>
                            <div><label htmlFor="ingreso-monto-rep" className="block text-sm font-medium text-zinc-300 mb-1">Monto ($):</label><input type="number" id="ingreso-monto-rep" value={formIngresoMonto} onChange={(e) => setFormIngresoMonto(e.target.value)} step="0.01" min="0" placeholder="Ej: 1000.00" className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100" /></div>
                            <div className="text-right"><motion.button onClick={handleRegistrarIngresoClick} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md transition duration-150 ease-in-out inline-flex items-center" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}><PlusCircle className="h-4 w-4 mr-2"/>Registrar Ingreso</motion.button></div>
                        </div>
                    </div>
                    <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md">
                        <h3 className="text-lg sm:text-xl font-medium mb-3 text-white border-b border-zinc-700 pb-2">Registrar Egreso</h3>
                        <div className="space-y-3">
                           <div><label htmlFor="egreso-descripcion-rep" className="block text-sm font-medium text-zinc-300 mb-1">Descripción:</label><input type="text" id="egreso-descripcion-rep" value={formEgresoDesc} onChange={(e) => setFormEgresoDesc(e.target.value)} placeholder="Ej: Pago a proveedor" className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" /></div>
                           <div><label htmlFor="egreso-monto-rep" className="block text-sm font-medium text-zinc-300 mb-1">Monto ($):</label><input type="number" id="egreso-monto-rep" value={formEgresoMonto} onChange={(e) => setFormEgresoMonto(e.target.value)} step="0.01" min="0" placeholder="Ej: 500.50" className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100" /></div>
                            <div className="text-right"><motion.button onClick={handleRegistrarEgresoClick} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md transition duration-150 ease-in-out inline-flex items-center" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}><MinusCircle className="h-4 w-4 mr-2"/>Registrar Gasto</motion.button></div>
                        </div>
                    </div>
                    <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md">
                        <h3 className="text-lg sm:text-xl font-medium mb-3 text-white border-b border-zinc-700 pb-2">Resumen del Día ({hoyStr})</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center"><span className="text-zinc-400">Total Ventas (Todos):</span><span className="font-semibold text-zinc-100">${formatCurrency(totalVentasHoyTodos)}</span></div><hr className="border-zinc-700 my-1" />
                            <h4 className="font-semibold text-zinc-200 pt-1">Desglose Ventas:</h4>
                            <div className="pl-4 space-y-1">{['efectivo', 'tarjeta', 'qr_banco', 'qr_billetera', 'transferencia'].map(medio => (<div key={medio} className="flex justify-between items-center"><span className="text-zinc-400 capitalize">{medio.replace('_', ' ')}:</span><span className="font-medium text-zinc-200">${formatCurrency(ventasPorMedioHoy[medio] || 0)}</span></div>))}</div><hr className="border-zinc-700 my-1" />
                            <h4 className="font-semibold text-zinc-200 pt-1">Movimientos Efectivo:</h4>
                            <div className="pl-4 space-y-1">
                                <div className="flex justify-between items-center"><span className="text-zinc-400">Ingresos Manuales:</span><span className="font-medium monto-positivo">${formatCurrency(totalIngresosManualesHoy)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-zinc-400">Egresos Efectivo:</span><span className="font-medium monto-negativo">-${formatCurrency(totalEgresosEfectivoHoy)}</span></div>
                            </div><hr className="border-zinc-700 my-1" />
                            <div className="flex justify-between items-center pt-2"><span className="font-bold text-zinc-100">Saldo Efectivo Esperado:</span><span className="font-bold text-lg text-blue-400">${formatCurrency(saldoEfectivoEsperado)}</span></div>
                        </div>
                        <div className="mt-4 text-right"><motion.button onClick={handleCerrarCaja} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-md transition duration-150 ease-in-out inline-flex items-center" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}><Archive className="h-4 w-4 mr-2"/>Simular Cierre</motion.button></div>
                    </div>
                </div>
                {/* Columna Derecha */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md"><h3 className="text-lg sm:text-xl font-medium mb-3 text-white border-b border-zinc-700 pb-2">Ventas Diarias del Mes ({nombreMesActual})</h3><SalesChart data={salesDataForChart} /></div>
                    <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-3 border-b border-zinc-700 pb-2 gap-2"><h3 className="text-lg sm:text-xl font-medium text-white whitespace-nowrap">Movimientos Caja del Día ({hoyStr})</h3><div className="relative w-full sm:w-auto"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"><Search className="h-4 w-4" /></span><input type="text" placeholder="Buscar..." value={searchTermDia} onChange={(e) => {setSearchTermDia(e.target.value); setCurrentPageDia(1);}} className="w-full sm:w-64 pl-10 pr-4 py-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400 text-sm" /></div></div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow className="hover:bg-transparent border-b-zinc-700"><TableHead><button onClick={() => requestSortDia('timestamp')} className={headerButtonClasses}>Hora {getSortIcon('timestamp', sortConfigDia)}</button></TableHead><TableHead><button onClick={() => requestSortDia('tipo')} className={headerButtonClasses}>Tipo {getSortIcon('tipo', sortConfigDia)}</button></TableHead><TableHead><button onClick={() => requestSortDia('desc')} className={headerButtonClasses}>Descripción {getSortIcon('desc', sortConfigDia)}</button></TableHead><TableHead className="text-right"><button onClick={() => requestSortDia('montoDisplay')} className={`${headerButtonClasses} justify-end w-full`}>Monto {getSortIcon('montoDisplay', sortConfigDia)}</button></TableHead><TableHead className="text-center">Acción</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {paginatedMovimientosDia.length === 0 ? (<TableRow className="hover:bg-transparent border-b-zinc-700"><TableCell colSpan={5} className="h-24 text-center text-zinc-400 italic">No hay movimientos para mostrar hoy.</TableCell></TableRow>) : (
                                        paginatedMovimientosDia.map(m => (
                                            <TableRow key={m.id || `mov_dia_fb_${Date.now()}${Math.random()}`} className="hover:bg-zinc-700/50 border-b-zinc-700">
                                                <TableCell className="text-zinc-400 whitespace-nowrap">{m.hora || 'N/A'}</TableCell>
                                                <TableCell className={`font-medium whitespace-nowrap ${m.tipo === 'Venta' ? 'text-green-400' : (m.tipo === 'Egreso' ? 'text-red-400' : 'text-blue-400')}`}>{m.tipo}</TableCell>
                                                <TableCell className="text-zinc-300 max-w-xs truncate" title={m.desc}>{m.desc}</TableCell>
                                                <TableCell className={`text-right font-semibold whitespace-nowrap ${m.montoDisplay >= 0 ? 'monto-positivo' : 'monto-negativo'}`}>${formatCurrency(m.montoDisplay)}</TableCell>
                                                <TableCell className="text-center whitespace-nowrap">
                                                    {m.tipo === 'Venta' && (<motion.button onClick={() => handleViewDetailsClick(m.id)} className="text-purple-400 hover:text-purple-300 mr-2 p-1 rounded" title="Ver Detalles" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={!m.id || !!m._id_original_invalid || (typeof m.id === 'string' && (m.id.startsWith("local_") || m.id.includes("_h_") || m.id.includes("_m_")))}><Eye className="h-4 w-4 inline-block"/></motion.button>)}
                                                    {m.tipo === 'Venta' && (<motion.button onClick={() => handlePrintClick(m.id)} className="text-blue-400 hover:text-blue-300 mr-2 p-1 rounded" title="Imprimir" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={!m.id || !!m._id_original_invalid || (typeof m.id === 'string' && (m.id.startsWith("local_") || m.id.includes("_h_") || m.id.includes("_m_")))}><Printer className="h-4 w-4 inline-block"/></motion.button>)}
                                                    <motion.button
                                                        onClick={() => m.tipo === 'Venta' ? handleEliminarVentaClick(m.id) : handleEliminarMovimientoClick(m.id, m.tipo, m.desc)}
                                                        className="text-red-500 hover:text-red-400 p-1 rounded" title={`Eliminar ${m.tipo}`}
                                                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                        disabled={!m.id || !!m._id_original_invalid || (typeof m.id === 'string' && (m.id.startsWith("local_") || m.id.includes("_h_") || m.id.includes("_m_")))}
                                                    ><Trash2 className="h-4 w-4 inline-block"/></motion.button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationControls currentPage={currentPageDia} totalPages={totalPagesDia} onPageChange={page => setCurrentPageDia(page)} itemsPerPage={ITEMS_PER_PAGE_REPORTE} totalItems={filteredSortedMovimientosDia.length} />
                    </div>
                    <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-3 border-b border-zinc-700 pb-2 gap-2"><h3 className="text-lg sm:text-xl font-medium text-white whitespace-nowrap">Movimientos del Mes ({nombreMesActual})</h3><div className="relative w-full sm:w-auto"><span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"><Search className="h-4 w-4" /></span><input type="text" placeholder="Buscar..." value={searchTermMes} onChange={(e) => {setSearchTermMes(e.target.value); setCurrentPageMes(1);}} className="w-full sm:w-64 pl-10 pr-4 py-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400 text-sm" /></div></div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow className="hover:bg-transparent border-b-zinc-700"><TableHead><button onClick={() => requestSortMes('timestamp')} className={headerButtonClasses}>Fecha/Hora {getSortIcon('timestamp', sortConfigMes)}</button></TableHead><TableHead><button onClick={() => requestSortMes('tipo')} className={headerButtonClasses}>Tipo {getSortIcon('tipo', sortConfigMes)}</button></TableHead><TableHead><button onClick={() => requestSortMes('desc')} className={headerButtonClasses}>Descripción {getSortIcon('desc', sortConfigMes)}</button></TableHead><TableHead className="text-right"><button onClick={() => requestSortMes('montoDisplay')} className={`${headerButtonClasses} justify-end w-full`}>Monto {getSortIcon('montoDisplay', sortConfigMes)}</button></TableHead><TableHead className="text-center">Acción</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {paginatedMovimientosMes.length === 0 ? (<TableRow className="hover:bg-transparent border-b-zinc-700"><TableCell colSpan={5} className="h-24 text-center text-zinc-400 italic">No hay movimientos para mostrar este mes.</TableCell></TableRow>) : (
                                        paginatedMovimientosMes.map(m => (
                                            <TableRow key={m.id || `mov_mes_fb_${Date.now()}${Math.random()}`} className="hover:bg-zinc-700/50 border-b-zinc-700">
                                                <TableCell className="text-zinc-400 whitespace-nowrap">{`${m.fecha || ''} ${m.hora || ''}`.trim()}</TableCell>
                                                <TableCell className={`font-medium whitespace-nowrap ${m.tipo === 'Venta' ? 'text-green-400' : (m.tipo === 'Egreso' ? 'text-red-400' : 'text-blue-400')}`}>{m.tipo}</TableCell>
                                                <TableCell className="text-zinc-300 max-w-xs truncate" title={m.desc}>{m.desc}</TableCell>
                                                <TableCell className={`text-right font-semibold whitespace-nowrap ${m.montoDisplay >= 0 ? 'monto-positivo' : 'monto-negativo'}`}>${formatCurrency(m.montoDisplay)}</TableCell>
                                                <TableCell className="text-center whitespace-nowrap">
                                                      {m.tipo === 'Venta' && (<motion.button onClick={() => handleViewDetailsClick(m.id)} className="text-purple-400 hover:text-purple-300 mr-2 p-1 rounded" title="Ver Detalles" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={!m.id || !!m._id_original_invalid || (typeof m.id === 'string' && (m.id.startsWith("local_") || m.id.includes("_h_") || m.id.includes("_m_")))}><Eye className="h-4 w-4 inline-block"/></motion.button>)}
                                                      {m.tipo === 'Venta' && (<motion.button onClick={() => handlePrintClick(m.id)} className="text-blue-400 hover:text-blue-300 mr-2 p-1 rounded" title="Imprimir" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={!m.id || !!m._id_original_invalid || (typeof m.id === 'string' && (m.id.startsWith("local_") || m.id.includes("_h_") || m.id.includes("_m_")))}><Printer className="h-4 w-4 inline-block"/></motion.button>)}
                                                      <motion.button
                                                        onClick={() => m.tipo === 'Venta' ? handleEliminarVentaClick(m.id) : handleEliminarMovimientoClick(m.id, m.tipo, m.desc)}
                                                        className="text-red-500 hover:text-red-400 p-1 rounded" title={`Eliminar ${m.tipo}`}
                                                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                        disabled={!m.id || !!m._id_original_invalid || (typeof m.id === 'string' && (m.id.startsWith("local_") || m.id.includes("_h_") || m.id.includes("_m_")))}
                                                      ><Trash2 className="h-4 w-4 inline-block"/></motion.button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationControls currentPage={currentPageMes} totalPages={totalPagesMes} onPageChange={page => setCurrentPageMes(page)} itemsPerPage={ITEMS_PER_PAGE_REPORTE} totalItems={filteredSortedMovimientosMes.length} />
                        <div className="mt-3 text-right text-sm text-zinc-400">Total Ventas del Mes: ${formatCurrency(totalVentasMesTodos)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default ReportesTab;