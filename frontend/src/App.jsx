// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Componentes
import LoginScreen from './components/LoginScreen.jsx';
import VentaTab from './components/VentaTab.jsx';
import ProductosTab from './components/ProductosTab.jsx';
import ClientesTab from './components/ClientesTab.jsx';
import ReportesTab from './components/ReportesTab.jsx';
import NotasCDTab from './components/NotasCDTab.jsx';
import ConfiguracionTab from './components/ConfiguracionTab.jsx';
import PrintReceipt from './components/PrintReceipt.jsx';
import AppLogo from './components/AppLogo.jsx';
import SaleDetailModal from './components/SaleDetailModal.jsx';
import NotaDetailModal from './components/NotaDetailModal.jsx'; // DEBE EXISTIR
import PrintNota from './components/PrintNota.jsx';             // DEBE EXISTIR

// Helpers y Datos
import {
    obtenerFechaHoraActual,
    formatCurrency,
    obtenerNombreMes
} from './utils/helpers.js';
import {
    initialDatosNegocio,
    initialProductos,
    initialClientes
} from './data/initialData.js';
import {
    ShoppingCart, Package, Users, LineChart, FileText, Settings, LogOut, Save
} from 'lucide-react';
import Swal from 'sweetalert2';
import * as fsService from './services/firestoreService';

// --- Funciones de Mensajes (SweetAlert) ---
const mostrarMensajeDark = (texto, tipo = 'info') => {
    Swal.fire({
        title: tipo === 'error' ? 'Error Grave' : (tipo === 'success' ? 'Éxito' : (tipo === 'warning' ? 'Advertencia' : 'Información')),
        text: texto, icon: tipo, confirmButtonText: 'Aceptar', heightAuto: false, background: '#27272a', color: '#e4e4e7', confirmButtonColor: '#3b82f6',
        customClass: { popup: 'text-sm rounded-lg', title: '!text-zinc-100 !text-xl', htmlContainer: '!text-zinc-300', confirmButton: 'px-4 py-2 rounded-md text-white hover:bg-blue-700 focus:ring-blue-500', icon: tipo === 'error' ? '!text-red-400 border-red-400' : (tipo === 'success' ? '!text-green-400 border-green-400' : (tipo === 'warning' ? '!text-yellow-400 border-yellow-400' : '!text-blue-400 border-blue-400')) }
     });
};
const confirmarAccionDark = async (titulo, texto, icono = 'warning', confirmButtonText = 'Sí, continuar') => {
    const resultado = await Swal.fire({
        title: titulo, text: texto, icon: icono, showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#ef4444', confirmButtonText: confirmButtonText, cancelButtonText: 'Cancelar', heightAuto: false, background: '#27272a', color: '#e4e4e7',
        customClass: { popup: 'text-sm rounded-lg', title: '!text-zinc-100 !text-xl', htmlContainer: '!text-zinc-300', confirmButton: `px-4 py-2 rounded-md text-white ${confirmButtonText.toLowerCase().includes("eliminar") ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`, cancelButton: 'px-4 py-2 rounded-md bg-zinc-600 text-zinc-200 hover:bg-zinc-500 focus:ring-zinc-500', icon: icono === 'error' ? '!text-red-400 border-red-400' : (icono === 'success' ? '!text-green-400 border-green-400' : (icono === 'warning' ? '!text-yellow-400 border-yellow-400' : '!text-blue-400 border-blue-400')) }
    });
    return resultado.isConfirmed;
};

// Helpers definidos fuera del componente para estabilidad en useCallback/useEffect
const generateLocalId = (prefix = "local_") => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
const isValidFirestoreId = (id) => id && typeof id === 'string' && !id.startsWith("local_") && !id.includes("_inv_") && !id.includes("_err_") && !id.includes("_init") && id.trim() !== "";
const ensureArray = (arr) => Array.isArray(arr) ? arr : [];

const initializeUserId = () => {
    let storedUserId = localStorage.getItem('pos_app_userId');
    if (!storedUserId) {
        storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('pos_app_userId', storedUserId);
        console.log("App.jsx (initializeUserId): No userId en localStorage, GENERADO NUEVO:", storedUserId);
    } else {
        console.log("App.jsx (initializeUserId): Usando userId de localStorage:", storedUserId);
    }
    return storedUserId;
};

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeTab, setActiveTab] = useState('venta');
    const [productos, setProductos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [ingresosManuales, setIngresosManuales] = useState([]);
    const [notasCD, setNotasCD] = useState([]);
    const [datosNegocio, setDatosNegocio] = useState(initialDatosNegocio);

    const [ventaToPrint, setVentaToPrint] = useState(null);
    const [clienteToPrint, setClienteToPrint] = useState(null);
    const printVentaRef = useRef();

    const [saleDetailModalOpen, setSaleDetailModalOpen] = useState(false);
    const [selectedSaleData, setSelectedSaleData] = useState(null);
    const [selectedSaleClientInfo, setSelectedSaleClientInfo] = useState(null);

    const [notaDetailModalOpen, setNotaDetailModalOpen] = useState(false);
    const [selectedNotaData, setSelectedNotaData] = useState(null);
    const [notaToPrint, setNotaToPrint] = useState(null);
    const printNotaRef = useRef();

    const [currentUserId, setCurrentUserId] = useState(initializeUserId);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingClient, setEditingClient] = useState(null);

    const processAndValidateIds = useCallback((dataArray, dataType = "Datos") => {
        if (!Array.isArray(dataArray)) { console.warn(`App.jsx: processAndValidateIds datos no válidos para ${dataType}:`, dataArray); return []; }
        return dataArray.map(item => {
            if (item && typeof item.id === 'string' && item.id.trim() !== "") return { ...item, _id_original_invalid: false };
            const itemName = item && (typeof item.nombre === 'string' ? item.nombre : (typeof item.descripcion === 'string' ? item.descripcion : 'Desconocido'));
            const newId = generateLocalId(`${dataType.slice(0,3).toLowerCase()}_inv_`);
            console.warn(`App.jsx: ${dataType} item "${itemName}" (Datos: ${JSON.stringify(item)}) tiene ID inválido: '${item ? item.id : 'undefined'}'. Asignando ID local: '${newId}'.`);
            return { ...item, id: newId, _id_original_invalid: true };
        });
    }, []); // generateLocalId está fuera, por lo que no necesita ser dependencia

    const loadAllDataFromFirestore = useCallback(async (userIdToLoad) => {
        if (!userIdToLoad) {
            console.warn("App.jsx: loadAllDataFromFirestore llamado SIN userIdToLoad. Limpiando datos locales.");
            setIsLoadingData(false);
            setProductos(initialProductos.map(p => ({...p, id: generateLocalId("prod_init_") })));
            setClientes(initialClientes.map(c => ({...c, id: generateLocalId("cli_init_") })));
            setVentas([]); setEgresos([]); setIngresosManuales([]); setNotasCD([]);
            setDatosNegocio(initialDatosNegocio);
            return;
        }
        setIsLoadingData(true);
        console.log(`App.jsx: Iniciando carga de datos para userId: ${userIdToLoad}`);
        try {
            const [ pRaw, cRaw, vRaw, eRaw, iRaw, ncRaw, dn ] = await Promise.all([
                fsService.getProductos(userIdToLoad), fsService.getClientes(userIdToLoad), fsService.getVentas(userIdToLoad),
                fsService.getEgresos(userIdToLoad), fsService.getIngresosManuales(userIdToLoad), fsService.getNotasCD(userIdToLoad),
                fsService.getDatosNegocio()
            ]);

            if (pRaw.length === 0 && initialProductos.length > 0) {
                console.log(`App.jsx: Sin productos en Firestore para ${userIdToLoad}, guardando initialProductos...`);
                const batch = initialProductos.map(p=>{const{id,...r}=p;return{...r,userId:userIdToLoad}});
                await fsService.saveProductosBatch(userIdToLoad, batch);
                setProductos(processAndValidateIds(await fsService.getProductos(userIdToLoad),"Productos Post-Batch"));
            } else {
                setProductos(processAndValidateIds(pRaw,"Productos Cargados"));
            }

            if (cRaw.length === 0 && initialClientes.length > 0) {
                console.log(`App.jsx: Sin clientes en Firestore para ${userIdToLoad}, guardando initialClientes...`);
                const batch = initialClientes.map(c=>{const{id,...r}=c;return{...r,userId:userIdToLoad}});
                await fsService.saveClientesBatch(userIdToLoad, batch);
                setClientes(processAndValidateIds(await fsService.getClientes(userIdToLoad),"Clientes Post-Batch"));
            } else {
                 setClientes(processAndValidateIds(cRaw,"Clientes Cargados"));
            }

            setVentas(processAndValidateIds(vRaw, "Ventas"));
            setEgresos(processAndValidateIds(eRaw, "Egresos"));
            setIngresosManuales(processAndValidateIds(iRaw, "IngresosMan"));
            setNotasCD(processAndValidateIds(ncRaw, "NotasCD"));

            if (!dn && initialDatosNegocio) { await fsService.saveDatosNegocio(initialDatosNegocio); setDatosNegocio(initialDatosNegocio); }
            else if (dn) { setDatosNegocio(dn); } else { setDatosNegocio(initialDatosNegocio); }

        } catch (e) { console.error(`App.jsx: Error CRÍTICO durante loadAllDataFromFirestore para userId ${userIdToLoad}:`, e); mostrarMensajeDark("Error crítico al cargar datos.", "error"); }
        finally { setIsLoadingData(false); console.log(`App.jsx: Carga de datos finalizada para userId: ${userIdToLoad}.`);}
    }, [processAndValidateIds]);

    useEffect(() => {
        const loggedInStatus = localStorage.getItem('pos_loggedIn') === 'true';
        if (loggedInStatus) {
            setIsLoggedIn(true);
            if (currentUserId) {
                console.log("App.jsx useEffect: Logueado. Cargando datos para userId (del estado):", currentUserId);
                loadAllDataFromFirestore(currentUserId);
            } else {
                console.error("App.jsx useEffect: Logueado pero currentUserId es nulo/indefinido. No se puede cargar.");
                setIsLoadingData(false);
            }
        } else {
            setIsLoggedIn(false);
            setIsLoadingData(false);
            console.log("App.jsx useEffect: No logueado.");
        }
        try { const c = sessionStorage.getItem('pos_carrito'); if(c) setCartItems(JSON.parse(c));} catch(e){setCartItems([]);}
    }, [currentUserId, loadAllDataFromFirestore]);

    const handleLoginSuccess = () => {
        localStorage.setItem('pos_loggedIn', 'true');
        setIsLoggedIn(true);
        // El useEffect anterior se encargará de la carga de datos al cambiar isLoggedIn y tener currentUserId
        setActiveTab('venta');
     };

    const handleLogout = () => {
        localStorage.removeItem('pos_loggedIn');
        setIsLoggedIn(false);
        setCartItems([]); setProductos([]); setClientes([]); setVentas([]);
        setEgresos([]); setIngresosManuales([]); setNotasCD([]);
        setActiveTab('venta');
        console.log("App.jsx: Usuario deslogueado.");
    };

    // --- Handlers CRUD COMPLETOS ---
    const handleSaveProduct = async (productDataFromForm) => {
        const productDataFirebase = { ...productDataFromForm, userId: currentUserId };
        const isEditing = isValidFirestoreId(productDataFromForm.id);
        const existingProductByBarcode = productos.find(p => p.codigoBarras && productDataFirebase.codigoBarras && p.codigoBarras === productDataFirebase.codigoBarras && p.id !== productDataFromForm.id);
        if (existingProductByBarcode) { mostrarMensajeDark(`Código de barras "${productDataFirebase.codigoBarras}" ya asignado.`, 'warning'); return; }
        setIsLoadingData(true);
        if (isEditing) {
            const firestoreId = productDataFromForm.id;
            const { id, ...dataToUpdate } = productDataFirebase;
            const success = await fsService.updateProducto(firestoreId, dataToUpdate);
            if (success) {
                setProductos(prev => ensureArray(prev).map(p => p.id === firestoreId ? { ...dataToUpdate, id: firestoreId, _id_original_invalid: false } : p));
                mostrarMensajeDark("Producto actualizado.", 'success');
            } else { mostrarMensajeDark("Error al actualizar producto.", 'error'); }
        } else {
            const { id, ...dataToAdd } = productDataFirebase;
            const newIdFromFirestore = await fsService.addProducto(currentUserId, dataToAdd);
            if (isValidFirestoreId(newIdFromFirestore)) {
                setProductos(prev => [...ensureArray(prev), { ...dataToAdd, id: newIdFromFirestore, _id_original_invalid: false }]);
                mostrarMensajeDark("Producto agregado.", 'success');
            } else { console.error("App.jsx: addProducto devolvió ID inválido:", newIdFromFirestore); mostrarMensajeDark("Error al agregar producto.", 'error'); }
        }
        setIsLoadingData(false); setEditingProduct(null);
    };
    const handleEditProduct = (product) => { if (!isValidFirestoreId(product.id)) { mostrarMensajeDark("No se puede editar producto con ID inválido.", "warning"); return; } setEditingProduct(product); };
    const handleCancelEditProduct = () => setEditingProduct(null);
    const handleDeleteProduct = async (firestoreProductId, productName) => {
        if (!isValidFirestoreId(firestoreProductId)) { mostrarMensajeDark("Error: ID de producto inválido.", "error"); return; }
        const confirmed = await confirmarAccionDark('¿Eliminar Producto?', `¿Eliminar "${productName}"?`, 'warning', 'Sí, eliminar');
        if (confirmed) {
            setIsLoadingData(true);
            const success = await fsService.deleteProducto(firestoreProductId);
            if(success){
                setProductos(prev => ensureArray(prev).filter(p => p.id !== firestoreProductId));
                mostrarMensajeDark(`Producto "${productName}" eliminado.`, 'success');
                if (editingProduct && editingProduct.id === firestoreProductId) setEditingProduct(null);
            } else { mostrarMensajeDark("Error al eliminar producto.", 'error'); }
            setIsLoadingData(false);
        }
    };

    const handleSaveClient = async (clientDataFromForm) => {
        const clientDataFirebase = { ...clientDataFromForm, userId: currentUserId };
        const isEditing = isValidFirestoreId(clientDataFromForm.id);
        setIsLoadingData(true);
        if (isEditing) {
            const firestoreId = clientDataFromForm.id;
            const { id, ...dataToUpdate } = clientDataFirebase;
            const success = await fsService.updateCliente(firestoreId, dataToUpdate);
            if(success){
                setClientes(prev => ensureArray(prev).map(c => c.id === firestoreId ? { ...dataToUpdate, id: firestoreId, _id_original_invalid: false } : c));
                mostrarMensajeDark("Cliente actualizado.", 'success');
            } else { mostrarMensajeDark("Error al actualizar cliente.", 'error');}
        } else {
            const { id, ...dataToAdd } = clientDataFirebase;
            const newIdFromFirestore = await fsService.addCliente(currentUserId, dataToAdd);
            if (isValidFirestoreId(newIdFromFirestore)) {
                setClientes(prev => [...ensureArray(prev), { ...dataToAdd, id: newIdFromFirestore, _id_original_invalid: false }]);
                mostrarMensajeDark("Cliente agregado.", 'success');
            } else { mostrarMensajeDark("Error al agregar cliente.", 'error'); }
        }
        setIsLoadingData(false); setEditingClient(null);
    };
    const handleEditClient = (client) => { if (!isValidFirestoreId(client.id)) { mostrarMensajeDark("No se puede editar cliente con ID inválido.", "warning"); return; } setEditingClient(client); };
    const handleCancelEditClient = () => setEditingClient(null);
    const handleDeleteClient = async (firestoreClientId, clientName) => {
        if (!isValidFirestoreId(firestoreClientId)) { mostrarMensajeDark("Error: ID de cliente inválido.", "error"); return; }
        const confirmed = await confirmarAccionDark( '¿Eliminar Cliente?', `¿Seguro de eliminar a "${clientName}"?`, 'warning', 'Sí, eliminar');
        if (confirmed) { setIsLoadingData(true); const success = await fsService.deleteCliente(firestoreClientId);
            if(success){ setClientes(prev => ensureArray(prev).filter(c => c.id !== firestoreClientId)); mostrarMensajeDark(`Cliente "${clientName}" eliminado.`, 'success'); if (editingClient && editingClient.id === firestoreClientId) setEditingClient(null);
            } else { mostrarMensajeDark("Error al eliminar cliente.", 'error'); }
            setIsLoadingData(false);
        }
    };

    const handleSaleConfirmed = async (itemsInCart, total, cliente, metodoPago, tipoFactura) => {
        if (itemsInCart.some(item => !isValidFirestoreId(item.id))) { mostrarMensajeDark("Error: Carrito contiene productos con ID inválido.", "error"); setIsLoadingData(false); return; }
        setIsLoadingData(true);
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const clienteIdFinal = cliente && isValidFirestoreId(cliente.id) ? cliente.id : "consumidor_final";
        const newSaleData = { fecha, hora, timestamp, clienteId: clienteIdFinal, clienteNombre: cliente && cliente.nombre ? cliente.nombre : "Consumidor Final", items: itemsInCart.map(item => ({ id: item.id, nombre: item.nombre, cantidad: item.cantidad, precio: item.precio })), total, metodoPago, tipoFactura, userId: currentUserId };
        try {
            const ventaId = await fsService.addVenta(currentUserId, newSaleData);
            if (isValidFirestoreId(ventaId)) {
                setVentas(prev => [...ensureArray(prev), { ...newSaleData, id: ventaId, _id_original_invalid: false }]);
                const updatedProductosLocal = productos.map(p => { const itemInCart = itemsInCart.find(i => i.id === p.id); return itemInCart ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) - Number(itemInCart.cantidad)) } : p; });
                setProductos(updatedProductosLocal);
                setCartItems([]); sessionStorage.removeItem('pos_carrito');
                mostrarMensajeDark(`Venta #${ventaId.substring(0,6)}... registrada.`, 'success');
            } else { mostrarMensajeDark("Error al registrar la venta (ID de venta no válido).", 'error'); }
        } catch (error) { console.error("App.jsx: Error en handleSaleConfirmed:", error); mostrarMensajeDark(error.message || "Error al procesar la venta. Verifique el stock.", 'error'); }
        setIsLoadingData(false);
    };
    const handleEliminarVenta = async (ventaId) => {
        if (!isValidFirestoreId(ventaId)) { mostrarMensajeDark("Error: ID de venta inválido.", "error"); return; }
        const confirmed = await confirmarAccionDark('¿Eliminar Venta?', `¿Eliminar Venta #${ventaId.substring(0,6)}...? ¡STOCK RESTAURADO!`, 'warning', 'Sí, eliminar');
        if (confirmed) {
            setIsLoadingData(true);
            const success = await fsService.deleteVentaAndRestoreStock(currentUserId, ventaId);
            if (success) {
                setVentas(prev => ensureArray(prev).filter(v => v.id !== ventaId));
                const prodsActualizados = await fsService.getProductos(currentUserId);
                setProductos(processAndValidateIds(prodsActualizados, "Productos Post-ElimVenta"));
                mostrarMensajeDark(`Venta #${ventaId.substring(0,6)}... eliminada y stock restaurado.`, 'success');
            } else { mostrarMensajeDark("Error al eliminar venta o restaurar stock.", 'error'); }
            setIsLoadingData(false);
        }
    };

    const handleRegistrarIngresoManual = async (descripcion, monto) => {
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const newIngresoData = { fecha, hora, timestamp, descripcion, monto: Number(monto) || 0, userId: currentUserId };
        setIsLoadingData(true);
        const newId = await fsService.addIngresoManual(currentUserId, newIngresoData);
        if (isValidFirestoreId(newId)) { setIngresosManuales(prev => [...ensureArray(prev), { ...newIngresoData, id: newId, _id_original_invalid: false }]); mostrarMensajeDark("Ingreso manual registrado.", 'success'); }
        else { mostrarMensajeDark("Error al registrar ingreso.", 'error'); }
        setIsLoadingData(false);
    };
    const handleEliminarIngresoManual = async (id, descripcion) => {
        if (!isValidFirestoreId(id)) { mostrarMensajeDark("Error: ID de ingreso inválido.", "error"); return; }
        const confirmed = await confirmarAccionDark('¿Eliminar Ingreso Manual?', `¿Eliminar "${descripcion || 'este ingreso'}"?`, 'warning', 'Sí, eliminar');
        if(confirmed) { setIsLoadingData(true); const success = await fsService.deleteIngresoManual(id);
            if (success) { setIngresosManuales(prev => ensureArray(prev).filter(i => i.id !== id)); mostrarMensajeDark("Ingreso Manual eliminado.", "success"); }
            else { mostrarMensajeDark("Error al eliminar ingreso manual.", "error"); }
            setIsLoadingData(false);
        }
    };
    const handleRegistrarEgreso = async (descripcion, monto) => {
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const newEgresoData = { fecha, hora, timestamp, descripcion, monto: Number(monto) || 0, userId: currentUserId };
        setIsLoadingData(true);
        const newId = await fsService.addEgreso(currentUserId, newEgresoData);
        if (isValidFirestoreId(newId)) { setEgresos(prev => [...ensureArray(prev), { ...newEgresoData, id: newId, _id_original_invalid: false }]); mostrarMensajeDark("Egreso registrado.", 'success'); }
        else { mostrarMensajeDark("Error al registrar egreso.", 'error'); }
        setIsLoadingData(false);
    };
    const handleEliminarEgreso = async (id, descripcion) => {
        if (!isValidFirestoreId(id)) { mostrarMensajeDark("Error: ID de egreso inválido.", "error"); return; }
        const confirmed = await confirmarAccionDark('¿Eliminar Egreso?', `¿Eliminar "${descripcion || 'este egreso'}"?`, 'warning', 'Sí, eliminar');
        if(confirmed) { setIsLoadingData(true); const success = await fsService.deleteEgreso(id);
            if (success) { setEgresos(prev => ensureArray(prev).filter(e => e.id !== id)); mostrarMensajeDark("Egreso eliminado.", "success"); }
            else { mostrarMensajeDark("Error al eliminar egreso.", "error"); }
            setIsLoadingData(false);
        }
    };

    const handleGenerarNota = async (notaDataFromForm) => {
        setIsLoadingData(true);
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const clienteSeleccionado = clientes.find(c => c.id === notaDataFromForm.clienteId);
        const notaPayload = { tipo: notaDataFromForm.tipo, ventaRelacionadaId: notaDataFromForm.ventaRelacionadaId || null, clienteId: notaDataFromForm.clienteId, clienteNombre: clienteSeleccionado ? clienteSeleccionado.nombre : (notaDataFromForm.clienteNombre || 'Cliente Desconocido'), motivo: notaDataFromForm.motivo, monto: Number(notaDataFromForm.monto) || 0, userId: currentUserId, fecha, hora, timestamp };
        let newNotaId = null; let operacionExitosa = false;

        if (notaDataFromForm.tipo === 'credito' && Array.isArray(notaDataFromForm.itemsDevueltos) && notaDataFromForm.itemsDevueltos.length > 0) {
            if (notaDataFromForm.itemsDevueltos.some(item => !isValidFirestoreId(item.id))) {
                mostrarMensajeDark("Error: Nota contiene productos devueltos con IDs inválidos.", "error"); setIsLoadingData(false); return;
            }
            newNotaId = await fsService.addNotaCreditoWithStockUpdate(currentUserId, notaPayload, notaDataFromForm.itemsDevueltos);
            if (isValidFirestoreId(newNotaId)) {
                operacionExitosa = true;
                const productosActualizados = productos.map(p => {
                    const itemDevuelto = notaDataFromForm.itemsDevueltos.find(dev => dev.id === p.id);
                    if (itemDevuelto && isValidFirestoreId(p.id)) { return { ...p, stock: (Number(p.stock) || 0) + Number(itemDevuelto.cantidad) }; }
                    return p;
                });
                setProductos(productosActualizados);
            }
        } else {
            newNotaId = await fsService.addNotaCDSimple(currentUserId, notaPayload);
            if (isValidFirestoreId(newNotaId)) operacionExitosa = true;
        }
        if (operacionExitosa) {
            setNotasCD(prev => [...ensureArray(prev), { ...notaPayload, itemsDevueltos: notaDataFromForm.itemsDevueltos || [], id: newNotaId, _id_original_invalid: false }]);
            mostrarMensajeDark(`Nota de ${notaPayload.tipo} generada.`, "success");
        } else { mostrarMensajeDark("Error al generar la nota.", "error"); }
        setIsLoadingData(false);
    };
    const handleEliminarNotaCD = async (id) => {
        if (!isValidFirestoreId(id)) { mostrarMensajeDark("Error: ID de nota inválido.", "error"); return; }
        const notaAEliminar = notasCD.find(n => n.id === id);
        const textoConfirmacion = (notaAEliminar?.tipo === 'credito' && Array.isArray(notaAEliminar?.itemsDevueltos) && notaAEliminar.itemsDevueltos.length > 0) ? `¿Eliminar Nota de Crédito? (STOCK NO SE AJUSTARÁ).` : `¿Eliminar Nota de ${notaAEliminar?.tipo || ''}?`;
        const confirmed = await confirmarAccionDark('¿Eliminar Nota?', textoConfirmacion, 'warning', 'Sí, eliminar');
        if(confirmed) {
            setIsLoadingData(true);
            const success = await fsService.deleteNotaCD(id);
            if(success) { setNotasCD(prev => ensureArray(prev).filter(n => n.id !== id)); mostrarMensajeDark("Nota eliminada.", "success"); }
            else { mostrarMensajeDark("Error al eliminar nota.", "error"); }
            setIsLoadingData(false);
        }
    };

    const openNotaDetailModal = useCallback((notaId) => {
        if (!isValidFirestoreId(notaId)) { mostrarMensajeDark("ID de nota inválido.", "warning"); return; }
        const notaSel = notasCD.find(n => n.id === notaId);
        if (notaSel) { setSelectedNotaData(notaSel); setNotaDetailModalOpen(true); }
        else { mostrarMensajeDark("Detalles de nota no encontrados.", "error"); }
    }, [notasCD]);
    const closeNotaDetailModal = useCallback(() => { setNotaDetailModalOpen(false); setSelectedNotaData(null); }, []);
    const handlePrintNota = (notaId) => {
        if (!isValidFirestoreId(notaId)) { mostrarMensajeDark("ID de nota inválido.", "warning"); return; }
        const notaSel = notasCD.find(n => n.id === notaId);
        if (notaSel) setNotaToPrint(notaSel);
        else mostrarMensajeDark("Nota no encontrada.", "error");
    };
    useEffect(() => { if (notaToPrint && printNotaRef.current) { setTimeout(() => { if (window.print) window.print(); setNotaToPrint(null); }, 150); } }, [notaToPrint]);

    const handleGuardarDatosNegocio = async (d) => {setIsLoadingData(true);if(await fsService.saveDatosNegocio(d)){setDatosNegocio(p=>({...p,...d}));mostrarMensajeDark("Config guardada.","success");}else mostrarMensajeDark("Error.","error");setIsLoadingData(false);};
    useEffect(() => { if(isLoggedIn)try{sessionStorage.setItem('pos_carrito',JSON.stringify(cartItems));}catch(e){console.error(e);}},[cartItems,isLoggedIn]);
    const handlePrintRequest = (v,c)=>{if(!v||!isValidFirestoreId(v.id)){mostrarMensajeDark("ID venta inválido.","warning");return;}setVentaToPrint(v);setClienteToPrint(c);};
    useEffect(()=>{if(ventaToPrint&&printVentaRef.current){setTimeout(()=>{if(window.print)window.print();setVentaToPrint(null);setClienteToPrint(null);},150);}},[ventaToPrint]);
    const openSaleDetailModal=useCallback((id)=>{if(!isValidFirestoreId(id)){mostrarMensajeDark("ID venta inválido.","warning");return;}const vS=ventas.find(v=>v.id===id);if(vS){const cI=clientes.find(c=>c.id===vS.clienteId);setSelectedSaleData(vS);setSelectedSaleClientInfo(cI||{nombre:vS.clienteNombre||"Cons. Final",id:vS.clienteId});setSaleDetailModalOpen(true);}else mostrarMensajeDark("Detalles no encontrados.","error");},[ventas,clientes]);
    const closeSaleDetailModal=useCallback(()=>{setSaleDetailModalOpen(false);setSelectedSaleData(null);setSelectedSaleClientInfo(null);},[]);

    const tabs = [
        { id: 'venta', label: 'Nueva Venta', Icon: ShoppingCart, shortLabel: 'Venta' },
        { id: 'productos', label: 'Productos', Icon: Package, shortLabel: 'Productos' },
        { id: 'clientes', label: 'Clientes', Icon: Users, shortLabel: 'Clientes' },
        { id: 'reportes', label: 'Caja y Reportes', Icon: LineChart, shortLabel: 'Caja' },
        { id: 'notas_cd', label: 'Notas C/D', Icon: FileText, shortLabel: 'Notas' },
        { id: 'configuracion', label: 'Configuración', Icon: Settings, shortLabel: 'Config' }
    ];
    const helpers = { formatCurrency, mostrarMensaje: mostrarMensajeDark, confirmarAccion: confirmarAccionDark, obtenerNombreMes, obtenerFechaHoraActual };

    if (isLoadingData && isLoggedIn) { return (<div className="flex justify-center items-center min-h-screen bg-zinc-900 text-white"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div><p className="ml-3 text-lg">Cargando datos...</p></div>); }
    if (!isLoggedIn) { return <LoginScreen onLoginSuccess={handleLoginSuccess} mostrarMensaje={mostrarMensajeDark} />; }

    return (
        <div id="app-container" className="p-3 md:p-6 font-inter bg-zinc-900 text-zinc-200 min-h-screen">
            <style>{` body { font-family: 'Inter', sans-serif; background-color: #18181b; } .active-tab { border-bottom-width: 2px; border-color: #60a5fa; color: #60a5fa; } .inactive-tab { border-bottom-width: 2px; border-color: transparent; color: #a1a1aa; } .inactive-tab:hover { border-color: #52525b; color: #e4e4e7; } .tabs-container nav { flex-wrap: wrap; } .search-results { background-color: #27272a; border: 1px solid #3f3f46; } .search-results div { color: #d4d4d8; } .search-results div:hover { background-color: #3f3f46; } .monto-positivo { color: #22c55e; } .monto-negativo { color: #ef4444; } .tabla-scrollable { max-height: 65vh; overflow-y: auto; display: block; } .tabla-scrollable thead { position: sticky; top: 0; z-index: 1; background-color: #27272a; } .tabla-scrollable th { color: #a1a1aa; } `}</style>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <AppLogo onLogoClick={() => setActiveTab('venta')} className="text-white hover:text-blue-400"/>
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 hidden md:block">Khaleesi System</h1>
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 md:hidden">POS</h1>
                </div>
                 <div></div>
            </div>
            <div className="mb-4 border-b border-zinc-700 tabs-container">
                <nav className="flex flex-wrap -mb-px justify-center sm:justify-end" aria-label="Tabs">
                    {tabs.map(tab => (
                        <motion.button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`tab-button flex items-center py-2 px-3 font-medium text-center text-sm transition-colors duration-150 ${activeTab === tab.id ? 'active-tab text-blue-400' : 'inactive-tab text-zinc-400 hover:text-zinc-200'}`}
                            whileHover={{ y: activeTab !== tab.id ? -2 : 0 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <tab.Icon className="mr-1 sm:mr-1.5 h-4 w-4" strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                            <span className="hidden sm:inline">{tab.label.split('(')[0].trim()}</span>
                            <span className="sm:hidden">{tab.shortLabel}</span>
                            {tab.label.includes('(') && (<span className="hidden sm:inline">{' (' + tab.label.split('(')[1]}</span>)}
                        </motion.button>
                    ))}
                </nav>
            </div>

            <div id="tab-content-container">
                {activeTab === 'venta' && <VentaTab productos={productos} clientes={clientes} cartItems={cartItems} setCartItems={setCartItems} onSaleConfirmed={handleSaleConfirmed} {...helpers} />}
                {activeTab === 'productos' && <ProductosTab productos={productos} onSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} onEditProduct={handleEditProduct} onCancelEditProduct={handleCancelEditProduct} editingProduct={editingProduct} {...helpers} />}
                {activeTab === 'clientes' && <ClientesTab clientes={clientes} onSaveClient={handleSaveClient} onDeleteClient={handleDeleteClient} onEditClient={handleEditClient} onCancelEditClient={handleCancelEditClient} editingClient={editingClient} {...helpers} />}
                {activeTab === 'reportes' &&
                    <ReportesTab
                        ventas={ventas} egresos={egresos} ingresosManuales={ingresosManuales}
                        clientes={clientes} datosNegocio={datosNegocio}
                        onPrintRequest={handlePrintRequest} onViewDetailsRequest={openSaleDetailModal}
                        onAddIngresoManual={handleRegistrarIngresoManual} onDeleteIngresoManual={handleEliminarIngresoManual}
                        onAddEgreso={handleRegistrarEgreso} onDeleteEgreso={handleEliminarEgreso}
                        onDeleteVenta={handleEliminarVenta}
                        {...helpers}
                    />
                }
                {activeTab === 'notas_cd' &&
                    <NotasCDTab
                        notasCD={notasCD}
                        onAddNotaCD={handleGenerarNota}
                        onDeleteNotaCD={handleEliminarNotaCD}
                        onViewDetailsNotaCD={openNotaDetailModal} // <-- PROP PASADA
                        onPrintNotaCD={handlePrintNota}           // <-- PROP PASADA
                        clientes={clientes}
                        productos={productos} // Necesaria para NotasCDTab
                        // ventas={ventas}    // Opcional, si NotasCDTab la necesita para algo
                        {...helpers}
                    />
                }
                {activeTab === 'configuracion' && <ConfiguracionTab datosNegocio={datosNegocio} onSaveDatosNegocio={handleGuardarDatosNegocio} onLogout={handleLogout} {...helpers} IconoLogout={LogOut} IconoGuardar={Save} />}
            </div>

            <PrintReceipt ref={printVentaRef} venta={ventaToPrint} datosNegocio={datosNegocio} cliente={clienteToPrint} formatCurrency={formatCurrency} />
            <PrintNota ref={printNotaRef} nota={notaToPrint} datosNegocio={datosNegocio} clientes={clientes} formatCurrency={formatCurrency} />

            <AnimatePresence>
                {saleDetailModalOpen && (
                    <SaleDetailModal
                        key="sale-detail-modal" isOpen={saleDetailModalOpen} onClose={closeSaleDetailModal}
                        venta={selectedSaleData} clienteInfo={selectedSaleClientInfo} formatCurrency={formatCurrency}
                    />
                )}
                {notaDetailModalOpen && (
                    <NotaDetailModal
                        key="nota-detail-modal"
                        isOpen={notaDetailModalOpen}
                        onClose={closeNotaDetailModal}
                        nota={selectedNotaData}
                        clientes={clientes} // Para que el modal pueda buscar info del cliente
                        formatCurrency={formatCurrency}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;