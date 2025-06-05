import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import * as fsService from '../services/firestoreService'; // Servicios de Firestore
import { initialDatosNegocio, initialProductos, initialClientes } from '../data/initialData'; // Datos iniciales
import { obtenerFechaHoraActual } from '../utils/helpers'; // Helpers

// Crear el contexto
const AppContext = createContext();

// Hook personalizado para usar el contexto fácilmente
export const useAppContext = () => useContext(AppContext);

// Función para generar IDs locales
const generateLocalId = (prefix = "local_") => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

// Función para validar si un ID es de Firestore
const isValidFirestoreId = (id) => id && typeof id === 'string' && !id.startsWith("local_") && !id.includes("_inv_") && !id.includes("_err_") && !id.includes("_init") && id.trim() !== "";

// Asegurar que siempre trabajamos con arrays
const ensureArray = (arr) => Array.isArray(arr) ? arr : [];

// Inicializar userId
const initializeUserId = () => {
    let storedUserId = localStorage.getItem('pos_app_userId');
    if (!storedUserId) {
        storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('pos_app_userId', storedUserId);
        console.log("AppContext: No userId en localStorage, GENERADO NUEVO:", storedUserId);
    } else {
        console.log("AppContext: Usando userId de localStorage:", storedUserId);
    }
    return storedUserId;
};


// Proveedor del Contexto
export const AppProvider = ({ children, mostrarMensaje, confirmarAccion }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [productos, setProductos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [ingresosManuales, setIngresosManuales] = useState([]);
    const [notasCD, setNotasCD] = useState([]);
    const [datosNegocio, setDatosNegocio] = useState(initialDatosNegocio);

    const [currentUserId, setCurrentUserId] = useState(initializeUserId);
    const [isLoadingData, setIsLoadingData] = useState(true); // Inicia como true para la carga inicial
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingClient, setEditingClient] = useState(null);

    const processAndValidateIds = useCallback((dataArray, dataType = "Datos") => {
        if (!Array.isArray(dataArray)) {
            console.warn(`AppContext: processAndValidateIds datos no válidos para ${dataType}:`, dataArray);
            return [];
        }
        return dataArray.map(item => {
            if (item && typeof item.id === 'string' && item.id.trim() !== "") {
                return { ...item, _id_original_invalid: false };
            }
            const itemName = item && (typeof item.nombre === 'string' ? item.nombre : (typeof item.descripcion === 'string' ? item.descripcion : 'Desconocido'));
            const newId = generateLocalId(`${dataType.slice(0,3).toLowerCase()}_inv_`);
            console.warn(`AppContext: ${dataType} item "${itemName}" tiene ID inválido: '${item ? item.id : 'undefined'}'. Asignando ID local: '${newId}'.`);
            return { ...item, id: newId, _id_original_invalid: true };
        });
    }, []);

    const loadAllDataFromFirestore = useCallback(async (userIdToLoad) => {
        if (!userIdToLoad) {
            console.warn("AppContext: loadAllDataFromFirestore llamado SIN userIdToLoad. Estado se mantendrá vacío hasta login/ID válido.");
            setIsLoadingData(false);
            setProductos([]);
            setClientes([]);
            setVentas([]);
            setEgresos([]);
            setIngresosManuales([]);
            setNotasCD([]);
            setDatosNegocio(initialDatosNegocio);
            return;
        }

        setIsLoadingData(true);
        console.log(`AppContext: Iniciando carga de datos para userId: ${userIdToLoad}`);
        try {
            const [ pRaw, cRaw, vRaw, eRaw, iRaw, ncRaw, dn ] = await Promise.all([
                fsService.getProductos(userIdToLoad),
                fsService.getClientes(userIdToLoad),
                fsService.getVentas(userIdToLoad),
                fsService.getEgresos(userIdToLoad),
                fsService.getIngresosManuales(userIdToLoad),
                fsService.getNotasCD(userIdToLoad),
                fsService.getDatosNegocio()
            ]);

            // CORRECCIÓN: No re-sembrar datos iniciales si el usuario los borró.
            // Simplemente carga lo que haya en Firestore.
            setProductos(processAndValidateIds(pRaw, "Productos Cargados"));
            setClientes(processAndValidateIds(cRaw, "Clientes Cargados"));

            setVentas(processAndValidateIds(vRaw, "Ventas"));
            setEgresos(processAndValidateIds(eRaw, "Egresos"));
            setIngresosManuales(processAndValidateIds(iRaw, "IngresosMan"));
            setNotasCD(processAndValidateIds(ncRaw, "NotasCD"));

            if (!dn && initialDatosNegocio) { // Si no hay datos del negocio en Firestore, guarda los iniciales
                await fsService.saveDatosNegocio(initialDatosNegocio);
                setDatosNegocio(initialDatosNegocio);
            } else if (dn) {
                setDatosNegocio(dn);
            } else {
                setDatosNegocio(initialDatosNegocio); // Fallback por si algo falla
            }

        } catch (e) {
            console.error(`AppContext: Error CRÍTICO durante loadAllDataFromFirestore para userId ${userIdToLoad}:`, e);
            if (mostrarMensaje) mostrarMensaje("Error crítico al cargar datos desde la nube. Intente recargar.", "error");
             // En caso de error de carga, establece estados a vacío para evitar inconsistencias
            setProductos([]);
            setClientes([]);
            setVentas([]);
            setEgresos([]);
            setIngresosManuales([]);
            setNotasCD([]);
        } finally {
            setIsLoadingData(false);
            // Log removido de aquí para evitar referencia a `productos` y `clientes` que se están actualizando.
            // console.log(`AppContext: Carga de datos finalizada para userId: ${userIdToLoad}. Productos: ${productos.length}, Clientes: ${clientes.length}`);
        }
    }, [processAndValidateIds, mostrarMensaje]);


    useEffect(() => {
        const loggedInStatus = localStorage.getItem('pos_loggedIn') === 'true';
        if (loggedInStatus) {
            setIsLoggedIn(true); // Actualiza estado de login
            if (currentUserId) { // Si ya tenemos un ID de usuario
                loadAllDataFromFirestore(currentUserId);
            } else {
                // Esto podría pasar si initializeUserId falla o si localStorage se corrompe
                console.error("AppContext useEffect: Logueado pero currentUserId es nulo/indefinido. Esperando ID.");
                setIsLoadingData(false); // Para no quedar en estado de carga infinito
            }
        } else {
            setIsLoggedIn(false);
            setIsLoadingData(false); // No hay nada que cargar si no está logueado
        }

        // Cargar carrito desde sessionStorage si existe (independiente del login, pero usualmente relevante si está logueado)
        try {
            const carritoGuardado = sessionStorage.getItem('pos_carrito');
            if (carritoGuardado) {
                setCartItems(JSON.parse(carritoGuardado));
            }
        } catch (error) {
            console.error("AppContext: Error cargando carrito desde sessionStorage:", error);
            setCartItems([]);
        }
    }, [currentUserId, loadAllDataFromFirestore]); // loadAllDataFromFirestore es una dependencia estable gracias a useCallback


    useEffect(() => {
        if (isLoggedIn) {
            try {
                sessionStorage.setItem('pos_carrito', JSON.stringify(cartItems));
            } catch (error) {
                console.error("AppContext: Error guardando carrito en sessionStorage:", error);
            }
        } else {
             sessionStorage.removeItem('pos_carrito');
        }
    }, [cartItems, isLoggedIn]);

    const handleLoginSuccess = useCallback(() => {
        localStorage.setItem('pos_loggedIn', 'true');
        const userId = currentUserId || initializeUserId(); // Re-asegura
        if (!currentUserId) {
            setCurrentUserId(userId); // Si no estaba, setéalo para disparar el useEffect de carga
        }
        setIsLoggedIn(true); // Esto, junto con currentUserId, activará la carga de datos en el useEffect
        if (userId && currentUserId === userId) { // Si el ID ya estaba y es el mismo, forzar carga por si acaso
            loadAllDataFromFirestore(userId);
        }
    }, [currentUserId, loadAllDataFromFirestore]);


    const handleLogout = () => {
        localStorage.removeItem('pos_loggedIn');
        setIsLoggedIn(false);
        setCartItems([]);
        setProductos([]);
        setClientes([]);
        setVentas([]);
        setEgresos([]);
        setIngresosManuales([]);
        setNotasCD([]);
        // No reseteamos datosNegocio aquí, ya que es configuración global
        // currentUserId se mantiene, no es necesario resetearlo
        console.log("AppContext: Usuario deslogueado.");
    };

    // --- Handlers CRUD y Lógica de Negocio ---
    // (Estos handlers son los que ya habías desarrollado, adaptados para usar los setters del estado del contexto)

    const handleSaveProduct = async (productDataFromForm) => {
        const productDataFirebase = { ...productDataFromForm, userId: currentUserId };
        const isEditing = isValidFirestoreId(productDataFromForm.id);
        const existingProductByBarcode = productos.find(p => p.codigoBarras && productDataFirebase.codigoBarras && p.codigoBarras === productDataFirebase.codigoBarras && p.id !== productDataFromForm.id);
        if (existingProductByBarcode) { if (mostrarMensaje) mostrarMensaje(`Código de barras "${productDataFirebase.codigoBarras}" ya asignado.`, 'warning'); return; }
        setIsLoadingData(true);
        if (isEditing) {
            const firestoreId = productDataFromForm.id;
            const { id, ...dataToUpdate } = productDataFirebase;
            const success = await fsService.updateProducto(firestoreId, dataToUpdate);
            if (success) {
                setProductos(prev => ensureArray(prev).map(p => p.id === firestoreId ? { ...dataToUpdate, id: firestoreId, _id_original_invalid: false } : p));
                if (mostrarMensaje) mostrarMensaje("Producto actualizado.", 'success');
            } else { if (mostrarMensaje) mostrarMensaje("Error al actualizar producto.", 'error'); }
        } else {
            const { id, ...dataToAdd } = productDataFirebase;
            const newIdFromFirestore = await fsService.addProducto(currentUserId, dataToAdd);
            if (isValidFirestoreId(newIdFromFirestore)) {
                setProductos(prev => [...ensureArray(prev), { ...dataToAdd, id: newIdFromFirestore, _id_original_invalid: false }]);
                if (mostrarMensaje) mostrarMensaje("Producto agregado.", 'success');
            } else { console.error("AppContext: addProducto devolvió ID inválido:", newIdFromFirestore); if (mostrarMensaje) mostrarMensaje("Error al agregar producto.", 'error'); }
        }
        setIsLoadingData(false); setEditingProduct(null);
    };
    const handleEditProduct = (product) => { if (!isValidFirestoreId(product.id)) { if (mostrarMensaje) mostrarMensaje("No se puede editar producto con ID inválido.", "warning"); return; } setEditingProduct(product); };
    const handleCancelEditProduct = () => setEditingProduct(null);
    const handleDeleteProduct = async (firestoreProductId, productName) => {
        if (!isValidFirestoreId(firestoreProductId)) { if (mostrarMensaje) mostrarMensaje("Error: ID de producto inválido.", "error"); return; }
        const confirmed = await confirmarAccion('¿Eliminar Producto?', `¿Eliminar "${productName}"?`, 'warning', 'Sí, eliminar');
        if (confirmed) {
            setIsLoadingData(true);
            const success = await fsService.deleteProducto(firestoreProductId);
            if(success){
                setProductos(prev => ensureArray(prev).filter(p => p.id !== firestoreProductId));
                if (mostrarMensaje) mostrarMensaje(`Producto "${productName}" eliminado.`, 'success');
                if (editingProduct && editingProduct.id === firestoreProductId) setEditingProduct(null);
            } else { if (mostrarMensaje) mostrarMensaje("Error al eliminar producto.", 'error'); }
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
                if (mostrarMensaje) mostrarMensaje("Cliente actualizado.", 'success');
            } else { if (mostrarMensaje) mostrarMensaje("Error al actualizar cliente.", 'error');}
        } else {
            const { id, ...dataToAdd } = clientDataFirebase;
            const newIdFromFirestore = await fsService.addCliente(currentUserId, dataToAdd);
            if (isValidFirestoreId(newIdFromFirestore)) {
                setClientes(prev => [...ensureArray(prev), { ...dataToAdd, id: newIdFromFirestore, _id_original_invalid: false }]);
                if (mostrarMensaje) mostrarMensaje("Cliente agregado.", 'success');
            } else { if (mostrarMensaje) mostrarMensaje("Error al agregar cliente.", 'error'); }
        }
        setIsLoadingData(false); setEditingClient(null);
    };
    const handleEditClient = (client) => { if (!isValidFirestoreId(client.id)) { if (mostrarMensaje) mostrarMensaje("No se puede editar cliente con ID inválido.", "warning"); return; } setEditingClient(client); };
    const handleCancelEditClient = () => setEditingClient(null);
    const handleDeleteClient = async (firestoreClientId, clientName) => {
        if (!isValidFirestoreId(firestoreClientId)) { if (mostrarMensaje) mostrarMensaje("Error: ID de cliente inválido.", "error"); return; }
        const confirmed = await confirmarAccion( '¿Eliminar Cliente?', `¿Seguro de eliminar a "${clientName}"?`, 'warning', 'Sí, eliminar');
        if (confirmed) { setIsLoadingData(true); const success = await fsService.deleteCliente(firestoreClientId);
            if(success){ setClientes(prev => ensureArray(prev).filter(c => c.id !== firestoreClientId)); if (mostrarMensaje) mostrarMensaje(`Cliente "${clientName}" eliminado.`, 'success'); if (editingClient && editingClient.id === firestoreClientId) setEditingClient(null);
            } else { if (mostrarMensaje) mostrarMensaje("Error al eliminar cliente.", 'error'); }
            setIsLoadingData(false);
        }
    };

    const handleSaleConfirmed = async (itemsInCart, total, cliente, metodoPago, tipoFactura) => {
        if (itemsInCart.some(item => !isValidFirestoreId(item.id))) { if (mostrarMensaje) mostrarMensaje("Error: Carrito contiene productos con ID inválido.", "error"); setIsLoadingData(false); return; }
        setIsLoadingData(true);
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const clienteIdFinal = cliente && isValidFirestoreId(cliente.id) ? cliente.id : "consumidor_final";
        const newSaleData = { fecha, hora, timestamp, clienteId: clienteIdFinal, clienteNombre: cliente && cliente.nombre ? cliente.nombre : "Consumidor Final", items: itemsInCart.map(item => ({ id: item.id, nombre: item.nombre, cantidad: item.cantidad, precio: item.precio })), total, metodoPago, tipoFactura, userId: currentUserId };
        try {
            const ventaId = await fsService.addVenta(currentUserId, newSaleData); //
            if (isValidFirestoreId(ventaId)) {
                setVentas(prev => [...ensureArray(prev), { ...newSaleData, id: ventaId, _id_original_invalid: false }]);
                const updatedProductosLocal = productos.map(p => { const itemInCart = itemsInCart.find(i => i.id === p.id); return itemInCart ? { ...p, stock: Math.max(0, (Number(p.stock) || 0) - Number(itemInCart.cantidad)) } : p; });
                setProductos(updatedProductosLocal);
                setCartItems([]); sessionStorage.removeItem('pos_carrito');
                if (mostrarMensaje) mostrarMensaje(`Venta #${ventaId.substring(0,6)}... registrada.`, 'success');
            } else { if (mostrarMensaje) mostrarMensaje("Error al registrar la venta (ID de venta no válido).", 'error'); }
        } catch (error) { console.error("AppContext: Error en handleSaleConfirmed:", error); if (mostrarMensaje) mostrarMensaje(error.message || "Error al procesar la venta. Verifique el stock.", 'error'); }
        finally { setIsLoadingData(false); }
    };
    const handleEliminarVenta = async (ventaId) => {
        if (!isValidFirestoreId(ventaId)) { if (mostrarMensaje) mostrarMensaje("Error: ID de venta inválido.", "error"); return; }
        const confirmed = await confirmarAccion('¿Eliminar Venta?', `¿Eliminar Venta #${ventaId.substring(0,6)}...? ¡STOCK RESTAURADO!`, 'warning', 'Sí, eliminar');
        if (confirmed) {
            setIsLoadingData(true);
            const success = await fsService.deleteVentaAndRestoreStock(currentUserId, ventaId); //
            if (success) {
                setVentas(prev => ensureArray(prev).filter(v => v.id !== ventaId));
                const prodsActualizados = await fsService.getProductos(currentUserId);
                setProductos(processAndValidateIds(prodsActualizados, "Productos Post-ElimVenta"));
                if (mostrarMensaje) mostrarMensaje(`Venta #${ventaId.substring(0,6)}... eliminada y stock restaurado.`, 'success');
            } else { if (mostrarMensaje) mostrarMensaje("Error al eliminar venta o restaurar stock.", 'error'); }
            setIsLoadingData(false);
        }
    };

    const handleRegistrarIngresoManual = async (descripcion, monto) => {
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const newIngresoData = { fecha, hora, timestamp, descripcion, monto: Number(monto) || 0, userId: currentUserId };
        setIsLoadingData(true);
        const newId = await fsService.addIngresoManual(currentUserId, newIngresoData);
        if (isValidFirestoreId(newId)) { setIngresosManuales(prev => [...ensureArray(prev), { ...newIngresoData, id: newId, _id_original_invalid: false }]); if (mostrarMensaje) mostrarMensaje("Ingreso manual registrado.", 'success'); }
        else { if (mostrarMensaje) mostrarMensaje("Error al registrar ingreso.", 'error'); }
        setIsLoadingData(false);
    };
    const handleEliminarIngresoManual = async (id, descripcion) => {
        if (!isValidFirestoreId(id)) { if (mostrarMensaje) mostrarMensaje("Error: ID de ingreso inválido.", "error"); return; }
        const confirmed = await confirmarAccion('¿Eliminar Ingreso Manual?', `¿Eliminar "${descripcion || 'este ingreso'}"?`, 'warning', 'Sí, eliminar');
        if(confirmed) { setIsLoadingData(true); const success = await fsService.deleteIngresoManual(id);
            if (success) { setIngresosManuales(prev => ensureArray(prev).filter(i => i.id !== id)); if (mostrarMensaje) mostrarMensaje("Ingreso Manual eliminado.", "success"); }
            else { if (mostrarMensaje) mostrarMensaje("Error al eliminar ingreso manual.", "error"); }
            setIsLoadingData(false);
        }
    };
    const handleRegistrarEgreso = async (descripcion, monto) => {
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const newEgresoData = { fecha, hora, timestamp, descripcion, monto: Number(monto) || 0, userId: currentUserId };
        setIsLoadingData(true);
        const newId = await fsService.addEgreso(currentUserId, newEgresoData);
        if (isValidFirestoreId(newId)) { setEgresos(prev => [...ensureArray(prev), { ...newEgresoData, id: newId, _id_original_invalid: false }]); if (mostrarMensaje) mostrarMensaje("Egreso registrado.", 'success'); }
        else { if (mostrarMensaje) mostrarMensaje("Error al registrar egreso.", 'error'); }
        setIsLoadingData(false);
    };
    const handleEliminarEgreso = async (id, descripcion) => {
        if (!isValidFirestoreId(id)) { if (mostrarMensaje) mostrarMensaje("Error: ID de egreso inválido.", "error"); return; }
        const confirmed = await confirmarAccion('¿Eliminar Egreso?', `¿Eliminar "${descripcion || 'este egreso'}"?`, 'warning', 'Sí, eliminar');
        if(confirmed) { setIsLoadingData(true); const success = await fsService.deleteEgreso(id);
            if (success) { setEgresos(prev => ensureArray(prev).filter(e => e.id !== id)); if (mostrarMensaje) mostrarMensaje("Egreso eliminado.", "success"); }
            else { if (mostrarMensaje) mostrarMensaje("Error al eliminar egreso.", "error"); }
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
            if (notaDataFromForm.itemsDevueltos.some(item => !isValidFirestoreId(item.id))) { if (mostrarMensaje) mostrarMensaje("Error: Nota contiene productos devueltos con IDs inválidos.", "error"); setIsLoadingData(false); return; }
            newNotaId = await fsService.addNotaCreditoWithStockUpdate(currentUserId, notaPayload, notaDataFromForm.itemsDevueltos); //
            if (isValidFirestoreId(newNotaId)) {
                operacionExitosa = true;
                const productosActualizados = productos.map(p => { const itemDevuelto = notaDataFromForm.itemsDevueltos.find(dev => dev.id === p.id); if (itemDevuelto && isValidFirestoreId(p.id)) { return { ...p, stock: (Number(p.stock) || 0) + Number(itemDevuelto.cantidad) }; } return p; });
                setProductos(productosActualizados);
            }
        } else {
            newNotaId = await fsService.addNotaCDSimple(currentUserId, notaPayload); //
            if (isValidFirestoreId(newNotaId)) operacionExitosa = true;
        }
        if (operacionExitosa) {
            setNotasCD(prev => [...ensureArray(prev), { ...notaPayload, itemsDevueltos: notaDataFromForm.itemsDevueltos || [], id: newNotaId, _id_original_invalid: false }]);
            if (mostrarMensaje) mostrarMensaje(`Nota de ${notaPayload.tipo} generada.`, "success");
        } else { if (mostrarMensaje) mostrarMensaje("Error al generar la nota.", "error"); }
        setIsLoadingData(false);
    };
    const handleEliminarNotaCD = async (id) => {
        if (!isValidFirestoreId(id)) { if (mostrarMensaje) mostrarMensaje("Error: ID de nota inválido.", "error"); return; }
        const notaAEliminar = notasCD.find(n => n.id === id);
        const textoConfirmacion = (notaAEliminar?.tipo === 'credito' && Array.isArray(notaAEliminar?.itemsDevueltos) && notaAEliminar.itemsDevueltos.length > 0) ? `¿Eliminar Nota de Crédito? (STOCK NO SE AJUSTARÁ).` : `¿Eliminar Nota de ${notaAEliminar?.tipo || ''}?`;
        const confirmed = await confirmarAccion('¿Eliminar Nota?', textoConfirmacion, 'warning', 'Sí, eliminar');
        if(confirmed) {
            setIsLoadingData(true);
            const success = await fsService.deleteNotaCD(id);
            if(success) { setNotasCD(prev => ensureArray(prev).filter(n => n.id !== id)); if (mostrarMensaje) mostrarMensaje("Nota eliminada.", "success"); }
            else { if (mostrarMensaje) mostrarMensaje("Error al eliminar nota.", "error"); }
            setIsLoadingData(false);
        }
    };

     const handleGuardarDatosNegocio = async (datosActualizados) => {
        setIsLoadingData(true);
        if(await fsService.saveDatosNegocio(datosActualizados)){ //
            setDatosNegocio(prev=>({...prev,...datosActualizados}));
            if (mostrarMensaje) mostrarMensaje("Configuración guardada.","success");
        } else { if (mostrarMensaje) mostrarMensaje("Error al guardar configuración.","error"); }
        setIsLoadingData(false);
    };

    // El valor que se provee a los componentes consumidores
    const contextValue = {
        isLoggedIn,
        productos,
        clientes,
        cartItems,
        ventas,
        egresos,
        ingresosManuales,
        notasCD,
        datosNegocio,
        currentUserId,
        isLoadingData,
        editingProduct,
        editingClient,
        setIsLoggedIn,
        setCartItems,
        // Handlers principales
        handleLoginSuccess,
        handleLogout,
        handleSaveProduct,
        handleEditProduct,
        handleCancelEditProduct,
        handleDeleteProduct,
        handleSaveClient,
        handleEditClient,
        handleCancelEditClient,
        handleDeleteClient,
        handleSaleConfirmed,
        handleEliminarVenta,
        handleRegistrarIngresoManual,
        handleEliminarIngresoManual,
        handleRegistrarEgreso,
        handleEliminarEgreso,
        handleGenerarNota,
        handleEliminarNotaCD,
        handleGuardarDatosNegocio,
        // Funciones de utilidad pasadas como props al provider
        mostrarMensaje,
        confirmarAccion,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};