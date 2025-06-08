// src/context/AppContext.jsx
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import * as fsService from '../services/firestoreService';
import { monitorAuthState, logOut as authLogOut } from '../services/authService';
import { obtenerFechaHoraActual } from '../utils/helpers';

// --- Creación del Contexto ---
const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

// --- Funciones de Ayuda ---
const generateLocalId = (prefix = "local_") => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
const isValidFirestoreId = (id) => id && typeof id === 'string' && !id.startsWith("local_");
const ensureArray = (arr) => Array.isArray(arr) ? arr : [];

// --- Componente Proveedor del Contexto ---
export const AppProvider = ({ children, mostrarMensaje, confirmarAccion }) => {
    // --- ESTADOS DE AUTENTICACIÓN Y CARGA ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // --- ESTADOS DE DATOS DE LA APLICACIÓN ---
    const [productos, setProductos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [ingresosManuales, setIngresosManuales] = useState([]);
    const [notasCD, setNotasCD] = useState([]);
    const [datosNegocio, setDatosNegocio] = useState(null);

    // --- ESTADOS DE UI (EDICIÓN) ---
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingClient, setEditingClient] = useState(null);

    // --- EFECTO PRINCIPAL: MANEJO DE AUTENTICACIÓN Y CARGA DE DATOS ---
    useEffect(() => {
        setIsLoadingData(true);
        const unsubscribe = monitorAuthState(async (user) => {
            if (user) {
                const tokenResult = await user.getIdTokenResult();
                const userIsAdmin = tokenResult.claims.admin === true;
                setCurrentUserId(user.uid);
                setIsLoggedIn(true);
                setIsAdmin(userIsAdmin);
                await loadAllDataForUser(user.uid);
            } else {
                setCurrentUserId(null);
                setIsLoggedIn(false);
                setIsAdmin(false);
                setProductos([]); setClientes([]); setCartItems([]); setVentas([]);
                setEgresos([]); setIngresosManuales([]); setNotasCD([]); setDatosNegocio(null);
            }
            setIsLoadingData(false);
        });
        return () => unsubscribe();
    }, []);

    const loadAllDataForUser = async (userId) => {
        if (!userId) return;
        try {
            const [p, c, v, e, i, nc, dn] = await Promise.all([
                fsService.getProductos(userId), fsService.getClientes(userId), fsService.getVentas(userId),
                fsService.getEgresos(userId), fsService.getIngresosManuales(userId), fsService.getNotasCD(userId),
                fsService.getDatosNegocio(userId)
            ]);
            setProductos(ensureArray(p)); setClientes(ensureArray(c)); setVentas(ensureArray(v));
            setEgresos(ensureArray(e)); setIngresosManuales(ensureArray(i)); setNotasCD(ensureArray(nc));
            setDatosNegocio(dn);
        } catch (error) {
            console.error("Error crítico cargando datos del usuario:", error);
            if (error.code === 'permission-denied') {
                mostrarMensaje("Tu suscripción puede haber vencido o no tienes permisos. Contacta al soporte.", "error");
            } else {
                mostrarMensaje("Error al cargar datos desde la nube. Intente recargar la página.", "error");
            }
        }
    };
    
    // --- INICIO DE TODOS LOS HANDLERS DE LA APLICACIÓN ---

    const handleLogout = async () => { await authLogOut(); };
    
    const handleSaveProduct = async (productDataFromForm) => {
        const productDataFirebase = { ...productDataFromForm, userId: currentUserId };
        const isEditing = isValidFirestoreId(productDataFromForm.id);
        const existingProductByBarcode = productos.find(p => p.codigoBarras && productDataFirebase.codigoBarras && p.codigoBarras === productDataFirebase.codigoBarras && p.id !== productDataFromForm.id);
        if (existingProductByBarcode) { mostrarMensaje(`Código de barras "${productDataFirebase.codigoBarras}" ya asignado.`, 'warning'); return; }
        setIsLoadingData(true);
        if (isEditing) {
            const { id, ...dataToUpdate } = productDataFirebase;
            if (await fsService.updateProducto(id, dataToUpdate)) {
                setProductos(prev => prev.map(p => p.id === id ? { ...dataToUpdate, id } : p));
                mostrarMensaje("Producto actualizado.", 'success');
            } else { mostrarMensaje("Error al actualizar producto.", 'error'); }
        } else {
            const { id, ...dataToAdd } = productDataFirebase;
            const newId = await fsService.addProducto(currentUserId, dataToAdd);
            if (isValidFirestoreId(newId)) {
                setProductos(prev => [...prev, { ...dataToAdd, id: newId }]);
                mostrarMensaje("Producto agregado.", 'success');
            } else { mostrarMensaje("Error al agregar producto.", 'error'); }
        }
        setIsLoadingData(false); setEditingProduct(null);
    };
    const handleEditProduct = (product) => setEditingProduct(product);
    const handleCancelEditProduct = () => setEditingProduct(null);
    const handleDeleteProduct = async (productId, productName) => {
        if (!isValidFirestoreId(productId)) { mostrarMensaje("ID de producto inválido.", "error"); return; }
        if (await confirmarAccion('¿Eliminar Producto?', `¿Seguro de eliminar "${productName}"?`, 'warning', 'Sí, eliminar')) {
            setIsLoadingData(true);
            if (await fsService.deleteProducto(productId)) {
                setProductos(prev => prev.filter(p => p.id !== productId));
                mostrarMensaje(`Producto "${productName}" eliminado.`, 'success');
                if (editingProduct?.id === productId) setEditingProduct(null);
            } else { mostrarMensaje("Error al eliminar producto.", 'error'); }
            setIsLoadingData(false);
        }
    };

    const handleSaveClient = async (clientDataFromForm) => {
        const clientDataFirebase = { ...clientDataFromForm, userId: currentUserId };
        const isEditing = isValidFirestoreId(clientDataFromForm.id);
        setIsLoadingData(true);
        if (isEditing) {
            const { id, ...dataToUpdate } = clientDataFirebase;
            if (await fsService.updateCliente(id, dataToUpdate)) {
                setClientes(prev => prev.map(c => c.id === id ? { ...dataToUpdate, id } : c));
                mostrarMensaje("Cliente actualizado.", 'success');
            } else { mostrarMensaje("Error al actualizar cliente.", 'error'); }
        } else {
            const { id, ...dataToAdd } = clientDataFirebase;
            const newId = await fsService.addCliente(currentUserId, dataToAdd);
            if (isValidFirestoreId(newId)) {
                setClientes(prev => [...prev, { ...dataToAdd, id: newId }]);
                mostrarMensaje("Cliente agregado.", 'success');
            } else { mostrarMensaje("Error al agregar cliente.", 'error'); }
        }
        setIsLoadingData(false); setEditingClient(null);
    };
    const handleEditClient = (client) => setEditingClient(client);
    const handleCancelEditClient = () => setEditingClient(null);
    const handleDeleteClient = async (clientId, clientName) => {
        if (!isValidFirestoreId(clientId)) { mostrarMensaje("ID de cliente inválido.", "error"); return; }
        if (await confirmarAccion('¿Eliminar Cliente?', `¿Seguro de eliminar a "${clientName}"?`, 'warning', 'Sí, eliminar')) {
            setIsLoadingData(true);
            if (await fsService.deleteCliente(clientId)) {
                setClientes(prev => prev.filter(c => c.id !== clientId));
                mostrarMensaje(`Cliente "${clientName}" eliminado.`, 'success');
                if (editingClient?.id === clientId) setEditingClient(null);
            } else { mostrarMensaje("Error al eliminar cliente.", 'error'); }
            setIsLoadingData(false);
        }
    };

    const handleAddManualItemToCart = (descripcion, monto) => {
        if (!descripcion.trim() || isNaN(monto) || monto <= 0) { mostrarMensaje("Ingrese una descripción y un monto válido.", "warning"); return false; }
        const manualItem = { id: generateLocalId("manual_"), nombre: descripcion.trim(), precio: Number(monto), cantidad: 1, isTracked: false };
        setCartItems(prev => [...prev, manualItem]);
        return true;
    };

    const handleSaleConfirmed = async (itemsInCart, total, cliente, metodoPago, tipoFactura) => {
        setIsLoadingData(true);
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const clienteIdFinal = cliente && isValidFirestoreId(cliente.id) ? cliente.id : "consumidor_final";
        const newSaleData = {
            fecha, hora, timestamp, clienteId: clienteIdFinal, clienteNombre: cliente?.nombre || "Consumidor Final",
            items: itemsInCart.map(item => ({ id: item.id, nombre: item.nombre, cantidad: item.cantidad, precio: item.precio })),
            total, metodoPago, tipoFactura, userId: currentUserId
        };
        try {
            const ventaId = await fsService.addVenta(currentUserId, newSaleData);
            if (isValidFirestoreId(ventaId)) {
                setVentas(prev => [...prev, { ...newSaleData, id: ventaId }]);
                const updatedProductos = productos.map(p => {
                    const itemInCart = itemsInCart.find(i => i.id === p.id && i.isTracked !== false);
                    return itemInCart ? { ...p, stock: p.stock - itemInCart.cantidad } : p;
                });
                setProductos(updatedProductos);
                setCartItems([]);
                mostrarMensaje('Venta registrada con éxito.', 'success');
            }
        } catch (error) { mostrarMensaje(error.message || "Error al procesar la venta.", 'error'); }
        finally { setIsLoadingData(false); }
    };

    const handleEliminarVenta = async (ventaId) => {
        if (!isValidFirestoreId(ventaId)) { mostrarMensaje("ID de venta inválido.", "error"); return; }
        if (await confirmarAccion('¿Eliminar Venta?', 'Esto restaurará el stock. ¿Continuar?', 'warning', 'Sí, eliminar')) {
            setIsLoadingData(true);
            if (await fsService.deleteVentaAndRestoreStock(currentUserId, ventaId)) {
                setVentas(prev => prev.filter(v => v.id !== ventaId));
                await loadAllDataForUser(currentUserId);
                mostrarMensaje('Venta eliminada y stock restaurado.', 'success');
            } else { mostrarMensaje("Error al eliminar la venta.", 'error'); }
            setIsLoadingData(false);
        }
    };

    const handleRegistrarIngresoManual = async (descripcion, monto) => {
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const newIngresoData = { fecha, hora, timestamp, descripcion, monto: Number(monto) || 0, userId: currentUserId };
        const newId = await fsService.addIngresoManual(currentUserId, newIngresoData);
        if (isValidFirestoreId(newId)) {
            setIngresosManuales(prev => [...prev, { ...newIngresoData, id: newId }]);
            mostrarMensaje("Ingreso manual registrado.", 'success');
        } else { mostrarMensaje("Error al registrar ingreso.", 'error'); }
    };

    const handleEliminarIngresoManual = async (id, descripcion) => {
        if (!isValidFirestoreId(id)) return;
        if (await confirmarAccion('¿Eliminar Ingreso?', `¿Eliminar "${descripcion || 'este ingreso'}"?`, 'warning', 'Sí, eliminar')) {
            if (await fsService.deleteIngresoManual(id)) {
                setIngresosManuales(prev => prev.filter(i => i.id !== id));
                mostrarMensaje("Ingreso eliminado.", "success");
            } else { mostrarMensaje("Error al eliminar ingreso.", "error"); }
        }
    };
    
    const handleRegistrarEgreso = async (descripcion, monto) => {
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const newEgresoData = { fecha, hora, timestamp, descripcion, monto: Number(monto) || 0, userId: currentUserId };
        const newId = await fsService.addEgreso(currentUserId, newEgresoData);
        if (isValidFirestoreId(newId)) {
            setEgresos(prev => [...prev, { ...newEgresoData, id: newId }]);
            mostrarMensaje("Egreso registrado.", 'success');
        } else { mostrarMensaje("Error al registrar egreso.", 'error'); }
    };

    const handleEliminarEgreso = async (id, descripcion) => {
        if (!isValidFirestoreId(id)) return;
        if (await confirmarAccion('¿Eliminar Egreso?', `¿Eliminar "${descripcion || 'este egreso'}"?`, 'warning', 'Sí, eliminar')) {
            if (await fsService.deleteEgreso(id)) {
                setEgresos(prev => prev.filter(e => e.id !== id));
                mostrarMensaje("Egreso eliminado.", "success");
            } else { mostrarMensaje("Error al eliminar egreso.", "error"); }
        }
    };

    const handleGenerarNota = async (notaData) => { /* Implementación pendiente si se requiere */ };
    const handleEliminarNotaCD = async (id) => { /* Implementación pendiente si se requiere */ };

    const handleGuardarDatosNegocio = async (datosActualizados) => {
        setIsLoadingData(true);
        if (await fsService.saveDatosNegocio(currentUserId, datosActualizados)) {
            setDatosNegocio(prev => ({ ...prev, ...datosActualizados }));
            mostrarMensaje("Configuración guardada.", "success");
        } else { mostrarMensaje("Error al guardar la configuración.", "error"); }
        setIsLoadingData(false);
    };

    // --- FIN DE TODOS LOS HANDLERS ---

    const contextValue = {
        isLoggedIn, isLoadingData, currentUserId, isAdmin,
        productos, clientes, cartItems, ventas, egresos, ingresosManuales, notasCD, datosNegocio,
        editingProduct, editingClient,
        setCartItems,
        handleLogout,
        handleSaveProduct, handleEditProduct, handleCancelEditProduct, handleDeleteProduct,
        handleSaveClient, handleEditClient, handleCancelEditClient, handleDeleteClient,
        handleSaleConfirmed, handleEliminarVenta,
        handleRegistrarIngresoManual, handleEliminarIngresoManual,
        handleRegistrarEgreso, handleEliminarEgreso,
        handleGenerarNota, handleEliminarNotaCD,
        handleGuardarDatosNegocio,
        handleAddManualItemToCart,
        mostrarMensaje,
        confirmarAccion,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};